import { type SelectHTMLAttributes, useId } from "react";

type Props = { label: string } & SelectHTMLAttributes<HTMLSelectElement>;

/** Select no visual do Colmeia (o DS ainda não tem um; trocar pelo oficial quando houver). */
export function Select({ label, className = "", id, children, ...rest }: Props) {
  const generated = useId();
  const selectId = id ?? generated;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={selectId} className="text-sm text-neutral-secondary">
        {label}
      </label>
      <select
        id={selectId}
        className="h-12 rounded-lg border border-border-default bg-surface px-3 text-base text-neutral-default outline-none focus:border-brand-primary disabled:bg-surface-subtle disabled:text-neutral-secondary"
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
