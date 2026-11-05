import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      TRUNCATE TABLE
        attendance, bookings, payments, sessions,
        trainings, subscriptions, instructors, styles, users
      RESTART IDENTITY CASCADE
    `);

    const adminPassword = await bcrypt.hash('admin123', 10);
    const studentPassword = await bcrypt.hash('student123', 10);

    const usersResult = await client.query<{ user_id: number }>(
      `INSERT INTO users (first_name, login, email, password, role)
       VALUES
         ($1, $2, $3, $4, $5),
         ($6, $7, $8, $9, $10),
         ($11, $12, $13, $14, $15)
       RETURNING user_id`,
      [
        'Анна', 'admin', 'admin@danceflow.ru', adminPassword, 'Администратор',
        'Мария', 'student', 'maria@example.ru', studentPassword, 'Студент',
        'Игорь', 'igor', 'igor@example.ru', studentPassword, 'Студент',
      ]
    );

    const adminId = usersResult.rows[0].user_id;
    const studentId = usersResult.rows[1].user_id;
    const igorId = usersResult.rows[2].user_id;

    const stylesResult = await client.query<{ style_id: number }>(
      `INSERT INTO styles (name, description)
       VALUES
         ('Хип-хоп', 'Динамичный уличный стиль танца'),
         ('Бачата', 'Чувственный парный латиноамериканский танец'),
         ('Контемпорари', 'Современная хореография с элементами импровизации'),
         ('Сальса', 'Энергичный кубинский парный танец')
       RETURNING style_id`
    );

    const [hipHop, bachata, contemporary, salsa] = stylesResult.rows.map((r) => r.style_id);

    const instructorsResult = await client.query<{ instructor_id: number }>(
      `INSERT INTO instructors (first_name, specialization, phone)
       VALUES
         ('Дмитрий', 'Хип-хоп', '+79001112233'),
         ('Елена', 'Бачата / Сальса', '+79004445566'),
         ('Ольга', 'Контемпорари', '+79007778899')
       RETURNING instructor_id`
    );

    const [dmitry, elena, olga] = instructorsResult.rows.map((r) => r.instructor_id);

    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);
    const addDays = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return formatDate(d);
    };

    const trainingsResult = await client.query<{ training_id: number }>(
      `INSERT INTO trainings (style_id, instructor_id, title, date, time, location, level)
       VALUES
         ($1, $2, 'Хип-хоп для начинающих', $3, '18:00', 'Зал 1', 'Начинающий'),
         ($4, $5, 'Бачата — основы', $6, '19:30', 'Зал 2', 'Начинающий'),
         ($7, $8, 'Контемпорари: поток', $9, '17:00', 'Зал 1', 'Средний'),
         ($10, $11, 'Сальса intermediate', $12, '20:00', 'Зал 2', 'Средний'),
         ($13, $14, 'Хип-хоп продвинутый', $15, '18:30', 'Зал 1', 'Продвинутый'),
         ($16, $17, 'Бачата вечерняя', $18, '19:00', 'Зал 2', 'Средний')
       RETURNING training_id`,
      [
        hipHop, dmitry, addDays(1),
        bachata, elena, addDays(1),
        contemporary, olga, addDays(2),
        salsa, elena, addDays(3),
        hipHop, dmitry, addDays(4),
        bachata, elena, addDays(5),
      ]
    );

    const trainingIds = trainingsResult.rows.map((r) => r.training_id);

    const subsResult = await client.query<{ subscription_id: number }>(
      `INSERT INTO subscriptions (user_id, type, total_lessons, lessons_used, start_date, end_date)
       VALUES
         ($1, 'Абонемент на 8 занятий', 8, 4, $2, $3),
         ($4, 'Безлимит', 999, 0, $5, $6),
         ($7, 'Абонемент на 4 занятия', 4, 0, $8, $9)
       RETURNING subscription_id`,
      [
        studentId, addDays(-10), addDays(50),
        studentId, addDays(-5), addDays(25),
        igorId, addDays(-2), addDays(28),
      ]
    );

    const [sub8, subUnlimited, subIgor] = subsResult.rows.map((r) => r.subscription_id);

    // Суммы в белорусских рублях (Br)
    await client.query(
      `INSERT INTO payments (subscription_id, payment_date, amount)
       VALUES
         ($1, $2, 120.00),
         ($3, $4, 220.00),
         ($5, $6, 70.00)`,
      [sub8, addDays(-10), subUnlimited, addDays(-5), subIgor, addDays(-2)]
    );

    const pastTrainings = await client.query<{ training_id: number }>(
      `INSERT INTO trainings (style_id, instructor_id, title, date, time, location, level)
       VALUES
         ($1, $2, 'Хип-хоп разминка', $3, '18:00', 'Зал 1', 'Начинающий'),
         ($4, $5, 'Бачата вечер', $6, '19:00', 'Зал 2', 'Начинающий'),
         ($7, $8, 'Сальса практика', $9, '20:00', 'Зал 2', 'Средний'),
         ($10, $11, 'Контемпорари этюд', $12, '17:30', 'Зал 1', 'Средний')
       RETURNING training_id`,
      [
        hipHop, dmitry, addDays(-14),
        bachata, elena, addDays(-10),
        salsa, elena, addDays(-7),
        contemporary, olga, addDays(-3),
      ]
    );

    const pastIds = pastTrainings.rows.map((r) => r.training_id);

    const bookingsResult = await client.query<{ booking_id: number }>(
      `INSERT INTO bookings (user_id, training_id, subscription_id, date, status)
       VALUES
         ($1, $2, $3, $4, 'Подтверждено'),
         ($5, $6, $7, $8, 'Подтверждено'),
         ($9, $10, $11, $12, 'Подтверждено'),
         ($13, $14, $15, $16, 'Подтверждено'),
         ($17, $18, $19, $20, 'Подтверждено'),
         ($21, $22, $23, $24, 'Подтверждено')
       RETURNING booking_id`,
      [
        studentId, pastIds[0], sub8, addDays(-14),
        studentId, pastIds[1], sub8, addDays(-10),
        studentId, pastIds[2], sub8, addDays(-7),
        studentId, pastIds[3], sub8, addDays(-3),
        studentId, trainingIds[0], sub8, addDays(1),
        igorId, trainingIds[1], subIgor, addDays(1),
      ]
    );

    await client.query(
      `INSERT INTO attendance (booking_id, visit_date, status)
       VALUES
         ($1, $2, 'Присутствовал'),
         ($3, $4, 'Присутствовал'),
         ($5, $6, 'Присутствовал'),
         ($7, $8, 'Присутствовал')`,
      [
        bookingsResult.rows[0].booking_id, addDays(-14),
        bookingsResult.rows[1].booking_id, addDays(-10),
        bookingsResult.rows[2].booking_id, addDays(-7),
        bookingsResult.rows[3].booking_id, addDays(-3),
      ]
    );

    await client.query(
      `INSERT INTO sessions (user_id, device, browser, ip_address, login_time)
       VALUES ($1, 'Desktop', 'Chrome', '127.0.0.1', NOW())`,
      [adminId]
    );

    await client.query('COMMIT');
    console.log('Демо-данные DanceFlow успешно загружены.');
    console.log('Администратор: admin / admin123');
    console.log('Студент: student / student123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка заполнения БД:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
