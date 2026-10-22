import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Button, Feedback, FormField, StepCard } from ".";

test("StepCard mostra o numero e o titulo da etapa", () => {
  render(<StepCard step={2} title="Cotação">conteúdo</StepCard>);
  expect(screen.getByRole("heading", { name: "Cotação" })).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
});

test("FormField com erro mostra o erro no lugar do helper", () => {
  render(<FormField label="Valor em reais" helper="Mínimo R$ 10,00" error="x" />);
  expect(screen.getByRole("alert")).toHaveTextContent("x");
  expect(screen.queryByText("Mínimo R$ 10,00")).toBeNull();
});

test("FormField sem erro mostra o helper e e achado pelo label", () => {
  render(<FormField label="Valor em reais" helper="Mínimo R$ 10,00" />);
  expect(screen.getByText("Mínimo R$ 10,00")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("textbox", { name: "Valor em reais" })).toBeInTheDocument();
});

test("Button com href vira link", () => {
  render(<Button href="/cambio">Ir</Button>);
  expect(screen.getByRole("link", { name: "Ir" })).toHaveAttribute("href", "/cambio");
});

test("Feedback de erro e alerta e de sucesso e status", () => {
  const { rerender } = render(<Feedback variant="error" title="Falhou" />);
  expect(screen.getByRole("alert")).toHaveTextContent("Falhou");
  rerender(<Feedback variant="success" title="Remessa entregue" />);
  expect(screen.getByRole("status")).toHaveTextContent("Remessa entregue");
});
