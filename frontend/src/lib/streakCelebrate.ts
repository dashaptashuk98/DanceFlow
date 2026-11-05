const SEEN_KEY = 'danceflow_streak_seen_level';

/** Возвращает true если fireLevel новый (ещё не показывали) и сохраняет его */
export function shouldShowStreakCelebrate(fireLevel: number): boolean {
  if (fireLevel <= 0) return false;
  try {
    const seen = Number(localStorage.getItem(SEEN_KEY) ?? -1);
    return fireLevel > seen;
  } catch {
    return false;
  }
}

export function dismissStreakCelebrate(fireLevel: number) {
  try {
    localStorage.setItem(SEEN_KEY, String(fireLevel));
  } catch {
    /* ignore */
  }
}

export function clearStreakCelebrate() {
  try {
    localStorage.removeItem(SEEN_KEY);
  } catch {
    /* ignore */
  }
}
