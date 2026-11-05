import { CalendarOff, ClipboardCheck, UserX } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ApiError } from '../api/client';
import {
  useAllSubscriptions,
  useAnalytics,
  useCancelSubscription,
  useCreateSubscription,
  useCreateTraining,
  useDeleteTraining,
  useInstructors,
  useMarkAttendance,
  useRenewSubscription,
  useSchedule,
  useStyles,
  useTrainingBookings,
  useUpdateTraining,
  useUsers,
} from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { BrAmount, BrIcon } from '../components/BrIcon';
import { AlertBanner, ConfirmModal, Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toLocalISODate } from '../lib/format';
import type { Subscription, Training } from '../types';

type Tab = 'schedule' | 'subscriptions' | 'attendance' | 'analytics';

const emptyTraining = {
  title: '',
  style_id: '',
  instructor_id: '',
  date: '',
  time: '',
  location: 'Зал 1',
  level: 'Начинающий',
};

const CHART_COLORS = ['#c45c26', '#1f6f6a', '#3d9a93', '#e8a078', '#8f3d12', '#243338'];

export function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const chartText = theme === 'dark' ? '#d0ddd9' : '#243338';
  const chartGrid = theme === 'dark' ? 'rgba(208,221,217,0.15)' : 'rgba(36,51,56,0.12)';

  const [tab, setTab] = useState<Tab>('schedule');
  const [subscriptionSort, setSubscriptionSort] = useState<'asc' | 'desc'>('asc');
  const [form, setForm] = useState(emptyTraining);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [flash, setFlash] = useState('');
  const [flashType, setFlashType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [cancelSubId, setCancelSubId] = useState<number | null>(null);
  const [renewSub, setRenewSub] = useState<Subscription | null>(null);
  const [renewForm, setRenewForm] = useState({
    end_date: '',
    amount: '120',
    total_lessons: '8',
  });

  const [subForm, setSubForm] = useState({
    user_id: '',
    type: 'Абонемент на 8 занятий',
    total_lessons: '8',
    start_date: toLocalISODate(),
    end_date: '',
    amount: '120',
  });

  const today = new Date();
  const from = toLocalISODate(new Date(today.getFullYear(), today.getMonth(), 1));
  const to = toLocalISODate(new Date(today.getFullYear(), today.getMonth() + 2, 0));

  const schedule = useSchedule({ from, to });
  const styles = useStyles();
  const instructors = useInstructors();
  const users = useUsers(isAuthenticated && user?.role === 'Администратор');
  const subscriptions = useAllSubscriptions(tab === 'subscriptions');
  const analytics = useAnalytics(tab === 'analytics');
  const sortedSubscriptions = useMemo(() => {
    const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });
    const direction = subscriptionSort === 'asc' ? 1 : -1;
    return [...(subscriptions.data?.subscriptions ?? [])].sort((a, b) => {
      const nameOrder = collator.compare(a.first_name ?? '', b.first_name ?? '');
      const loginOrder = collator.compare(a.login ?? '', b.login ?? '');
      return direction * (nameOrder || loginOrder) || b.subscription_id - a.subscription_id;
    });
  }, [subscriptions.data?.subscriptions, subscriptionSort]);
  const trainingBookings = useTrainingBookings(selectedTrainingId);

  const createTraining = useCreateTraining();
  const updateTraining = useUpdateTraining();
  const deleteTraining = useDeleteTraining();
  const createSub = useCreateSubscription();
  const renewMutation = useRenewSubscription();
  const cancelSubMutation = useCancelSubscription();
  const markAttendance = useMarkAttendance();

  const styleChartData = useMemo(
    () =>
      (analytics.data?.byStyle ?? []).map((r) => ({
        name: r.style_name,
        value: r.visits,
      })),
    [analytics.data]
  );

  const trendData = useMemo(
    () =>
      (analytics.data?.attendanceTrend ?? []).map((r) => ({
        date: r.date.slice(5),
        посещения: r.visits,
      })),
    [analytics.data]
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'Администратор') return <Navigate to="/dashboard" replace />;

  function show(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    setFlash(msg);
    setFlashType(type);
  }

  async function onSubmitTraining(e: FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title,
      style_id: Number(form.style_id),
      instructor_id: Number(form.instructor_id),
      date: form.date,
      time: form.time,
      location: form.location,
      level: form.level,
    };

    try {
      if (editingId) {
        const res = await updateTraining.mutateAsync({ id: editingId, ...payload });
        show(res.message);
      } else {
        const res = await createTraining.mutateAsync(payload);
        show(res.message);
      }
      setForm(emptyTraining);
      setEditingId(null);
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Ошибка сохранения занятия', 'error');
    }
  }

  function startEdit(t: Training) {
    setEditingId(t.training_id);
    setForm({
      title: t.title,
      style_id: String(t.style_id),
      instructor_id: String(t.instructor_id),
      date: t.date,
      time: t.time.slice(0, 5),
      location: t.location,
      level: t.level,
    });
    setTab('schedule');
  }

  async function confirmDelete() {
    if (deleteId == null) return;
    try {
      const res = await deleteTraining.mutateAsync(deleteId);
      show(res.message);
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Не удалось удалить', 'error');
    } finally {
      setDeleteId(null);
    }
  }

  async function onCreateSub(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await createSub.mutateAsync({
        user_id: Number(subForm.user_id),
        type: subForm.type,
        total_lessons: Number(subForm.total_lessons),
        start_date: subForm.start_date,
        end_date: subForm.end_date,
        amount: Number(subForm.amount),
      });
      show(res.message);
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Не удалось выдать абонемент', 'error');
    }
  }

  function openRenew(s: Subscription) {
    setRenewSub(s);
    setRenewForm({
      end_date: s.end_date,
      amount: '120',
      total_lessons: String(Math.min(s.total_lessons, 999) || 8),
    });
  }

  async function confirmRenew() {
    if (!renewSub) return;
    try {
      const res = await renewMutation.mutateAsync({
        id: renewSub.subscription_id,
        end_date: renewForm.end_date,
        amount: renewForm.amount ? Number(renewForm.amount) : undefined,
        total_lessons: Number(renewForm.total_lessons),
      });
      show(res.message);
      setRenewSub(null);
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Не удалось продлить', 'error');
    }
  }

  async function confirmCancelSub() {
    if (cancelSubId == null) return;
    try {
      const res = await cancelSubMutation.mutateAsync(cancelSubId);
      show(res.message);
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Не удалось отменить абонемент', 'error');
    } finally {
      setCancelSubId(null);
    }
  }

  async function onMark(bookingId: number, status: 'Присутствовал' | 'Пропуск') {
    try {
      const res = await markAttendance.mutateAsync({ booking_id: bookingId, status });
      show(res.message);
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Ошибка отметки', 'error');
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'schedule', label: 'Управление расписанием' },
    { id: 'subscriptions', label: 'Абонементы' },
    { id: 'attendance', label: 'Посещаемость' },
    { id: 'analytics', label: 'Аналитика' },
  ];

  const activeSubsCount =
    subscriptions.data?.subscriptions.filter((s) => s.status_label === 'Активен').length ??
    analytics.data?.overview.active_subscriptions ??
    0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-content">Админ-панель</h1>
        <p className="mt-1 text-sm text-muted">Управление студией DanceFlow · валюта: <BrIcon /></p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'btn-primary !py-2' : 'btn-secondary !py-2'}
          >
            {t.label}
          </button>
        ))}
      </div>

      {flash && (
        <AlertBanner type={flashType} onDismiss={() => setFlash('')}>
          {flash}
        </AlertBanner>
      )}

      {tab === 'schedule' && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={onSubmitTraining} className="panel h-fit space-y-3 p-5">
            <h2 className="font-display text-lg font-semibold text-content">
              {editingId ? 'Редактировать занятие' : 'Добавить занятие'}
            </h2>
            <div>
              <label className="label-field">Название занятия</label>
              <input
                className="input-field"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label-field">Направление</label>
              <select
                className="input-field"
                value={form.style_id}
                onChange={(e) => setForm({ ...form, style_id: e.target.value })}
                required
              >
                <option value="">Выберите</option>
                {styles.data?.styles.map((s) => (
                  <option key={s.style_id} value={s.style_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Преподаватель</label>
              <select
                className="input-field"
                value={form.instructor_id}
                onChange={(e) => setForm({ ...form, instructor_id: e.target.value })}
                required
              >
                <option value="">Выберите</option>
                {instructors.data?.instructors.map((i) => (
                  <option key={i.instructor_id} value={i.instructor_id}>
                    {i.first_name} — {i.specialization}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-field">Дата</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label-field">Время</label>
                <input
                  type="time"
                  className="input-field"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label-field">Зал</label>
              <input
                className="input-field"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label-field">Уровень</label>
              <select
                className="input-field"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                <option>Начинающий</option>
                <option>Средний</option>
                <option>Продвинутый</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary flex-1">
                {editingId ? 'Сохранить' : 'Добавить'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyTraining);
                  }}
                >
                  Отмена
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {(schedule.data?.trainings.length ?? 0) === 0 && !schedule.isLoading && (
              <EmptyState
                icon={<CalendarOff size={22} strokeWidth={1.5} />}
                title="Расписание пусто"
                description="Добавьте первое занятие с помощью формы слева."
              />
            )}
            {schedule.data?.trainings.map((t) => (
              <article
                key={t.training_id}
                className="panel flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium text-content">
                    {t.date} {t.time.slice(0, 5)} — {t.title}
                  </p>
                  <p className="text-sm text-muted">
                    {t.style_name} · {t.instructor_name} · {t.location} · {t.level}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary !py-2"
                    onClick={() => startEdit(t)}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setDeleteId(t.training_id)}
                  >
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={onCreateSub} className="panel h-fit space-y-3 p-5">
            <h2 className="font-display text-lg font-semibold text-content">Выдать абонемент</h2>
            <div>
              <label className="label-field">Студент</label>
              <select
                className="input-field"
                value={subForm.user_id}
                onChange={(e) => setSubForm({ ...subForm, user_id: e.target.value })}
                required
              >
                <option value="">Выберите</option>
                {users.data?.users
                  .filter((u) => u.role === 'Студент')
                  .map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.first_name} ({u.login})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label-field">Тип</label>
              <select
                className="input-field"
                value={subForm.type}
                onChange={(e) => {
                  const type = e.target.value;
                  setSubForm({
                    ...subForm,
                    type,
                    total_lessons: type === 'Безлимит' ? '999' : type.includes('4') ? '4' : '8',
                    amount: type === 'Безлимит' ? '220' : type.includes('4') ? '70' : '120',
                  });
                }}
              >
                <option>Абонемент на 8 занятий</option>
                <option>Абонемент на 4 занятия</option>
                <option>Безлимит</option>
              </select>
            </div>
            <div>
              <label className="label-field">Количество занятий</label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={subForm.total_lessons}
                onChange={(e) => setSubForm({ ...subForm, total_lessons: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-field">Начало</label>
                <input
                  type="date"
                  className="input-field"
                  value={subForm.start_date}
                  onChange={(e) => setSubForm({ ...subForm, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label-field">Окончание</label>
                <input
                  type="date"
                  className="input-field"
                  value={subForm.end_date}
                  onChange={(e) => setSubForm({ ...subForm, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label-field">Сумма оплаты (<BrIcon />)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input-field"
                value={subForm.amount}
                onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })}
                title="Белорусские рубли"
              />
              <p className="mt-1 text-xs text-muted">Валюта: белорусские рубли (<BrIcon />)</p>
            </div>
            <button type="submit" className="btn-primary w-full">
              Выдать абонемент
            </button>
          </form>

          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-content">
                Существующие абонементы
              </h2>
              <div>
                <label className="label-field" htmlFor="subscription-sort">
                  По имени студента
                </label>
                <select
                  id="subscription-sort"
                  className="input-field"
                  value={subscriptionSort}
                  onChange={(event) => setSubscriptionSort(event.target.value as 'asc' | 'desc')}
                >
                  <option value="asc">А–Я</option>
                  <option value="desc">Я–А</option>
                </select>
              </div>
            </div>
            {sortedSubscriptions.map((s) => (
              <article
                key={s.subscription_id}
                className="panel flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium text-content">
                    {s.first_name} ({s.login}) — {s.type}
                  </p>
                  <p className="text-sm text-muted">
                    {s.status_label} · осталось {s.remaining_lessons} · до {s.end_date}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary !py-2"
                    onClick={() => openRenew(s)}
                  >
                    Продлить
                  </button>
                  {s.status_label === 'Активен' && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => setCancelSubId(s.subscription_id)}
                    >
                      Отменить
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-content">Выберите занятие</h2>
            {schedule.data?.trainings.map((t) => (
              <button
                key={t.training_id}
                type="button"
                onClick={() => setSelectedTrainingId(t.training_id)}
                className={`panel w-full p-4 text-left transition ${
                  selectedTrainingId === t.training_id
                    ? 'border-accent/40'
                    : 'hover:border-accent/25'
                }`}
              >
                <p className="font-medium text-content">
                  {t.date} {t.time.slice(0, 5)} — {t.title}
                </p>
                <p className="text-sm text-muted">
                  {t.instructor_name} · {t.location}
                </p>
              </button>
            ))}
          </div>
          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-content">Участники</h2>
            {!selectedTrainingId && (
              <EmptyState
                icon={<ClipboardCheck size={22} strokeWidth={1.5} />}
                title="Занятие не выбрано"
                description="Выберите занятие слева, чтобы отметить посещаемость."
              />
            )}
            {trainingBookings.isLoading && <p className="text-sm text-muted">Загрузка...</p>}
            <div className="space-y-3">
              {trainingBookings.data?.bookings.map((b) => (
                <article key={b.booking_id} className="panel p-4">
                  <p className="font-medium text-content">
                    {b.first_name} ({b.login})
                  </p>
                  <p className="text-sm text-muted">
                    {b.attendance_status
                      ? `Статус: ${b.attendance_status}`
                      : 'Посещаемость не отмечена'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary !py-2"
                      onClick={() => onMark(b.booking_id, 'Присутствовал')}
                    >
                      Отметить присутствие
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !py-2"
                      onClick={() => onMark(b.booking_id, 'Пропуск')}
                    >
                      Пропуск
                    </button>
                  </div>
                </article>
              ))}
              {selectedTrainingId && trainingBookings.data?.bookings.length === 0 && (
                <EmptyState
                  icon={<UserX size={22} strokeWidth={1.5} />}
                  title="На это занятие никто не записан"
                  description="Студенты смогут записаться через раздел «Расписание»."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-6">
          {analytics.isLoading && <p className="text-sm text-muted">Загрузка аналитики...</p>}
          {analytics.data && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['Студенты', analytics.data.overview.students_count],
                  ['Записи', analytics.data.overview.confirmed_bookings],
                  ['Посещения', analytics.data.overview.attended],
                  ['Активные абонементы', analytics.data.overview.active_subscriptions ?? activeSubsCount],
                  ['Выручка', <BrAmount amount={analytics.data.overview.total_payments} />],
                ].map(([label, value]) => (
                  <div key={String(label)} className="panel p-5">
                    <p className="text-sm text-muted">{label}</p>
                    <p className="mt-1 font-display text-2xl font-bold text-content">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="panel p-5">
                  <h3 className="mb-4 font-display text-lg font-semibold text-content">
                    Динамика посещаемости
                  </h3>
                  {trendData.length === 0 ? (
                    <p className="text-sm text-muted">Пока нет данных для графика</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                          <XAxis dataKey="date" stroke={chartText} fontSize={12} />
                          <YAxis stroke={chartText} fontSize={12} allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="посещения"
                            stroke="#c45c26"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                <section className="panel p-5">
                  <h3 className="mb-4 font-display text-lg font-semibold text-content">
                    Популярность направлений
                  </h3>
                  {styleChartData.length === 0 ? (
                    <p className="text-sm text-muted">Пока нет данных для диаграммы</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={styleChartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={3}
                            label
                          >
                            {styleChartData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>
              </div>

              <section className="panel p-5">
                <h3 className="mb-4 font-display text-lg font-semibold text-content">
                  Топ клиентов и выручка
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(analytics.data.topClients ?? []).map((c) => ({
                          name: c.first_name,
                          посещения: c.visits,
                        }))}
                      >
                        <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke={chartText} fontSize={12} />
                        <YAxis stroke={chartText} fontSize={12} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="посещения" fill="#1f6f6a" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between border-b border-line py-2 text-muted">
                      <span>Суммарная выручка</span>
                      <span className="font-semibold text-content">
                        <BrAmount amount={analytics.data.overview.total_payments} />
                      </span>
                    </li>
                    <li className="flex justify-between border-b border-line py-2 text-muted">
                      <span>Активные абонементы</span>
                      <span className="font-semibold text-content">
                        {analytics.data.overview.active_subscriptions ?? activeSubsCount}
                      </span>
                    </li>
                    {(analytics.data.revenueByMonth ?? []).map((row) => (
                      <li
                        key={row.month}
                        className="flex justify-between border-b border-line py-2 text-muted"
                      >
                        <span>{row.month}</span>
                        <span className="text-content"><BrAmount amount={row.amount} /></span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      <ConfirmModal
        open={deleteId != null}
        title="Удаление занятия"
        message="Вы уверены, что хотите удалить занятие из расписания?"
        confirmLabel="Подтвердить"
        danger
        loading={deleteTraining.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal
        open={cancelSubId != null}
        title="Отмена абонемента"
        message="Вы уверены, что хотите отменить абонемент? Он станет неактивным."
        confirmLabel="Подтвердить"
        danger
        loading={cancelSubMutation.isPending}
        onConfirm={confirmCancelSub}
        onCancel={() => setCancelSubId(null)}
      />

      <Modal
        open={!!renewSub}
        onClose={() => setRenewSub(null)}
        title="Продление абонемента"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setRenewSub(null)}>
              Отмена
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={renewMutation.isPending}
              onClick={confirmRenew}
            >
              {renewMutation.isPending ? 'Сохранение...' : 'Подтвердить'}
            </button>
          </>
        }
      >
        {renewSub && (
          <div className="space-y-3">
            <p className="text-content/90">
              {renewSub.first_name} ({renewSub.login}) — {renewSub.type}
            </p>
            <div>
              <label className="label-field">Новая дата окончания</label>
              <input
                type="date"
                className="input-field"
                value={renewForm.end_date}
                onChange={(e) => setRenewForm({ ...renewForm, end_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label-field">Количество занятий</label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={renewForm.total_lessons}
                onChange={(e) => setRenewForm({ ...renewForm, total_lessons: e.target.value })}
              />
            </div>
            <div>
              <label className="label-field">Сумма оплаты (<BrIcon />)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input-field"
                value={renewForm.amount}
                onChange={(e) => setRenewForm({ ...renewForm, amount: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted">Белорусские рубли (<BrIcon />)</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
