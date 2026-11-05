import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db/pool.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import scheduleRoutes from './routes/schedule.js';
import bookingsRoutes from './routes/bookings.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import instructorsRoutes from './routes/instructors.js';
import attendanceRoutes from './routes/attendance.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.set('trust proxy', 1);

app.get('/api/health', async (_req, res) => {
  const dbOk = await testConnection();
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    message: dbOk ? 'DanceFlow API работает' : 'Нет подключения к базе данных',
    db: dbOk,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/instructors', instructorsRoutes);
app.use('/api/attendance', attendanceRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Маршрут не найден' });
});

app.listen(PORT, () => {
  console.log(`DanceFlow API запущен на порту ${PORT}`);
});
