import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT instructor_id, first_name, specialization, phone
       FROM instructors
       ORDER BY first_name`
    );
    res.json({ instructors: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить преподавателей' });
  }
});

router.post('/', authenticate, requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const { first_name, specialization, phone } = req.body;

    if (!first_name?.trim() || !specialization?.trim() || !phone?.trim()) {
      res.status(400).json({ message: 'Заполните все поля преподавателя' });
      return;
    }

    const result = await query(
      `INSERT INTO instructors (first_name, specialization, phone)
       VALUES ($1, $2, $3)
       RETURNING instructor_id, first_name, specialization, phone`,
      [first_name.trim(), specialization.trim(), phone.trim()]
    );

    res.status(201).json({ instructor: result.rows[0], message: 'Преподаватель добавлен' });
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      res.status(409).json({ message: 'Преподаватель с таким телефоном уже есть' });
      return;
    }
    console.error(error);
    res.status(500).json({ message: 'Не удалось добавить преподавателя' });
  }
});

router.put('/:id', authenticate, requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const { first_name, specialization, phone } = req.body;

    const result = await query(
      `UPDATE instructors
       SET first_name = $1, specialization = $2, phone = $3
       WHERE instructor_id = $4
       RETURNING instructor_id, first_name, specialization, phone`,
      [first_name.trim(), specialization.trim(), phone.trim(), Number(req.params.id)]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Преподаватель не найден' });
      return;
    }

    res.json({ instructor: result.rows[0], message: 'Данные преподавателя обновлены' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось обновить преподавателя' });
  }
});

router.delete('/:id', authenticate, requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM instructors WHERE instructor_id = $1 RETURNING instructor_id',
      [Number(req.params.id)]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Преподаватель не найден' });
      return;
    }

    res.json({ message: 'Преподаватель удалён' });
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === '23503') {
      res.status(400).json({ message: 'Нельзя удалить преподавателя с привязанными занятиями' });
      return;
    }
    console.error(error);
    res.status(500).json({ message: 'Не удалось удалить преподавателя' });
  }
});

export default router;
