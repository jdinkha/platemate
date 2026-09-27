import Link from "next/link";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <span
      className={`grid place-items-center rounded-[10px] bg-accent text-accent-foreground shadow-sm ring-1 ring-black/10 ${className}`}
    >
      {/* A weight plate seen head-on */}
      <svg viewBox="0 0 24 24" className="size-[62%]" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <circle cx="12" cy="12" r="1.75" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <LogoMark className="size-8 transition-transform duration-500 group-hover:rotate-90" />
      <span className="text-lg font-semibold tracking-tight">PlateMate</span>
    </Link>
  );
}
