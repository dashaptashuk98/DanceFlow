import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Только добавление в существующую БД. Повторный запуск сохраняет изменения
// демо-данных в интерфейсе. SEED_DATE=YYYY-MM-DD фиксирует даты первого запуска.
// SEED_DEMO_PASSWORD задаёт пароль демо-аккаунтов; иначе он генерируется.
const NAMES = [
  'Александра', 'Алексей', 'Алина', 'Анастасия', 'Андрей', 'Анна',
  'Антон', 'Артём', 'Валерия', 'Василий', 'Вера', 'Вероника',
  'Виктор', 'Виктория', 'Владислав', 'Галина', 'Дарья', 'Денис',
  'Диана', 'Дмитрий', 'Евгения', 'Егор', 'Екатерина', 'Елена',
  'Иван', 'Игорь', 'Илья', 'Ирина', 'Кирилл', 'Кристина',
  'Ксения', 'Максим', 'Маргарита', 'Марина', 'Мария', 'Михаил',
  'Надежда', 'Наталья', 'Никита', 'Олег', 'Ольга', 'Павел',
  'Полина', 'Роман', 'Светлана', 'Сергей', 'София', 'Юлия',
];

interface ExistingTraining {
  date: string;
  time: string;
  location: string;
  instructor_id: number;
}

interface References {
  styles: { style_id: number; name: string }[];
  instructors: { instructor_id: number; specialization: string }[];
  rooms: string[];
  trainings: ExistingTraining[];
}

interface DemoSubscription {
  studentIndex: number;
  type: string;
  total_lessons: number;
  lessons_used: number;
  start_date: string;
  end_date: string;
  amount: number;
}

interface DemoTraining extends ExistingTraining {
  style_id: number;
  title: string;
  level: string;
}

interface DemoBooking {
  studentIndex: number;
  subscriptionIndex: number;
  trainingIndex: number;
  status: 'Подтверждено' | 'Отменено';
  attendance?: 'Присутствовал' | 'Пропуск';
}

