# Layout do câmbio no visual Colmeia 3.0 — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home e `/cambio` do `oxus-poc-web` visualmente iguais ao protótipo em `docs/design/`, sem mudar o comportamento contra a OXUS.

**Architecture:** Tokens do Colmeia (`core-light`) no `@theme` do Tailwind; componentes de aparência em `src/components/ui/`; regras puras de apresentação (tom do status, feedback final, centavos dos chips, contagem) em `src/lib/cambio.ts`; `CambioFlow` passa a desenhar a página inteira (Header, grid, Resumo) porque é ele que tem o estado.

**Tech Stack:** Next 16.4 (App Router), React 19, Tailwind 4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-22-layout-cambio-colmeia-design.md`. Referência visual: `docs/design/README.md` (medidas e textos) e `docs/design/Cambio PagBank.html` (abra no navegador para comparar).

## Global Constraints

- Antes de escrever código Next, leia o guia pertinente em `oxus-poc-web/node_modules/next/dist/docs/` (`oxus-poc-web/AGENTS.md`).
- Sem dependência nova no `package.json`. Fontes por `next/font/google`: `Inter` (400/600/700) e `Fira_Code` (400).
- Sem modo escuro: remover `prefers-color-scheme: dark` e todas as classes `dark:`.
- Cores só pelos tokens: brand #1D8915 (bg) / #1C7417 (content), link #0078AD, texto #272727 / #535353 / #8A8A8A, superfície #FFFFFF / #F8F8F8, borda #D3D3D3 / #E8E8E8, atenção #94400C, negativo #C31312.
- Radius 8px (inputs, blocos), 12px (cards), 999px (chips, botões).
- Nenhuma mudança em `src/app/api/**`, `src/lib/repasse.ts`, `-api` ou `-core`.
- Comportamento preservado: KYC pendente desabilitado, só receivers `VALIDATED`, `Idempotency-Key` por cotação, polling a cada 3000 ms até `FINAL_STATUSES`, trocar cliente/conta limpa a cotação.
- `data-testid="transfer-status"` e `data-testid="quote-countdown"` permanecem.
- Verificação do web: `make test-web` (lint, typecheck, vitest) a partir da raiz.

## Review Focus

1. Recusa da cotação depois de uma cotação boa (Recotar com `,99`): a cotação antiga some e o erro aparece no campo — teste na Task 3.
2. Texto não numérico no valor: o botão continua clicável e o erro vai para o campo, sem chamar `/api/quotes` — teste na Task 3.
3. Chip clicado com o campo vazio ou inválido vira `1.000,cc`, não `NaN`/`,cc` — teste na Task 2.
4. PIX copia e cola some quando o pagamento conclui, mesmo com a transferência ainda em andamento — teste na Task 4.
5. Status desconhecido vindo da OXUS (fora de `STATUS_LABELS`) cai em tom neutro/atenção sem quebrar a tela — teste na Task 2.

---

### Task 1: Tokens, fontes, componentes `ui/` e Home

**Files:**
- Modify: `oxus-poc-web/src/app/globals.css`, `oxus-poc-web/src/app/layout.tsx`, `oxus-poc-web/src/app/page.tsx`
- Create: `oxus-poc-web/src/components/ui/{Button,FormField,Select,TagStatus,Feedback,Header,StepCard}.tsx`, `oxus-poc-web/src/components/ui/index.ts`
- Test: `oxus-poc-web/src/components/ui/ui.test.tsx`, `oxus-poc-web/src/app/page.test.tsx`
- Também neste commit: `docs/design/*` e `docs/superpowers/specs/2026-10-22-layout-cambio-colmeia-design.md` (ainda não commitados).

**Interfaces (Produces):**
- `Button({ variant?: "primary" | "secondary"; href?: string } & ButtonHTMLAttributes)` — com `href` renderiza `next/link`. Pill, altura 48px, primary bg brand, secondary borda #D3D3D3; `disabled` com opacidade 0.4.
- `FormField({ label: string; prefix?: string; helper?: string; error?: string | null } & InputHTMLAttributes)` — `<label>` envolvendo; erro com `role="alert"` em #C31312 substitui o helper; borda do input vermelha com erro.
- `Select({ label: string; children } & SelectHTMLAttributes)` — 48px, padding 0 12px, borda #D3D3D3, radius 8, label 14px #535353, gap 6.
- `type Tone = "success" | "attention" | "error" | "neutral"`; `TagStatus({ tone: Tone; children; "data-testid"?: string })`.
- `Feedback({ variant: "success" | "warning" | "error"; title: string; description?: string })` — `role="alert"` quando error/warning, `role="status"` quando success.
- `Header({ userName?: string; userEmail?: string })` — barra 64px, largura total, nome/e-mail à direita.
- `StepCard({ step: number; title: string; muted?: boolean; aside?: ReactNode; children })` — `<section>` card #FFF, borda #E8E8E8, radius 12, padding 24, gap 16; círculo 28×28 #1D8915 com número 14/700 branco + título 18/600 (`<h2>`); `aside` à direita do título; `muted` aplica opacidade 0.5.

- [ ] **Step 1: Testes que falham** em `ui.test.tsx`:
  - `StepCard` com `step={2} title="Cotação"` expõe `getByRole("heading", { name: "Cotação" })` e o texto `"2"`.
  - `FormField` com `error="x"` tem `getByRole("alert")` com `"x"` e não mostra o `helper`; sem erro mostra o helper e `queryByRole("alert")` é null; `getByRole("textbox", { name: "Valor em reais" })` funciona com `label="Valor em reais"`.
  - `Button href="/cambio"` é `getByRole("link")` com `href` `/cambio`.
  - `Feedback variant="error"` → `role="alert"`; `variant="success"` → `role="status"`.
  - Em `page.test.tsx`, além do teste atual: `getByRole("heading", { level: 1, name: "oxus-poc" })` e o texto `"Câmbio"`.
- [ ] **Step 2:** `cd oxus-poc-web && npx vitest run src/components/ui src/app/page.test.tsx` → FAIL (módulos não existem).
- [ ] **Step 3:** Implementar. `globals.css`: `@theme` com `--color-brand-primary: #1D8915`, `--color-brand-content: #1C7417`, `--color-interactive: #0078AD`, `--color-neutral-default: #272727`, `--color-neutral-secondary: #535353`, `--color-neutral-tertiary: #8A8A8A`, `--color-surface: #FFFFFF`, `--color-surface-subtle: #F8F8F8`, `--color-border-default: #D3D3D3`, `--color-border-subtle: #E8E8E8`, `--color-attention: #94400C`, `--color-negative: #C31312`, `--font-sans: var(--font-inter)`, `--font-mono: var(--font-fira-code)`; `body` em Inter, cor #272727, fundo #F8F8F8 (fundo de página do protótipo — conferir no HTML). `layout.tsx`: Inter e Fira_Code com `variable` `--font-inter` / `--font-fira-code`. Home conforme README §1 (container 720px, padding 64px 24px, gap 16; overline 12/600 uppercase tracking .06em brand-content; H1 36/44/700; texto 16/24 secondary; `Button href="/cambio"`).
- [ ] **Step 4:** Mesmo comando → PASS; `make test-web` → PASS (o `CambioFlow.test.tsx` não muda nesta task).
- [ ] **Step 5: Commit** `feat(web): tokens Colmeia, componentes ui e Home no novo visual` (inclui `docs/design/` e o spec).

---

### Task 2: Regras de apresentação em `lib/cambio.ts`

**Files:**
- Modify: `oxus-poc-web/src/lib/cambio.ts`
- Test: `oxus-poc-web/src/lib/cambio.test.ts`

**Interfaces:**
- Consumes: `import type { Tone } from "@/components/ui"` (exportado por `TagStatus`, Task 1).
- Produces:
  - `MIN_AMOUNT_CENTS = 1000`
  - `SCENARIOS: { cents: string; desc: string }[]` = `[{ cents: "13", desc: "entrega falha e reembolsa" }, { cents: "14", desc: "PIX expira" }, { cents: "15", desc: "fica parada até reembolso" }, { cents: "99", desc: "sem rota" }]`
  - `withCents(amountText: string, cents: string): string`
  - `formatCountdown(seconds: number): string` → `m:ss`
  - `stageTone(status: string): "done" | "active" | "failed" | "waiting"` — `COMPLETED`→done; `FAILED`/`EXPIRED`→failed; `PENDING`→waiting; qualquer outro→active.
  - `transferTone(status: string): Tone` — `COMPLETED`→success; `FAILED`/`EXPIRED`/`REFUNDED`/`CANCELLED`→error; qualquer outro→attention.
  - `outcomeFeedback(t: Transfer, holderName: string): { variant: "success" | "warning" | "error"; title: string; description: string } | null` — null se não final. `COMPLETED`→success "Remessa entregue", `"<US$ destino> creditados para <holderName>."`; `EXPIRED`→error "PIX expirado" / "O pagamento não foi identificado dentro do prazo. Faça uma nova cotação."; `REFUNDED` com etapa `DELIVERY` em `FAILED`→error "Entrega falhou" / "O banco de destino recusou o crédito. O valor foi reembolsado na conta de origem."; `REFUNDED` sem falha de entrega→warning "Operação reembolsada" / "A entrega ficou parada e foi cancelada. O valor voltou para a conta de origem."; `FAILED`/`CANCELLED`→error com título do `STATUS_LABELS` e `failureReason ?? ""`.
  - `pixPending(t: Transfer): boolean` — há `pixCopyPaste`, transferência não final e etapa `PAYMENT` não está `COMPLETED`.
  - `PURPOSE_DEFAULT = "TRAVEL"`

- [ ] **Step 1: Testes que falham** (`cambio.test.ts`):
  - `withCents("1.000,00","13")` → `"1.000,13"`; `withCents("250","99")` → `"250,99"`; `withCents("","14")` → `"1.000,14"`; `withCents("abc","15")` → `"1.000,15"`; `withCents("12.345,67","13")` → `"12.345,13"`.
  - `formatCountdown(300)` → `"5:00"`; `formatCountdown(59)` → `"0:59"`; `formatCountdown(0)` → `"0:00"`.
  - `stageTone`: `COMPLETED` done, `WAITING_PAYMENT` active, `FAILED` failed, `EXPIRED` failed, `PENDING` waiting, `"WHATEVER"` active.
  - `transferTone`: `PROCESSING` attention, `REFUNDING` attention, `COMPLETED` success, `REFUNDED` error, `"WHATEVER"` attention.
  - `outcomeFeedback`: `PROCESSING` → null; `COMPLETED` com destino 18361 USD e holder "Carlos Oliveira" → title "Remessa entregue", description contém "183,61" e "Carlos Oliveira"; `REFUNDED` + DELIVERY `FAILED` → error "Entrega falhou"; `REFUNDED` + DELIVERY `IN_PROGRESS` → warning "Operação reembolsada"; `EXPIRED` → error "PIX expirado".
  - `pixPending`: true com `PROCESSING` + PAYMENT `WAITING_PAYMENT`; false com PAYMENT `COMPLETED` e transferência `PROCESSING`; false com `EXPIRED`.
- [ ] **Step 2:** `npx vitest run src/lib/cambio.test.ts` → FAIL.
- [ ] **Step 3:** Implementar. `withCents`: reais = `Math.floor(parseReais(text) / 100)`, ou 1000 se `parseReais` for null; formatar reais com `Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })` + `","` + cents.
- [ ] **Step 4:** Mesmo comando → PASS.
- [ ] **Step 5: Commit** `feat(web): regras de apresentacao da remessa (tons, feedback, cenarios)`.

---

### Task 3: `CambioFlow` — página, etapas 1–3 e Resumo

**Files:**
- Modify: `oxus-poc-web/src/components/CambioFlow.tsx`, `oxus-poc-web/src/app/cambio/page.tsx`
- Test: `oxus-poc-web/src/components/CambioFlow.test.tsx`

**Interfaces:**
- Consumes: tudo de `@/components/ui` (Task 1) e de `@/lib/cambio` (Task 2).
- Produces: `CambioFlow` desenha a página inteira; `cambio/page.tsx` fica só com `metadata` e `<CambioFlow />`.

Estrutura (README §2): `Header` (nome/e-mail do cliente escolhido) → "← Voltar" (`next/link` para `/`, 14/600 #0078AD) → `main` 1080px, padding `8px 24px 64px`, grid `minmax(0,1fr) minmax(0,340px)` gap 24 (uma coluna abaixo de `lg`/~900px, Resumo depois dos cards) → cabeçalho em 2 colunas (overline "Câmbio · Sandbox OXUS", H1 "Remessa BRL → exterior", descrição) → coluna esquerda com `Feedback` de erro geral (se houver) e os `StepCard`s → coluna direita `<aside>` com `<h2>` "Resumo", sticky top 24.

Estado novo: `quoteError: string | null` separado de `error`. Erros de `requestQuote` (valor inválido e resposta não-ok de `/api/quotes`) vão para `quoteError`, exibido no `FormField`; editar o valor ou clicar chip limpa `quoteError`. Os demais erros continuam em `error`, num `Feedback variant="error" title="Algo deu errado"` com a mensagem na description. Recotar começa limpando `quote` (já faz).

- Etapa 1: `Select` "Cliente" e "Conta de destino", grid `repeat(auto-fit,minmax(220px,1fr))`. Opções e regras iguais às de hoje.
- Etapa 2: `FormField` "Valor em reais", `prefix="R$"`, `helper="Mínimo R$ 10,00"`, `inputMode="decimal"`, placeholder `1.000,00`. Botão `Cotar` / `Cotando…` (durante `busy` da cotação) / `Recotar` (já há cotação). Desabilitado se sem receiver, `busy`, transferência ativa ou `parseReais(valor)` não-nulo e `< MIN_AMOUNT_CENTS` (texto inválido deixa clicar, para o erro aparecer no campo). Chips de `SCENARIOS` (pill, Fira Code 12px, `nowrap`, hover borda brand, `type="button"`, rótulo `",13 entrega falha e reembolsa"`) fazem `setAmountText(withCents(amountText, cents))`; desabilitados com transferência ativa. Resultado da cotação: bloco #F8F8F8 grid `1fr auto 1fr` "Você envia" (20/600) → "Destino recebe" (24/700 brand-content) e tabela Câmbio (mono), VET (mono), Tarifas `R$ x (OXUS R$ y + entrega R$ z)`, Prazo estimado `<estimatedDelivery> · N rotas avaliadas`, Validade (`quote-countdown`): `formatCountdown`, cor #94400C se `< 60`, `"Expirada"` #C31312 em 0, `"Usada"` com transferência.
- Etapa 3: sempre renderizada, `muted` sem cotação. `Select` "Finalidade" com `PURPOSES`, estado inicial `PURPOSE_DEFAULT`. Botão "Confirmar" como hoje.
- Etapa 4: `<TransferStatus>` (Task 4 o reestiliza; aqui só passe `holderName` do receiver escolhido).
- Resumo: Remetente (nome 14/600 + e-mail 12px), Beneficiário (`holder.name` + `displayLabel`), divisor, "Total a pagar" (`quote.sourceAmount`), "Recebe" (700 brand-content), "Finalidade" (label de `PURPOSES`), nota 12/18 #535353 "Operação de câmbio intermediada pela OXUS. O IOF de 0,38% já está incluído no VET." Campos sem dado mostram "—".

- [ ] **Step 1: Ajustar/criar testes** em `CambioFlow.test.tsx`:
  - Existentes continuam; no de confirmação, o corpo esperado passa a ser `{ quoteId: "quo_1", purpose: "TRAVEL" }` e o status `toHaveTextContent("Em andamento")` (sem "· atualizando").
  - `"valor invalido nao chama a cotacao"`: o alerta está dentro do campo — `expect(screen.getByRole("textbox", { name: "Valor em reais" }).closest("label")).toContainElement(await screen.findByRole("alert"))`.
  - Novo `"chip de cenario troca os centavos"`: digita `1.000,00`, clica `getByRole("button", { name: /,13/ })` → textbox com valor `"1.000,13"`.
  - Novo `"abaixo do minimo nao deixa cotar"`: valor `9,99` → `getByRole("button", { name: "Cotar" })` `toBeDisabled()`.
  - Novo `"depois de cotar o botao vira Recotar e a recusa limpa a cotacao"`: cota `1.000,00`, espera `183,61`; troca rota de quotes para 422 `ROUTE_UNAVAILABLE`; clica "Recotar" → alerta no campo com "(ROUTE_UNAVAILABLE)" e `queryByText(/183,61/)` null.
  - Novo `"validade mostra Expirada"`: rota de quotes com `expiresAt` = agora + 1 s; fake timers, avança 2000 ms → `quote-countdown` tem `"Expirada"` e "Confirmar" desabilitado.
  - Novo `"resumo mostra remetente e beneficiario"`: após cotar, a região com heading "Resumo" contém "Lucas Fernandes", "Carlos Oliveira" e "R$ 1.000,00" (use `within(screen.getByRole("heading", { name: "Resumo" }).closest("aside")!)`).
- [ ] **Step 2:** `npx vitest run src/components/CambioFlow.test.tsx` → os novos FAIL.
- [ ] **Step 3:** Implementar conforme acima.
- [ ] **Step 4:** `make test-web` → PASS.
- [ ] **Step 5: Commit** `feat(web): tela de remessa no layout do prototipo (etapas, cenarios, resumo)`.

---

### Task 4: Etapa 4 — transferência, timeline e Feedback

**Files:**
- Modify: `oxus-poc-web/src/components/CambioFlow.tsx` (`TransferStatus`; pode extrair para `src/components/TransferStatus.tsx` se passar de ~120 linhas)
- Test: `oxus-poc-web/src/components/CambioFlow.test.tsx`

**Interfaces:**
- Consumes: `StepCard`, `TagStatus`, `Feedback`, `Button` (Task 1); `transferTone`, `stageTone`, `outcomeFeedback`, `pixPending` (Task 2).
- Produces: `TransferStatus({ transfer: Transfer; holderName: string; onRestart: () => void })`.

`StepCard step={4} title="Transferência"` com `aside={<TagStatus data-testid="transfer-status" tone={transferTone(status)}>{STATUS_LABELS[status] ?? status}</TagStatus>}`. ID em Fira Code 12px #535353 `break-all`. PIX só se `pixPending`: caixa #F8F8F8 borda #E8E8E8 radius 8 padding 12 Fira Code 12/18 com o código (mantenha um `textarea readOnly` estilizado — o teste usa `findByDisplayValue`) e `Button variant="secondary"` "Copiar código"/"Copiado". Timeline `<ol>`, cada `<li>` grid `24px 1fr auto`, padding 12px 0, divisor #E8E8E8: indicador 12×12 por `stageTone` (done cheio #1C7417; active anel #94400C; failed anel #C31312; waiting anel #8A8A8A; `aria-hidden`), rótulo `STAGE_LABELS` com `reference` em mono 11px embaixo, status 14px à direita. Motivo e reembolso continuam (texto 14px; motivo em #C31312). Final: `Feedback` de `outcomeFeedback(transfer, holderName)` + `Button variant="secondary"` "Nova operação".

- [ ] **Step 1: Testes que falham:**
  - No teste de confirmação: após concluir, `getByRole("status")` contém "Remessa entregue" e "Carlos Oliveira"; `queryByDisplayValue("000201pix")` é null (pagamento concluído).
  - Novo `"PIX some quando o pagamento conclui com a transferencia em andamento"`: rota GET devolve `transfer("PROCESSING", "COMPLETED")`; após avançar 3000 ms, `queryByDisplayValue("000201pix")` null e status "Em andamento".
  - Novo `"entrega falha e reembolsa mostra Feedback de erro"`: GET devolve `REFUNDED` com stages CREATION/PAYMENT `COMPLETED`, DELIVERY `FAILED` e `refund` preenchido → `findByRole("alert")` contém "Entrega falhou"; "Nova operação" presente.
- [ ] **Step 2:** `npx vitest run src/components/CambioFlow.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `make test-web` → PASS.
- [ ] **Step 5: Commit** `feat(web): acompanhamento da transferencia com timeline e feedback`.

---

### Task 5: Runbook

**Files:**
- Modify: `docs/checkpoints/cambio-sandbox.md` (siga `docs/checkpoints/README.md`; `type: screen-web` fica).

Atualize o que mudou na tela: Home no novo visual; layout duas colunas com Resumo (e uma coluna em janela estreita); chips de cenário (clicar troca os centavos); helper "Mínimo R$ 10,00" e botão desabilitado com `9,99`; "Cotar" → "Recotar"; finalidade padrão "Viagem"; tag "Em andamento"/"Concluída"; PIX some quando o pagamento conclui; Feedback ao final por cenário (`,13` "Entrega falhou", `,14` "PIX expirado", `,15` "Operação reembolsada" se a OXUS reembolsar, sucesso "Remessa entregue"); validade "Expirada" em vez de "expirou, cote de novo"; erros de cotação dentro do campo, demais erros no Feedback do topo. Acrescente em "O que precisa bater" um item **Aparência**: abrir `docs/design/Cambio PagBank.html` ao lado e comparar cores, fontes (Inter/Fira Code), cards numerados, timeline. Mantenha o resto (chave não vaza, idempotência, valores inválidos, api fora).

- [ ] **Step 1:** Editar o runbook.
- [ ] **Step 2: Commit** `docs: runbook do cambio no novo layout`.

## Checkpoint de conferência (após a Task 5)

Aparência é critério que a suíte não pega. Proponha à pessoa rodar `/test-runbook` com `cambio-sandbox.md`, dizendo o que não foi verificado: fidelidade visual ao protótipo (Header e Feedback do DS foram reproduzidos a olho, sem o pacote), o comportamento do `,15` no sandbox real (se reembolsa ou fica parado) e o layout em janela estreita.
