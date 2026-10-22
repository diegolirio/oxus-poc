"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type Customer,
  FINAL_STATUSES,
  MIN_AMOUNT_CENTS,
  PURPOSES,
  PURPOSE_DEFAULT,
  type Quote,
  type Receiver,
  SCENARIOS,
  type Transfer,
  errorMessage,
  formatCountdown,
  formatMoney,
  parseReais,
  withCents,
} from "@/lib/cambio";
import { Button, Feedback, FormField, Header, Select, StepCard } from "@/components/ui";
import TransferStatus from "./TransferStatus";

const POLL_MS = 3000;

function isEligible(customer: Customer) {
  return customer.status === "ACTIVE" && customer.kyc.status === "ATTESTED";
}

/**
 * Tela de teste da remessa BRL -> exterior no sandbox da OXUS: cliente e
 * conta, cotacao, confirmacao com o PIX copia e cola e acompanhamento das
 * etapas ate um status final, com o resumo da operacao ao lado.
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
  const [purpose, setPurpose] = useState(PURPOSE_DEFAULT);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  // Erro da cotacao (valor ou recusa da OXUS) fica no campo; os demais, no topo.
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quoting, setQuoting] = useState(false);
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

  function changeAmount(text: string) {
    setAmountText(text);
    setQuoteError(null);
  }

  async function requestQuote(event: React.FormEvent) {
    event.preventDefault();
    const amountInCents = parseReais(amountText);
    setQuote(null);
    if (amountInCents === null) {
      setQuoteError("Informe um valor em reais maior que zero, por exemplo 1.000,00.");
      return;
    }
    setBusy(true);
    setQuoting(true);
    setQuoteError(null);
    setError(null);
    try {
      const r = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, receiverId, amountInCents }),
      });
      if (!r.ok) {
        setQuoteError(await errorMessage(r));
        return;
      }
      setQuote(await r.json());
      setIdempotencyKey(crypto.randomUUID());
      setNow(Date.now());
    } finally {
      setBusy(false);
      setQuoting(false);
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
    setQuoteError(null);
    setError(null);
  }

  const customer = customers?.find((c) => c.id === customerId);
  const receiver = receivers?.find((r) => r.id === receiverId);
  const secondsLeft = quote ? Math.max(0, Math.floor((Date.parse(quote.expiresAt) - now) / 1000)) : 0;
  const quoteExpired = quote !== null && secondsLeft === 0;
  const amountInCents = parseReais(amountText);
  const belowMinimum = amountInCents !== null && amountInCents < MIN_AMOUNT_CENTS;
  const locked = transfer !== null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header userName={customer?.name} userEmail={customer?.email} />
      <div className="mx-auto w-full max-w-[1080px] px-6 pt-6">
        <Link href="/" className="inline-block py-2 text-sm font-semibold text-interactive">
          ← Voltar
        </Link>
      </div>
      <main className="mx-auto grid w-full max-w-[1080px] grid-cols-1 items-start gap-6 px-6 pt-2 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="flex flex-col gap-2 lg:col-span-2">
          <span className="text-xs font-semibold tracking-[.06em] text-brand-content uppercase">Câmbio · Sandbox OXUS</span>
          <h1 className="text-4xl leading-[44px] font-bold">Remessa BRL → exterior</h1>
          <p className="text-base leading-6 text-neutral-secondary">
            Cliente e conta prontos do sandbox, cotação, PIX e acompanhamento. Nenhum dinheiro de verdade.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {error && <Feedback variant="error" title="Algo deu errado" description={error} />}

          <StepCard step={1} title="Cliente e conta de destino">
            {customers === null ? (
              <p className="text-sm text-neutral-secondary">Carregando clientes…</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                <Select label="Cliente" value={customerId} disabled={locked} onChange={(e) => chooseCustomer(e.target.value)}>
                  <option value="">Escolha…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} disabled={!isEligible(c)}>
                      {c.name}
                      {isEligible(c) ? "" : " (KYC pendente)"}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Conta de destino"
                  value={receiverId}
                  disabled={!receivers || receivers.length === 0 || locked}
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
                </Select>
              </div>
            )}
          </StepCard>

          <StepCard step={2} title="Cotação">
            <form onSubmit={requestQuote} className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <FormField
                label="Valor em reais"
                prefix="R$"
                helper="Mínimo R$ 10,00"
                error={quoteError}
                inputMode="decimal"
                placeholder="1.000,00"
                value={amountText}
                disabled={locked}
                onChange={(e) => changeAmount(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" className="sm:mt-1" disabled={!receiverId || busy || locked || belowMinimum}>
                {quoting ? "Cotando…" : quote ? "Recotar" : "Cotar"}
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.cents}
                  type="button"
                  title={s.desc}
                  disabled={locked}
                  onClick={() => changeAmount(withCents(amountText, s.cents))}
                  className="cursor-pointer rounded-full border border-border-default bg-surface px-2.5 py-1 font-mono text-xs whitespace-nowrap text-neutral-default hover:border-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ,{s.cents} {s.desc}
                </button>
              ))}
            </div>

            {quote && (
              <div className="flex flex-col gap-4 border-t border-border-subtle pt-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-surface-subtle p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-neutral-secondary">Você envia</span>
                    <span className="text-xl font-semibold">{formatMoney(quote.sourceAmount, quote.sourceCurrency)}</span>
                  </div>
                  <span aria-hidden className="text-neutral-tertiary">→</span>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-xs text-neutral-secondary">Destino recebe</span>
                    <span className="text-2xl font-bold text-brand-content">
                      {formatMoney(quote.destinationAmount, quote.destinationCurrency)}
                    </span>
                  </div>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
                  <dt className="text-neutral-secondary">Câmbio</dt>
                  <dd className="text-right font-mono">{quote.exchangeRate}</dd>
                  <dt className="text-neutral-secondary">VET</dt>
                  <dd className="text-right font-mono">{quote.effectiveRate}</dd>
                  <dt className="text-neutral-secondary">Tarifas</dt>
                  <dd className="text-right">
                    {formatMoney(quote.fees.total, quote.fees.currency)} (OXUS {formatMoney(quote.fees.oxusFee, quote.fees.currency)} + entrega{" "}
                    {formatMoney(quote.fees.payoutFee, quote.fees.currency)})
                  </dd>
                  <dt className="text-neutral-secondary">Prazo estimado</dt>
                  <dd className="text-right">
                    {quote.routing.estimatedDelivery} · {quote.routing.evaluatedRoutes} rotas avaliadas
                  </dd>
                  <dt className="text-neutral-secondary">Validade</dt>
                  <dd
                    data-testid="quote-countdown"
                    className={`text-right font-mono ${
                      transfer ? "" : quoteExpired ? "text-negative" : secondsLeft < 60 ? "text-attention" : ""
                    }`}
                  >
                    {transfer ? "Usada" : quoteExpired ? "Expirada" : formatCountdown(secondsLeft)}
                  </dd>
                </dl>
              </div>
            )}
          </StepCard>

          <StepCard step={3} title="Confirmação" muted={!quote}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Select
                label="Finalidade"
                className="flex-1"
                value={purpose}
                disabled={!quote || locked}
                onChange={(e) => setPurpose(e.target.value)}
              >
                {PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <Button onClick={confirm} disabled={!quote || busy || quoteExpired || locked}>
                Confirmar
              </Button>
            </div>
          </StepCard>

          {transfer && <TransferStatus transfer={transfer} holderName={receiver?.holder.name ?? ""} onRestart={restart} />}
        </div>

        <aside className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-6 lg:sticky lg:top-6">
          <h2 className="text-base font-semibold">Resumo</h2>
          <SummaryItem label="Remetente">
            <span className="block text-sm font-semibold">{customer?.name ?? "—"}</span>
            {customer && <span className="block text-xs text-neutral-secondary">{customer.email}</span>}
          </SummaryItem>
          <SummaryItem label="Beneficiário">
            <span className="block text-sm font-semibold">{receiver?.holder.name ?? "—"}</span>
            {receiver && <span className="block text-xs text-neutral-secondary">{receiver.displayLabel}</span>}
          </SummaryItem>
          <hr className="border-border-subtle" />
          <SummaryRow label="Total a pagar">{quote ? formatMoney(quote.sourceAmount, quote.sourceCurrency) : "—"}</SummaryRow>
          <SummaryRow label="Recebe" strong>
            {quote ? formatMoney(quote.destinationAmount, quote.destinationCurrency) : "—"}
          </SummaryRow>
          <SummaryRow label="Finalidade">{PURPOSES.find((p) => p.value === purpose)?.label ?? purpose}</SummaryRow>
          <p className="text-xs leading-[18px] text-neutral-secondary">
            Operação de câmbio intermediada pela OXUS. O IOF de 0,38% já está incluído no VET.
          </p>
        </aside>
      </main>
    </div>
  );
}

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-neutral-secondary">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function SummaryRow({ label, strong = false, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-neutral-secondary">{label}</span>
      <span className={strong ? "font-bold text-brand-content" : "font-semibold"}>{children}</span>
    </div>
  );
}
