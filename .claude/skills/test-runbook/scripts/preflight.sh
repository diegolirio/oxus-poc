#!/usr/bin/env bash
# Estado do ambiente antes de um checkpoint, num tiro so.
#
# Existe porque descobrir no meio do caminho que um servico esta parado e o
# tipo de atrito que faz a pessoa desistir de conferir -- e a conferencia que
# nao acontece e o unico jeito garantido de nao achar nada.
#
# Nao muda nada: so olha. Roda da raiz do repositorio.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

echo "== containers =="
if docker compose ps --format '{{.Service}} {{.Status}}' 2>/dev/null | grep -q .; then
  docker compose ps --format '{{.Service}} {{.Status}}' | sed 's/^/  /'
else
  echo "  nenhum de pe -- confira o comando de subida deste projeto"
fi

echo
echo "== aplicacao =="
PORTAS=("8080:api" "3000:web")
for porta in "${PORTAS[@]}"; do
  p="${porta%%:*}"; nome="${porta##*:}"
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  $nome ($p): no ar"
  else
    echo "  $nome ($p): fora"
  fi
done

echo
echo "== runbooks =="
encontrou=0
for f in docs/checkpoints/*.md; do
  [ -e "$f" ] || continue
  case "$(basename "$f")" in README.md) continue ;; esac
  encontrou=1
  tipo=$(sed -n 's/^type: *//p' "$f" | head -1)
  titulo=$(grep -m1 '^# ' "$f" | sed 's/^# //')
  printf '  %-22s [%-10s] %s\n' "$(basename "$f" .md)" "${tipo:-sem tipo}" "$titulo"
done
[ "$encontrou" = 0 ] && echo "  nenhum em docs/checkpoints/"

echo
echo "== banco =="
if docker exec oxus-poc-postgres pg_isready -U oxus_poc >/dev/null 2>&1; then
  echo "  no ar"
else
  echo "  fora do ar, ou comando de health-check precisa de ajuste"
fi
# Health-check de infraestrutura, nao de dado: uma query de negocio (contagem
# de linhas, status de um registro) pode entrar aqui depois, se ajudar uma
# conferencia especifica deste projeto.

