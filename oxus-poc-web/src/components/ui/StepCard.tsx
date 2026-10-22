import { type ReactNode, useId } from "react";

type Props = { step: number; title: string; muted?: boolean; aside?: ReactNode; children: ReactNode };

/** Card de etapa do fluxo: círculo numerado verde, título e, à direita, um complemento opcional. */
export function StepCard({ step, title, muted = false, aside, children }: Props) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={`flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-6 transition-opacity ${muted ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white">
            {step}
          </span>
          <h2 id={titleId} className="text-lg font-semibold text-neutral-default">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
