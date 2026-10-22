// Tipos do que o oxus-poc-api devolve (o recorte da OXUS em domain/Remittance.kt)
// e as conversoes que a tela faz. Valores sempre inteiros em centavos.

import type { Tone } from "@/components/ui";

export type Customer = {
  id: string;
  name: string;
  email: string;
  status: string;
  kyc: { status: string; level?: string | null };
};

export type Receiver = {
  id: string;
  customerId: string;
  rail: string;
  currency: string;
  displayLabel: string;
  status: string;
  holder: { name: string; relationship: string; country: string };
};

export type Fees = { oxusFee: number; payoutFee: number; total: number; currency: string };

export type Quote = {
  id: string;
  sourceAmount: number;
  sourceCurrency: string;
  destinationAmount: number;
  destinationCurrency: string;
  exchangeRate: string;
  effectiveRate: string;
  fees: Fees;
  routing: { evaluatedRoutes: number; estimatedDelivery: string };
  expiresAt: string;
};

export type Stage = { stage: string; status: string; updatedAt?: string | null; reference?: string | null };

export type Transfer = {
  id: string;
  status: string;
  quoteId: string;
  purpose: string;
  sourceAmount: number;
  sourceCurrency: string;
  destinationAmount: number;
  destinationCurrency: string;
  exchangeRate: string;
  fees: Fees;
  paymentInstructions?: {
    method: string;
    amount: number;
    currency: string;
    pixCopyPaste?: string | null;
    expiresAt?: string | null;
  } | null;
  stages: Stage[];
  failureReason?: string | null;
  refund?: { status: string; reason: string; amount: number; currency: string } | null;
};

/** Status em que a transferencia nao muda mais: a tela para de consultar. */
export const FINAL_STATUSES = ["COMPLETED", "FAILED", "REFUNDED", "EXPIRED", "CANCELLED"];

export const PURPOSES: { value: string; label: string }[] = [
  { value: "OWN_ACCOUNT", label: "Conta própria" },
  { value: "FAMILY_SUPPORT", label: "Manutenção de família" },
  { value: "EDUCATION", label: "Educação" },
  { value: "MEDICAL", label: "Saúde" },
  { value: "TRAVEL", label: "Viagem" },
  { value: "SERVICES", label: "Serviços" },
  { value: "GOODS", label: "Mercadorias" },
  { value: "INVESTMENT", label: "Investimento" },
];

export const PURPOSE_DEFAULT = "TRAVEL";

export const STATUS_LABELS: Record<string, string> = {
  PROCESSING: "Em andamento",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
  REFUNDING: "Reembolsando",
  REFUNDED: "Reembolsada",
  EXPIRED: "Expirada",
  CANCELLED: "Cancelada",
  PENDING: "Aguardando",
  WAITING_PAYMENT: "Aguardando pagamento",
  IN_PROGRESS: "Em andamento",
};

export const STAGE_LABELS: Record<string, string> = {
  CREATION: "Criação",
  PAYMENT: "Pagamento PIX",
  SETTLEMENT: "Liquidação",
  DELIVERY: "Entrega",
};

/**
 * "1.234,56", "1234,5" ou "1234" -> centavos. Devolve null para o que nao e
 * um valor positivo com ate duas casas. Ponto so vale como separador de
 * milhar: "1.000.00" e recusado em vez de virar cem mil reais.
 */
export function parseReais(texto: string): number | null {
  const semPrefixo = texto.trim().replace(/^R\$\s*/, "");
  if (!/^(\d+|\d{1,3}(\.\d{3})+)(,\d{1,2})?$/.test(semPrefixo)) return null;
  const limpo = semPrefixo.replace(/\./g, "");
  const [inteiro, decimal = ""] = limpo.split(",");
  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
  return centavos > 0 ? centavos : null;
}

