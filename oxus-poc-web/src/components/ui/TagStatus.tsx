import type { ReactNode } from "react";

export type Tone = "success" | "attention" | "error" | "neutral";

const tones: Record<Tone, string> = {
  success: "bg-success-light text-success-dark",
  attention: "bg-warning-light text-warning-dark",
  error: "bg-error-light text-error-dark",
  neutral: "bg-disabled text-neutral-secondary",
};

/** TagStatus do Colmeia: etiqueta pequena, caixa alta, fundo claro do tom. */
export function TagStatus({ tone, children, "data-testid": testId }: { tone: Tone; children: ReactNode; "data-testid"?: string }) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex w-fit items-center whitespace-nowrap rounded-lg px-1.5 pt-0.5 pb-px text-[10px] leading-[14px] font-black uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
