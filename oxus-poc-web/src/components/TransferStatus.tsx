"use client";

import { useState } from "react";
import {
  STAGE_LABELS,
  STATUS_LABELS,
  type Transfer,
  formatMoney,
  outcomeFeedback,
  pixPending,
  stageTone,
  transferTone,
} from "@/lib/cambio";
import { Button, Feedback, StepCard, TagStatus } from "@/components/ui";

const indicator = {
  done: "bg-brand-content",
  active: "border-2 border-attention",
  failed: "border-2 border-negative",
  waiting: "border-2 border-neutral-tertiary",
};

/** Etapa 4: status da transferencia, PIX enquanto o pagamento nao entra, timeline e o desfecho. */
export default function TransferStatus({
  transfer,
  holderName,
  onRestart,
}: {
  transfer: Transfer;
  holderName: string;
  onRestart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pix = transfer.paymentInstructions?.pixCopyPaste;
  const outcome = outcomeFeedback(transfer, holderName);

  async function copy() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix);
    setCopied(true);
  }

  return (
    <StepCard
      step={4}
      title="Transferência"
      aside={
        <TagStatus data-testid="transfer-status" tone={transferTone(transfer.status)}>
          {STATUS_LABELS[transfer.status] ?? transfer.status}
        </TagStatus>
      }
    >
      <p className="font-mono text-xs break-all text-neutral-secondary">{transfer.id}</p>

      {pix && pixPending(transfer) && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">PIX copia e cola</span>
          <textarea
            readOnly
            rows={3}
            value={pix}
            aria-label="PIX copia e cola"
            className="resize-none rounded-lg border border-border-subtle bg-surface-subtle p-3 font-mono text-xs leading-[18px] break-all text-neutral-default"
          />
          <Button variant="secondary" size="sm" className="self-start" onClick={copy}>
            {copied ? "Copiado" : "Copiar código"}
          </Button>
        </div>
      )}

      <ol className="flex flex-col">
        {transfer.stages.map((s) => (
          <li
            key={s.stage}
            className="grid grid-cols-[24px_1fr_auto] items-center gap-2 border-b border-border-subtle py-3 last:border-b-0"
          >
            <span aria-hidden className={`size-3 rounded-full ${indicator[stageTone(s.status)]}`} />
            <span className="text-sm">
              {STAGE_LABELS[s.stage] ?? s.stage}
              {s.reference && <span className="block font-mono text-[11px] text-neutral-secondary">{s.reference}</span>}
            </span>
            <span className="text-right text-sm">{STATUS_LABELS[s.status] ?? s.status}</span>
          </li>
        ))}
      </ol>

      {transfer.failureReason && <p className="text-sm text-negative">Motivo: {transfer.failureReason}</p>}
      {transfer.refund && (
        <p className="text-sm">
          Reembolso {STATUS_LABELS[transfer.refund.status] ?? transfer.refund.status}:{" "}
          {formatMoney(transfer.refund.amount, transfer.refund.currency)} ({transfer.refund.reason})
        </p>
      )}

      {outcome && (
        <>
          <Feedback variant={outcome.variant} title={outcome.title} description={outcome.description} />
          <Button variant="secondary" size="sm" className="self-start" onClick={onRestart}>
            Nova operação
          </Button>
        </>
      )}
    </StepCard>
  );
}
