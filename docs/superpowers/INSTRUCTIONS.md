# Instruções do projeto

## Arquitetura

Monorepo de cinco módulos. Esta seção descreve **como implementar**. O
scaffold cria a árvore de diretórios das camadas abaixo, vazia (`.gitkeep`),
mas não escreve código de domínio — isso é trabalho de quem for construir a
primeira fatia vertical.

### Módulos

| Módulo | Papel |
|---|---|
| `buildingBlocks` | `kotlin` puro. Contratos base de Command, Query e domínio. Sem Spring |
| `oxus-poc-api` | Spring Boot. `presenter/`: rotas e configuração de entrada |
| `oxus-poc-core` | `application/`, `domain/` e `infrastructure/`. **Pode usar Spring** |
| `oxus-poc-web` | Next.js |
| `oxus-poc-mobile` | Expo / React Native |

**A seta é sempre `-api → -core → buildingBlocks`.** O `-core` não conhece o
`-api`: nenhuma classe do `-core` importa nada de `com.diegolirio.oxuspoc.presenter`, e o
`build.gradle.kts` do `-core` não declara o `-api` como dependência — só o
contrário. O `-core` **pode** depender de Spring (veja a seção seguinte); o
que ele não faz é depender do módulo de entrada.

### O que mora onde

Pacote base: `com.diegolirio.oxuspoc`, o mesmo nos três módulos `kotlin` — não há
sufixo por módulo. A camada é o primeiro segmento depois da raiz, e é ela,
não o módulo, que dá o nome ao pacote. Por isso `buildingBlocks` e o `-core`
compartilham `com.diegolirio.oxuspoc.application` e `com.diegolirio.oxuspoc.domain`: são o mesmo
pacote em módulos diferentes (split package), de propósito.

#### `buildingBlocks` — os contratos

```
application/   Command, CommandBase, CommandHandler
               Query, QueryBase, QueryHandler
               ResultCommand, ResultCommandHandler
domain/        Entity, Id, Event
               BusinessRule, RuleChecker, BusinessRulesBrokenException
presenter/
  exception/   ErrorMessage, ListErrorMessage
```

Sem Spring. Nenhum destes tem lógica de negócio — são a forma que as outras
camadas preenchem. Quando usar cada um está na seção *Os contratos do
`buildingBlocks`*. É o único código que o scaffold entrega pronto,
justamente porque é forma e não domínio.

#### `oxus-poc-api` — só a entrada

```
Application                        ponto de entrada; a raiz do component scan
presenter/
  routes/<agregado>/<casoDeUso>/   uma Route por caso de uso, com o Request
                                   co-locado no mesmo arquivo
  jobs/                            jobs agendados: o agendamento e sua habilitação
  configuration/
    security/                      cadeia de filtros, validação de credencial
    exception/                     o handler global e as exceções de transporte
```

Não há mais nada neste módulo — nem `infrastructure/`, nem entidade de
persistência, nem adapter. Se você está prestes a criar uma pasta aqui que
não seja `presenter/`, provavelmente o código pertence ao `-core`.

A classe de aplicação mora na raiz do pacote de propósito: é ela que define
onde o component scan começa, e é por isso que os componentes do `-core`
são encontrados sem varredura explícita.

Um job agendado mora em `presenter/jobs/` pelo mesmo critério que uma Route
mora em `presenter/routes/`: ele é **entrada** — recebe um gatilho, monta o
Command, chama o handler e traduz o resultado em log. O gatilho é o
relógio em vez de HTTP, e só isso muda. Um job não tem regra de negócio,
pelo mesmo motivo que uma Route não tem.

#### `oxus-poc-core` — domínio, casos de uso e saída

