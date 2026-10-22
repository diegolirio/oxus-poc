# Dúvidas para o PO — Integração PagBank × OXUS (câmbio BRL → USD)

> Levantadas a partir da referência da API OXUS (versão `2026-10-01`, https://docs.oxus.finance/referencia) e de testes no sandbox, comparadas com o modelo-alvo dos slides ("PagBank na experiência, OXUS na infraestrutura").
>
> Data: 2026-10-22

## Contexto rápido: como a OXUS funciona

Fluxo de uma operação BRL → USD na API:

1. `POST /v1/customers`: cadastro do cliente final (fica `PENDING_KYC_ATTESTATION`).
2. `POST /v1/customers/{id}/kyc-attestations`: o PagBank atesta o KYC (assinatura Ed25519 + dossiê cifrado com chave do PagBank).
3. `POST /v1/customers/{id}/receivers`: conta de destino (ACH, Wire, SWIFT ou carteira USDT/USDC).
4. `POST /v1/quotes`: melhor rota entre vários provedores, válida por 5 min, com câmbio, VET e tarifas.
5. `POST /v1/transfers`: executa a cotação e devolve um **PIX copia e cola**. Etapas: `CREATION → PAYMENT → SETTLEMENT → DELIVERY`.
6. Webhooks `transfer.*` a cada mudança; se a entrega falhar, o reembolso é automático.

Exemplo real do sandbox: R$ 10.000,00 → US$ 1.823,58 (câmbio 0,183610; VET 0,182358; tarifas R$ 68,17; entrega `SAME_DAY` via ACH; 5 rotas avaliadas).

---

## 1. Escopo e objetivo da POC

**1.1 O que a POC precisa provar, e para quem?**
Opções: (a) jornada ponta a ponta funcionando no sandbox; (b) comparação de custo all-in (VET) OXUS × trilho SWIFT atual; (c) mapa de responsabilidades PagBank × OXUS; (d) demo para o comitê.
*Por que importa:* define se construímos código, planilha de custos ou um documento de arquitetura.

**1.2 A POC tem interface (tela de cliente/backoffice) ou é só integração backend?**

**1.3 Qual o critério de sucesso para recomendar o piloto com até 10 clientes?**

## 2. Movimentação do BRL (ponto crítico)

**2.1 Quem paga o PIX de entrada?**
A API diz: *"O pagamento deve sair de conta do próprio cliente final."* O slide diz que o PagBank "debita BRL e aplica controles".
- O PagBank dispara o PIX a partir da conta do cliente (cliente é correntista PagBank)?
- Ou o PagBank paga com conta própria/de liquidação (modelo agregador), que a OXUS hoje parece não permitir?
*Por que importa:* muda o enquadramento regulatório e o desenho do débito.

**2.2 O que acontece se o PIX não for pago antes de `expiresAt`?** Precisamos de bloqueio de saldo prévio ou um débito síncrono no momento da transferência?

**2.3 Reembolsos:** o valor "volta para a origem do pagamento". Como isso aparece para o cliente, como estorno ou crédito em conta? E quem concilia?

## 3. Regulatório, câmbio e tributos

**3.1 Na visão do Jurídico/Regulatório, a operação via OXUS é um contrato de câmbio do PagBank, uma remessa via eFX/terceiro ou outra coisa?**
A API classifica a operação como `REMITTANCE` e só oferece o campo `externalReference` (sugere o "número do contrato de câmbio").

**3.2 IOF:** a cotação da OXUS não mostra IOF. Quem calcula, recolhe e informa: o PagBank (DARF) ou a OXUS/provedor?

**3.3 Reporte ao Banco Central e Receita:** quem é responsável pelos reportes regulatórios da operação?

**3.4 Stablecoin escondida:** a perna USDT/USDC não aparece na API (o PagBank não vê hash, rede nem custódia). Isso é aceitável para Compliance/PLD? Precisamos de rastreabilidade on-chain?

**3.5 Qual `purpose` (finalidade) vamos aceitar?** Opções da API: `FAMILY_SUPPORT`, `EDUCATION`, `MEDICAL`, `TRAVEL`, `SERVICES`, `GOODS`, `INVESTMENT`, `OWN_ACCOUNT`. Algum precisa ser bloqueado no piloto?

## 4. Cadastro e KYC

**4.1 Público do piloto: só pessoa física?** A API aceita apenas `INDIVIDUAL` com CPF. Os cenários corporate/grandes contas dos slides não são atendidos hoje.

**4.2 KYC delegado:** o PagBank aceita ser o responsável pelo KYC e assinar atestações (Ed25519)?
- Quem custodia a chave de assinatura e a chave do dossiê (KMS)?
- Qual nível (`SIMPLIFIED`, `STANDARD` ou `ENHANCED`) vamos atestar?
- A atestação expira (exemplo do sandbox: 1 ano). Quem renova?

**4.2.1 Cliente que ainda não passou por nenhuma validação de produto de investimento: como fica o cadastro para câmbio?**
Cenário: o cliente tem conta, mas nunca passou pelo onboarding de investimentos (suitability, cadastro complementar, comprovação de renda/patrimônio, origem dos recursos).
- O KYC da abertura de conta basta para atestar à OXUS ou precisamos de uma **validação de cadastro específica para o produto câmbio**?
- Quais dados e documentos complementares são exigidos (renda, patrimônio, ocupação, origem dos recursos, finalidade das remessas)?
- Essa validação pode **reaproveitar** o onboarding de investimentos ou é uma etapa própria do câmbio?
- A jornada é **bloqueante** (não cota nem transfere até aprovar) ou permite limites menores com KYC `SIMPLIFIED` enquanto o cadastro completo não é aprovado?
- Quem aprova (motor automático, mesa de PLD, manual) e qual o SLA?
- Como o resultado dessa validação se traduz nos campos da atestação OXUS (`level`, `riskRating`, `politicallyExposedPerson`, `sanctionsScreening`)?
*Por que importa:* define se o produto precisa de uma etapa nova de onboarding antes da primeira operação. É o gap "Cadastro e PLD" dos slides.

**4.3 Auditoria de KYC pela OXUS:** a OXUS pode pedir acesso ao dossiê (prazo de até 168 h). Quem aprova do lado do PagBank (Compliance Officer?) e qual o SLA?

**4.4 Para a POC, usamos dados fictícios do sandbox ou queremos simular o fluxo completo de atestação com chaves reais de teste?**

## 5. Conta de destino

**5.1 Quais trilhos de saída USD vamos suportar:** ACH, Wire ou SWIFT?

**5.2 Quem é o beneficiário?** A própria pessoa (`SELF`) ou também terceiros (`FAMILY`, `SUPPLIER`...)? Contas de terceiros aumentam o risco de PLD.

**5.3 USD em conta PagBank no exterior** (ex.: conta global do próprio cliente) está no escopo?

## 6. Economia e precificação

**6.1 Onde entra o spread do PagBank?** A OXUS devolve câmbio, VET e tarifas (`oxusFee`, `payoutFee`). O PagBank vai cobrar spread por cima e mostrar ao cliente um VET próprio?

**6.2 Qual a referência de comparação?** Precisamos do custo all-in atual do trilho Core/SWIFT para comparar.

**6.3 A cotação vale 5 minutos.** Isso basta para a jornada do app (cotar → aceitar → autenticar → pagar)?

## 7. Operação, SLA e contingência

**7.1 SLA esperado de entrega:** a API estima `INSTANT`, `MINUTES`, `SAME_DAY` ou `NEXT_BUSINESS_DAY`. O que é aceitável?

**7.2 Conciliação:** os webhooks trazem comprovantes por etapa (E2E do PIX, trace ACH). Isso basta para a conciliação/SAP ou precisamos de relatório/extrato da OXUS?

**7.3 Contingência:** se a OXUS cair ou retornar `ROUTE_UNAVAILABLE`, caímos para o trilho convencional ou bloqueamos a operação?

**7.4 Limites:** há limites por cliente, operação ou dia (do PagBank ou da OXUS)? A API não documenta limites.

## 8. Itens não documentados para perguntar à OXUS

- Limites por operação e volume diário.
- Provedores e contrapartes por trás das rotas (diligência).
- Horário de funcionamento e cut-off para `SAME_DAY`.
- Ambiente de homologação além do sandbox simulado e o processo de obtenção de chaves de produção.
- Rate limits (`RATE_LIMITED` existe, mas não há números).
- Tratamento de IOF e da documentação cambial.
- **Código estruturado para a falha da transferência.** Hoje o `failureReason` é texto livre, com o código do banco dentro da frase (no sandbox: "Conta do beneficiário recusada pelo banco de destino (R03 · conta inexistente)"). Sem um campo de código separado (ex.: `failureCode: "RECEIVER_ACCOUNT_NOT_FOUND"`, com o código original do rail à parte), o app não consegue mostrar mensagem própria nem decidir a ação (pedir para corrigir a conta, tentar de novo, acionar o suporte). A OXUS pode expor esse código, e qual é a lista de valores possíveis?
- **Evento de webhook para PIX expirado.** Há `transfer.completed`, `transfer.failed` e `transfer.refunded`, mas não `transfer.expired`: a expiração do PIX só chega como `transfer.updated`, e o PagBank precisa olhar o status em toda atualização para avisar o cliente. Está previsto um evento próprio, e o mesmo vale para `transfer.cancelled`?
