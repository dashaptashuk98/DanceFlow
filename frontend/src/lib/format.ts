/** Форматирование сумм в белорусских рублях (Br) */
export function formatBr(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `${n.toLocaleString('ru-BY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} Br`;
}

export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(iso.includes('T') ? iso : `${iso}T12:00:00`).toLocaleDateString(
    'ru-RU',
    options ?? {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );
}

export function formatTime(time: string) {
  return time.slice(0, 5);
}

/** Локальная дата YYYY-MM-DD без сдвига UTC */
export function toLocalISODate(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
