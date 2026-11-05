import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useLogin } from '../api/hooks';
import { AgreementCheckbox } from '../components/AgreementCheckbox';
import { AlertBanner } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { isAuthenticated, loginSuccess } = useAuth();
  const navigate = useNavigate();
  const login = useLogin();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!agreementAccepted) {
      setError('Примите пользовательское соглашение, чтобы войти');
      return;
    }
    try {
      const result = await login.mutateAsync({ login: loginValue, password });
      loginSuccess(result.token, result.user);
      navigate(result.user.role === 'Администратор' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти');
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-content">Вход</h1>
        <p className="mt-2 text-sm text-muted">Войдите в аккаунт DanceFlow</p>
      </div>

      <form onSubmit={onSubmit} className="panel space-y-4 p-6">
        <div>
          <label className="label-field" htmlFor="login">
            Логин
          </label>
          <input
            id="login"
            className="input-field"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            placeholder="Введите логин"
            autoComplete="username"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            autoComplete="current-password"
            required
          />
        </div>

        <AgreementCheckbox
          id="login-agreement"
          checked={agreementAccepted}
          onChange={setAgreementAccepted}
        />

        {error && <AlertBanner type="error">{error}</AlertBanner>}

        <button type="submit" className="btn-primary w-full" disabled={login.isPending}>
          {login.isPending ? 'Вход...' : 'Войти'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-teal-deep hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}
