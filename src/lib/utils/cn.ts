/**
 * Joins conditional class names, dropping falsy values.
 *
 * Kept dependency-free on purpose (Mandamiento I: no unrequested packages).
 * If Tailwind class conflicts ever become a real problem, `tailwind-merge`
 * can be proposed then — with authorization.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