```
domain/
  <Agregado>   entidades e value objects, soltos na raiz
  rules/       regras que não pertencem a uma entidade só
  repositories/ interfaces de persistência. Portas, não implementações
  services/    orquestração de domínio que não cabe numa entidade
application/
  <agregado>/<casoDeUso>/   Command + Handler + Result
infrastructure/
  repositories/                        Entity JPA, RepositoryImpl, interface do Spring Data
  data/anticorruptionLayer/<vendor>/   integração externa: interface + impl/
  security/                            emissão de credencial de saída: interface + impl/
  utils/                               utilidades de saída
  configuration/                       @Configuration do que é saída
```

Um agregado é uma `class` que estende `Entity()` (do `buildingBlocks`) e
valida sua invariante ao nascer, chamando `checkAllRules(...)` no `init`. Um
value object sem identidade é um `data class` comum, ou um
`@JvmInline value class` quando envolve um único valor primitivo e o custo
zero em runtime compensa.


Enquanto houver poucos agregados, `domain/` fica com os arquivos soltos na
raiz e `rules/`/`services/` vazios (`.gitkeep`). Quando eles ganharem
conteúdo real, o padrão é o mesmo: um arquivo por regra ou serviço, sem
sub-pastas por agregado — isso só se justifica se o número de agregados
crescer a ponto de a raiz de `domain/` ficar difícil de navegar.

Um serviço de `domain/services/` é lógica pura, sem Spring e sem banco — por
exemplo, transformar uma lista plana numa árvore, ou derivar um código a
partir de um nome. É isso que o mantém no `-core`: se ele morasse no `-web`,
teria de ser reescrito no `-mobile`.

**Não existe uma pasta `port/` dentro de `application/`.** A interface do serviço externo mora no
próprio `infrastructure/`, ao lado do `impl/` que a implementa — por exemplo
`infrastructure/data/anticorruptionLayer/<vendor>/<Servico>` (interface) e
`infrastructure/data/anticorruptionLayer/<vendor>/impl/<ServicoImpl>`
(implementação).

`domain/repositories` guarda **interfaces**; a implementação (`RepositoryImpl`,
a `@Entity` JPA e a interface do Spring Data) mora em
`infrastructure/repositories/`, no mesmo módulo. Não há adapter "no outro
módulo": o `-core` implementa suas próprias portas.

Os recursos de saída — templates de mensagem, layouts de documento gerado e
afins — moram em `oxus-poc-core/src/main/resources/<saída>/` (por
exemplo `mail/templates/`), pelo mesmo critério das migrations: são saída,
pertencem ao `-core` e chegam ao classpath do `-api` pela dependência de
projeto. O prefixo não pode colidir com as pastas que o Spring Boot varre
sozinho (`templates/`, `static/`, `public/`): um `templates/` na raiz do
classpath liga resolução de view no `-api`, que é uma API JSON.

**Critério para decidir o que é `infrastructure/`:** é infraestrutura tudo
que é **saída** — qualquer coisa que fale com algo fora do processo (banco,
SMTP, um serviço externo, emissão de credencial). O caso que mais confunde é
uma credencial que o próprio `-core` emite: **emitir** é saída
(`infrastructure/security/`, porque é o `-core` produzindo um artefato para
outra parte consumir) — mas **validar** uma credencial de uma requisição que
chega é guarda de entrada, e por isso mora no `-api`, em
`presenter/configuration/security/`, não no `-core`. A pergunta a fazer
diante de um caso novo é: isso está produzindo algo para o mundo de fora, ou
decidindo se algo que chegou pode entrar? A primeira resposta é
`infrastructure/`; a segunda é `presenter/`.

### `-core` pode usar Spring

O `-core` aplica `org.jetbrains.kotlin.plugin.spring` e `plugin.jpa` (para
que classe Kotlin `final` por padrão funcione com proxy do Spring e da JPA
sem precisar declarar `open` manualmente) e depende de
`spring-boot-starter-data-jpa` e das demais dependências de saída que o caso
de uso exigir — veja o `build.gradle.kts` do `oxus-poc-core`.
`@Component` em handler, `@Entity` e `@Repository` em `infrastructure/`,
`@Configuration` para os beans de saída — tudo isso é normal aqui.


