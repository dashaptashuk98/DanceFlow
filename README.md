# DanceFlow

Веб-приложение для танцевальных студий: расписание, записи, абонементы и учёт посещаемости.

## Стек

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, TanStack Query
- **Backend:** Node.js, Express (TypeScript)
- **Database:** PostgreSQL (`pg`)

## Быстрый старт

### 1. База данных

Создайте БД PostgreSQL:

```sql
CREATE DATABASE danceflow;
```

Скопируйте настройки backend:

```bash
cd backend
cp .env.example .env
# при необходимости отредактируйте DATABASE_URL
# на этой машине PostgreSQL слушает порт 5433
```

Примените схему и демо-данные:

```bash
npm install
npm run db:migrate
npm run db:seed
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

API: `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: `http://localhost:5173`

## Демо-аккаунты

| Роль           | Логин   | Пароль    |
|----------------|---------|-----------|
| Администратор  | admin   | admin123  |
| Студент        | student | student123|

## Структура

```
backend/          Express API + PostgreSQL
frontend/         React (Vite) клиент
```
