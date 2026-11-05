import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import type { User } from '../types/index.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('Администратор'), async (_req: Request, res: Response) => {
  try {
    const result = await query<User>(
      `SELECT user_id, first_name, login, email, role
       FROM users
       ORDER BY first_name`
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить список пользователей' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (req.user!.role !== 'Администратор' && req.user!.userId !== id) {
      res.status(403).json({ message: 'Недостаточно прав для этого действия' });
      return;
    }

    const result = await query<User>(
      `SELECT user_id, first_name, login, email, role FROM users WHERE user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Пользователь не найден' });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/:id/stats', requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const stats = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM bookings b WHERE b.user_id = $1 AND b.status = 'Подтверждено') AS total_bookings,
         (SELECT COUNT(*)::int FROM attendance a
            JOIN bookings b ON b.booking_id = a.booking_id
           WHERE b.user_id = $1 AND a.status = 'Присутствовал') AS attended,
         (SELECT COUNT(*)::int FROM attendance a
            JOIN bookings b ON b.booking_id = a.booking_id
           WHERE b.user_id = $1 AND a.status = 'Пропуск') AS missed`,
      [id]
    );

    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить статистику' });
  }
});

export default router;
