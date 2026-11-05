import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

export interface TrainingRow {
  training_id: number;
  style_id: number;
  instructor_id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  level: string;
  style_name: string;
  instructor_name: string;
  specialization: string;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to, view, style_id } = req.query as { from?: string; to?: string; view?: string; style_id?: string };

    let start = from;
    let end = to;

    if (!start || !end) {
      const today = new Date();
      if (view === 'month') {
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        start = first.toISOString().slice(0, 10);
        end = last.toISOString().slice(0, 10);
      } else if (view === 'day') {
        start = end = today.toISOString().slice(0, 10);
      } else {
        const day = today.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        start = monday.toISOString().slice(0, 10);
        end = sunday.toISOString().slice(0, 10);
      }
    }

    const params: unknown[] = [start, end];
    const styleCondition = style_id ? ` AND t.style_id = $${params.push(Number(style_id))}` : '';

    const result = await query<TrainingRow>(
      `SELECT t.training_id, t.style_id, t.instructor_id, t.title,
              t.date::text, t.time::text, t.location, t.level,
              s.name AS style_name, i.first_name AS instructor_name, i.specialization
       FROM trainings t
       JOIN styles s ON s.style_id = t.style_id
       JOIN instructors i ON i.instructor_id = t.instructor_id
       WHERE t.date BETWEEN $1 AND $2${styleCondition}
       ORDER BY t.date, t.time`,
      params
    );

    res.json({ trainings: result.rows, from: start, to: end });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить расписание' });
  }
});

router.get('/styles', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT style_id, name, description FROM styles ORDER BY name');
    res.json({ styles: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить направления' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query<TrainingRow>(
      `SELECT t.training_id, t.style_id, t.instructor_id, t.title,
              t.date::text, t.time::text, t.location, t.level,
              s.name AS style_name, i.first_name AS instructor_name, i.specialization
       FROM trainings t
       JOIN styles s ON s.style_id = t.style_id
       JOIN instructors i ON i.instructor_id = t.instructor_id
       WHERE t.training_id = $1`,
      [Number(req.params.id)]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Занятие не найдено' });
      return;
    }

    res.json({ training: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/', authenticate, requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const { style_id, instructor_id, title, date, time, location, level } = req.body;

    if (!style_id || !instructor_id || !title || !date || !time || !location || !level) {
      res.status(400).json({ message: 'Заполните все поля занятия' });
      return;
    }

    const result = await query(
      `INSERT INTO trainings (style_id, instructor_id, title, date, time, location, level)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING training_id, style_id, instructor_id, title, date::text, time::text, location, level`,
      [style_id, instructor_id, title.trim(), date, time, location.trim(), level]
    );

    res.status(201).json({ training: result.rows[0], message: 'Занятие добавлено в расписание' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось создать занятие' });
  }
});

router.put('/:id', authenticate, requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const { style_id, instructor_id, title, date, time, location, level } = req.body;

    const result = await query(
      `UPDATE trainings
       SET style_id = $1, instructor_id = $2, title = $3, date = $4,
           time = $5, location = $6, level = $7
       WHERE training_id = $8
       RETURNING training_id, style_id, instructor_id, title, date::text, time::text, location, level`,
      [style_id, instructor_id, title.trim(), date, time, location.trim(), level, Number(req.params.id)]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Занятие не найдено' });
      return;
    }

    res.json({ training: result.rows[0], message: 'Занятие обновлено' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось обновить занятие' });
  }
});

router.delete('/:id', authenticate, requireRole('Администратор'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM trainings WHERE training_id = $1 RETURNING training_id',
      [Number(req.params.id)]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Занятие не найдено' });
      return;
    }

    res.json({ message: 'Занятие удалено из расписания' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось удалить занятие' });
  }
});

export default router;
