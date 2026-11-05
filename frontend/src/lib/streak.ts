import type { Booking } from '../types';

export interface StreakStats {
  totalAttended: number;
  /** Серия подряд посещённых занятий (по датам, от ближайшей) */
  streak: number;
  /** Уровень «огня»: +1 за каждые 2 посещения */
  fireLevel: number;
  nextMilestone: number;
}

export function computeStreakStats(bookings: Booking[] | undefined): StreakStats {
  const attended = (bookings ?? [])
    .filter((b) => b.attendance_status === 'Присутствовал')
    .map((b) => b.date)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const totalAttended = attended.length;
  const uniqueDates = [...new Set(attended)];

  let streak = 0;
  if (uniqueDates.length > 0) {
    streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const cur = new Date(`${uniqueDates[i]}T12:00:00`);
      const prev = new Date(`${uniqueDates[i + 1]}T12:00:00`);
      const diffDays = Math.round(
        (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays <= 7) {
        streak += 1;
      } else {
        break;
      }
    }
  }

  const fireLevel = Math.floor(totalAttended / 2);
  const nextMilestone = (fireLevel + 1) * 2;

  return { totalAttended, streak, fireLevel, nextMilestone };
}
