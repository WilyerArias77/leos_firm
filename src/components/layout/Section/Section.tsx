import { cn } from "@/lib/utils/cn";
import type { SectionHeadingProps, SectionProps, SectionTone } from "./Section.types";

const TONE_CLASSES: Record<SectionTone, string> = {
  surface: "bg-surface text-ink",
  muted: "bg-surface-muted text-ink",
  navy: "bg-navy-900 text-platinum",
};

export function Section({ children, className, tone = "surface", id }: SectionProps) {
  return (
    <section id={id} className={cn("py-16 sm:py-20", TONE_CLASSES[tone], className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "surface",
  centered = false,
}: SectionHeadingProps) {
  const onNavy = tone === "navy";

  return (
    <div className={cn("max-w-2xl", centered && "mx-auto text-center")}>
      {eyebrow ? (
        <p
          className={cn(
            "text-xs font-medium tracking-widest uppercase",
            onNavy ? "text-gold" : "text-accent",
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      <h2
        className={cn(
          "mt-3 text-3xl sm:text-4xl",
          onNavy ? "text-platinum" : "text-navy-900",
        )}
      >
        {title}
      </h2>

      {description ? (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed",
            onNavy ? "text-platinum-dim" : "text-ink-muted",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
