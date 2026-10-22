# Layout do câmbio no visual Colmeia 3.0 — design

## Intenção

Deixar a Home (`/`) e a tela de remessa (`/cambio`) do `oxus-poc-web`
visualmente iguais ao protótipo do handoff em `docs/design/` (README +
`Cambio PagBank.html` / `.dc.html`), sem o pacote do PagBank Design System,
que o projeto não tem. O comportamento real contra a OXUS (via `-api`) não
muda: clientes com KYC pendente, receivers validados, cotação, idempotência,
polling a cada 3 s até status final.

## Objetivos, não-objetivos, anti-objetivos

- **Objetivo:** estrutura, textos, cores, tipografia, espaçamentos e estados
  visuais como no `docs/design/README.md`.
- **Não-objetivo:** instalar o Colmeia; mexer no mobile; mudar a API, o `-api`
  ou as rotas do Next (`/api/...`); modo escuro (o protótipo é só `core-light`).
- **Anti-objetivo:** trazer a simulação do protótipo (tempos fixos, cotação
  calculada no cliente) para a tela. Qualquer número na tela continua vindo da
  OXUS.

## Abordagens

- **A. Tokens no Tailwind + componentes locais em `src/components/ui/`
  (escolhida).** Segue o idioma do projeto; se o Colmeia entrar, a troca fica
  confinada a `ui/`.
- **B. CSS do protótipo num CSS Module.** Mais literal, mas cria um segundo
  jeito de estilizar e nada reaproveitável.
- Descartada: colar o HTML do protótipo — ele simula a API.

Escolha da pessoa: **A**.

## Como

- **Tokens:** `globals.css` ganha no `@theme` as cores do README (brand
  #1D8915 / #1C7417, link #0078AD, textos #272727 / #535353 / #8A8A8A,
  superfícies #FFFFFF / #F8F8F8, bordas #D3D3D3 / #E8E8E8, feedback #1C7417 /
  #94400C / #C31312) com os nomes do DS (`brand-primary`, `neutral-secondary`
  etc.). Fontes Inter (400/600/700) e Fira Code (400) por `next/font/google`,
  substituindo Geist. Sai o bloco `prefers-color-scheme: dark`.
- **`src/components/ui/`:** `Button` (primary/secondary, pill), `FormField`
  (label, prefix, helper, erro), `Select`, `TagStatus` (attention/success/error),
  `Feedback` (success/warning/error, md), `Header`, `StepCard` (círculo
  numerado + título). Só a aparência; sem lógica de negócio.
- **Home:** overline "Câmbio", título 36/44, texto, botão primário "Testar
  remessa no sandbox" (link para `/cambio`).
- **`/cambio`:** Header com nome/e-mail do cliente escolhido, "← Voltar" para
  `/`, grid `1fr / 340px` com o cabeçalho ocupando as duas colunas, os 4 cards
  à esquerda e o card "Resumo" sticky à direita, como no README.
- **Comportamento que o protótipo traz e a tela passa a ter:** chips de cenário
  (`,13` `,14` `,15` `,99`) que trocam os centavos do valor digitado; botão
  "Cotar" → "Cotando…" → "Recotar"; helper "Mínimo R$ 10,00" e botão
  desabilitado abaixo disso; card 3 sempre visível com opacidade 0.5 até haver
  cotação; validade em `m:ss`, âmbar abaixo de 60 s, "Expirada" em 0, "Usada"
  após confirmar; PIX copia e cola só enquanto o pagamento está pendente;
  timeline com indicador por estado; `Feedback` + "Nova operação" ao chegar a
  status final.
- **De-para dos status reais para o visual:** etapa `COMPLETED` → ponto cheio
  verde; `IN_PROGRESS`/`WAITING_PAYMENT`/`PROCESSING` → anel âmbar; `FAILED`/
  `EXPIRED` → anel vermelho; `PENDING` → anel cinza. Tag da transferência:
  `PROCESSING`/`REFUNDING` attention, `COMPLETED` success, `FAILED`/`EXPIRED`/
  `REFUNDED`/`CANCELLED` error. Feedback: `COMPLETED` success "Remessa
  entregue"; `REFUNDED` após falha de entrega error; `EXPIRED` error;
  reembolso de transferência parada (`,15`) warning. Rótulos continuam vindo de
  `STATUS_LABELS`/`STAGE_LABELS`.
- **Erros:** recusa da cotação (ex.: `ROUTE_UNAVAILABLE`) e valor inválido
  aparecem como erro do `FormField` "Valor em reais"; erros fora da cotação
  (api fora, chave errada, falha ao confirmar/consultar) num `Feedback` error
  no topo da coluna. Ambos com `role="alert"`.
- **Testes e runbook:** `CambioFlow.test.tsx` e `page.test.tsx` ajustados aos
  novos textos ("Recotar", "Em andamento" sem "· atualizando", "Expirada");
  `data-testid` existentes ficam. `docs/checkpoints/cambio-sandbox.md`
  atualizado para o novo layout (chips, Resumo, Feedback, textos de validade).

## Decisões que foram minhas (conferir)

- **Finalidade:** mantém as 8 opções da API (o protótipo omite
  "Investimento"); padrão "Viagem", como no protótipo.
- **Resumo:** a API não devolve CPF; sob o nome do remetente vai o e-mail.
- **Mínimo R$ 10,00:** aplicado só na tela; se a OXUS recusar outro valor, o
  erro dela aparece no campo.
- **Responsivo:** abaixo de ~900 px o grid vira uma coluna com o Resumo depois
  dos cards (o protótipo não define).

## Fica com quem constrói

Nomes exatos dos tokens no `@theme`, divisão interna dos componentes de `ui/`,
texto da nota legal do Resumo (copiar o provisório do protótipo).
