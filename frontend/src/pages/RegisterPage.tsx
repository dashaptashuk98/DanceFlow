import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useRegister } from '../api/hooks';
import { AlertBanner } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { isAuthenticated, loginSuccess } = useAuth();
  const navigate = useNavigate();
  const register = useRegister();
  const [form, setForm] = useState({
    first_name: '',
    login: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const result = await register.mutateAsync(form);
      loginSuccess(result.token, result.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось зарегистрироваться');
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-content">Регистрация</h1>
        <p className="mt-2 text-sm text-muted">Создайте аккаунт студента DanceFlow</p>
      </div>

      <form onSubmit={onSubmit} className="panel space-y-4 p-6">
        <div>
          <label className="label-field" htmlFor="first_name">
            Имя
          </label>
          <input
            id="first_name"
            className="input-field"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            placeholder="Ваше имя"
            required
          />
        </div>
        <div>
          <label className="label-field" htmlFor="login">
            Логин
          </label>
          <input
            id="login"
            className="input-field"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            placeholder="Придумайте логин"
            required
          />
        </div>
        <div>
          <label className="label-field" htmlFor="email">
            Электронная почта
          </label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@example.ru"
            required
          />
        </div>
        <div>
          <label className="label-field" htmlFor="password">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            className="input-field"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Не менее 6 символов"
            minLength={6}
            required
          />
        </div>

        {error && <AlertBanner type="error">{error}</AlertBanner>}

        <button type="submit" className="btn-primary w-full" disabled={register.isPending}>
          {register.isPending ? 'Создание...' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-teal-deep hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