const students = NAMES.map((first_name, index) => {
  const suffix = String(index + 1).padStart(3, '0');
  return { first_name, login: `demo_df_${suffix}`, email: `demo.df.${suffix}@example.test` };
});

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function minutes(time: string) {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

function overlaps(a: ExistingTraining, b: ExistingTraining) {
  // Длительности в модели нет: оставляем 2 часа для одного зала/преподавателя.
  return a.date === b.date &&
    (a.location === b.location || a.instructor_id === b.instructor_id) &&
    Math.abs(minutes(a.time) - minutes(b.time)) < 120;
}

export function buildDemoPlan(today: string, references: References) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) ||
      Number.isNaN(Date.parse(`${today}T12:00:00Z`)) || addDays(today, 0) !== today) {
    throw new Error('SEED_DATE должна содержать существующую дату YYYY-MM-DD');
  }
  if (!references.styles.length || !references.instructors.length || !references.rooms.length) {
    throw new Error('Для расписания нужны направления, преподаватели и залы');
  }
  // Воспроизводимое распределение записей; для паролей используется randomBytes.
  let state = 20261105;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const shuffled = <T,>(items: T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const trainings: DemoTraining[] = [];
  const levels = ['Начинающий', 'Средний', 'Продвинутый'];
  const themes = ['основы и техника', 'музыкальность', 'танцевальная практика'];
  for (let day = -20; day <= 9; day++) {
    const date = addDays(today, day);
    const weekend = [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
    for (let session = 0; session < 2; session++) {
      const index = trainings.length;
      const style = references.styles[index % references.styles.length];
      const specialized = references.instructors.filter((instructor) =>
        instructor.specialization.toLocaleLowerCase('ru').includes(style.name.toLocaleLowerCase('ru'))
      );
      const instructors = specialized.length ? specialized : references.instructors;
      const roomOffset = index % references.rooms.length;
      const rooms = [...references.rooms.slice(roomOffset), ...references.rooms.slice(0, roomOffset)];
      const hours = weekend ? [12, 14, 16, 18, 20, 10] : [18, 20, 16, 14, 12, 10];
      const times = [...hours.slice(session), ...hours.slice(0, session)];
      let chosen: DemoTraining | undefined;
      for (const hour of times) {
        for (const location of rooms) {
          for (const instructor of instructors) {
            const candidate: DemoTraining = {
              style_id: style.style_id,
              instructor_id: instructor.instructor_id,
              title: `${style.name}: ${themes[Math.floor(index / references.styles.length) % themes.length]}`,
              date, time: `${String(hour).padStart(2, '0')}:00`, location,
              level: levels[Math.floor(index / references.styles.length) % levels.length],
            };
            if (![...references.trainings, ...trainings].some((other) => overlaps(candidate, other))) {
              chosen = candidate;
              break;
            }
          }
          if (chosen) break;
        }
        if (chosen) break;
      }
      if (!chosen) throw new Error(`Нет свободного зала/преподавателя на ${date}; данные не добавлены`);
      trainings.push(chosen);
    }
  }

  const subscriptions: DemoSubscription[] = [];
  const bookings: DemoBooking[] = [];
  const bookedDays = new Set<string>();
  const addBooking = (subscriptionIndex: number, trainingIndex: number,
    status: DemoBooking['status'], attendance?: DemoBooking['attendance']) => {
    const studentIndex = subscriptions[subscriptionIndex].studentIndex;
    const key = `${studentIndex}:${trainings[trainingIndex].date}`;
    if (bookedDays.has(key)) return false;
    bookings.push({ studentIndex, subscriptionIndex, trainingIndex, status, attendance });
    bookedDays.add(key);
    return true;
  };

  for (let studentIndex = 0; studentIndex < students.length; studentIndex++) {
    const profile = studentIndex % 12;
    if (profile === 0) continue; // Четыре студента пока без абонемента.
    const unlimited = profile === 11;
    const four = [5, 6, 7, 9].includes(profile);
    const expired = profile === 8 || profile === 9;
    const planned = profile === 10;
    const total = unlimited ? 999 : four ? 4 : 8;
    const used = [0, 0, 2, 5, 8, 0, 2, 4, 3, 4, 0, 5 + Math.floor(studentIndex / 12)][profile];
    const startOffset = planned ? 1 : expired ? (four ? -35 : -65) : four || unlimited ? -15 : -20;
    // Сроки и цены из исходного seed: 4 / Безлимит — 30 дней, 8 — 60 дней.
    const start = addDays(today, startOffset);
    const sub: DemoSubscription = {
      studentIndex,
      type: unlimited ? 'Безлимит' : `Абонемент на ${total} занятий`,
      total_lessons: total, lessons_used: used,
      start_date: start, end_date: addDays(start, four || unlimited ? 30 : 60),
      amount: unlimited ? 220 : four ? 70 : 120,
    };
    const subscriptionIndex = subscriptions.push(sub) - 1;
    const eligible = trainings.map((training, index) => ({ ...training, index }))
      .filter((training) => training.date >= sub.start_date && training.date <= sub.end_date);
    const past = shuffled(eligible.filter((training) => training.date < today));
    let attended = 0;
    for (const training of past) {
      if (attended === used) break;
      if (addBooking(subscriptionIndex, training.index, 'Подтверждено', 'Присутствовал')) attended++;
    }
    if (attended !== used) throw new Error(`Недостаточно прошедших занятий для ${students[studentIndex].login}`);

    const lastVisit = bookings.filter((booking) => booking.subscriptionIndex === subscriptionIndex)
      .map((booking) => trainings[booking.trainingIndex].date).sort().at(-1);
    let missed = 0;
    for (const training of past) {
      if (missed >= 1 + studentIndex % 2) break;
      if (used === total && lastVisit && training.date > lastVisit) continue;
      if (addBooking(subscriptionIndex, training.index, 'Подтверждено', 'Пропуск')) missed++;
    }

    if (!expired && !planned && used < total) {
      const future = shuffled(eligible.filter((training) => training.date >= today));
      const reserved = Math.min(total - used, 1 + studentIndex % 3);
      let confirmed = 0;
      for (const training of future) {
        if (confirmed >= reserved) break;
        if (addBooking(subscriptionIndex, training.index, 'Подтверждено')) confirmed++;
      }
      if (studentIndex % 2 === 0) {
        for (const training of future) {
          if (addBooking(subscriptionIndex, training.index, 'Отменено')) break;
        }
      }
    }
  }
  const plan = { today, students, subscriptions, trainings, bookings };
  validateDemoPlan(plan, references.trainings);
  return plan;
}

export function validateDemoPlan(plan: ReturnType<typeof buildDemoPlan>, existing: ExistingTraining[] = []) {
  const unique = new Set<string>();
  const present = plan.subscriptions.map(() => 0);
  const reserved = plan.subscriptions.map(() => 0);
  for (const booking of plan.bookings) {
    const sub = plan.subscriptions[booking.subscriptionIndex];
    const training = plan.trainings[booking.trainingIndex];
    if (!sub || !training || !plan.students[booking.studentIndex] || sub.studentIndex !== booking.studentIndex) {
      throw new Error('Нарушены связи между студентом, абонементом и тренировкой');
    }
    const key = `${booking.studentIndex}:${booking.trainingIndex}`;
    if (unique.has(key)) throw new Error('Повторная запись студента на тренировку');
    unique.add(key);
    if (training.date < sub.start_date || training.date > sub.end_date) {
      throw new Error('Тренировка вне срока абонемента');
    }
    if (booking.attendance && (training.date >= plan.today || booking.status !== 'Подтверждено')) {
      throw new Error('Посещение должно относиться к прошедшей подтверждённой записи');
    }
    if (booking.attendance === 'Присутствовал') present[booking.subscriptionIndex]++;
    if (!booking.attendance && booking.status === 'Подтверждено') {
      if (training.date < plan.today || sub.start_date > plan.today || sub.end_date < plan.today) {
        throw new Error('Открытая запись требует действующего абонемента и текущей/будущей даты');
      }
      reserved[booking.subscriptionIndex]++;
    }
  }
  plan.subscriptions.forEach((sub, index) => {
    if (sub.start_date > sub.end_date || sub.lessons_used !== present[index] ||
        sub.lessons_used < 0 || sub.lessons_used + reserved[index] > sub.total_lessons) {
      throw new Error('Остаток занятий не соответствует посещениям и резервам');
    }
  });
  plan.trainings.forEach((training, index) => {
    if ([...existing, ...plan.trainings.slice(0, index)].some((other) => overlaps(training, other))) {
      throw new Error('Пересечение занятий в зале или у преподавателя');
    }
  });
}

async function seed() {
  // Проверка генератора при импорте файла не требует подключения к PostgreSQL.
  const { pool } = await import('./pool.js');
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('danceflow-demo-v2'))`);
    const existingUsers = await client.query<{ login: string; email: string; role: string }>(
      'SELECT login, email, role FROM users WHERE login = ANY($1::text[]) OR email = ANY($2::text[])',
      [students.map((student) => student.login), students.map((student) => student.email)]
    );
    if (existingUsers.rows.length) {
      const complete = existingUsers.rows.length === students.length && students.every((student) =>
        existingUsers.rows.some((user) => user.login === student.login && user.email === student.email && user.role === 'Студент')
      );
      if (!complete) throw new Error('Часть демо-логинов/email уже занята. Существующие аккаунты не изменены');
      await client.query('COMMIT');
      console.log('Демонстрационный набор уже добавлен. Повторных записей и изменений нет.');
      return;
    }

    // При выборе слотов блокируем параллельную запись в расписание.
    await client.query('LOCK TABLE trainings IN SHARE ROW EXCLUSIVE MODE');
    let styles = await client.query<References['styles'][number]>('SELECT style_id, name FROM styles ORDER BY style_id');
    let instructors = await client.query<References['instructors'][number]>(
      'SELECT instructor_id, specialization FROM instructors ORDER BY instructor_id'
    );
    // Исходные справочники добавляются только если соответствующая таблица пуста.
    if (!styles.rows.length) {
      await client.query(`INSERT INTO styles (name, description) VALUES
        ('Хип-хоп', 'Динамичный уличный стиль танца'),
        ('Бачата', 'Чувственный парный латиноамериканский танец'),
        ('Контемпорари', 'Современная хореография с элементами импровизации'),
        ('Сальса', 'Энергичный кубинский парный танец') ON CONFLICT (name) DO NOTHING`);
      styles = await client.query('SELECT style_id, name FROM styles ORDER BY style_id');
    }
    if (!instructors.rows.length) {
      await client.query(`INSERT INTO instructors (first_name, specialization, phone) VALUES
        ('Дмитрий', 'Хип-хоп', '+79001112233'),
        ('Елена', 'Бачата / Сальса', '+79004445566'),
        ('Ольга', 'Контемпорари', '+79007778899') ON CONFLICT (phone) DO NOTHING`);
      instructors = await client.query('SELECT instructor_id, specialization FROM instructors ORDER BY instructor_id');
    }
    const existingTrainings = await client.query<ExistingTraining>(
      'SELECT date::text, time::text, location, instructor_id FROM trainings ORDER BY date, time, training_id'
    );
    const rooms = [...new Set(existingTrainings.rows.map((training) => training.location))].sort();
    const today = process.env.SEED_DATE || (await client.query<{ today: string }>('SELECT CURRENT_DATE::text AS today')).rows[0].today;
    const plan = buildDemoPlan(today, {
      styles: styles.rows, instructors: instructors.rows,
      rooms: rooms.length ? rooms : ['Зал 1', 'Зал 2'], trainings: existingTrainings.rows,
    });

    const demoPassword = process.env.SEED_DEMO_PASSWORD || randomBytes(18).toString('base64url');
    if (demoPassword.length < 6 || Buffer.byteLength(demoPassword, 'utf8') > 72) {
      throw new Error('SEED_DEMO_PASSWORD: минимум 6 символов, максимум 72 байта для bcrypt');
    }
    const passwordHash = await bcrypt.hash(demoPassword, 12);
    const userIds: number[] = [];
    const subscriptionIds: number[] = [];
    const trainingIds: number[] = [];
    for (const student of plan.students) {
      const result = await client.query<{ user_id: number }>(
        `INSERT INTO users (first_name, login, email, password, role)
         VALUES ($1, $2, $3, $4, 'Студент') RETURNING user_id`,
        [student.first_name, student.login, student.email, passwordHash]
      );
      userIds.push(result.rows[0].user_id);
    }
    for (const sub of plan.subscriptions) {
      const result = await client.query<{ subscription_id: number }>(
        `INSERT INTO subscriptions (user_id, type, total_lessons, lessons_used, start_date, end_date)
         VALUES ($1, $2, $3, 0, $4, $5) RETURNING subscription_id`,
        [userIds[sub.studentIndex], sub.type, sub.total_lessons, sub.start_date, sub.end_date]
      );
      const id = result.rows[0].subscription_id;
      subscriptionIds.push(id);
      await client.query('INSERT INTO payments (subscription_id, payment_date, amount) VALUES ($1, $2, $3)',
        [id, sub.start_date > today ? today : sub.start_date, sub.amount]);
    }
    for (const training of plan.trainings) {
      const result = await client.query<{ training_id: number }>(
        `INSERT INTO trainings (style_id, instructor_id, title, date, time, location, level)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING training_id`,
        [training.style_id, training.instructor_id, training.title, training.date, training.time, training.location, training.level]
      );
      trainingIds.push(result.rows[0].training_id);
    }
    for (const booking of plan.bookings) {
      const date = plan.trainings[booking.trainingIndex].date;
      const result = await client.query<{ booking_id: number }>(
        `INSERT INTO bookings (user_id, training_id, subscription_id, date, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING booking_id`,
        [userIds[booking.studentIndex], trainingIds[booking.trainingIndex], subscriptionIds[booking.subscriptionIndex], date, booking.status]
      );
      if (booking.attendance) {
        await client.query('INSERT INTO attendance (booking_id, visit_date, status) VALUES ($1, $2, $3)',
          [result.rows[0].booking_id, date, booking.attendance]);
        // Как в attendance/mark: списание только при первом «Присутствовал».
        if (booking.attendance === 'Присутствовал') {
          await client.query('UPDATE subscriptions SET lessons_used = lessons_used + 1 WHERE subscription_id = $1',
            [subscriptionIds[booking.subscriptionIndex]]);
        }
      }
    }
    const inconsistent = await client.query(
      `SELECT s.subscription_id FROM subscriptions s
       LEFT JOIN bookings b ON b.subscription_id = s.subscription_id
       LEFT JOIN attendance a ON a.booking_id = b.booking_id
       WHERE s.subscription_id = ANY($1::int[])
       GROUP BY s.subscription_id
       HAVING s.lessons_used <> COUNT(*) FILTER (WHERE a.status = 'Присутствовал')
          OR s.lessons_used + COUNT(*) FILTER (WHERE b.status = 'Подтверждено' AND a.attendance_id IS NULL) > s.total_lessons`,
      [subscriptionIds]
    );
    if (inconsistent.rows.length) throw new Error('Проверка списаний не пройдена; пакет отменён');
    await client.query('COMMIT');
    console.log(`Добавлено: студентов ${plan.students.length}, абонементов ${plan.subscriptions.length}, тренировок ${plan.trainings.length}, записей ${plan.bookings.length}, отметок посещаемости ${plan.bookings.filter((booking) => booking.attendance).length}.`);
    console.log('Логины демо-студентов: demo_df_001 — demo_df_048.');
    if (!process.env.SEED_DEMO_PASSWORD) console.log(`Сгенерированный пароль только для новых демо-аккаунтов: ${demoPassword}`);
    console.log('Существующие пользователи и их данные сохранены.');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Ошибка заполнения БД:', error);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch((error) => {
    console.error('Не удалось запустить seed:', error);
    process.exitCode = 1;
  });
}
