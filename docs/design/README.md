# Handoff: Câmbio PagBank — Remessa BRL → exterior (sandbox OXUS)

## Overview
Fluxo de remessa internacional (BRL → USD) integrado à API da OXUS, em ambiente sandbox. O usuário escolhe cliente e conta de destino, cota o valor, confirma com uma finalidade, paga via PIX copia e cola e acompanha a transferência até a entrega.

## About the Design Files
Os arquivos deste pacote são **referências de design feitas em HTML**: protótipos que mostram aparência e comportamento, não código de produção. A tarefa é **recriar este design no ambiente do codebase alvo** (React, Next.js etc.) usando seus padrões e o PagBank Design System (Colmeia 3.0). Se ainda não houver ambiente, escolha o framework mais adequado.

- `Cambio PagBank.html`: protótipo navegável, autocontido (abre offline no navegador).
- `Cambio PagBank.dc.html`: fonte do protótipo (template + classe de lógica no final do arquivo). A lógica de estado e cenários está na classe `Component`.

## Fidelity
**High-fidelity.** Cores, tipografia e componentes seguem o Colmeia 3.0 (tema `core-light`). Use os componentes reais do design system do codebase.

## Screens / Views

### 1. Home (`screen = 'home'`)
- Container centralizado, `max-width: 720px`, padding `64px 24px`, coluna com gap 16px.
- Overline "Câmbio": 12px / 600, uppercase, letter-spacing .06em, `--content-brand-primary-default` #1C7417.
- Título "oxus-poc": 36px / 44px / 700, #272727.
- Texto "POC de integração com a API da OXUS para câmbio BRL → USD.": 16px / 24px, `--content-neutral-secondary` #535353.
- Botão primário DS "Testar remessa no sandbox" → abre o fluxo.