**Consequência que precisa ficar clara: não há regra de build impedindo uma
`@Entity` dentro de `domain/`.** O Gradle não separa `domain/` de
`infrastructure/` em módulos ou source sets diferentes — são pastas do mesmo
módulo, compiladas juntas, com o mesmo acesso a qualquer dependência do
classpath do `-core`. Nada no CI barra alguém de anotar uma classe de
`domain/` com `@Entity` ou de fazer um `Handler` de `application/` chamar
`JpaRepository` direto, pulando a porta de `domain/repositories`. A separação
é convenção de pacote, e quem a garante é revisão de código — não o
`./gradlew build`.

### A fatia vertical

Um caso de uso atravessa assim:

1. **Route** no `-api`, em `presenter/routes/<agregado>/<casoDeUso>/`, com o
   Request co-locado no mesmo pacote. Recebe o request, monta o Command ou a
   Query, traduz o resultado em resposta HTTP. Não tem regra de negócio.
2. **Command / Query** no `-core`, em `application/<agregado>/<casoDeUso>/`:
   objeto de entrada do caso de uso.
3. **Handler** no `-core`, no mesmo pacote, anotado `@Component`,
   implementando o contrato do `buildingBlocks` (`CommandHandler`,
   `ResultCommandHandler` ou `QueryHandler`). Orquestra: carrega pelo
   repositório, chama a regra de domínio, persiste, devolve o Result.
4. **Domain** no `-core`, em `domain/`: onde a decisão de negócio acontece de
   fato.
5. **Adapter** no `-core`, em `infrastructure/repositories/`: implementa a
   porta de `domain/repositories` usando JPA e traduz entre entidade de
   domínio e entidade JPA.

CQRS aqui significa **separar escrita de leitura**, não event sourcing e não
dois bancos. Uma Query pode ler por um caminho mais direto que o de escrita
quando isso simplificar; o que não pode é uma Query mudar estado.

### Os contratos do `buildingBlocks`

Quinze arquivos, um contrato por arquivo (com uma exceção: `ErrorMessage` e
`ListErrorMessage` dividem arquivo, porque juntos cabem sem esforço num único
arquivo Kotlin — não há a regra de um tipo público por arquivo que o Java
impõe), distribuídos em três pacotes: `com.diegolirio.oxuspoc.application` e
`com.diegolirio.oxuspoc.domain` (`kotlin` puro, sem Spring) e
`com.diegolirio.oxuspoc.presenter.exception`. Quando usar cada um:


- **`CommandHandler<TCommand>`** — escrita sem retorno.
- **`CommandBase` / `QueryBase`** — implementações prontas de `Command` e
  `Query` que geram o `id` via UUID aleatório. Estenda-as em vez de
  implementar a interface do zero quando não precisar de um id customizado.
- **`ResultCommandHandler<TCommand, TResult>`** — escrita com retorno. É o
  caso mais comum: a maioria dos casos de uso de escrita confirma algo ao
  chamador (id gerado, estado resultante). Um handler pode ser quase
  passthrough para uma porta de `infrastructure/` e ainda assim existir de
  propósito: é ele que impede a Route de injetar a porta direto e furar a
  regra de que o `-api` não importa `infrastructure/`.
  Handler magro é o preço de manter a seta, não sinal de camada sobrando.
  Repare que **`ResultCommand` não estende `Command`**: um `ResultCommand`
  não tem `id`. Se o caso de uso precisar de um identificador de
  correlação, declare o campo você mesmo — o contrato não empresta um.
- **`QueryHandler<TQuery, TResult>`** — leitura.
- **`Entity`** — base para agregado que valida sua própria invariante ao
  nascer, via `checkAllRules(...)`. Herdar de `Entity` **sem** chamar
  `checkAllRules` é caso normal, não esquecimento: quando a invariante
  depende de um argumento da fábrica e não de um campo do agregado, é a
  fábrica que chama um `RuleChecker` direto (veja o item seguinte).
