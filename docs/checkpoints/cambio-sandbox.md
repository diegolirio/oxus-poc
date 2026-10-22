---
type: screen-web
---

# Remessa BRL → exterior no sandbox da OXUS

Tela `/cambio` do `-web`: escolher cliente e conta de destino prontos do
sandbox, cotar, confirmar, receber o PIX copia e cola e acompanhar as etapas
até um status final. Sem KYC nem cadastro de cliente (próxima fatia). O
navegador fala só com o Next; o Next repassa ao `-api`, que guarda a chave e
chama a OXUS.

## Preparação

Subir é preparação; a conferência é na tela.

1. A chave do sandbox é a de demonstração publicada na referência da OXUS
   (https://docs.oxus.finance/referencia, "Autenticação"). Exporte no shell
   que vai rodar o `make run` — o Makefile não lê `.env.local`:

   ```bash
   export OXUS_API_KEY=oxk_sandbox_parceirodemo2026
   ```

   `OXUS_API_URL` e `OXUS_POC_API_URL` ficam no padrão (sandbox e
   `http://localhost:8080`).
2. `make run` (Postgres na 5433, api na 8080, web na 3000). No log da api
   **não** pode aparecer `OXUS_API_KEY esta vazia`.
3. Abra `http://localhost:3000/cambio`.

## O que precisa bater

1. **Clientes:** o seletor "Cliente" lista os clientes do sandbox; os que não
   estão `ACTIVE` com KYC `ATTESTED` aparecem com "(KYC pendente)" e não
   podem ser escolhidos. Escolha "Lucas Fernandes".
2. **Conta:** "Conta de destino" se preenche sozinha com `ACH •••• 6789 ·
   Carlos Oliveira (USD)` (é a única validada).
3. **Cotação:** digite `1.000,00` e clique em **Cotar**. Aparecem: "Você
   envia" R$ 1.000,00, "Destino recebe" em US$ (por volta de US$ 183), câmbio
   e VET com seis casas, tarifas com a divisão OXUS + entrega, prazo
   estimado com o número de rotas avaliadas e a validade contando de 5:00
   para baixo.
4. **Confirmação:** deixe a finalidade em "Conta própria" e clique em
   **Confirmar**. Aparece o bloco "4. Transferência" com o id `trf_…`, o
   **PIX copia e cola** (começa com `000201`) e o botão "Copiar código".
5. **Acompanhamento:** sem recarregar, o status passa de "Em andamento ·
   atualizando" para **Concluída** em cerca de 45 s, e as etapas Pagamento
   PIX, Liquidação e Entrega vão para "Concluída", as de pagamento e entrega
   com uma referência (`E2E…`, `TRC…`). Ao concluir aparece "Nova operação".
6. **A chave não vaza:** DevTools > Network, filtre por `oxk_`: nenhuma
   requisição ou resposta do navegador tem a chave. Todas as chamadas vão para
   `localhost:3000/api/...`, nenhuma para `oxus.finance`.

## O que tentar para ver se quebra

- **Finais mágicos do sandbox** (os centavos do valor):
  - `1.000,13`: a entrega falha por volta de 30 s, o status vira
    "Reembolsando" e depois **Reembolsada**, com o motivo e o bloco de
    reembolso.
  - `1.000,14`: o PIX nunca é pago e a transferência **Expira** em ~15 s.
  - `1.000,15`: fica "Em andamento" na entrega e não termina sozinha. A tela
    continua consultando a cada 3 s — confira no Network que a consulta não
    dispara mais rápido que isso nem para.
  - `1.000,99`: a cotação é recusada com "… (ROUTE_UNAVAILABLE)" no aviso
    vermelho, e nada de cotação aparece.
- **Cotação vencida:** cote, espere a validade chegar a 0:00. O texto vira
  "expirou, cote de novo" e **Confirmar** fica desabilitado. Cote de novo e
  confirme normalmente.
- **Duplo clique em Confirmar:** clique duas vezes rápido. Tem de existir
  **uma** transferência só (um `trf_…`); no Network, as duas chamadas a
  `/api/transfers` (se saírem duas) levam o mesmo `Idempotency-Key`.
- **Valores que não são valor:** `abc`, `0`, `1.000.00`, `10.00`. Todos
  mostram "Informe um valor em reais maior que zero" sem chamar
  `/api/quotes`. Em especial, `1.000.00` **não** pode virar R$ 100.000,00.
- **Chave errada:** suba a api com `OXUS_API_KEY=oxk_sandbox_errada`. A tela
  mostra "Servico de cambio indisponivel." ao carregar os clientes, sem tela
  em branco; no log da api aparece um `WARN OXUS respondeu 401 (...)` e a
  chave não aparece no log.
- **Api fora do ar:** pare só a api (deixe o web). Recarregue: o aviso é "O
  oxus-poc-api nao respondeu.", sem erro não tratado no console.
- **Trocar o cliente ou a conta depois de cotar:** a cotação some; não pode
  sobrar cotação de um cliente na tela de outro.

## O que não está na lista

Estranhe qualquer número que apareça sem ter sido pedido: um valor em reais
diferente do digitado na cotação ou no PIX, uma segunda transferência para a
mesma cotação, uma consulta à transferência depois de ela ter chegado a um
status final, um aviso no console, uma chamada do navegador para um host que
não seja `localhost:3000`. A lista acima é feita do que já se pensou.

## O que este checkpoint já pegou

Ainda não conferido. Preencher, com data e achado real, depois da primeira
execução.
