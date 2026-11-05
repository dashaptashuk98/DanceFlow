import { Router, Request, Response } from 'express';
import { getClient, query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/my', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT b.booking_id, b.user_id, b.training_id, b.subscription_id,
              b.date::text, b.status,
              t.title, t.time::text AS training_time, t.location, t.level,
              s.name AS style_name, i.first_name AS instructor_name,
              a.status AS attendance_status
       FROM bookings b
       JOIN trainings t ON t.training_id = b.training_id
       JOIN styles s ON s.style_id = t.style_id
       JOIN instructors i ON i.instructor_id = t.instructor_id
       LEFT JOIN attendance a ON a.booking_id = b.booking_id
       WHERE b.user_id = $1
       ORDER BY b.date DESC, t.time DESC`,
      [req.user!.userId]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить ваши записи' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { training_id, subscription_id } = req.body as {
      training_id?: number;
      subscription_id?: number;
    };

    if (!training_id || !subscription_id) {
      res.status(400).json({ message: 'Укажите занятие и абонемент' });
      return;
    }

    await client.query('BEGIN');

    const training = await client.query(
      `SELECT training_id, date::text FROM trainings WHERE training_id = $1 FOR SHARE`,
      [training_id]
    );

    if (training.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Занятие не найдено' });
      return;
    }

    const existing = await client.query(
      `SELECT booking_id FROM bookings
       WHERE user_id = $1 AND training_id = $2 AND status = 'Подтверждено'`,
      [req.user!.userId, training_id]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'Вы уже записаны на это занятие' });
      return;
    }

    const sub = await client.query(
      `SELECT subscription_id, total_lessons, lessons_used, start_date, end_date
       FROM subscriptions
       WHERE subscription_id = $1 AND user_id = $2
       FOR UPDATE`,
      [subscription_id, req.user!.userId]
    );

    if (sub.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Абонемент не найден' });
      return;
    }

    const subscription = sub.rows[0];
    const trainingDate = training.rows[0].date;
    const today = new Date().toISOString().slice(0, 10);

    if (subscription.end_date < today || subscription.start_date > today) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Абонемент недействителен на текущую дату' });
      return;
    }

    const remaining = subscription.total_lessons - subscription.lessons_used;
    if (remaining <= 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'На абонементе не осталось занятий' });
      return;
    }

    // Учитываем подтверждённые записи без отметки посещаемости
    const confirmedOpen = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM bookings b
       WHERE b.subscription_id = $1 AND b.status = 'Подтверждено'
         AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.booking_id = b.booking_id)`,
      [subscription_id]
    );

    if (subscription.lessons_used + confirmedOpen.rows[0].cnt >= subscription.total_lessons) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Недостаточно занятий по абонементу для новой записи' });
      return;
    }

    const result = await client.query(
      `INSERT INTO bookings (user_id, training_id, subscription_id, date, status)
       VALUES ($1, $2, $3, $4, 'Подтверждено')
       RETURNING booking_id, user_id, training_id, subscription_id, date::text, status`,
      [req.user!.userId, training_id, subscription_id, trainingDate]
    );

    await client.query('COMMIT');
    res.status(201).json({ booking: result.rows[0], message: 'Вы успешно записались на занятие' });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      res.status(409).json({ message: 'Вы уже записаны на это занятие' });
      return;
    }
    console.error(error);
    res.status(500).json({ message: 'Не удалось записаться на занятие' });
  } finally {
    client.release();
  }
});

router.patch('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const bookingId = Number(req.params.id);

    const existing = await query(
      `SELECT booking_id, user_id, status FROM bookings WHERE booking_id = $1`,
      [bookingId]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ message: 'Запись не найдена' });
      return;
    }

    const booking = existing.rows[0];
    if (req.user!.role !== 'Администратор' && booking.user_id !== req.user!.userId) {
      res.status(403).json({ message: 'Недостаточно прав для этого действия' });
      return;
    }

    if (booking.status === 'Отменено') {
      res.status(400).json({ message: 'Запись уже отменена' });
      return;
    }

    const attendance = await query(
      'SELECT attendance_id FROM attendance WHERE booking_id = $1',
      [bookingId]
    );

    if (attendance.rows.length > 0) {
      res.status(400).json({ message: 'Нельзя отменить запись после отметки посещаемости' });
      return;
    }

    const result = await query(
      `UPDATE bookings SET status = 'Отменено'
       WHERE booking_id = $1
       RETURNING booking_id, user_id, training_id, subscription_id, date::text, status`,
      [bookingId]
    );

    res.json({ booking: result.rows[0], message: 'Запись отменена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось отменить запись' });
  }
});

router.get('/training/:trainingId', authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'Администратор') {
      res.status(403).json({ message: 'Недостаточно прав для этого действия' });
      return;
    }

    const result = await query(
      `SELECT b.booking_id, b.user_id, b.status, b.date::text,
              u.first_name, u.login, u.email,
              a.status AS attendance_status, a.attendance_id
       FROM bookings b
       JOIN users u ON u.user_id = b.user_id
       LEFT JOIN attendance a ON a.booking_id = b.booking_id
       WHERE b.training_id = $1 AND b.status = 'Подтверждено'
       ORDER BY u.first_name`,
      [Number(req.params.trainingId)]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить записи на занятие' });
  }
});

export default router;