- **`Id`** — base para agregado cujo identificador é numérico sequencial
  (`Long`). Um agregado com `UUID` ou outro tipo de identificador
  simplesmente não o estende.
- **`BusinessRule` + `RuleChecker`** — regra que estoura
  `BusinessRulesBrokenException` quando quebrada. `Entity.checkAllRules` usa
  um `RuleChecker` internamente; uma fábrica chama um `RuleChecker` direto
  quando a regra olha um argumento da fábrica em vez de um campo do
  agregado — `checkAllRules` foi feito para uma entidade validar os
  próprios campos, não a entrada da fábrica.
- **`Event`** — para um caso de uso que precise publicar algo que aconteceu;
  consumidor e mecanismo de publicação são decisão de quem implementar.
- **`ErrorMessage` / `ListErrorMessage`** — formato de corpo de erro
  alternativo a `ProblemDetail` (veja a seção seguinte). Use um ou outro, não
  os dois: escolha o formato de erro do projeto e registre a decisão aqui.

Sem essa lista, `buildingBlocks` vira gaveta: esses arquivos e nenhuma pista
de quando usar cada um.

### Falha e corpo de erro

Decidido: o corpo de erro do projeto inteiro é `ProblemDetail` (RFC 9457), o
tipo nativo do Spring — habilite com
`spring.mvc.problemdetails.enabled=true`, para que até os 400/404 levantados
pelo próprio framework saiam no mesmo formato. (Alternativa registrada no
`buildingBlocks`: `ErrorMessage`/`ListErrorMessage` como formato próprio — se
escolher esse caminho, substitua esta decisão e registre a troca aqui.)

**Padrão: exceção.** Uma regra de domínio quebrada estoura
`BusinessRulesBrokenException` (do `buildingBlocks`), e um
`GlobalExceptionHandler`, em
`oxus-poc-api/.../presenter/configuration/exception/`, a converte em
422, com um `errors` no corpo listando o `code` e a `message` de cada
`BusinessRule` que quebrou. Fatia nova que precisa de um novo tipo de erro
acrescenta um `@ExceptionHandler` ali, não inventa formato próprio.

Nem toda falha é regra de negócio quebrada. Buscar um recurso que não existe
estoura uma exceção própria do `-core` (por exemplo
`<Agregado>NotFoundException`), e o mesmo `GlobalExceptionHandler` a
converte em 404, com um corpo genérico que não repete o identificador
pedido nem diz se ele existiu e foi removido ou nunca existiu. Quando revelar
a própria existência do recurso já é o vazamento — por exemplo, uma busca por
um identificador de login —, o caso de uso não usa esse 404: segue a exceção
de opacidade descrita a seguir.

**A exceção nomeada.** Nem toda falha pode passar pelo caminho padrão. O 422
do `GlobalExceptionHandler` embute no corpo da resposta o `id` e a `message`
de cada `BusinessRule` quebrada — informação útil na maioria dos casos, mas
às vezes é exatamente o que a resposta não pode revelar. Quando causas
distintas de falha de um mesmo caso de uso precisarem ficar indistinguíveis
para quem chama — por exemplo, um endpoint que não pode deixar quem chama
descobrir se um registro existe testando qual mensagem de erro volta — usar
uma `BusinessRule` por causa, cada uma com sua mensagem, já é o vazamento: o
422 resultante conta qual das causas é verdadeira.

Nesse caso o Handler devolve um tipo de resultado fechado em vez de estourar
exceção, e é a `Route` — não o `GlobalExceptionHandler` — quem traduz esse
valor em status HTTP, sempre com o mesmo status e a mesma mensagem para todas
as causas que precisam ficar opacas. Uma falha de infraestrutura de fato (o
serviço externo do qual o caso de uso depende está fora do ar) não precisa
dessa opacidade e pode virar uma resposta diferente — porque isso não é
informação sobre o pedido, é sobre o próprio serviço estar no ar.

