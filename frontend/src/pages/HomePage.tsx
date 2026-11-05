import { Link } from 'react-router-dom';
import { BrIcon } from '../components/BrIcon';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(12,18,20,0.92) 0%, rgba(18,26,29,0.75) 45%, rgba(12,18,20,0.55) 100%), url('https://images.unsplash.com/photo-1508700929628-666bc436f58e?auto=format&fit=crop&w=1600&q=80')",
        }}
      />
      <div className="relative flex min-h-[70vh] flex-col justify-end gap-6 px-6 py-12 sm:px-10 sm:py-16">
        <p className="font-display text-5xl font-extrabold tracking-tight text-mist-50 sm:text-6xl md:text-7xl">
          Dance<span className="text-accent">Flow</span>
        </p>
        <h1 className="max-w-xl text-xl font-medium text-mist-100/90 sm:text-2xl">
          Расписание, абонементы и посещаемость — в одном ритме студии
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-mist-200/70">
          Записывайтесь на занятия, следите за остатком уроков и управляйте студией.
          Стоимость абонементов — в белорусских рублях (<BrIcon />).
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/schedule" className="btn-primary">
            Смотреть расписание
          </Link>
          {isAuthenticated ? (
            <Link
              to={user?.role === 'Администратор' ? '/admin' : '/dashboard'}
              className="btn-secondary !border-white/20 !bg-white/10 !text-mist-50"
            >
              {user?.role === 'Администратор' ? 'Админ-панель' : 'Личный кабинет'}
            </Link>
          ) : (
            <Link
              to="/register"
              className="btn-secondary !border-white/20 !bg-white/10 !text-mist-50"
            >
              Стать студентом
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
