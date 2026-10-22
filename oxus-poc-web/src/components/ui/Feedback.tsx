type Variant = "success" | "warning" | "error";

const icons: Record<Variant, { glyph: string; bg: string }> = {
  success: { glyph: "✓", bg: "bg-success-icon" },
  warning: { glyph: "!", bg: "bg-warning-icon" },
  error: { glyph: "✕", bg: "bg-error-icon" },
};

/** Feedback do Colmeia, tamanho md: ícone redondo de 48px, título e descrição centralizados. */
export function Feedback({ variant, title, description }: { variant: Variant; title: string; description?: string }) {
  const { glyph, bg } = icons[variant];
  return (
    <div
      role={variant === "success" ? "status" : "alert"}
      className="flex w-full flex-col items-center gap-4 rounded-xl bg-surface px-4 py-6 text-center"
    >
      <span aria-hidden className={`flex size-12 shrink-0 items-center justify-center rounded-full text-[19px] text-white ${bg}`}>
        {glyph}
      </span>
      <div className="flex flex-col items-center gap-4 self-stretch">
        <span className="text-base leading-[22px] font-semibold text-neutral-default">{title}</span>
        {description && <span className="text-base leading-[22px] text-neutral-secondary">{description}</span>}
      </div>
    </div>
  );
}
