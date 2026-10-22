# Chamadas da POC em curl — câmbio BRL → USD na OXUS

> Cada etapa da tela `/cambio`, a rota da POC que ela chama e a chamada que a POC faz à API da OXUS (versão `2026-10-01`, https://docs.oxus.finance/referencia). As respostas abaixo foram capturadas no sandbox em 2026-10-22 e cortadas onde indicado.
>
> Dúvidas de produto: [requirements-doubts.md](requirements-doubts.md). Conferência manual da tela: [docs/checkpoints/cambio-sandbox.md](docs/checkpoints/cambio-sandbox.md).

## Antes de começar

```bash
export OXUS_API_URL=https://docs.oxus.finance/api/sandbox
export OXUS_API_KEY=oxk_sandbox_parceirodemo2026   # chave de demonstração publicada na referência da OXUS
export POC_API_URL=http://localhost:8080           # oxus-poc-api rodando com `make run`
```

- Toda chamada à OXUS leva `Authorization: Bearer $OXUS_API_KEY`. A chave fica **só no back** (`oxus-poc-api`); o navegador nunca a vê.
- Valores são **inteiros em centavos**: `100000` = R$ 1.000,00.
- Caminho de cada chamada da tela: navegador → Next (`/api/...`) → `oxus-poc-api` → OXUS.

## Visão geral

| # | Etapa na tela | Rota da POC (`oxus-poc-api`) | Chamada à OXUS | Sucesso |
|---|---|---|---|---|
| 1 | Carregar clientes | `GET /customers` | `GET /v1/customers` | 200 |
| 2 | Escolher conta de destino | `GET /customers/{id}/receivers` | `GET /v1/customers/{id}/receivers` | 200 |
| 3 | Cotar | `POST /quotes` | `POST /v1/quotes` | 201 |
| 4 | Confirmar (gera o PIX) | `POST /transfers` | `POST /v1/transfers` | 201 |
| 5 | Acompanhar (a cada 3 s) | `GET /transfers/{id}` | `GET /v1/transfers/{id}` | 200 |

Na POC não há banco: o status vem sempre da OXUS, a cada consulta.

---

## 1. Listar clientes

A tela só deixa escolher cliente com `status: ACTIVE` e `kyc.status: ATTESTED`; os outros aparecem como "(KYC pendente)".

**OXUS**

```bash
curl -s "$OXUS_API_URL/v1/customers" \
  -H "Authorization: Bearer $OXUS_API_KEY"
```

**POC**

```bash
curl -s "$POC_API_URL/customers"
```

**Resposta da OXUS — `200 OK`**

```json
{
  "data": [
    {
      "id": "cus_8f2a91c04d7e",
      "externalId": "cliente-019838",
      "type": "INDIVIDUAL",
      "name": "Lucas Fernandes",
      "email": "lucas@exemplo.com.br",
      "status": "ACTIVE",
      "kyc": {
        "status": "ATTESTED",
        "level": "STANDARD",
        "attestationId": "kya_8f2a91c04d7e",
        "attestedAt": "2026-10-10T14:36:04.061Z",
        "expiresAt": "2027-10-10T14:36:04.061Z"
      },
      "createdAt": "2026-10-10T14:36:04.061Z",
      "updatedAt": "2026-10-10T14:36:04.061Z"
    }
  ],
  "nextCursor": null
}
```

A POC devolve o mesmo cliente em `{"customers": [...]}`, só com `id`, `name`, `email`, `status` e `kyc`.

| Status do cliente | Significa |
|---|---|
| `PENDING_KYC_ATTESTATION` | Cadastrado, sem atestação de KYC. Não pode cotar (`KYC_ATTESTATION_REQUIRED`) |
| `ACTIVE` | Pode cotar e transferir |
| `SUSPENDED` | Bloqueado |

| `kyc.status` | Significa |
|---|---|
| `MISSING` | Nunca atestado |
| `ATTESTED` | Atestado e válido até `kyc.expiresAt` |
| `EXPIRED` | Atestação vencida: precisa renovar |

## 2. Listar contas de destino do cliente

A tela só mostra contas `VALIDATED` e escolhe sozinha quando há uma só.

**OXUS**

```bash
curl -s "$OXUS_API_URL/v1/customers/cus_8f2a91c04d7e/receivers" \
  -H "Authorization: Bearer $OXUS_API_KEY"
```

**POC**

```bash
curl -s "$POC_API_URL/customers/cus_8f2a91c04d7e/receivers"
```

**Resposta da OXUS — `200 OK`**

```json
{
  "data": [
    {
      "id": "rcv_AHShHbju",
      "customerId": "cus_8f2a91c04d7e",
      "rail": "ACH",
      "currency": "USD",
      "holder": {
        "type": "INDIVIDUAL",
        "name": "Carlos Oliveira",
        "relationship": "FAMILY",
        "country": "USA"
      },
      "displayLabel": "ACH •••• 6789",
      "status": "VALIDATED",
      "createdAt": "2026-10-19T14:36:04.358Z"
    }
  ],
  "nextCursor": null
}
```

| Status da conta | Significa |
|---|---|
| `VALIDATING` | Em validação no rail |
| `VALIDATED` | Pronta para receber |
| `REJECTED` | Recusada |

## 3. Cotar

A POC sempre cota BRL por PIX, com o valor de origem (`amountType: SOURCE`). A cotação vale **5 minutos** (`expiresAt`).

**OXUS**

```bash
curl -s -X POST "$OXUS_API_URL/v1/quotes" \
  -H "Authorization: Bearer $OXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cus_8f2a91c04d7e",
    "receiverId": "rcv_AHShHbju",
    "paymentMethod": "PIX",
    "sourceCurrency": "BRL",
    "amount": 100000,
    "amountType": "SOURCE"
  }'
```

**POC** — só o que muda; o resto a POC preenche

```bash
curl -s -X POST "$POC_API_URL/quotes" \
  -H "Content-Type: application/json" \
  -d '{"customerId": "cus_8f2a91c04d7e", "receiverId": "rcv_AHShHbju", "amountInCents": 100000}'
```

**Resposta da OXUS — `201 Created`**

```json
{
  "id": "quo_jyqRwE1-AHShHbjuAAAAAAABhqBq2h9U",
  "type": "REMITTANCE",
  "customerId": "cus_8f2a91c04d7e",
  "receiverId": "rcv_AHShHbju",
  "sourceAmount": 100000,
  "sourceCurrency": "BRL",
  "destinationAmount": 18092,
  "destinationCurrency": "USD",
  "exchangeRate": "0.183524",
  "effectiveRate": "0.180920",
  "fees": {
    "oxusFee": 600,
    "payoutFee": 818,
    "total": 1418,
    "currency": "BRL"
  },
  "routing": {
    "evaluatedRoutes": 5,
    "selectedRouteId": "rte_brl_usd_ach_01",
    "estimatedDelivery": "SAME_DAY"
  },
  "expiresAt": "2026-10-22T14:41:04.000Z",
  "createdAt": "2026-10-22T14:36:04.000Z"
}
```

Leitura: R$ 1.000,00 viram **US$ 180,92**; câmbio 0,183524; VET 0,180920; tarifas R$ 14,18 (OXUS R$ 6,00 + entrega R$ 8,18); entrega estimada no mesmo dia; 5 rotas avaliadas.

`estimatedDelivery` pode ser `INSTANT`, `MINUTES`, `SAME_DAY` ou `NEXT_BUSINESS_DAY`.

## 4. Confirmar — criar a transferência

Executa a cotação e devolve o **PIX copia e cola**. O header `Idempotency-Key` é obrigatório: a tela gera um UUID por cotação, então confirmar duas vezes devolve a **mesma** transferência em vez de criar outra.

**OXUS**

```bash
curl -s -X POST "$OXUS_API_URL/v1/transfers" \
  -H "Authorization: Bearer $OXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"quoteId": "quo_jyqRwE1-AHShHbjuAAAAAAABhqBq2h9U", "purpose": "OWN_ACCOUNT"}'
```

**POC**

```bash
curl -s -X POST "$POC_API_URL/transfers" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"quoteId": "quo_jyqRwE1-AHShHbjuAAAAAAABhqBq2h9U", "purpose": "OWN_ACCOUNT"}'
```

Não mande campo opcional como `null` (por exemplo `"externalReference": null`): a OXUS recusa com `VALIDATION_ERROR` em vez de tratar como ausente. Omita o campo.

`purpose` aceita `FAMILY_SUPPORT`, `EDUCATION`, `MEDICAL`, `TRAVEL`, `SERVICES`, `GOODS`, `INVESTMENT` e `OWN_ACCOUNT` (padrão da tela).

**Resposta da OXUS — `201 Created`**

```json
{
  "id": "trf_jyqRwE1-AHShHbjuAAAAAAABhqBq2h9UatofYQemzA",
  "type": "REMITTANCE",
  "status": "PROCESSING",
  "customerId": "cus_8f2a91c04d7e",
  "receiverId": "rcv_AHShHbju",
  "quoteId": "quo_jyqRwE1-AHShHbjuAAAAAAABhqBq2h9U",
  "purpose": "OWN_ACCOUNT",
  "sourceAmount": 100000,
  "sourceCurrency": "BRL",
  "destinationAmount": 18092,
  "destinationCurrency": "USD",
  "exchangeRate": "0.183524",
  "fees": { "oxusFee": 600, "payoutFee": 818, "total": 1418, "currency": "BRL" },
  "paymentInstructions": {
    "method": "PIX",
    "amount": 100000,
    "currency": "BRL",
    "pixCopyPaste": "00020126580014br.gov.bcb.pix0136…5915OXUS PAGAMENTOS6009SAO PAULO…6304C0DF",
    "expiresAt": "2026-10-22T15:06:17.000Z"
  },
  "stages": [
    { "stage": "CREATION",   "status": "COMPLETED",       "updatedAt": "2026-10-22T14:36:17.000Z" },
    { "stage": "PAYMENT",    "status": "WAITING_PAYMENT", "updatedAt": "2026-10-22T14:36:17.000Z" },
    { "stage": "SETTLEMENT", "status": "PENDING" },
    { "stage": "DELIVERY",   "status": "PENDING" }
  ],
  "createdAt": "2026-10-22T14:36:17.000Z",
  "updatedAt": "2026-10-22T14:36:17.000Z"
}
```

O PIX vale 30 minutos (`paymentInstructions.expiresAt`). No sandbox ele **não deve ser pago**: o pagamento é simulado sozinho.

## 5. Acompanhar o status

A tela consulta a cada 3 s até um status final (`COMPLETED`, `FAILED`, `REFUNDED`, `EXPIRED` ou `CANCELLED`).

**OXUS**

```bash
curl -s "$OXUS_API_URL/v1/transfers/trf_jyqRwE1-AHShHbjuAAAAAAABhqBq2h9UatofYQemzA" \
  -H "Authorization: Bearer $OXUS_API_KEY"
```

**POC**

```bash
curl -s "$POC_API_URL/transfers/trf_jyqRwE1-AHShHbjuAAAAAAABhqBq2h9UatofYQemzA"
```

**Linha do tempo no sandbox** (valor sem final mágico)

| Tempo | `status` | Etapa em andamento |
|---|---|---|
| 0–15 s | `PROCESSING` | `PAYMENT` (`WAITING_PAYMENT`) |
| 15–30 s | `PROCESSING` | `SETTLEMENT` |
| 30–45 s | `PROCESSING` | `DELIVERY` |
| após 45 s | `COMPLETED` | — |

**Resposta final — `200 OK`** (só o que muda em relação ao passo 4)

```json
{
  "id": "trf_jyqRwE1-AHShHbjuAAAAAAABhqBq2h9UatofYQemzA",
  "status": "COMPLETED",
  "stages": [
    { "stage": "CREATION",   "status": "COMPLETED", "updatedAt": "2026-10-22T14:36:17.000Z" },
    { "stage": "PAYMENT",    "status": "COMPLETED", "updatedAt": "2026-10-22T14:36:32.000Z", "reference": "E2E4A928285E9C2907E2C681B86" },
    { "stage": "SETTLEMENT", "status": "COMPLETED", "updatedAt": "2026-10-22T14:36:47.000Z" },
    { "stage": "DELIVERY",   "status": "COMPLETED", "updatedAt": "2026-10-22T14:37:02.000Z", "reference": "TRCE13AD703AD9A30B79EC5A4FB" }
  ],
  "updatedAt": "2026-10-22T14:37:02.000Z"
}
```

Os demais campos (valores, câmbio, tarifas, `paymentInstructions`) continuam os do passo 4.

### Status da transferência

| `status` | Final? | Significa | Na tela |
|---|---|---|---|
| `PROCESSING` | não | Em alguma etapa | Em andamento |
| `COMPLETED` | sim | Valor creditado ao beneficiário | Concluída |
| `FAILED` | sim | Entrega recusada no destino | Falhou |
| `REFUNDING` | não | Reembolso em andamento | Reembolsando |
| `REFUNDED` | sim | Valor devolvido à origem do PIX | Reembolsada |
| `EXPIRED` | sim | PIX não pago dentro do prazo | Expirada |
| `CANCELLED` | sim | Cancelada antes de o PIX ser pago | Cancelada |

### Status de cada etapa (`stages[].status`)

| Etapa | O que é | `reference` quando conclui |
|---|---|---|
| `CREATION` | Transferência criada | — |
| `PAYMENT` | PIX de entrada | código E2E do PIX |
| `SETTLEMENT` | Liquidação do câmbio | — |
| `DELIVERY` | Crédito na conta do exterior | trace do rail (ex.: ACH `TRC…`) |

Valores possíveis: `PENDING`, `WAITING_PAYMENT`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `EXPIRED`, `CANCELLED`.

### Quando dá errado depois de criada

A transferência não volta erro HTTP: ela muda de status e explica em `failureReason` (texto livre) e, se houver, em `refund`. Exemplo real do sandbox com o final `13` (entrega recusada e reembolso automático):

```json
{
  "status": "REFUNDED",
  "stages": [
    { "stage": "CREATION",   "status": "COMPLETED" },
    { "stage": "PAYMENT",    "status": "COMPLETED" },
    { "stage": "SETTLEMENT", "status": "COMPLETED" },
    { "stage": "DELIVERY",   "status": "FAILED" }
  ],
  "failureReason": "Conta do beneficiário recusada pelo banco de destino (R03 · conta inexistente).",
  "refund": { "status": "COMPLETED", "reason": "DELIVERY_FAILED", "…": "…" }
}
```

E com o final `14` (PIX não pago):

```json
{
  "status": "EXPIRED",
  "stages": [
    { "stage": "CREATION",   "status": "COMPLETED" },
    { "stage": "PAYMENT",    "status": "EXPIRED" },
    { "stage": "SETTLEMENT", "status": "PENDING" },
    { "stage": "DELIVERY",   "status": "PENDING" }
  ],
  "failureReason": "O pagamento de entrada não foi identificado dentro do prazo."
}
```

---

## Erros de chamada

Erros na hora do pedido vêm da OXUS neste formato:

```json
{
  "error": {
    "code": "ROUTE_UNAVAILABLE",
    "message": "Nenhuma rota disponível para esta combinação de origem, destino e valor no momento.",
    "details": { "…": "…" },
    "requestId": "req_f17164058a990b91"
  }
}
```

A POC traduz para `ProblemDetail` (RFC 9457). Recusa que quem chama pode corrigir mantém o `code` da OXUS:

```json
{
  "status": 422,
  "detail": "Nenhuma rota disponível para esta combinação de origem, destino e valor no momento.",
  "errors": [{ "code": "ROUTE_UNAVAILABLE", "message": "Nenhuma rota disponível para esta combinação de origem, destino e valor no momento." }]
}
```

| Situação | HTTP OXUS | `code` | HTTP POC |
|---|---|---|---|
| Campo inválido (inclusive `null` em campo opcional) | 422 | `VALIDATION_ERROR` | 422 |
| Cotação passou dos 5 min | 422 | `QUOTE_EXPIRED` | 422 |
| Nenhum provedor atende | 422 | `ROUTE_UNAVAILABLE` | 422 |
| Cliente sem KYC atestado | 422 | `KYC_ATTESTATION_REQUIRED` | 422 |
| `POST /v1/transfers` sem `Idempotency-Key` | 400 | `IDEMPOTENCY_KEY_REQUIRED` | 400 (a POC barra antes de chamar a OXUS) |
| Mesma `Idempotency-Key` com corpo diferente | 409 | `IDEMPOTENCY_CONFLICT` | 422 |
| Cancelar ou reembolsar fora da janela | 409 | `TRANSFER_NOT_CANCELLABLE` / `TRANSFER_NOT_REFUNDABLE` | 422 |
| Recurso não existe | 404 | `NOT_FOUND` | 404, corpo genérico |
| Chave errada ou revogada | 401 | `UNAUTHORIZED` | 502, "Servico de cambio indisponivel." |
| Chave de produção no sandbox | 403 | `FORBIDDEN` | 502 |
| Limite de requisições | 429 | `RATE_LIMITED` | 502 |
| Falha da OXUS ou do provedor | 5xx | `PROVIDER_ERROR` / `INTERNAL_ERROR` | 502 |

O 502 da POC é genérico de propósito; o status, o `code` e o `requestId` da OXUS ficam no log do `oxus-poc-api`, nunca a chave.

### Reproduzir os erros

```bash
# ROUTE_UNAVAILABLE (final mágico 99) → 422
curl -s -X POST "$OXUS_API_URL/v1/quotes" \
  -H "Authorization: Bearer $OXUS_API_KEY" -H "Content-Type: application/json" \
  -d '{"customerId":"cus_8f2a91c04d7e","receiverId":"rcv_AHShHbju","paymentMethod":"PIX","sourceCurrency":"BRL","amount":100099,"amountType":"SOURCE"}'

# IDEMPOTENCY_KEY_REQUIRED → 400
curl -s -X POST "$OXUS_API_URL/v1/transfers" \
  -H "Authorization: Bearer $OXUS_API_KEY" -H "Content-Type: application/json" \
  -d '{"quoteId":"<quo_…>","purpose":"OWN_ACCOUNT"}'

# IDEMPOTENCY_CONFLICT → 409: a mesma chave de um pedido anterior, com outro purpose
curl -s -X POST "$OXUS_API_URL/v1/transfers" \
  -H "Authorization: Bearer $OXUS_API_KEY" -H "Content-Type: application/json" \
  -H "Idempotency-Key: <a mesma chave do passo 4>" \
  -d '{"quoteId":"<quo_…>","purpose":"EDUCATION"}'

# VALIDATION_ERROR por campo null → 422, com details.fields
curl -s -X POST "$OXUS_API_URL/v1/transfers" \
  -H "Authorization: Bearer $OXUS_API_KEY" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"quoteId":"<quo_…>","purpose":"OWN_ACCOUNT","externalReference":null}'

# UNAUTHORIZED → 401
curl -s "$OXUS_API_URL/v1/customers" -H "Authorization: Bearer oxk_sandbox_errada"

# NOT_FOUND → 404
curl -s "$OXUS_API_URL/v1/transfers/trf_naoexiste" -H "Authorization: Bearer $OXUS_API_KEY"
```

Respostas reais:

```json
{ "error": { "code": "IDEMPOTENCY_KEY_REQUIRED", "message": "Envie o header `Idempotency-Key` (ex.: um UUID v4 por operação)." } }
{ "error": { "code": "IDEMPOTENCY_CONFLICT", "message": "Esta `Idempotency-Key` já foi usada em outra requisição." } }
{ "error": { "code": "VALIDATION_ERROR", "message": "Um ou mais campos são inválidos.",
             "details": { "fields": [{ "field": "externalReference", "message": "Invalid input: expected string, received null" }] } } }
{ "error": { "code": "UNAUTHORIZED", "message": "API key inválida ou revogada." } }
{ "error": { "code": "NOT_FOUND", "message": "Transferência não encontrado(a)." } }
```

## Cenários do sandbox (finais mágicos)

Os dois últimos dígitos do `amount` da cotação mudam o desfecho:

| Final | Exemplo | Desfecho |
|---|---|---|
| `13` | `100013` | Entrega falha em ~30 s (`FAILED`), reembolso automático (`REFUNDING`) e `REFUNDED` em ~60 s |
| `14` | `100014` | PIX nunca pago: `EXPIRED` em ~15 s |
| `15` | `100015` | Entrega fica em andamento até alguém pedir reembolso |
| `99` | `100099` | A cotação já falha com `422 ROUTE_UNAVAILABLE` |

## O que a POC ainda não chama

| Etapa | Chamada à OXUS | Por que ainda não |
|---|---|---|
| Cadastrar cliente | `POST /v1/customers` | Próxima fatia (KYC) |
| Atestar KYC | `POST /v1/customers/{id}/kyc-attestations`, `POST /v1/kyc/signing-keys` | Exige assinatura Ed25519 e dossiê cifrado |
| Cadastrar conta de destino | `POST /v1/customers/{id}/receivers` | O sandbox já traz uma conta validada |
| Cancelar | `POST /v1/transfers/{id}/cancel` | Só antes de o PIX ser pago |
| Reembolsar | `POST /v1/transfers/{id}/refund` (exige `Idempotency-Key`) | Fora do escopo do teste |
| Webhooks | `POST /v1/webhook-endpoints` e eventos `transfer.*` | A POC consulta o status em vez de receber eventos |
