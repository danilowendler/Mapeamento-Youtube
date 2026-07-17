import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

/**
 * Campo de texto do design system: 48px, raio sm, hairline
 * (DESIGN-ferrari.md v2 · text-input-on-dark).
 */
export function Input({ label, error, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-xxs">
      <label htmlFor={id} className="text-caption-upper uppercase text-muted-soft">
        {label}
      </label>
      <input
        id={id}
        className="h-[48px] rounded-sm border border-hairline bg-canvas px-xs text-body-md text-ink placeholder:text-muted"
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <p role="alert" className="text-body-sm text-warning">
          {error}
        </p>
      ) : null}
    </div>
  );
}
