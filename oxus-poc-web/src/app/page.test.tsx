import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("a tela inicial leva ao teste de cambio", () => {
  render(<Home />);
  expect(screen.getByRole("link", { name: "Testar remessa no sandbox" })).toHaveAttribute("href", "/cambio");
});

test("a tela inicial tem o titulo e o overline do prototipo", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1, name: "oxus-poc" })).toBeInTheDocument();
  expect(screen.getByText("Câmbio")).toBeInTheDocument();
});
