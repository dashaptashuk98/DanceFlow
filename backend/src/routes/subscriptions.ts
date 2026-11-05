import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/my', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT s.subscription_id, s.user_id, s.type, s.total_lessons, s.lessons_used,
              s.start_date::text, s.end_date::text,
              (s.total_lessons - s.lessons_used) AS remaining_lessons,
              CASE
                WHEN s.end_date < CURRENT_DATE THEN 'Истёк'
                WHEN s.start_date > CURRENT_DATE THEN 'Ещё не начался'
                WHEN s.lessons_used >= s.total_lessons THEN 'Исчерпан'
                ELSE 'Активен'
              END AS status_label
       FROM subscriptions s
       WHERE s.user_id = $1
       ORDER BY s.end_date DESC`,
      [req.user!.userId]
    );

    res.json({ subscriptions: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить абонементы' });
  }
});

router.get('/user/:userId', requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT s.subscription_id, s.user_id, s.type, s.total_lessons, s.lessons_used,
              s.start_date::text, s.end_date::text,
              (s.total_lessons - s.lessons_used) AS remaining_lessons,
              CASE
                WHEN s.end_date < CURRENT_DATE THEN 'Истёк'
                WHEN s.start_date > CURRENT_DATE THEN 'Ещё не начался'
                WHEN s.lessons_used >= s.total_lessons THEN 'Исчерпан'
                ELSE 'Активен'
              END AS status_label
       FROM subscriptions s
       WHERE s.user_id = $1
       ORDER BY s.end_date DESC`,
      [Number(req.params.userId)]
    );

    res.json({ subscriptions: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить абонементы пользователя' });
  }
});

router.get('/', requireRole('Администратор'), async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT s.subscription_id, s.user_id, s.type, s.total_lessons, s.lessons_used,
              s.start_date::text, s.end_date::text,
              (s.total_lessons - s.lessons_used) AS remaining_lessons,
              u.first_name, u.login,
              CASE
                WHEN s.end_date < CURRENT_DATE THEN 'Истёк'
                WHEN s.start_date > CURRENT_DATE THEN 'Ещё не начался'
                WHEN s.lessons_used >= s.total_lessons THEN 'Исчерпан'
                ELSE 'Активен'
              END AS status_label
       FROM subscriptions s
       JOIN users u ON u.user_id = s.user_id
       ORDER BY s.end_date DESC`
    );

    res.json({ subscriptions: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить абонементы' });
  }
});

router.post('/', requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const { user_id, type, total_lessons, start_date, end_date, amount } = req.body;

    if (!user_id || !type || !total_lessons || !start_date || !end_date) {
      res.status(400).json({ message: 'Заполните все поля абонемента' });
      return;
    }

    const result = await query(
      `INSERT INTO subscriptions (user_id, type, total_lessons, lessons_used, start_date, end_date)
       VALUES ($1, $2, $3, 0, $4, $5)
       RETURNING subscription_id, user_id, type, total_lessons, lessons_used,
                 start_date::text, end_date::text`,
      [user_id, type, total_lessons, start_date, end_date]
    );

    const subscription = result.rows[0];

    if (amount != null) {
      await query(
        `INSERT INTO payments (subscription_id, payment_date, amount)
         VALUES ($1, CURRENT_DATE, $2)`,
        [subscription.subscription_id, amount]
      );
    }

    res.status(201).json({ subscription, message: 'Абонемент выдан' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось выдать абонемент' });
  }
});

router.post('/:id/renew', requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const { total_lessons, end_date, amount, type } = req.body;
    const id = Number(req.params.id);

    const current = await query(
      'SELECT * FROM subscriptions WHERE subscription_id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      res.status(404).json({ message: 'Абонемент не найден' });
      return;
    }

    const old = current.rows[0];
    const newTotal = total_lessons ?? old.total_lessons;
    const newEnd = end_date ?? old.end_date;
    const newType = type ?? old.type;

    const result = await query(
      `UPDATE subscriptions
       SET type = $1,
           total_lessons = $2,
           lessons_used = 0,
           start_date = CURRENT_DATE,
           end_date = $3
       WHERE subscription_id = $4
       RETURNING subscription_id, user_id, type, total_lessons, lessons_used,
                 start_date::text, end_date::text`,
      [newType, newTotal, newEnd, id]
    );

    if (amount != null) {
      await query(
        `INSERT INTO payments (subscription_id, payment_date, amount)
         VALUES ($1, CURRENT_DATE, $2)`,
        [id, amount]
      );
    }

    res.json({ subscription: result.rows[0], message: 'Абонемент продлён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось продлить абонемент' });
  }
});

/** Отмена абонемента: дата окончания = вчера (статус «Истёк») */
router.post('/:id/cancel', requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const current = await query(
      'SELECT subscription_id FROM subscriptions WHERE subscription_id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      res.status(404).json({ message: 'Абонемент не найден' });
      return;
    }

    const result = await query(
      `UPDATE subscriptions
       SET lessons_used = total_lessons,
           end_date = LEAST(end_date, CURRENT_DATE)
       WHERE subscription_id = $1
       RETURNING subscription_id, user_id, type, total_lessons, lessons_used,
                 start_date::text, end_date::text`,
      [id]
    );

    res.json({ subscription: result.rows[0], message: 'Абонемент отменён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось отменить абонемент' });
  }
});

export default router;