Essa indisponibilidade é um caso que o caso de uso **decide**: a saída fora
do ar do serviço externo que ele existe para chamar pode, inclusive, virar
uma variante a mais do tipo fechado (por exemplo `EntregaIndisponivel`),
respondida com um status próprio, diferente do das causas opacas. O tipo
fechado cobre só o que o caso de uso decide. Falha **inesperada** — um
template quebrado, o banco fora — não tem valor no tipo: ela sobe como
exceção, a `Route` não a traduz, e o resultado é 500. A distinção é o
ponto, não uma brecha: tudo que o caso de uso não decide — um defeito
nosso, o banco fora, um template quebrado — é exceção, e é isso que
impede que defeito nosso se disfarce de sucesso. Por isso a `Route` de um
caso de uso opaco não envolve a chamada num "captura tudo e devolve o
status de sucesso".

Use esse padrão só quando houver esse risco de vazamento. Uma regra que não
tem esse risco usa o caminho padrão (`BusinessRule` + exceção + 422).

O tipo de retorno fechado é um `sealed interface`, com um `data class` ou
`object` por causa.


### Autenticação e autorização

O `-api` é um resource server stateless — recebe uma credencial em cada
requisição autenticada e a valida antes de deixar a requisição entrar.
**Emitir** a credencial é saída (`infrastructure/security/` no `-core`, com o
par interface + `impl/` descrito acima); **validar** a credencial de uma
requisição que chega é guarda de entrada
(`presenter/configuration/security/` no `-api`) — mesmo critério de "o que é
`infrastructure/`" aplicado à autenticação.

Decidido também o mecanismo da validação: `spring-boot-starter-oauth2-resource-server`
com um `JwtDecoder`, não um filtro de autenticação escrito à mão. Validar
credencial é onde bug de segurança mora, e o Spring Security já entrega
decodificação, conferência de assinatura, expiração e emissor. O filtro
próprio também deixa de fora, sem ninguém perceber, o que o resto do
ecossistema assume: papéis em `GrantedAuthority`, `@PreAuthorize`, e um
`Authentication` que outras camadas conseguem ler sem conhecer o formato do
token.

Continua **aberto**, porque é decisão de produto: qual credencial o usuário
apresenta no login (senha, código, OAuth, certificado), e quais claims a
credencial emitida carrega e por quanto tempo ela vale — o **formato** dela
não, que o `JwtDecoder` acima já fixa em JWT. Implemente e registre aqui
quando a primeira fatia de autenticação for escrita. Falha de autenticação que
precisar ser opaca por segurança (não revelar, por exemplo, se um
identificador de login existe) segue o padrão da seção anterior.

Qualquer código que precise saber **quem** chamou lê `Authentication.getName()`
e `getAuthorities()`, nunca o objeto do token. É o que mantém uma tool MCP, um
job ou um interceptor funcionando se o mecanismo mudar.

### CORS e como `-web` e `-mobile` alcançam o `-api`

Decidido: o `-web` não fala com o `-api` direto do browser. Route Handlers do
Next chamam o `-api` de servidor para servidor e guardam do lado do servidor
qualquer credencial de sessão (por exemplo, um cookie `httpOnly`) — o browser
só fala com o próprio Next. Como resultado, **não há CORS a configurar no
`-api`** para o `-web`.

O `-mobile` não tem essa camada intermediária: fala direto com o `-api`.
Cliente nativo não está sujeito a CORS (é regra de browser), mas se o
`-mobile` rodar contra um `-api` em outro host durante o desenvolvimento,
confirme que a configuração de rede do app aponta para o host certo — não é
problema de CORS, é de endereço.

Isso deixa em aberto, para quando a primeira fatia de autenticação for
escrita: como o `-mobile` guarda a credencial recebida. Sem cookie de browser
disponível, a opção comum é um armazenamento seguro do próprio aparelho
(keychain/keystore), mas a escolha é de quem implementar.

### Migrations

