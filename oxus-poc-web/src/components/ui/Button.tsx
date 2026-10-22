import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Props = {
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  href?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed";
const sizes = { sm: "h-10 px-4 text-[15px]", md: "h-12 px-6 text-base" };
const variants = {
  primary: "bg-brand-primary text-white hover:bg-brand-content disabled:bg-disabled disabled:text-neutral-tertiary",
  secondary:
    "border border-brand-primary bg-surface text-brand-content hover:bg-success-light/40 disabled:border-disabled disabled:text-neutral-tertiary",
};

/** Button do Colmeia: pill, primary (verde cheio) ou secondary (contorno). Com href vira link. */
export function Button({ variant = "primary", size = "md", href, className = "", children, ...rest }: Props) {
  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
