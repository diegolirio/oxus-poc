import { describe, expect, test } from "vitest";
import { errorMessage, formatMoney, parseReais } from "./cambio";

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
