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

1. **Home:** `http://localhost:3000` mostra o Header "PagBank", o overline
   "CÂMBIO", o título "oxus-poc" e o botão verde em pílula **Testar remessa no
   sandbox**, que leva a `/cambio`.
2. **Aparência:** com `docs/design/Cambio PagBank.html` aberto ao lado (abra
   o arquivo direto no navegador), compare: fundo cinza-claro, cards brancos
   de borda fina com o círculo verde numerado, fonte Inter nos textos e Fira
   Code nos valores técnicos (câmbio, VET, id, PIX), "← Voltar" em azul, o
   **Resumo** fixo à direita enquanto a página rola. Em janela estreita
   (menos de ~1024 px) vira uma coluna, com o Resumo depois dos cards.
3. **Clientes:** o seletor "Cliente" lista os clientes do sandbox; os que não
   estão `ACTIVE` com KYC `ATTESTED` aparecem com "(KYC pendente)" e não
   podem ser escolhidos. Escolha "Lucas Fernandes": o nome e o e-mail
   aparecem no Header e em "Remetente" no Resumo.
4. **Conta:** "Conta de destino" se preenche sozinha com `ACH •••• 6789 ·
   Carlos Oliveira (USD)` (é a única validada), e "Beneficiário" no Resumo
   mostra Carlos Oliveira.
5. **Cotação:** o campo "Valor em reais" tem o prefixo "R$" e o apoio
   "Mínimo R$ 10,00". Digite `1.000,00` e clique em **Cotar** (o botão mostra
   "Cotando…" e depois vira **Recotar**). Aparecem: "Você envia" R$ 1.000,00
   → "Destino recebe" em US$ verde (por volta de US$ 183), câmbio e VET com
   seis casas em fonte mono, tarifas com a divisão OXUS + entrega, prazo
   estimado com o número de rotas avaliadas e a validade contando de 5:00
   para baixo, em âmbar abaixo de 1:00. "Total a pagar" e "Recebe" no Resumo
   batem com a cotação.
6. **Confirmação:** antes de cotar o card 3 fica esmaecido. Depois, a
   finalidade vem em "Viagem" (o Resumo acompanha se você trocar). Clique em
   **Confirmar**. Aparece o card "4. Transferência" com a etiqueta "EM
   ANDAMENTO" à direita, o id `trf_…`, o **PIX copia e cola** (começa com
   `000201`) e o botão "Copiar código" (vira "Copiado" e o código está na
   área de transferência). A validade da cotação vira "Usada".
7. **Acompanhamento:** sem recarregar, a timeline (Criação, Pagamento PIX,
   Liquidação, Entrega) vai pintando: ponto verde cheio para concluída, anel
   âmbar para em andamento, anel cinza para aguardando; pagamento e entrega
   ganham a referência (`E2E…`, `TRC…`) embaixo. Quando o pagamento conclui,
   o bloco do PIX **some**. Em cerca de 45 s a etiqueta vira **CONCLUÍDA**
   (verde), aparece o aviso "Remessa entregue" com o valor em US$ e o nome do
   beneficiário, e o botão "Nova operação".
8. **A chave não vaza:** DevTools > Network, filtre por `oxk_`: nenhuma
   requisição ou resposta do navegador tem a chave. Todas as chamadas vão para
   `localhost:3000/api/...`, nenhuma para `oxus.finance`.

## O que tentar para ver se quebra

- **Finais mágicos do sandbox:** os chips abaixo do campo (`,13`, `,14`,
  `,15`, `,99`) trocam só os centavos do valor digitado — com `1.000,00`,
  clicar `,13` deixa `1.000,13`; com o campo vazio, vira `1.000,13`.
  - `,13`: a entrega falha por volta de 30 s (anel vermelho na Entrega), a
    etiqueta passa por "REEMBOLSANDO" e termina em **REEMBOLSADA**, com o
    motivo, o bloco de reembolso e o aviso vermelho "Entrega falhou".
  - `,14`: o PIX nunca é pago e a transferência **Expira** em ~15 s; aviso
    vermelho "PIX expirado".
  - `,15`: fica "Em andamento" na entrega e não termina sozinha. A tela
    continua consultando a cada 3 s — confira no Network que a consulta não
    dispara mais rápido que isso nem para. Se o sandbox chegar a reembolsar,
    o aviso é âmbar, "Operação reembolsada" (anote no fim deste arquivo se
    reembolsa e em quanto tempo).
  - `,99`: a cotação é recusada com "… (ROUTE_UNAVAILABLE)" em vermelho
    **embaixo do campo** (a borda do campo fica vermelha), e nada de cotação
    aparece. Também depois de uma cotação boa: cote `1.000,00`, troque para
    `,99` e clique **Recotar** — a cotação antiga tem de sumir.
- **Abaixo do mínimo:** `9,99` deixa **Cotar** desabilitado.
- **Cotação vencida:** cote, espere a validade chegar a 0:00. O texto vira
  "Expirada" em vermelho e **Confirmar** fica desabilitado. Cote de novo e
  confirme normalmente.
- **Duplo clique em Confirmar:** clique duas vezes rápido. Tem de existir
  **uma** transferência só (um `trf_…`); no Network, as duas chamadas a
  `/api/transfers` (se saírem duas) levam o mesmo `Idempotency-Key`.
- **Valores que não são valor:** `abc`, `0`, `1.000.00`, `10.00`. Todos
  mostram "Informe um valor em reais maior que zero" embaixo do campo sem
  chamar `/api/quotes`. Em especial, `1.000.00` **não** pode virar R$
  100.000,00.
- **Chave errada:** suba a api com `OXUS_API_KEY=oxk_sandbox_errada`. A tela
  mostra o aviso vermelho "Algo deu errado" com "Servico de cambio
  indisponivel." no topo da coluna, sem tela em branco; no log da api
  aparece um `WARN OXUS respondeu 401 (...)` e a chave não aparece no log.
- **Api fora do ar:** pare só a api (deixe o web). Recarregue: o aviso é "O
  oxus-poc-api nao respondeu.", sem erro não tratado no console.
- **Trocar o cliente ou a conta depois de cotar:** a cotação some (e o Resumo
  volta a "—"); não pode sobrar cotação de um cliente na tela de outro.
- **Nova operação:** depois de um status final, "Nova operação" limpa valor,
  cotação e transferência; cliente e conta continuam escolhidos.

## O que não está na lista

Estranhe qualquer número que apareça sem ter sido pedido: um valor em reais
diferente do digitado na cotação ou no PIX, uma segunda transferência para a
mesma cotação, uma consulta à transferência depois de ela ter chegado a um
status final, um aviso no console, uma chamada do navegador para um host que
não seja `localhost:3000`. A lista acima é feita do que já se pensou.

## O que este checkpoint já pegou

Ainda não conferido. Preencher, com data e achado real, depois da primeira
execução.
