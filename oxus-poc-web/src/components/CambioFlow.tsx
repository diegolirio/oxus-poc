"use client";

import { useEffect, useState } from "react";
import {
  type Customer,
  FINAL_STATUSES,
  PURPOSES,
  type Quote,
  type Receiver,
  STAGE_LABELS,
  STATUS_LABELS,
  type Transfer,
  errorMessage,
  formatMoney,
  parseReais,
} from "@/lib/cambio";

const POLL_MS = 3000;

function isEligible(customer: Customer) {
  return customer.status === "ACTIVE" && customer.kyc.status === "ATTESTED";
}

/**
 * Tela de teste da remessa BRL -> exterior no sandbox da OXUS: cliente e
 * conta, cotacao, confirmacao com o PIX copia e cola e acompanhamento das
 * etapas ate um status final.
 */
export default function CambioFlow() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [receivers, setReceivers] = useState<Receiver[] | null>(null);
  const [receiverId, setReceiverId] = useState("");
  const [amountText, setAmountText] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  // Uma por cotacao: confirmar duas vezes a mesma cotacao nao cria duas transferencias.
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [purpose, setPurpose] = useState("OWN_ACCOUNT");
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Relogio da contagem regressiva. Comeca em 0 e so passa a valer quando
  // chega uma cotacao: Date.now() aqui rodaria no prerender do servidor.
  const [now, setNow] = useState(0);

  useEffect(() => {
    fetch("/api/customers")
      .then(async (r) => {
        if (!r.ok) throw new Error(await errorMessage(r));
        return r.json();
      })
      .then((body) => setCustomers(body.customers))
      .catch((e: Error) => {
        setCustomers([]);
        setError(e.message);
      });
  }, []);

  // Contagem regressiva da validade da cotacao, so enquanto ela espera confirmacao.
  useEffect(() => {
    if (!quote || transfer) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [quote, transfer]);

  // Consulta a transferencia ate um status final.
  useEffect(() => {
    if (!transfer || FINAL_STATUSES.includes(transfer.status)) return;
    const timer = setTimeout(async () => {
      const r = await fetch(`/api/transfers/${encodeURIComponent(transfer.id)}`).catch(() => null);
      if (r?.ok) setTransfer(await r.json());
      else setError(r ? await errorMessage(r) : "Sem resposta ao consultar a transferência.");
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [transfer]);

  async function chooseCustomer(id: string) {
    setCustomerId(id);
    setReceiverId("");
    setReceivers(null);
    setQuote(null);
    setError(null);
    if (!id) return;
    const r = await fetch(`/api/customers/${encodeURIComponent(id)}/receivers`);
    if (!r.ok) {
      setReceivers([]);
      setError(await errorMessage(r));
      return;
    }
    const body = await r.json();
    const validated: Receiver[] = body.receivers.filter((rcv: Receiver) => rcv.status === "VALIDATED");
    setReceivers(validated);
    if (validated.length === 1) setReceiverId(validated[0].id);
  }

  async function requestQuote(event: React.FormEvent) {
    event.preventDefault();
    const amountInCents = parseReais(amountText);
    if (amountInCents === null) {
      setError("Informe um valor em reais maior que zero, por exemplo 1.000,00.");
      return;
    }
    setBusy(true);
    setError(null);
    setQuote(null);
    try {
      const r = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, receiverId, amountInCents }),
      });
      if (!r.ok) {
        setError(await errorMessage(r));
        return;
      }
      setQuote(await r.json());
      setIdempotencyKey(crypto.randomUUID());
      setNow(Date.now());
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!quote) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ quoteId: quote.id, purpose }),
      });
      if (!r.ok) {
        setError(await errorMessage(r));
        return;
      }
      setTransfer(await r.json());
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setQuote(null);
    setTransfer(null);
    setAmountText("");
    setError(null);
  }

  const secondsLeft = quote ? Math.max(0, Math.floor((Date.parse(quote.expiresAt) - now) / 1000)) : 0;
  const quoteExpired = quote !== null && secondsLeft === 0;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <section className={card}>
        <h2 className={heading}>1. Cliente e conta de destino</h2>
        {customers === null ? (
          <p className={muted}>Carregando clientes…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={field}>
              <span>Cliente</span>
              <select
                className={input}
                value={customerId}
                disabled={transfer !== null}
                onChange={(e) => chooseCustomer(e.target.value)}
              >
                <option value="">Escolha…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id} disabled={!isEligible(c)}>
                    {c.name}
                    {isEligible(c) ? "" : " (KYC pendente)"}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              <span>Conta de destino</span>
              <select
                className={input}
                value={receiverId}
                disabled={!receivers || receivers.length === 0 || transfer !== null}
                onChange={(e) => {
                  setReceiverId(e.target.value);
                  setQuote(null);
                }}
              >
                <option value="">{receivers?.length === 0 ? "Nenhuma conta validada" : "Escolha…"}</option>
                {receivers?.map((rcv) => (
                  <option key={rcv.id} value={rcv.id}>
                    {rcv.displayLabel} · {rcv.holder.name} ({rcv.currency})
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className={heading}>2. Cotação</h2>
        <form onSubmit={requestQuote} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className={`${field} flex-1`}>
            <span>Valor em reais</span>
            <input
              className={input}
              inputMode="decimal"
              placeholder="1.000,00"
              value={amountText}
              disabled={transfer !== null}
              onChange={(e) => setAmountText(e.target.value)}
            />
          </label>
          <button type="submit" className={primaryButton} disabled={!receiverId || busy || transfer !== null}>
            Cotar
          </button>
        </form>
        <p className={`${muted} mt-3`}>
          Sandbox: o final do valor em centavos simula cenários. <code>,13</code> a entrega falha e é reembolsada,{" "}
          <code>,14</code> o PIX expira, <code>,15</code> fica parada até reembolso, <code>,99</code> sem rota.
        </p>

        {quote && (
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className={muted}>Você envia</dt>
            <dd className="text-right font-medium">{formatMoney(quote.sourceAmount, quote.sourceCurrency)}</dd>
            <dt className={muted}>Destino recebe</dt>
            <dd className="text-right text-lg font-semibold">{formatMoney(quote.destinationAmount, quote.destinationCurrency)}</dd>
            <dt className={muted}>Câmbio</dt>
            <dd className="text-right font-mono">{quote.exchangeRate}</dd>
            <dt className={muted}>VET</dt>
            <dd className="text-right font-mono">{quote.effectiveRate}</dd>
            <dt className={muted}>Tarifas</dt>
            <dd className="text-right">
              {formatMoney(quote.fees.total, quote.fees.currency)}
              <span className={muted}> (OXUS {formatMoney(quote.fees.oxusFee, quote.fees.currency)} + entrega {formatMoney(quote.fees.payoutFee, quote.fees.currency)})</span>
            </dd>
            <dt className={muted}>Prazo estimado</dt>
            <dd className="text-right">{quote.routing.estimatedDelivery} · {quote.routing.evaluatedRoutes} rotas avaliadas</dd>
            <dt className={muted}>Validade</dt>
            <dd className="text-right" data-testid="quote-countdown">
              {transfer ? "usada" : quoteExpired ? "expirou, cote de novo" : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
            </dd>
          </dl>
        )}
      </section>

      {quote && (
        <section className={card}>
          <h2 className={heading}>3. Confirmação</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className={`${field} flex-1`}>
              <span>Finalidade</span>
              <select className={input} value={purpose} disabled={transfer !== null} onChange={(e) => setPurpose(e.target.value)}>
                {PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={primaryButton} onClick={confirm} disabled={busy || quoteExpired || transfer !== null}>
              Confirmar
            </button>
          </div>
        </section>
      )}

      {transfer && <TransferStatus transfer={transfer} onRestart={restart} />}
    </div>
  );
}

function TransferStatus({ transfer, onRestart }: { transfer: Transfer; onRestart: () => void }) {
  const [copied, setCopied] = useState(false);
  const pix = transfer.paymentInstructions?.pixCopyPaste;
  const final = FINAL_STATUSES.includes(transfer.status);

  async function copy() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix);
    setCopied(true);
  }

  return (
    <section className={card}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={heading}>4. Transferência</h2>
        <span data-testid="transfer-status" className="rounded-full bg-black/5 px-3 py-1 text-sm font-medium dark:bg-white/10">
          {STATUS_LABELS[transfer.status] ?? transfer.status}
          {final ? "" : " · atualizando"}
        </span>
      </div>
      <p className={`${muted} font-mono text-xs`}>{transfer.id}</p>

      {pix && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-medium">PIX copia e cola</span>
          <textarea readOnly rows={3} value={pix} className={`${input} font-mono text-xs`} />
          <button type="button" className={secondaryButton} onClick={copy}>
            {copied ? "Copiado" : "Copiar código"}
          </button>
        </div>
      )}

      <ol className="mt-4 flex flex-col gap-2">
        {transfer.stages.map((s) => (
          <li key={s.stage} className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15">
            <span>{STAGE_LABELS[s.stage] ?? s.stage}</span>
            <span className="text-right">
              {STATUS_LABELS[s.status] ?? s.status}
              {s.reference && <span className={`${muted} block font-mono text-xs`}>{s.reference}</span>}
            </span>
          </li>
        ))}
      </ol>

      {transfer.failureReason && <p className="mt-3 text-sm text-red-700 dark:text-red-300">Motivo: {transfer.failureReason}</p>}
      {transfer.refund && (
        <p className="mt-3 text-sm">
          Reembolso {STATUS_LABELS[transfer.refund.status] ?? transfer.refund.status}: {formatMoney(transfer.refund.amount, transfer.refund.currency)} ({transfer.refund.reason})
        </p>
      )}

      {final && (
        <button type="button" className={`${secondaryButton} mt-4`} onClick={onRestart}>
          Nova operação
        </button>
      )}
    </section>
  );
}

const card = "rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900";
const heading = "mb-3 text-base font-semibold";
const muted = "text-sm text-zinc-500 dark:text-zinc-400";
const field = "flex flex-col gap-1 text-sm font-medium";
const input = "rounded-lg border border-black/15 bg-white px-3 py-2 font-normal dark:border-white/20 dark:bg-zinc-950";
const primaryButton =
  "rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40";
const secondaryButton =
  "self-start rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";