`oxus-poc-core/src/main/resources/db/migration/`, no formato do Flyway
(`V1__descricao.sql`). Ficam no `-core` porque o schema pertence ao domínio,
não ao transporte HTTP. Chegam ao classpath do `-api` pela dependência de
projeto.

Migration aplicada é imutável: um ambiente que já a rodou tem o checksum do
arquivo original gravado em `flyway_schema_history`, e reescrever uma
migration já aplicada quebra a validação de checksum no próximo boot.
Correção vira sempre uma `V` nova.

O `spring.jpa.hibernate.ddl-auto` fica em `none`. Quem cria e altera tabela é
a migration, sempre.

### Testes

Montados pela skill `analizza-integration-test`.

- **Todo entrypoint tem os dois tipos de teste, e nenhum substitui o outro.**
  Regra de domínio e handler: teste unitário, sem Spring e sem banco, com
  dublê da dependência externa cobrindo exaustivamente os ramos de erro.
  Route, job, tool MCP e infraestrutura: teste de integração em `oxus-poc-integration-tests`,
  classe terminada em `IT`, estendendo `BaseIntegrationTest`, sobre um único
  container de banco para a suíte inteira, provando o fluxo contra o sistema
  de verdade.
- **`oxus-poc-integration-tests` é o único módulo com Testcontainers.** É ele quem sobe os containers e testa
  a infraestrutura de ponta a ponta através do `BaseIntegrationTest`.
- Serviço de saída sem container (e-mail, gateway de terceiro) ganha um dublê `@Primary` no
  `TestConfig`: nenhuma mensagem nem chamada sai da suíte.
- `EntrypointHasIntegrationTestIT` tem **um único trabalho**: todo entrypoint — `@RestController`,
  método `@Scheduled`, `@KafkaListener`, `@Tool` ou `@McpTool` — precisa de um `<Nome>IT` que estenda
  `BaseIntegrationTest`. Ela garante só a metade de integração do par acima — o unitário do
  handler não tem guardrail automático, é revisão de quem mexe. Um job entra pelo mesmo motivo
  que um controller, e com mais razão: ninguém recebe um 500 quando um agendamento para de rodar.
  Uma tool MCP entra pelo mesmo motivo: quem chama por MCP também não vê stack trace, só a
  resposta que a tool devolveu.
- `./gradlew test` roda só o que não precisa de banco; `./gradlew integrationTest` sobe o
  container. Os dois se separam pelo sufixo `IT`, não por tag.
- **Teste de mutação mede os unitários, não a cobertura.** O Pitest roda em `oxus-poc-core`
  contra os `*Test` (`make test-mutation`), fora do `make test` e sem limiar: o mutation score é
  diagnóstico. Mutante sobrevivente é assert fraco ou ramo sem teste — ou mutante equivalente,
  que se documenta e aceita, sem silenciar a métrica.

**Um exemplo escrito à mão do formato de saída de outro sistema não é
evidência sobre o que aquele sistema produz.** Teste de adapter que monta à
mão uma URL, um JSON ou uma mensagem "como o SDK devolveria" prova só que o
código entende o exemplo. O teste que protege a integração usa a saída real —
do SDK, do container, do serviço — ao menos uma vez.

**O inverso também vale: o teste de integração não substitui o unitário.**
Subir container e contexto Spring a cada ramo de erro é caro demais para
cobrir todos eles a cada mudança — é o teste unitário do handler, com dublê
da dependência externa, que cobre os ramos de erro exaustivamente e roda em
segundos. Todo entrypoint tem os dois: o unitário prova os ramos, o
`<Nome>IT` prova que o sistema de verdade se comporta como o dublê promete.
Nenhum dos dois é opcional por causa do outro.

### Guia de domínio

`docs/domain/domain-guide.md` é o mapa do projeto para quem chega sem o
código na cabeça, pessoa ou agente: onde ficam as specs e em que formato, as
pastas de rotas, casos de uso, regras e persistência, como seguir uma regra da
rota até o domínio, e o glossário entre termo de negócio e nome no código. Não
resume regra de negócio: diz onde ela está.

