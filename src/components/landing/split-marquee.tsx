const splits = [
  "Push / Pull / Legs",
  "Upper / Lower",
  "Full Body",
  "Bro Split",
  "Arnold Split",
  "PHUL",
  "PHAT",
  "Push / Pull",
  "Torso / Limbs",
];

export function SplitMarquee() {
  return (
    <section id="splits" className="scroll-mt-16 border-y border-border bg-card/50 py-10">
      <h2 className="px-5 text-center font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Built around the splits lifters swear by
      </h2>
      <div className="relative mt-7 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        {/* The list is rendered twice and shifted by half its width for a seamless loop.
            Trailing padding equals the gap so both halves are exactly the same width. */}
        <ul className="flex w-max gap-3 pr-3 motion-safe:animate-marquee hover:[animation-play-state:paused]">
          {[...splits, ...splits].map((split, i) => (
            <li
              key={i}
              aria-hidden={i >= splits.length || undefined}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium"
            >
              <span className="size-1.5 rounded-full bg-accent-ink" />
              {split}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
