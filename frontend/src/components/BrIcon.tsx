import { formatBr } from '../lib/format';

export function BrIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 310 380"
      fill="currentColor"
      role="img"
      aria-label="Белорусский рубль"
      focusable="false"
      className={`inline-block h-[1em] w-auto shrink-0 align-[-0.125em] ${className}`}
    >
      <path
        fillRule="evenodd"
        d="M54 0H266V42H96V156H184C256 156 310 202 310 268C310 334 260 380 192 380H54V290H0V248H54V0ZM96 198V248H192V290H96V338H190C236 338 268 310 268 268C268 226 235 198 190 198H96Z"
      />
    </svg>
  );
}

export function BrAmount({ amount }: { amount: number | string | null | undefined }) {
  return (
    <span className="whitespace-nowrap">
      {formatBr(amount)}&thinsp;<BrIcon />
    </span>
  );
}
