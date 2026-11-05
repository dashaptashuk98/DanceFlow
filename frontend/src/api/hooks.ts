import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Analytics,
  Booking,
  Instructor,
  Style,
  Subscription,
  Training,
  User,
} from '../types';

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: User }>('/auth/me'),
    enabled,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { login: string; password: string }) =>
      api<{ user: User; token: string; message: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      first_name: string;
      login: string;
      email: string;
      password: string;
    }) =>
      api<{ user: User; token: string; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useSchedule(params: { from?: string; to?: string; view?: string; style_id?: number | '' }) {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.view) search.set('view', params.view);
  if (params.style_id) search.set('style_id', String(params.style_id));
  const qs = search.toString();

  return useQuery({
    queryKey: ['schedule', params],
    queryFn: () =>
      api<{ trainings: Training[]; from: string; to: string }>(
        `/schedule${qs ? `?${qs}` : ''}`
      ),
  });
}

export function useStyles() {
  return useQuery({
    queryKey: ['styles'],
    queryFn: () => api<{ styles: Style[] }>('/schedule/styles'),
  });
}

export function useMyBookings(enabled = true) {
  return useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api<{ bookings: Booking[] }>('/bookings/my'),
    enabled,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { training_id: number; subscription_id: number }) =>
      api<{ booking: Booking; message: string }>('/bookings', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      qc.invalidateQueries({ queryKey: ['my-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) =>
      api<{ booking: Booking; message: string }>(`/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      qc.invalidateQueries({ queryKey: ['training-bookings'] });
    },
  });
}

export function useMySubscriptions(enabled = true) {
  return useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => api<{ subscriptions: Subscription[] }>('/subscriptions/my'),
    enabled,
  });
}

export function useAllSubscriptions(enabled = false) {
  return useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: () => api<{ subscriptions: Subscription[] }>('/subscriptions'),
    enabled,
  });
}

export function useUsers(enabled = false) {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api<{ users: User[] }>('/users'),
    enabled,
  });
}

export function useInstructors() {
  return useQuery({
    queryKey: ['instructors'],
    queryFn: () => api<{ instructors: Instructor[] }>('/instructors'),
  });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ training: Training; message: string }>('/schedule', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });
}

export function useUpdateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      api<{ training: Training; message: string }>(`/schedule/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });
}

export function useDeleteTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api<{ message: string }>(`/schedule/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ subscription: Subscription; message: string }>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['my-subscriptions'] });
    },
  });
}

export function useRenewSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      api<{ subscription: Subscription; message: string }>(`/subscriptions/${id}/renew`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['my-subscriptions'] });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api<{ subscription: Subscription; message: string }>(`/subscriptions/${id}/cancel`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['my-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useTrainingBookings(trainingId: number | null) {
  return useQuery({
    queryKey: ['training-bookings', trainingId],
    queryFn: () =>
      api<{ bookings: Booking[] }>(`/bookings/training/${trainingId}`),
    enabled: trainingId != null,
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { booking_id: number; status: 'Присутствовал' | 'Пропуск' }) =>
      api<{ message: string }>('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-bookings'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['all-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      qc.invalidateQueries({ queryKey: ['my-subscriptions'] });
    },
  });
}

export function useAnalytics(enabled = false) {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => api<Analytics>('/attendance/analytics'),
    enabled,
  });
}
