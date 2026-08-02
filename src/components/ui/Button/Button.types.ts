import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export type ButtonProps = BaseProps & ComponentPropsWithoutRef<"button">;

export type ButtonLinkProps = BaseProps &
  Omit<ComponentPropsWithoutRef<"a">, "href"> & {
    href: string;
  };
