const API_BASE = '/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem('danceflow_token');
}

export function setAuth(token: string, user: unknown) {
  localStorage.setItem('danceflow_token', token);
  localStorage.setItem('danceflow_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('danceflow_token');
  localStorage.removeItem('danceflow_user');
}

export function getStoredUser<T>(): T | null {
  const raw = localStorage.getItem('danceflow_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      (data as { message?: string }).message || 'Произошла ошибка запроса',
      response.status
    );
  }

  return data as T;
}