Ele é gerado, não escrito à mão: `/domain-context-map` na raiz do projeto. O
arquivo ainda não existe num projeto recém-criado; gere-o depois da primeira
fatia vertical, e rode a skill de novo quando a organização das pastas mudar —
ela compara o projeto com o guia e diz o que ficou velho antes de regravar.

### Não está decidido

O scaffold deliberadamente não escolheu, e a primeira implementação que
precisar deve decidir e registrar aqui:

- paginação e ordenação nas listagens
- upload e armazenamento de arquivos
- versionamento da API
- observabilidade além do Actuator

Não improvise nenhum desses no meio de uma fatia: decida, escreva aqui,
depois implemente.

### Variáveis de ambiente

**Toda variável lida pela configuração da aplicação (`${NOME}` ou
`${NOME:padrao}`) está em dois lugares além dela, no mesmo commit que a
introduz:**

1. **`README.md`, seção *Variáveis de ambiente*, sem valor** — sempre `NOME=`,
   mesmo quando há padrão e mesmo quando o valor não é segredo. O padrão mora
   só na configuração: copiá-lo para o README é criar um segundo lugar para
   ele envelhecer.
2. **`.env.local` da raiz, se o arquivo existir na máquina** — com o padrão da
   configuração preenchido, ou vazio (`NOME=`) quando não há padrão. O arquivo
   não é versionado, então isto é um passo na máquina de quem mexeu, não uma
   linha do diff: não crie o arquivo se ele não existe.

Renomear ou remover uma variável mexe nas mesmas duas listas.

O porquê: o `.env.local` não vai para o repositório, e o README é a única
lista versionada do que a aplicação precisa para subir. Sem ela, uma variável
nova sem padrão faz a aplicação parar de subir em toda máquina, e ninguém sabe
que ela existe até o boot recusar.

### Checkpoints de conferência

Um checkpoint é uma parada onde **uma pessoa olha o resultado rodando** antes
de o trabalho seguir. Ele não substitui teste: existe para o que teste nenhum
pega.

**Proponha um checkpoint sem esperar que peçam** sempre que o critério de
aceite mora fora da suíte de testes:

- **Aparência.** Uma tela nova ou redesenhada, comparada com um print, um
  protótipo ou uma descrição.
- **Contrato com serviço externo.** A primeira chamada real a um storage, a um
  SMTP, a uma API de terceiro. Container e emulador provam a forma, não provam
  a conta de produção, o CORS nem a credencial.
- **Migration que muda dado que já existe.** Rodar contra uma cópia e conferir
  as linhas antes de rodar contra o ambiente de verdade.
- **Qualquer coisa irreversível ou de fora**: apagar dado, publicar, mandar
  mensagem para gente de verdade, mexer em configuração compartilhada.

**Não proponha checkpoint** para o que a suíte já cobre: regra de domínio,
handler, contrato HTTP entre os próprios módulos, refactor com teste verde
antes e depois. Um checkpoint a cada tarefa treina quem revisa a carimbar sem
olhar.

**Como propor.** Diga o que olhar e como olhar, não "confira por favor", e
aponte o runbook da funcionalidade em `docs/checkpoints/`. Diga também, sem
que perguntem, **o que você não conseguiu verificar** — é isso que a pessoa
confere primeiro.

**Quem executa é uma pessoa, na mão.** Não rode o fluxo e apresente a saída
como se fosse a conferência. Num plano de implementação, o checkpoint é uma
seção própria entre as fases, e a fase seguinte não começa sem o aval.

### Débitos técnicos

Coisas já implementadas que funcionam mas carregam uma dívida conhecida. Cada
item diz o que está errado, por que foi aceito e o que o fecha. Nenhum bloqueia
o uso em desenvolvimento; quem mexer na área decide se fecha junto.

Um item entra no mesmo commit que cria a dívida, não depois. Um débito que só
existe na cabeça de quem o criou é um defeito esperando para ser redescoberto.
