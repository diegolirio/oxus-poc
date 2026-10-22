import { renderRouter } from "expo-router/testing-library";

// Teste minimo: prova que a suite roda e que o roteador abre a tela inicial.
// Troque pelo primeiro teste de comportamento quando a tela ganhar um.
test("a tela inicial abre na rota raiz", async () => {
  // O matcher toHavePathname le o valor devolvido por renderRouter; o `screen`
  // importado do testing-library nao ganha getPathname. A partir do SDK 58,
  // renderRouter devolve uma Promise.
  const tela = await renderRouter("./src/app");
  expect(tela).toHavePathname("/");
});
