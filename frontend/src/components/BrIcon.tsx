export function BrIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 24"
      fill="currentColor"
      aria-label="Br"
      className={`inline-block h-[1em] w-auto align-baseline ${className}`}
    >
      {/* Вертикальная левая черта */}
      <rect x="1" y="1" width="2.5" height="22" rx="0.5" />
      {/* Верхняя полка Б */}
      <rect x="1" y="1" width="13" height="2.5" rx="0.5" />
      {/* Верхняя дуга Б */}
      <path d="M3.5 3.5 H12 Q18.5 3.5 18.5 9 Q18.5 14 12 14 H3.5 Z" />
      {/* Нижняя дуга Д */}
      <path d="M3.5 14 H12 Q18.5 14 18.5 19.5 Q18.5 23 12 23 H3.5 Z" />
      {/* Горизонтальная перечёркивающая черта */}
      <rect x="0" y="17" width="9" height="2.2" rx="0.5" />
    </svg>
  );
}

export function BrAmount({ amount }: { amount: number | string | null | undefined }) {
  const n = Number(amount ?? 0);
  const formatted = n.toLocaleString('ru-BY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return (
    <span className="inline-flex items-baseline gap-0.5">
      {formatted}&thinsp;<BrIcon />
    </span>
  );
}
