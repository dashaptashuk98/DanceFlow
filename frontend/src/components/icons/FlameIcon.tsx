interface FlameIconProps {
  className?: string;
  animated?: boolean;
  size?: number;
}

/** Минималистичный векторный огонь (flat SVG) */
export function FlameIcon({ className = '', animated = false, size = 24 }: FlameIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`${animated ? 'flame-svg' : ''} ${className}`}
      aria-hidden="true"
    >
      <path
        className={animated ? 'flame-outer' : undefined}
        d="M12 2c.4 2.2-.3 3.8-1.6 5.2C8.8 8.8 7.5 10.6 7.5 13a4.5 4.5 0 0 0 9 0c0-2.1-.8-3.6-2-5 .7 1.4.9 2.6.6 3.8-.2.7-.7 1.3-1.4 1.6.9-.2 1.7-.8 2.1-1.7.6-1.2.7-2.6.2-4.1C14.8 4.8 13.4 3.2 12 2Z"
        fill="currentColor"
        opacity={0.9}
      />
      <path
        className={animated ? 'flame-inner' : undefined}
        d="M12 22a5.5 5.5 0 0 1-5.5-5.5c0-2.3 1.2-4 2.8-5.5.3 1.6 1.2 2.7 2.7 3.2-.4-1.5-.2-3 .7-4.4.9 1.2 1.5 2.6 1.5 4.2A4.2 4.2 0 0 1 12 22Z"
        fill="currentColor"
        opacity={0.55}
      />
    </svg>
  );
}
