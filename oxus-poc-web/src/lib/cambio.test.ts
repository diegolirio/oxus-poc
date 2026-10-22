import { describe, expect, test } from "vitest";
import {
  type Transfer,
  errorMessage,
  formatCountdown,
  formatMoney,
  outcomeFeedback,
  parseReais,
  pixPending,
  stageTone,
  transferTone,
  withCents,
} from "./cambio";

describe("parseReais", () => {
  test.each([
    ["1.000,00", 100000],
    ["1000", 100000],
    ["1234,5", 123450],
    ["R$ 10.000,13", 1000013],
    ["0,01", 1],
  ])("%s vira %i centavos", (texto, centavos) => {
    expect(parseReais(texto)).toBe(centavos);
  });

  test.each(["", "0", "0,00", "abc", "1,234", "-5", "1.000.00", "10.00", "1.0000"])("%s nao e valor", (texto) => {
    expect(parseReais(texto)).toBeNull();
  });
});

describe("formatMoney", () => {
  test("formata BRL e USD", () => {
    expect(formatMoney(100000, "BRL")).toBe("R$ 1.000,00");
    expect(formatMoney(18361, "USD")).toBe("US$ 183,61");
  });

  test("moeda que o Intl nao conhece sai com o codigo", () => {
    expect(formatMoney(150, "USDT")).toMatch(/1,50\s?USDT/);
  });
});

describe("errorMessage", () => {
  test("usa a mensagem e o code da OXUS", async () => {
    const r = Response.json({ errors: [{ code: "QUOTE_EXPIRED", message: "A cotação expirou." }] }, { status: 422 });
    expect(await errorMessage(r)).toBe("A cotação expirou. (QUOTE_EXPIRED)");
  });

  test("sem errors, usa o detail", async () => {
    const r = Response.json({ detail: "Servico de cambio indisponivel." }, { status: 502 });
    expect(await errorMessage(r)).toBe("Servico de cambio indisponivel.");
  });

  test("corpo que nao e JSON vira mensagem generica", async () => {
    expect(await errorMessage(new Response("x", { status: 500 }))).toBe("Falha inesperada (HTTP 500).");
  });
});

describe("withCents", () => {
  test.each([
    ["1.000,00", "13", "1.000,13"],
    ["250", "99", "250,99"],
    ["", "14", "1.000,14"],
    ["abc", "15", "1.000,15"],
    ["12.345,67", "13", "12.345,13"],
  ])("%s com ,%s vira %s", (texto, cents, esperado) => {
    expect(withCents(texto, cents)).toBe(esperado);
  });
});

describe("formatCountdown", () => {
  test.each([
    [300, "5:00"],
    [59, "0:59"],
    [0, "0:00"],
  ])("%i s vira %s", (s, esperado) => {
    expect(formatCountdown(s)).toBe(esperado);
  });
});

describe("stageTone", () => {
  test.each([
    ["COMPLETED", "done"],
    ["WAITING_PAYMENT", "active"],
    ["FAILED", "failed"],
    ["EXPIRED", "failed"],
    ["PENDING", "waiting"],
    ["WHATEVER", "active"],
  ])("%s e %s", (status, tom) => {
    expect(stageTone(status)).toBe(tom);
  });
});

describe("transferTone", () => {
  test.each([
    ["PROCESSING", "attention"],
    ["REFUNDING", "attention"],
    ["COMPLETED", "success"],
    ["REFUNDED", "error"],
    ["WHATEVER", "attention"],
  ])("%s e %s", (status, tom) => {
    expect(transferTone(status)).toBe(tom);
  });
});

function transfer(status: string, stages: [string, string][]): Transfer {
  const fees = { oxusFee: 60, payoutFee: 815, total: 875, currency: "BRL" };
  return {
    id: "trf_1",
    status,
    quoteId: "quo_1",
    purpose: "TRAVEL",
    sourceAmount: 100000,
    sourceCurrency: "BRL",
    destinationAmount: 18361,
    destinationCurrency: "USD",
    exchangeRate: "0.183610",
    fees,
    paymentInstructions: { method: "PIX", amount: 100000, currency: "BRL", pixCopyPaste: "000201pix" },
    stages: stages.map(([stage, s]) => ({ stage, status: s })),
  };
}

describe("outcomeFeedback", () => {
  test("transferencia em andamento nao tem feedback", () => {
    expect(outcomeFeedback(transfer("PROCESSING", []), "Carlos Oliveira")).toBeNull();
  });

  test("concluida diz quanto chegou e para quem", () => {
    const fb = outcomeFeedback(transfer("COMPLETED", [["DELIVERY", "COMPLETED"]]), "Carlos Oliveira")!;
    expect(fb.variant).toBe("success");
    expect(fb.title).toBe("Remessa entregue");
    expect(fb.description).toContain("183,61");
    expect(fb.description).toContain("Carlos Oliveira");
  });

  test("reembolsada depois de falha na entrega e erro", () => {
    const fb = outcomeFeedback(transfer("REFUNDED", [["DELIVERY", "FAILED"]]), "x")!;
    expect(fb).toMatchObject({ variant: "error", title: "Entrega falhou" });
  });

  test("reembolsada com a entrega parada e aviso", () => {
    const fb = outcomeFeedback(transfer("REFUNDED", [["DELIVERY", "IN_PROGRESS"]]), "x")!;
    expect(fb).toMatchObject({ variant: "warning", title: "Operação reembolsada" });
  });

  test("expirada e PIX expirado", () => {
    expect(outcomeFeedback(transfer("EXPIRED", [["PAYMENT", "EXPIRED"]]), "x")).toMatchObject({ variant: "error", title: "PIX expirado" });
  });
});

describe("pixPending", () => {
  test("pagamento aguardando com transferencia em andamento", () => {
    expect(pixPending(transfer("PROCESSING", [["PAYMENT", "WAITING_PAYMENT"]]))).toBe(true);
  });

  test("pagamento concluido esconde o PIX mesmo em andamento", () => {
    expect(pixPending(transfer("PROCESSING", [["PAYMENT", "COMPLETED"]]))).toBe(false);
  });

  test("transferencia expirada esconde o PIX", () => {
    expect(pixPending(transfer("EXPIRED", [["PAYMENT", "EXPIRED"]]))).toBe(false);
  });
});
