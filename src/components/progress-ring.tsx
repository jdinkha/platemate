export function ProgressRing({
  done,
  total,
  size = "size-14",
}: {
  done: number;
  total: number;
  size?: string;
}) {
  const radius = 23;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(done / total, 1) : 0;

  return (
    <div className={`relative grid shrink-0 place-items-center ${size}`}>
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={radius} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="stroke-accent-ink transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="font-mono text-[11px] font-semibold">
        {done}/{total}
      </span>
    </div>
  );
}
