import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
};

/**
 * Botão do design system: cantos retos, label uppercase com tracking,
 * 48px de altura (DESIGN-ferrari.md · button-primary / button-outline).
 */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex h-[48px] cursor-pointer items-center justify-center px-md text-button-label uppercase transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-on-primary active:bg-primary-active",
    outline:
      "border border-ink bg-transparent text-ink active:bg-canvas-elevated",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
