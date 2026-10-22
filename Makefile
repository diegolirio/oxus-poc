API_DIR    := oxus-poc-api
CORE_DIR   := oxus-poc-core
WEB_DIR    := oxus-poc-web
MOBILE_DIR := oxus-poc-mobile
GRADLEW    := ./gradlew

API_PORT ?= 8080
WEB_PORT ?= 3000

.DEFAULT_GOAL := help
SHELL := /bin/bash

##@ Geral

.PHONY: help
help: ## Mostra esta ajuda
	@awk 'BEGIN {FS = ":.*##"; printf "\nUso:\n  make \033[36m<alvo>\033[0m\n"} \
		/^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)
	@echo ""

##@ Dependências

$(WEB_DIR)/node_modules: $(WEB_DIR)/package-lock.json
	cd $(WEB_DIR) && npm ci
	@touch $@

$(MOBILE_DIR)/node_modules: $(MOBILE_DIR)/package-lock.json
	cd $(MOBILE_DIR) && npm ci
	@touch $@

.PHONY: install
install: $(WEB_DIR)/node_modules $(MOBILE_DIR)/node_modules ## Instala dependências de web e mobile

##@ Banco

# Sem prefixo db-: os alvos do compose do projeto sao up, down e down-volumes.
.PHONY: up
up: ## Sobe o Postgres e espera ficar saudável
	docker compose up -d --wait

.PHONY: down
down: ## Derruba o Postgres (mantém o volume)
	docker compose down

.PHONY: down-volumes
down-volumes: ## Derruba o Postgres e APAGA o volume de dados
	docker compose down -v

##@ Build

.PHONY: build
build: build-backend build-web build-mobile ## Builda os quatro módulos

.PHONY: build-backend
build-backend: ## Builda os modulos do backend (gera o jar e roda os unitarios; nao sobe banco)
	$(GRADLEW) build

.PHONY: build-web
build-web: $(WEB_DIR)/node_modules ## Builda o web (produção)
	cd $(WEB_DIR) && npm run build

.PHONY: build-mobile
build-mobile: $(MOBILE_DIR)/node_modules ## Checa tipos do mobile (Expo não tem build de CI)
	cd $(MOBILE_DIR) && { [ -f expo-env.d.ts ] || echo '/// <reference types="expo/types" />' > expo-env.d.ts; }
	cd $(MOBILE_DIR) && npx tsc --noEmit

##@ Testes

.PHONY: test
test: test-backend test-integration test-web test-mobile ## Roda todos os testes

.PHONY: test-backend
test-backend: ## Testes unitarios do backend (nao sobe banco)
	$(GRADLEW) test

.PHONY: test-integration
test-integration: ## Testes de integracao (*IT) sobre Testcontainers
	$(GRADLEW) integrationTest

.PHONY: test-mutation
test-mutation: ## Teste de mutacao (Pitest) sobre os unitarios; diagnostico, fora do test
	$(GRADLEW) :$(CORE_DIR):pitest

.PHONY: test-web
test-web: $(WEB_DIR)/node_modules ## Lint, tipos e testes do web
	cd $(WEB_DIR) && npm run lint
	cd $(WEB_DIR) && npm run typecheck
	cd $(WEB_DIR) && npm test

.PHONY: test-mobile
test-mobile: $(MOBILE_DIR)/node_modules ## Tipos e testes do mobile
	cd $(MOBILE_DIR) && npm run typecheck
	cd $(MOBILE_DIR) && npm test

.PHONY: doctor-mobile
doctor-mobile: $(MOBILE_DIR)/node_modules ## Confere as dependências do Expo
	cd $(MOBILE_DIR) && npx expo-doctor

##@ Execução

.PHONY: run
run: up $(WEB_DIR)/node_modules ## Sobe banco, api e web juntos (Ctrl+C encerra api e web)
	@echo "api -> http://localhost:$(API_PORT)"
	@echo "web -> http://localhost:$(WEB_PORT)"
	@echo ""
	@trap 'kill 0' INT TERM; \
		( $(GRADLEW) :$(API_DIR):bootRun --console=plain 2>&1 | awk '{ print "[api] " $$0; fflush() }' ) & \
		( cd $(WEB_DIR) && npm run dev 2>&1 | awk '{ print "[web] " $$0; fflush() }' ) & \
		wait

.PHONY: run-api
run-api: up ## Roda somente o backend
	$(GRADLEW) :$(API_DIR):bootRun

.PHONY: run-web
run-web: $(WEB_DIR)/node_modules ## Roda somente o web (dev)
	cd $(WEB_DIR) && npm run dev

.PHONY: run-mobile
run-mobile: $(MOBILE_DIR)/node_modules ## Roda o Metro do mobile (fora do make run)
	cd $(MOBILE_DIR) && npx expo start

##@ Limpeza

.PHONY: clean
clean: ## Remove artefatos de build dos quatro módulos
	$(GRADLEW) clean
	rm -rf $(WEB_DIR)/.next $(MOBILE_DIR)/.expo

.PHONY: clean-all
clean-all: clean ## Limpeza completa, incluindo node_modules
	rm -rf $(WEB_DIR)/node_modules $(MOBILE_DIR)/node_modules
