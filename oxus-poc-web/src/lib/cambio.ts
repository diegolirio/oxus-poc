// Tipos do que o oxus-poc-api devolve (o recorte da OXUS em domain/Remittance.kt)
// e as conversoes que a tela faz. Valores sempre inteiros em centavos.

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
