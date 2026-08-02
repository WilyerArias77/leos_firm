import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type {
  ButtonLinkProps,
  ButtonProps,
  ButtonSize,
  ButtonVariant,
} from "./Button.types";

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-card font-medium transition-colors " +
  "disabled:pointer-events-none disabled:opacity-50";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-navy-200 bg-surface text-navy-900 hover:bg-surface-muted",
  ghost: "border border-platinum/30 text-platinum hover:bg-navy-700",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

function buttonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
): string {
  return cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

/** Same visual treatment as `Button`, but renders a real link (keeps a11y semantics). */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
