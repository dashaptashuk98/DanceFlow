import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { signToken, authenticate } from '../middleware/auth.js';
import type { User, UserRole } from '../types/index.js';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { first_name, login, email, password } = req.body as {
      first_name?: string;
      login?: string;
      email?: string;
      password?: string;
    };

    if (!first_name?.trim() || !login?.trim() || !email?.trim() || !password) {
      res.status(400).json({ message: 'Заполните все обязательные поля' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Пароль должен содержать не менее 6 символов' });
      return;
    }

    const existing = await query(
      'SELECT user_id FROM users WHERE login = $1 OR email = $2',
      [login.trim(), email.trim().toLowerCase()]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ message: 'Пользователь с таким логином или email уже существует' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const role: UserRole = 'Студент';

    const result = await query<User>(
      `INSERT INTO users (first_name, login, email, password, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, first_name, login, email, role`,
      [first_name.trim(), login.trim(), email.trim().toLowerCase(), hashed, role]
    );

    const user = result.rows[0];
    const token = signToken({ userId: user.user_id, role: user.role, login: user.login });

    const device = (req.headers['user-agent'] || '').slice(0, 100) || null;
    await query(
      `INSERT INTO sessions (user_id, device, browser, ip_address, login_time)
       VALUES ($1, $2, $3, $4, NOW())`,
      [user.user_id, device, req.headers['sec-ch-ua']?.toString().slice(0, 100) || null, req.ip]
    );

    res.status(201).json({ user, token, message: 'Регистрация успешно завершена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера при регистрации' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body as { login?: string; password?: string };

    if (!login?.trim() || !password) {
      res.status(400).json({ message: 'Укажите логин и пароль' });
      return;
    }

    const result = await query<User & { password: string }>(
      `SELECT user_id, first_name, login, email, password, role
       FROM users WHERE login = $1`,
      [login.trim()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Неверный логин или пароль' });
      return;
    }

    const row = result.rows[0];
    const valid = await bcrypt.compare(password, row.password);
    if (!valid) {
      res.status(401).json({ message: 'Неверный логин или пароль' });
      return;
    }

    const user: User = {
      user_id: row.user_id,
      first_name: row.first_name,
      login: row.login,
      email: row.email,
      role: row.role,
    };

    const token = signToken({ userId: user.user_id, role: user.role, login: user.login });

    const device = (req.headers['user-agent'] || '').slice(0, 100) || null;
    await query(
      `INSERT INTO sessions (user_id, device, browser, ip_address, login_time)
       VALUES ($1, $2, $3, $4, NOW())`,
      [user.user_id, device, req.headers['sec-ch-ua']?.toString().slice(0, 100) || null, req.ip]
    );

    res.json({ user, token, message: 'Вход выполнен успешно' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера при входе' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await query<User>(
      `SELECT user_id, first_name, login, email, role FROM users WHERE user_id = $1`,
      [req.user!.userId]
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

export default router;
