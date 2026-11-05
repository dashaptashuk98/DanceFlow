import { CalendarDays, Music2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import {
  useCreateBooking,
  useMySubscriptions,
  useSchedule,
  useStyles,
} from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { AlertBanner, Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { addDays, formatDate, formatTime, toLocalISODate } from '../lib/format';
import type { Training } from '../types';

type ViewMode = 'day' | 'week' | 'month';

function rangeFor(view: ViewMode, anchor: Date) {
  if (view === 'day') {
    const iso = toLocalISODate(anchor);
    return { from: iso, to: iso };
  }
  if (view === 'month') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: toLocalISODate(first), to: toLocalISODate(last) };
  }
  const day = anchor.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(anchor, mondayOffset);
  const sunday = addDays(monday, 6);
  return { from: toLocalISODate(monday), to: toLocalISODate(sunday) };
}

export function SchedulePage() {
  const { isAuthenticated, user } = useAuth();
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [bookingTraining, setBookingTraining] = useState<Training | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<number | ''>('');
  const [styleFilter, setStyleFilter] = useState<number | ''>('');

  const styles = useStyles();

  const range = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const schedule = useSchedule({ ...range, view, style_id: styleFilter });
  const subs = useMySubscriptions(isAuthenticated && user?.role === 'Студент');
  const createBooking = useCreateBooking();

  const activeSubs =
    subs.data?.subscriptions.filter((s) => s.status_label === 'Активен') ?? [];

  const todayIso = toLocalISODate();
  const isTodayView = view === 'day' && toLocalISODate(anchor) === todayIso;

  const grouped = useMemo(() => {
    const map = new Map<string, Training[]>();
    for (const t of schedule.data?.trainings ?? []) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return [...map.entries()];
  }, [schedule.data, styleFilter]);

  function shift(dir: -1 | 1) {
    if (view === 'day') setAnchor(addDays(anchor, dir));
    else if (view === 'week') setAnchor(addDays(anchor, dir * 7));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
  }

  /** «Сегодня» — только занятия текущего дня */
  function goToday() {
    setView('day');
    setAnchor(new Date());
  }

  async function confirmBooking() {
    if (!bookingTraining || !subscriptionId) {
      setMessageType('error');
      setMessage('Выберите абонемент для записи');
      return;
    }
    setMessage('');
    try {
      const result = await createBooking.mutateAsync({
        training_id: bookingTraining.training_id,
        subscription_id: Number(subscriptionId),
      });
      setMessageType('success');
      setMessage(result.message);
      setBookingTraining(null);
      setSubscriptionId('');
    } catch (err) {
      setMessageType('error');
      setMessage(err instanceof ApiError ? err.message : 'Не удалось записаться');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-content">Расписание</h1>
          <p className="mt-1 text-sm text-muted">
            Занятия студии по дням, неделям и месяцам
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={view === v ? 'btn-primary !py-2' : 'btn-secondary !py-2'}
            >
              {v === 'day' ? 'День' : v === 'week' ? 'Неделя' : 'Месяц'}
            </button>
          ))}
          <button type="button" className="btn-secondary !py-2" onClick={() => shift(-1)}>
            ←
          </button>
          <button
            type="button"
            className={`!py-2 ${isTodayView ? 'btn-primary' : 'btn-secondary'}`}
            onClick={goToday}
          >
            Сегодня
          </button>
          <button type="button" className="btn-secondary !py-2" onClick={() => shift(1)}>
            →
          </button>
          <select
            className="input-field !py-2"
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Все стили</option>
            {styles.data?.styles.map((s) => (
              <option key={s.style_id} value={s.style_id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <AlertBanner type={messageType} onDismiss={() => setMessage('')}>
          {message}
        </AlertBanner>
      )}

      {schedule.isLoading && <p className="text-sm text-muted">Загрузка расписания...</p>}
      {schedule.isError && (
        <AlertBanner type="error">Не удалось загрузить расписание</AlertBanner>
      )}

      <div className="space-y-6">
        {grouped.length === 0 && !schedule.isLoading && (
          isTodayView ? (
            <EmptyState
              icon={<Music2 size={22} strokeWidth={1.5} />}
              title="Сегодня занятий нет"
              description="Сегодня занятий нет. Посмотрите расписание на ближайшие дни!"
              actionLabel="Показать неделю"
              onAction={() => {
                setView('week');
                setAnchor(new Date());
              }}
            />
          ) : (
            <EmptyState
              icon={<CalendarDays size={22} strokeWidth={1.5} />}
              title="На выбранный период занятий нет"
              description="Сдвиньте период стрелками или вернитесь к сегодняшнему дню."
              actionLabel="Сегодня"
              onAction={goToday}
            />
          )
        )}
        {grouped.map(([date, items]) => (
          <section key={date}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              {formatDate(date, { weekday: 'short', day: 'numeric', month: 'long' })}
            </h2>
            <div className="grid gap-3">
              {items.map((t) => (
                <article
                  key={t.training_id}
                  className="panel grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-display text-lg font-semibold text-content">
                        {formatTime(t.time)}
                      </span>
                      <h3 className="font-medium text-content">{t.title}</h3>
                    </div>
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                      <div>
                        <span className="opacity-70">Направление: </span>
                        {t.style_name}
                      </div>
                      <div>
                        <span className="opacity-70">Преподаватель: </span>
                        {t.instructor_name}
                      </div>
                      <div>
                        <span className="opacity-70">Уровень: </span>
                        {t.level}
                      </div>
                      <div>
                        <span className="opacity-70">Зал: </span>
                        {t.location}
                      </div>
                    </dl>
                  </div>
                  {isAuthenticated && user?.role === 'Студент' && (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={t.date < todayIso}
                      onClick={() => {
                        setBookingTraining(t);
                        setSubscriptionId(activeSubs[0]?.subscription_id ?? '');
                        setMessage('');
                      }}
                    >
                      {t.date < todayIso ? 'Запись закрыта' : 'Записаться'}
                    </button>
                  )}
                  {!isAuthenticated && (
                    <Link to="/login" className="btn-secondary text-center">
                      Войти, чтобы записаться
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Modal
        open={!!bookingTraining}
        onClose={() => setBookingTraining(null)}
        title="Запись на занятие"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setBookingTraining(null)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={activeSubs.length === 0 || createBooking.isPending}
              onClick={confirmBooking}
            >
              {createBooking.isPending ? 'Запись...' : 'Подтвердить'}
            </button>
          </>
        }
      >
        {bookingTraining && (
          <>
            <p className="text-content/90">
              {bookingTraining.title} ·{' '}
              {formatDate(bookingTraining.date, {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
              })}{' '}
              · {formatTime(bookingTraining.time)}
            </p>

            {activeSubs.length === 0 ? (
              <p className="mt-4 text-red-600 dark:text-red-300">
                Нет активного абонемента. Обратитесь к администратору. Стоимость абонементов
                указывается в Br (белорусские рубли).
              </p>
            ) : (
              <div className="mt-4">
                <label className="label-field" htmlFor="sub">
                  Абонемент
                </label>
                <select
                  id="sub"
                  className="input-field"
                  value={subscriptionId}
                  onChange={(e) =>
                    setSubscriptionId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  {activeSubs.map((s) => (
                    <option key={s.subscription_id} value={s.subscription_id}>
                      {s.type} — осталось {s.remaining_lessons}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
