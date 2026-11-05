import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { ConfirmModal } from "./Modal";
import { ThemeToggle } from "./ThemeToggle";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition ${
    isActive ? "text-accent" : "text-muted hover:text-content"
  }`;

export function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "Администратор";
  const [logoutOpen, setLogoutOpen] = useState(false);

  function confirmLogout() {
    logout();
    setLogoutOpen(false);
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-app">
      <header className="border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <NavLink to="/" className="group flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold tracking-tight text-content">
              Dance<span className="text-accent">Flow</span>
            </span>
            <span className="hidden text-xs text-muted sm:inline">
              студия танца
            </span>
          </NavLink>

          <nav className="flex flex-wrap items-center gap-3 sm:gap-5">
            <NavLink to="/schedule" className={linkClass}>
              Расписание
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/dashboard" className={linkClass}>
                Личный кабинет
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={linkClass}>
                Админ-панель
              </NavLink>
            )}

            {!isAuthenticated ? (
              <>
                <NavLink to="/login" className={linkClass}>
                  Войти
                </NavLink>
                <NavLink to="/register" className="btn-primary !py-2">
                  Регистрация
                </NavLink>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {user && (
                  <NavLink
                    to="/dashboard"
                    className="flex items-center gap-2 rounded-full border border-line bg-surface-2/60 py-1 pl-1 pr-3 transition hover:border-accent/30"
                    title="Профиль"
                  >
                    <Avatar
                      userId={user.user_id}
                      name={user.first_name}
                      size="sm"
                    />
                    <span className="hidden text-sm text-muted sm:inline">
                      {user.first_name} · {user.role}
                    </span>
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  className="btn-secondary !py-2"
                >
                  Выйти
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        DanceFlow — система учёта посещаемости танцевальной студии
      </footer>

      <ConfirmModal
        open={logoutOpen}
        title="Выход из аккаунта"
        message="Вы уверены, что хотите выйти из аккаунта?"
        confirmLabel="Выйти"
        danger
        onConfirm={confirmLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