export function formatMoney(centavos: number, moeda: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(centavos / 100);
  } catch {
    // Moeda que o Intl nao conhece (USDT, USDC): numero e o codigo.
    return `${(centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ${moeda}`;
  }
}

/** Mensagem de um ProblemDetail do oxus-poc-api, com o code da OXUS quando houver. */
export async function errorMessage(resposta: Response): Promise<string> {
  try {
    const corpo = await resposta.json();
    const erro = corpo?.errors?.[0];
    if (erro?.message) return erro.code ? `${erro.message} (${erro.code})` : erro.message;
    if (corpo?.detail) return corpo.detail;
  } catch {
    // corpo que nao e JSON: cai na mensagem generica
  }
  return `Falha inesperada (HTTP ${resposta.status}).`;
}

/** Menor valor que a tela deixa cotar (R$ 10,00). */
export const MIN_AMOUNT_CENTS = 1000;

/** Finais de centavos que o sandbox da OXUS usa para simular cenarios. */
export const SCENARIOS: { cents: string; desc: string }[] = [
  { cents: "13", desc: "entrega falha e reembolsa" },
  { cents: "14", desc: "PIX expira" },
  { cents: "15", desc: "fica parada até reembolso" },
  { cents: "99", desc: "sem rota" },
];

/** Troca os centavos do valor digitado. Sem valor valido, parte de R$ 1.000. */
export function withCents(amountText: string, cents: string): string {
  const centavos = parseReais(amountText);
  const reais = centavos === null ? 1000 : Math.floor(centavos / 100);
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(reais)},${cents}`;
}

/** Segundos -> "m:ss". */
export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Como o indicador da timeline desenha cada status de etapa. */
export function stageTone(status: string): "done" | "active" | "failed" | "waiting" {
  if (status === "COMPLETED") return "done";
  if (status === "FAILED" || status === "EXPIRED") return "failed";
  if (status === "PENDING") return "waiting";
  return "active";
}

/** Tom da tag de status da transferencia. Status desconhecido conta como em andamento. */
export function transferTone(status: string): Tone {
  if (status === "COMPLETED") return "success";
  if (["FAILED", "EXPIRED", "REFUNDED", "CANCELLED"].includes(status)) return "error";
  return "attention";
}

export type OutcomeFeedback = { variant: "success" | "warning" | "error"; title: string; description: string };

/** Mensagem final da transferencia, ou null enquanto ela nao chegou a um status final. */
export function outcomeFeedback(t: Transfer, holderName: string): OutcomeFeedback | null {
  if (!FINAL_STATUSES.includes(t.status)) return null;
  switch (t.status) {
    case "COMPLETED":
      return {
        variant: "success",
        title: "Remessa entregue",
        description: `${formatMoney(t.destinationAmount, t.destinationCurrency)} creditados para ${holderName}.`,
      };
    case "EXPIRED":
      return {
        variant: "error",
        title: "PIX expirado",
        description: "O pagamento não foi identificado dentro do prazo. Faça uma nova cotação.",
      };
    case "REFUNDED":
      return t.stages.some((s) => s.stage === "DELIVERY" && s.status === "FAILED")
        ? {
            variant: "error",
            title: "Entrega falhou",
            description: "O banco de destino recusou o crédito. O valor foi reembolsado na conta de origem.",
          }
        : {
            variant: "warning",
            title: "Operação reembolsada",
            description: "A entrega ficou parada e foi cancelada. O valor voltou para a conta de origem.",
          };
    default:
      return { variant: "error", title: STATUS_LABELS[t.status] ?? t.status, description: t.failureReason ?? "" };
  }
}

/** O PIX copia e cola so faz sentido enquanto o pagamento ainda nao entrou. */
export function pixPending(t: Transfer): boolean {
  if (!t.paymentInstructions?.pixCopyPaste || FINAL_STATUSES.includes(t.status)) return false;
  return t.stages.find((s) => s.stage === "PAYMENT")?.status !== "COMPLETED";
}
