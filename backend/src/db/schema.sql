-- DanceFlow PostgreSQL Schema
-- Все справочные значения локализованы на русский язык

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  login VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Студент', 'Администратор'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  total_lessons INTEGER NOT NULL,
  lessons_used INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  CHECK (lessons_used >= 0),
  CHECK (total_lessons > 0),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS styles (
  style_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS instructors (
  instructor_id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS trainings (
  training_id SERIAL PRIMARY KEY,
  style_id INTEGER NOT NULL REFERENCES styles(style_id) ON DELETE RESTRICT,
  instructor_id INTEGER NOT NULL REFERENCES instructors(instructor_id) ON DELETE RESTRICT,
  title VARCHAR(150) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location VARCHAR(200) NOT NULL,
  level VARCHAR(30) NOT NULL CHECK (level IN ('Начинающий', 'Средний', 'Продвинутый'))
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  training_id INTEGER NOT NULL REFERENCES trainings(training_id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(subscription_id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Подтверждено', 'Отменено')),
  UNIQUE (user_id, training_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Присутствовал', 'Пропуск')),
  UNIQUE (booking_id)
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  device VARCHAR(100),
  browser VARCHAR(100),
  ip_address VARCHAR(45),
  login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_trainings_date ON trainings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_training ON bookings(training_id);
CREATE INDEX IF NOT EXISTS idx_attendance_booking ON attendance(booking_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
