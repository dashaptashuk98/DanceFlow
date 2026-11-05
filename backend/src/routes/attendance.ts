import { Router, Request, Response } from 'express';
import { getClient, query } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('Администратор'));

router.post('/mark', async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { booking_id, status } = req.body as {
      booking_id?: number;
      status?: 'Присутствовал' | 'Пропуск';
    };

    if (!booking_id || !status || !['Присутствовал', 'Пропуск'].includes(status)) {
      res.status(400).json({
        message: 'Укажите запись и статус: Присутствовал или Пропуск',
      });
      return;
    }

    await client.query('BEGIN');

    const bookingRes = await client.query(
      `SELECT b.booking_id, b.subscription_id, b.status AS booking_status, b.date,
              t.date AS training_date
       FROM bookings b
       JOIN trainings t ON t.training_id = b.training_id
       WHERE b.booking_id = $1
       FOR UPDATE OF b`,
      [booking_id]
    );

    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Запись не найдена' });
      return;
    }

    const booking = bookingRes.rows[0];
    if (booking.booking_status !== 'Подтверждено') {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Можно отметить только подтверждённую запись' });
      return;
    }

    const existing = await client.query(
      'SELECT attendance_id, status FROM attendance WHERE booking_id = $1',
      [booking_id]
    );

    let attendance;
    let deducted = false;

    if (existing.rows.length > 0) {
      attendance = await client.query(
        `UPDATE attendance SET status = $1, visit_date = $2
         WHERE booking_id = $3
         RETURNING attendance_id, booking_id, visit_date::text, status`,
        [status, booking.training_date, booking_id]
      );
    } else {
      attendance = await client.query(
        `INSERT INTO attendance (booking_id, visit_date, status)
         VALUES ($1, $2, $3)
         RETURNING attendance_id, booking_id, visit_date::text, status`,
        [booking_id, booking.training_date, status]
      );

      if (status === 'Присутствовал') {
        await client.query(
          `UPDATE subscriptions
           SET lessons_used = lessons_used + 1
           WHERE subscription_id = $1`,
          [booking.subscription_id]
        );
        deducted = true;
      }
    }

    await client.query('COMMIT');
    res.json({
      attendance: attendance.rows[0],
      deducted,
      message:
        status === 'Присутствовал'
          ? 'Присутствие отмечено' + (deducted ? ', занятие списано с абонемента' : '')
          : 'Пропуск отмечен',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Не удалось отметить посещаемость' });
  } finally {
    client.release();
  }
});

router.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const overview = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM users WHERE role = 'Студент') AS students_count,
         (SELECT COUNT(*)::int FROM bookings WHERE status = 'Подтверждено') AS confirmed_bookings,
         (SELECT COUNT(*)::int FROM attendance WHERE status = 'Присутствовал') AS attended,
         (SELECT COUNT(*)::int FROM attendance WHERE status = 'Пропуск') AS missed,
         (SELECT COALESCE(SUM(amount), 0)::float FROM payments) AS total_payments,
         (SELECT COUNT(*)::int FROM subscriptions s
           WHERE s.end_date >= CURRENT_DATE
             AND s.start_date <= CURRENT_DATE
             AND s.lessons_used < s.total_lessons) AS active_subscriptions`
    );

    const byStyle = await query(
      `SELECT s.name AS style_name, COUNT(a.attendance_id)::int AS visits
       FROM attendance a
       JOIN bookings b ON b.booking_id = a.booking_id
       JOIN trainings t ON t.training_id = b.training_id
       JOIN styles s ON s.style_id = t.style_id
       WHERE a.status = 'Присутствовал'
       GROUP BY s.name
       ORDER BY visits DESC`
    );

    const topClients = await query(
      `SELECT u.user_id, u.first_name, u.login,
              COUNT(a.attendance_id)::int AS visits
       FROM users u
       JOIN bookings b ON b.user_id = u.user_id
       JOIN attendance a ON a.booking_id = b.booking_id AND a.status = 'Присутствовал'
       WHERE u.role = 'Студент'
       GROUP BY u.user_id, u.first_name, u.login
       ORDER BY visits DESC
       LIMIT 10`
    );

    const attendanceTrend = await query(
      `SELECT a.visit_date::text AS date, COUNT(*)::int AS visits
       FROM attendance a
       WHERE a.status = 'Присутствовал'
         AND a.visit_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY a.visit_date
       ORDER BY a.visit_date`
    );

    const revenueByMonth = await query(
      `SELECT to_char(date_trunc('month', payment_date), 'YYYY-MM') AS month,
              COALESCE(SUM(amount), 0)::float AS amount
       FROM payments
       GROUP BY date_trunc('month', payment_date)
       ORDER BY date_trunc('month', payment_date) DESC
       LIMIT 6`
    );

    res.json({
      overview: overview.rows[0],
      byStyle: byStyle.rows,
      topClients: topClients.rows,
      attendanceTrend: attendanceTrend.rows,
      revenueByMonth: revenueByMonth.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить аналитику' });
  }
});

export default router;
