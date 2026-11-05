import type { StreakStats } from '../lib/streak';
import { FlameIcon } from './icons/FlameIcon';

interface StreakBadgeProps {
  stats: StreakStats;
  compact?: boolean;
}

export function StreakBadge({ stats, compact = false }: StreakBadgeProps) {
  const { totalAttended, streak, nextMilestone } = stats;
  const active = totalAttended > 0;

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1"
        title={`Посещено: ${totalAttended}. Серия: ${streak}`}
      >
        <FlameIcon
          size={14}
          className={active ? 'text-accent' : 'text-muted opacity-50'}
        />
        <span className="font-display text-xs font-semibold tabular-nums text-content">
          {totalAttended}
        </span>
      </div>
    );
  }

  return (
    <article className="panel flex items-center gap-4 p-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line ${
          active ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-muted'
        }`}
      >
        <FlameIcon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted">Серия посещений</p>
        <p className="mt-0.5 font-display text-lg font-semibold text-content">
          {totalAttended}{' '}
          <span className="text-sm font-medium text-muted">занятий</span>
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Серия {streak}
          {active && (
            <>
              {' '}
              · до уровня ещё {Math.max(0, nextMilestone - totalAttended)}
            </>
          )}
        </p>
      </div>
    </article>
  );
}