### 2. Fluxo de remessa (`screen = 'flow'`)
- Header DS (`Header`) no topo com nome/e-mail do cliente selecionado.
- Link "← Voltar" (14px/600, #0078AD): reseta o fluxo e volta à Home.
- `main`: `max-width: 1080px`, padding `8px 24px 64px`, grid `minmax(0,1fr) minmax(0,340px)`, gap 24px.
- Cabeçalho (ocupa as 2 colunas): overline "Câmbio · Sandbox OXUS", H1 "Remessa BRL → exterior" (36/44/700), descrição 16/24 #535353.
- Coluna esquerda: 4 cards de etapa empilhados (gap 16px). Coluna direita: card "Resumo" `position: sticky; top: 24px`.

**Card de etapa (padrão)**: fundo #FFFFFF, borda 1px `--border-neutral-subtle` #E8E8E8, radius 12px, padding 24px, gap 16px. Cabeçalho: círculo 28×28 #1D8915 com número branco 14/700 + título 18/600.

**Etapa 1 — Cliente e conta de destino**
- Grid `repeat(auto-fit, minmax(220px,1fr))`, gap 16px.
- Select "Cliente": Lucas Fernandes, Mariana Costa.
- Select "Conta de destino": "ACH •••• 6789 · Carlos Oliveira (USD)", "SWIFT •••• 2201 · Ana Ribeiro (USD)".
- Select: altura 48px, padding 0 12px, borda 1px #D3D3D3, radius 8px, texto 16px #272727; label 14px #535353, gap 6px. (O DS ainda não tem Select; substituir pelo componente oficial quando houver.)
- Bloqueados depois que a transferência é criada.

**Etapa 2 — Cotação**
- DS `FormField` "Valor em reais", prefix "R$", helper "Mínimo R$ 10,00", erro "Sem rota disponível para este valor.".
- Botão primário DS: "Cotar" → "Cotando…" (600ms) → "Recotar". Desabilitado se valor < 10 ou com transferência ativa.
- Chips de cenário (pill, borda #D3D3D3, 12px Fira Code, `white-space: nowrap`, hover borda #1D8915): `,13 entrega falha e reembolsa`, `,14 PIX expira`, `,15 fica parada até reembolso`, `,99 sem rota`. Clique troca os centavos do valor atual.
- Resultado da cotação (separador 1px #E8E8E8 no topo):
  - Bloco #F8F8F8, radius 8px, padding 16px, grid `1fr auto 1fr`: "Você envia" (20/600) → "Destino recebe" (24/700 #1C7417).
  - Tabela 2 colunas (14px, row-gap 10px): Câmbio `0.184062` (mono), VET (mono, 6 casas), Tarifas "R$ 8,75 (OXUS R$ 0,60 + entrega R$ 8,15)", Prazo estimado "Mesmo dia · 3 rotas avaliadas", Validade `m:ss`.
  - Validade: #272727 normal; #94400C abaixo de 60s; #C31312 "Expirada" em 0; "Usada" após confirmar.

**Etapa 3 — Confirmação**
- Opacidade 0.5 até existir cotação.
- Select "Finalidade": Conta própria, Manutenção de família, Educação, Saúde, Viagem (padrão), Serviços, Mercadorias.
- Botão primário "Confirmar": habilitado só com cotação válida (não expirada) e sem transferência ativa.

**Etapa 4 — Transferência** (aparece após confirmar)
- Título + DS `TagStatus` à direita: attention "Em andamento"/"Parada", success "Concluída", error "Expirada"/"Reembolsada".
- ID da transferência `trf_…` (Fira Code 12px #535353, quebra de linha livre).
- "PIX copia e cola": caixa #F8F8F8, borda #E8E8E8, radius 8px, padding 12px, Fira Code 12/18. Botão secundário "Copiar código" → "Copiado" (copia para o clipboard). Visível apenas enquanto o pagamento PIX está pendente.
- Timeline com 4 linhas (grid `24px 1fr auto`, padding 12px 0, divisor #E8E8E8): Criação, Pagamento PIX, Liquidação, Entrega.
  - Indicador 12×12: preenchido #1C7417 (concluída); anel #94400C (em andamento/parada); anel #C31312 (falha); anel #8A8A8A (aguardando).
  - Referência mono 11px sob o rótulo quando concluída (E2E do PIX, TRC da entrega).
  - Status à direita 14px: Concluída / Em andamento / Aguardando / Expirado / Parada / Falhou · reembolsado / Reembolsada.
- Ao finalizar: DS `Feedback` (size md) + botão secundário "Nova operação" (reseta cotação e transferência).

**Resumo (coluna direita)**
- Remetente (nome 14/600 + CPF mascarado 12px), Beneficiário (titular + rótulo da conta), divisor, "Total a pagar", "Recebe" (700 #1C7417), "Finalidade", nota legal 12/18 #535353 (texto provisório sobre IOF, validar com jurídico/produto).

## Interactions & Behavior
- Home → Fluxo: botão "Testar remessa no sandbox". Fluxo → Home: "← Voltar" (reseta).
- Cotação: `recebe = floor((valor − 8,75) × 0,184062 × 100) / 100`; `VET = recebe / valor`. Validade de 300s com contagem regressiva de 1s.
- Cenários pelos centavos do valor:
  - `,99`: erro de sem rota no campo, nenhuma cotação.
  - `,14`: após ~3,5s o PIX expira (Criação concluída, Pagamento PIX "Expirado"), Feedback error.
  - `,13`: avança até a Entrega e falha com reembolso (~6,5s), Feedback error.
  - `,15`: Entrega fica "Parada" (~7s) e depois é reembolsada (~11s), Feedback warning.
  - Outros: Criação → Pagamento PIX (2,5s) → Liquidação (4,5s) → Entrega concluída (6,5s), Feedback success "Remessa entregue".
- Em produção, os tempos simulados viram polling/webhooks da API OXUS.

## State Management
`screen` ('home'|'flow'), `clientId`, `accountId`, `amount` (string pt-BR), `quote` ({v, recv, vet} | null), `left` (segundos de validade), `purpose`, `transfer` ({id, pix, refs[4]} | null), `stage` (0–4), `outcome` (null|'done'|'expired'|'failed'|'stuck'|'refunded_stuck'), `copied`, `noRoute`, `loading`.

Dados a buscar na API real: clientes e contas do sandbox, cotação (taxa, VET, tarifas, prazo, rotas, expiração), criação da transferência (id + PIX), status por etapa.

## Design Tokens (core-light)
- Brand: `--bg-brand-primary-default` #1D8915, `--content-brand-primary-default` #1C7417
- Interativo/link: #0078AD
- Texto: `--content-neutral-default` #272727, `--content-neutral-secondary` #535353, tertiary #8A8A8A
- Superfícies: `--bg-neutral-default` #FFFFFF, `--bg-neutral-subtle` #F8F8F8
- Bordas: `--border-neutral-default` #D3D3D3, `--border-neutral-subtle` #E8E8E8
- Feedback: positivo #1C7417, atenção #94400C, negativo #C31312
- Tipografia: Inter 400/600/700; Fira Code 400 para valores técnicos (taxas, IDs, PIX)
- Escala usada: 36/44 (H1), 24, 20, 18 (títulos de card), 16, 14, 12, 11
- Espaçamento: 4, 8, 12, 16, 24, 32, 64
- Radius: 8px (inputs, blocos), 12px (cards), 999px (chips, botões DS)

## Assets
Nenhuma imagem própria. Componentes do PagBank Design System (Colmeia 3.0): Header, Button, FormField, TagStatus, Feedback.

## Files
- `Cambio PagBank.html`: protótipo navegável autocontido
- `Cambio PagBank.dc.html`: fonte (template + lógica)
