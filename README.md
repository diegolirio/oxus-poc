# oxus-poc

POC de integração com a API da [OXUS](https://docs.oxus.finance/referencia) para uma operação de câmbio BRL → USD.
As dúvidas de produto estão em [requirements-doubts.md](requirements-doubts.md) e as convenções de arquitetura, em [docs/superpowers/INSTRUCTIONS.md](docs/superpowers/INSTRUCTIONS.md).

## Módulos

| Módulo | Papel |
|---|---|
| `buildingBlocks` | Contratos base de Command, Query e domínio (Kotlin puro) |
| `oxus-poc-api` | Spring Boot: rotas e configuração de entrada |
| `oxus-poc-core` | Casos de uso, domínio e infraestrutura (inclui o cliente OXUS) |
| `oxus-poc-integration-tests` | Testes de integração (`*IT`) sobre Testcontainers |
| `oxus-poc-web` | Next.js |
| `oxus-poc-mobile` | Expo |

## Rodando

```bash
make run
```

Sobe o Postgres (porta **5433**), a api (8080) e o web (3000). Para usar outras portas:

```bash
SERVER_PORT=8081 PORT=3001 make run API_PORT=8081 WEB_PORT=3001
```

## Variáveis de ambiente

Nenhuma por enquanto.

## Testes

| Comando | O que roda |
|---|---|
| `make test-backend` | Unitários do backend (`./gradlew test`). Não sobe banco |
| `make test-integration` | Testes de integração `*IT` (`./gradlew integrationTest`), com Postgres em Testcontainers |
| `make test-mutation` | Pitest no `oxus-poc-core` (`./gradlew :oxus-poc-core:pitest`). É diagnóstico e fica fora do `make test` |
| `make test-web` | Lint, typecheck e Vitest do web |
| `make test-mobile` | Typecheck e Jest (`jest-expo`) do mobile |
| `make test` | Todos os anteriores, exceto mutação |

Os ITs ficam em `oxus-poc-integration-tests/src/test/kotlin`. Todo entrypoint (`@RestController`, `@Scheduled` etc.) precisa de um `<Nome>IT` que estenda `BaseIntegrationTest`, e a regra ArchUnit `EntrypointHasIntegrationTestIT` garante isso.
