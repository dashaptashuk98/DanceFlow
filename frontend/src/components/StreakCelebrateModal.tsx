import { FlameIcon } from './icons/FlameIcon';

interface StreakCelebrateModalProps {
  open: boolean;
  attendedCount: number;
  onContinue: () => void;
}

function pluralizeClasses(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'занятие';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'занятия';
  return 'занятий';
}

export function StreakCelebrateModal({
  open,
  attendedCount,
  onContinue,
}: StreakCelebrateModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-celebrate-title"
    >
      <div className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]" />
      <div className="panel relative z-10 w-full max-w-sm animate-modal-in px-6 py-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent">
          <FlameIcon size={40} animated className="text-accent" />
        </div>

        <p
          id="streak-celebrate-title"
          className="font-display text-xl font-semibold tracking-tight text-content"
        >
          Вы посетили {attendedCount} {pluralizeClasses(attendedCount)}!
        </p>
        <p className="mt-2 text-sm text-muted">
          Продолжайте заниматься — серия растёт с каждым визитом.
        </p>

        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-1.5">
          <FlameIcon size={16} className="text-accent" />
          <span className="font-display text-sm font-bold text-content">{attendedCount}</span>
          <span className="text-xs text-muted">посещений</span>
        </div>

        <button type="button" className="btn-primary mt-7 w-full" onClick={onContinue}>
          Продолжить
        </button>
      </div>
    </div>
  );
}
