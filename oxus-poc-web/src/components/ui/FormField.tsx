import { type InputHTMLAttributes, useId } from "react";

type Props = {
  label: string;
  prefix?: string;
  helper?: string;
  error?: string | null;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "prefix">;

/**
 * FormField do Colmeia: campo de 56px com label flutuante, prefixo e
 * mensagem de apoio que vira erro. O label sobe quando há foco ou valor.
 */
export function FormField({ label, prefix, helper, error, className = "", id, ...rest }: Props) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className={`flex w-full flex-col gap-1 ${className}`}>
      <div
        className={`flex h-14 items-end gap-2 rounded-lg border px-3.5 transition-colors focus-within:border-brand-primary ${
          error ? "border-negative focus-within:border-negative" : "border-border-default"
        } ${rest.disabled ? "bg-surface-subtle" : "bg-surface"}`}
      >
        {prefix && <span className="pb-2.5 text-base text-neutral-secondary">{prefix}</span>}
        <div className="relative h-full flex-1">
          <input
            id={inputId}
            className="peer absolute bottom-1.5 left-0 w-full border-0 bg-transparent p-0 text-base text-neutral-default outline-none placeholder:text-transparent focus:placeholder:text-neutral-tertiary"
            {...rest}
            // Sem placeholder o :placeholder-shown nao dispara e o label nao desce.
            placeholder={rest.placeholder ?? " "}
          />
          <label
            htmlFor={inputId}
            className={`pointer-events-none absolute left-0 top-1.5 text-xs transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-xs ${
              error ? "text-negative" : "text-neutral-secondary"
            }`}
          >
            {label}
          </label>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-negative">
          {error}
        </p>
      ) : (
        helper && <p className="text-xs text-neutral-secondary">{helper}</p>
      )}
    </div>
  );
}
