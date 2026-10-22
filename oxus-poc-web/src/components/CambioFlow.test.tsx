import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import CambioFlow from "./CambioFlow";

const fees = { oxusFee: 600, payoutFee: 82, total: 682, currency: "BRL" };

const customers = [
  { id: "cus_1", name: "Lucas Fernandes", email: "l@x.com", status: "ACTIVE", kyc: { status: "ATTESTED" } },
  { id: "cus_2", name: "Ana Pendente", email: "a@x.com", status: "PENDING_KYC_ATTESTATION", kyc: { status: "MISSING" } },
];

const receivers = [
  {
    id: "rcv_1",
    customerId: "cus_1",
    rail: "ACH",
    currency: "USD",
    displayLabel: "ACH •••• 6789",
    status: "VALIDATED",
    holder: { name: "Carlos Oliveira", relationship: "FAMILY", country: "USA" },
  },
];

function quote() {
  return {
    id: "quo_1",
    sourceAmount: 100000,
    sourceCurrency: "BRL",
    destinationAmount: 18361,
    destinationCurrency: "USD",
    exchangeRate: "0.183610",
    effectiveRate: "0.182358",
    fees,
    routing: { evaluatedRoutes: 5, estimatedDelivery: "SAME_DAY" },
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
}

function transfer(status: string, payment: string) {
  return {
    id: "trf_1",
    status,
    quoteId: "quo_1",
    purpose: "OWN_ACCOUNT",
    sourceAmount: 100000,
    sourceCurrency: "BRL",
    destinationAmount: 18361,
    destinationCurrency: "USD",
    exchangeRate: "0.183610",
    fees,
    paymentInstructions: { method: "PIX", amount: 100000, currency: "BRL", pixCopyPaste: "000201pix" },
    stages: [
      { stage: "CREATION", status: "COMPLETED" },
      { stage: "PAYMENT", status: payment },
    ],
  };
}

type Call = { url: string; init?: RequestInit };
let calls: Call[];
let routes: Record<string, () => Response>;

beforeEach(() => {
  calls = [];
  routes = {
    "GET /api/customers": () => Response.json({ customers }),
    "GET /api/customers/cus_1/receivers": () => Response.json({ receivers }),
    "POST /api/quotes": () => Response.json(quote(), { status: 201 }),
    "POST /api/transfers": () => Response.json(transfer("PROCESSING", "WAITING_PAYMENT"), { status: 201 }),
    "GET /api/transfers/trf_1": () => Response.json(transfer("COMPLETED", "COMPLETED")),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const route = routes[`${init?.method ?? "GET"} ${url}`];
      if (!route) throw new Error(`rota nao esperada: ${url}`);
      return route();
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function chooseLucasAndQuote(valor = "1.000,00") {
  render(<CambioFlow />);
  const cliente = await screen.findByRole("combobox", { name: "Cliente" });
  fireEvent.change(cliente, { target: { value: "cus_1" } });
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Conta de destino" })).toHaveValue("rcv_1"));
  fireEvent.change(screen.getByRole("textbox", { name: "Valor em reais" }), { target: { value: valor } });
  fireEvent.click(screen.getByRole("button", { name: "Cotar" }));
}

test("cliente sem KYC atestado aparece desabilitado", async () => {
  render(<CambioFlow />);
  expect(await screen.findByRole("option", { name: "Ana Pendente (KYC pendente)" })).toBeDisabled();
  expect(screen.getByRole("option", { name: "Lucas Fernandes" })).toBeEnabled();
});

test("cota o valor em centavos e mostra o que o destino recebe", async () => {
  await chooseLucasAndQuote("1.000,00");

  const cotacao = within(screen.getByRole("region", { name: "Cotação" }));
  expect(await cotacao.findByText(/183,61/)).toHaveTextContent(/^US\$\s183,61$/);
  expect(screen.getByText("0.182358")).toBeInTheDocument();
  const pedido = calls.find((c) => c.url === "/api/quotes");
  expect(JSON.parse(pedido!.init!.body as string)).toEqual({ customerId: "cus_1", receiverId: "rcv_1", amountInCents: 100000 });
});

test("valor invalido nao chama a cotacao", async () => {
  await chooseLucasAndQuote("abc");

  expect(await screen.findByRole("alert")).toHaveTextContent("Informe um valor em reais");
  expect(screen.getByRole("textbox", { name: "Valor em reais" })).toHaveAccessibleDescription(/Informe um valor em reais/);
  expect(calls.some((c) => c.url === "/api/quotes")).toBe(false);
});

test("recusa da OXUS aparece com o code", async () => {
  routes["POST /api/quotes"] = () =>
    Response.json({ errors: [{ code: "ROUTE_UNAVAILABLE", message: "Nenhuma rota disponível." }] }, { status: 422 });

  await chooseLucasAndQuote("1.000,99");

  expect(await screen.findByRole("alert")).toHaveTextContent("Nenhuma rota disponível. (ROUTE_UNAVAILABLE)");
});

test("confirma com Idempotency-Key, mostra o PIX e acompanha ate concluir", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  await chooseLucasAndQuote();
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));

  expect(await screen.findByDisplayValue("000201pix")).toBeInTheDocument();
  expect(screen.getByTestId("transfer-status")).toHaveTextContent("Em andamento");
  const pedido = calls.find((c) => c.url === "/api/transfers");
  expect((pedido!.init!.headers as Record<string, string>)["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(JSON.parse(pedido!.init!.body as string)).toEqual({ quoteId: "quo_1", purpose: "TRAVEL" });

  await act(() => vi.advanceTimersByTimeAsync(3000));

  await waitFor(() => expect(screen.getByTestId("transfer-status")).toHaveTextContent("Concluída"));
  expect(screen.getByRole("button", { name: "Nova operação" })).toBeInTheDocument();
});

test("falha ao carregar clientes aparece na tela", async () => {
  routes["GET /api/customers"] = () => Response.json({ detail: "Servico de cambio indisponivel." }, { status: 502 });

  render(<CambioFlow />);

  expect(await screen.findByRole("alert")).toHaveTextContent("Servico de cambio indisponivel.");
});

test("chip de cenario troca os centavos", async () => {
  render(<CambioFlow />);
  const valor = await screen.findByRole("textbox", { name: "Valor em reais" });
  fireEvent.change(valor, { target: { value: "1.000,00" } });
  fireEvent.click(screen.getByRole("button", { name: /,13/ }));
  expect(valor).toHaveValue("1.000,13");
});

test("abaixo do minimo nao deixa cotar", async () => {
  render(<CambioFlow />);
  fireEvent.change(await screen.findByRole("combobox", { name: "Cliente" }), { target: { value: "cus_1" } });
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Conta de destino" })).toHaveValue("rcv_1"));
  fireEvent.change(screen.getByRole("textbox", { name: "Valor em reais" }), { target: { value: "9,99" } });
  expect(screen.getByRole("button", { name: "Cotar" })).toBeDisabled();
});

test("depois de cotar o botao vira Recotar e a recusa limpa a cotacao", async () => {
  await chooseLucasAndQuote("1.000,00");
  const cotacao = within(screen.getByRole("region", { name: "Cotação" }));
  expect(await cotacao.findByText(/183,61/)).toBeInTheDocument();
  routes["POST /api/quotes"] = () =>
    Response.json({ errors: [{ code: "ROUTE_UNAVAILABLE", message: "Nenhuma rota disponível." }] }, { status: 422 });

  fireEvent.click(screen.getByRole("button", { name: "Recotar" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("(ROUTE_UNAVAILABLE)");
  expect(screen.getByRole("textbox", { name: "Valor em reais" })).toHaveAccessibleDescription(/ROUTE_UNAVAILABLE/);
  expect(cotacao.queryByText(/183,61/)).toBeNull();
});

test("validade mostra Expirada e bloqueia a confirmacao", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  routes["POST /api/quotes"] = () =>
    Response.json({ ...quote(), expiresAt: new Date(Date.now() + 1000).toISOString() }, { status: 201 });
  await chooseLucasAndQuote();
  await screen.findByTestId("quote-countdown");

  await act(() => vi.advanceTimersByTimeAsync(2000));

  expect(screen.getByTestId("quote-countdown")).toHaveTextContent("Expirada");
  expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
});

test("resumo mostra remetente, beneficiario e total", async () => {
  await chooseLucasAndQuote();
  await within(screen.getByRole("region", { name: "Cotação" })).findByText(/183,61/);
  const resumo = within(screen.getByRole("heading", { name: "Resumo" }).closest("aside")!);
  expect(resumo.getByText("Lucas Fernandes")).toBeInTheDocument();
  expect(resumo.getByText("Carlos Oliveira")).toBeInTheDocument();
  expect(resumo.getByText(/R\$\s1\.000,00/)).toBeInTheDocument();
});
