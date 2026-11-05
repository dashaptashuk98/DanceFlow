import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-content transition hover:border-teal-soft/50"
      title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          isDark ? 'bg-ink-700' : 'bg-teal-DEFAULT/40'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
            isDark ? 'left-0.5' : 'left-4'
          }`}
        />
      </span>
      <span>{isDark ? 'Тёмная' : 'Светлая'}</span>
    </button>
  );
}
