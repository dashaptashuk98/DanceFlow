import {
  CalendarDays,
  ClipboardList,
  Settings2,
  Ticket,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  useCancelBooking,
  useMyBookings,
  useMySubscriptions,
} from "../api/hooks";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { AlertBanner, ConfirmModal } from "../components/Modal";
import { StreakBadge } from "../components/StreakBadge";
import { StreakCelebrateModal } from "../components/StreakCelebrateModal";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatTime, toLocalISODate } from "../lib/format";
import { shouldShowStreakCelebrate, dismissStreakCelebrate } from "../lib/streakCelebrate";
import { computeStreakStats } from "../lib/streak";

type ProfileCard = "info" | "subs" | "history" | "settings" | null;

export function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const subs = useMySubscriptions(isAuthenticated);
  const bookings = useMyBookings(isAuthenticated);
  const cancel = useCancelBooking();

  const [activeCard, setActiveCard] = useState<ProfileCard>("info");
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [celebrateShown, setCelebrateShown] = useState(false);

  const streak = useMemo(
    () => computeStreakStats(bookings.data?.bookings),
    [bookings.data?.bookings],
  );

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== "Студент") return;
    if (bookings.isLoading || bookings.isError || !bookings.data) return;
    if (streak.fireLevel <= 0) return;
    if (celebrateShown) return;
    if (shouldShowStreakCelebrate(streak.fireLevel)) {
      dismissStreakCelebrate(streak.fireLevel);
      setCelebrateShown(true);
      setCelebrateOpen(true);
    }
  }, [streak.fireLevel, bookings.isLoading, bookings.isError, bookings.data]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const today = toLocalISODate();
  const upcoming =
    bookings.data?.bookings.filter(
      (b) => b.status === "Подтверждено" && b.date >= today,
    ) ?? [];
  const past =
    bookings.data?.bookings.filter(
      (b) => b.date < today || b.status === "Отменено",
    ) ?? [];
  const attendedHistory = past.filter(
    (b) => b.attendance_status === "Присутствовал",
  );

  async function handleCancelConfirm() {
    if (cancelId == null) return;
    setError("");
    try {
      await cancel.mutateAsync(cancelId);
      setSuccess("Запись успешно отменена");
      setCancelId(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось отменить запись",
      );
      setCancelId(null);
    }
  }

  function handleCelebrateContinue() {
    setCelebrateOpen(false);
  }

  const isAdmin = user.role === "Администратор";

  const cards: {
    id: NonNullable<ProfileCard>;
    title: string;
    subtitle: string;
    icon: typeof UserRound;
  }[] = [
    {
      id: "info",
      title: "Профиль",
      subtitle: "Личные данные",
      icon: UserRound,
    },
    ...(!isAdmin
      ? [
          {
            id: "subs" as const,
            title: "Абонементы",
            subtitle: "Статус и остаток",
            icon: Ticket,
          },
        ]
      : []),
    ...(!isAdmin
      ? [
          {
            id: "history" as const,
            title: "Посещения",
            subtitle: "История занятий",
            icon: ClipboardList,
          },
        ]
      : []),
    {
      id: "settings",
      title: "Настройки",
      subtitle: "Тема и аватар",
      icon: Settings2,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-content">
            Личный кабинет
          </h1>
          <p className="mt-1 text-sm text-muted">
            Здравствуйте, {user.first_name}!
          </p>
        </div>
        {!isAdmin && <StreakBadge stats={streak} compact />}
      </div>

      {error && (
        <AlertBanner type="error" onDismiss={() => setError("")}>
          {error}
        </AlertBanner>
      )}
      {success && (
        <AlertBanner type="success" onDismiss={() => setSuccess("")}>
          {success}
        </AlertBanner>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const active = activeCard === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCard(active ? null : c.id)}
              className={`panel flex items-start gap-3 p-4 text-left transition hover:border-accent/30 ${
                active ? "border-accent/40" : ""
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "bg-surface-2 text-muted"
                }`}
              >
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <span>
                <span className="block font-display text-base font-semibold text-content">
                  {c.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {c.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {activeCard === "info" && (
        <section className="panel flex flex-wrap items-center gap-5 p-6">
          <Avatar
            userId={user.user_id}
            name={user.first_name}
            size="lg"
            editable
          />
          <dl className="grid gap-2 text-sm sm:grid-cols-2 sm:gap-x-8">
            <div>
              <dt className="text-muted">Имя</dt>
              <dd className="font-medium text-content">{user.first_name}</dd>
            </div>
            <div>
              <dt className="text-muted">Логин</dt>
              <dd className="font-medium text-content">{user.login}</dd>
            </div>
            <div>
              <dt className="text-muted">Электронная почта</dt>
              <dd className="font-medium text-content">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Роль</dt>
              <dd className="font-medium text-content">{user.role}</dd>
            </div>
          </dl>
        </section>
      )}

      {activeCard === "settings" && (
        <section className="panel space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold text-content">
            Настройки
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-content">
                Тема оформления
              </p>
              <p className="text-xs text-muted">Сохраняется в браузере</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface-2/50 px-4 py-3">
            <Avatar
              userId={user.user_id}
              name={user.first_name}
              size="md"
              editable
            />
            <div>
              <p className="text-sm font-medium text-content">Аватар</p>
              <p className="text-xs text-muted">
                Загрузите фото или оставьте векторный аватар с инициалами.
              </p>
            </div>
          </div>
        </section>
      )}

      {!isAdmin && <StreakBadge stats={streak} />}

      {!isAdmin && (activeCard === "subs" || activeCard === "info" || activeCard === null) && (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-content">
            Мои абонементы
          </h2>
          {subs.isLoading && <p className="text-sm text-muted">Загрузка...</p>}
          {subs.isError && (
            <AlertBanner type="error">
              Не удалось загрузить абонементы
            </AlertBanner>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
              {subs.data?.subscriptions.map((s) => (
                <article
                  key={s.subscription_id}
                  className="panel p-5 transition hover:border-accent/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-content">{s.type}</h3>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        s.status_label === "Активен"
                          ? "bg-teal-DEFAULT/15 text-teal-deep"
                          : "bg-surface-2 text-muted"
                      }`}
                    >
                      {s.status_label}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-muted">
                    <div className="flex justify-between">
                      <dt>Осталось занятий</dt>
                      <dd className="font-medium text-content">
                        {s.remaining_lessons} из {s.total_lessons}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Период</dt>
                      <dd className="text-right">
                        {formatDate(s.start_date)} — {formatDate(s.end_date)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
              {subs.data?.subscriptions.length === 0 && (
                <div className="sm:col-span-2">
                  <EmptyState
                    icon={<Ticket size={22} strokeWidth={1.5} />}
                    title="Нет активных абонементов"
                    description="Обратитесь к администратору студии, чтобы оформить абонемент. Оплата в белорусских рублях (Br)."
                    actionLabel="Перейти к расписанию"
                    actionTo="/schedule"
                  />
                </div>
              )}
          </div>
        </section>
      )}

      {!isAdmin && (activeCard === "history" || activeCard === "info" || activeCard === null) && (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-content">
            Мои записи
          </h2>
          {bookings.isLoading && (
            <p className="text-sm text-muted">Загрузка...</p>
          )}

          <h3 className="mb-2 text-sm font-medium text-muted">Предстоящие</h3>
          <div className="mb-6 space-y-3">
            {upcoming.length === 0 && (
              <EmptyState
                icon={<CalendarDays size={22} strokeWidth={1.5} />}
                title="У вас пока нет активных записей"
                description="Выберите занятие в расписании и запишитесь на удобное время."
                actionLabel="Перейти к расписанию"
                actionTo="/schedule"
              />
            )}
            {upcoming.map((b) => (
              <article
                key={b.booking_id}
                className="panel flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium text-content">{b.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(b.date)} · {formatTime(b.training_time || "")} ·{" "}
                    {b.location} · {b.style_name} · {b.instructor_name}
                  </p>
                  <p className="mt-1 text-xs text-teal-deep">{b.status}</p>
                </div>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setCancelId(b.booking_id)}
                  disabled={cancel.isPending}
                >
                  Отменить запись
                </button>
              </article>
            ))}
          </div>

          <h3 className="mb-2 text-sm font-medium text-muted">
            История посещений
          </h3>
          <div className="space-y-3">
            {attendedHistory.length === 0 && past.length === 0 && (
              <EmptyState
                icon={<ClipboardList size={22} strokeWidth={1.5} />}
                title="История посещений пуста"
                description="После занятий с отметкой «Присутствовал» они появятся здесь."
                actionLabel="Перейти к расписанию"
                actionTo="/schedule"
              />
            )}
            {past.slice(0, 10).map((b) => (
              <article key={b.booking_id} className="panel p-4 opacity-90">
                <p className="font-medium text-content">{b.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatDate(b.date)} · {b.status}
                  {b.attendance_status ? ` · ${b.attendance_status}` : ""}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <ConfirmModal
        open={cancelId != null}
        title="Отмена записи"
        message="Вы уверены, что хотите отменить запись?"
        confirmLabel="Подтвердить"
        danger
        loading={cancel.isPending}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelId(null)}
      />

      <StreakCelebrateModal
        open={celebrateOpen}
        attendedCount={streak.totalAttended}
        onContinue={handleCelebrateContinue}
      />
    </div>
  );
}
