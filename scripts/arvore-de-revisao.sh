#!/usr/bin/env bash
# Uma copia da arvore so para quem reve.
#
# ── PORQUE EXISTE ────────────────────────────────────────────────────────────
#
# Quatro vezes uma medicao minha foi corrompida por medir a arvore que o JR
# estava a escrever. As tres primeiras estao no cabecalho do provar-tudo.sh; a
# quarta foi a 04/09: corri a suite completa e li ONZE vermelhos. Nenhum era
# regressao - `carregar-staff.ts` estava a meio, nao compilava, a aplicacao nao
# subia, e caiu tudo o que precisa dela de pe.
#
# Ja tinhamos separado o PORTO (PORTA_INSPECCAO) e a BASE (base-de-revisao.sh).
# Faltava a arvore, que e' a que muda mais depressa - dele para mim, a cada
# ficheiro que ele grava.
#
# E ha um segundo motivo, que hoje pesa mais: **a CI esta trancada por
# facturacao** e nao mede nada. Isto e o mais perto de uma CI que eu controlo -
# um sitio onde qualquer commit se verifica inteiro, a qualquer hora, sem
# depender de o JR estar parado.
#
# O `pnpm install` aqui e' barato: a loja do pnpm e' global e os pacotes entram
# por hardlink. Nao se duplica um gigabyte por copia.
set -euo pipefail

cd "$(dirname "$0")/.."
RAIZ="$(pwd)"
ARVORE="${ARVORE_REVISAO:-$RAIZ/../bossaos-revisao}"
COMMIT="${1:-HEAD}"

# Trava: nunca apontar isto a arvore de trabalho.
case "$(cd "$ARVORE" 2>/dev/null && pwd || echo "$ARVORE")" in
  "$RAIZ") echo "RECUSO: a arvore de revisao nao pode ser a arvore de trabalho." >&2; exit 1 ;;
esac

alvo=$(git rev-parse --short "$COMMIT")
echo "==> Arvore de revisao em $ARVORE, no commit $alvo"

if [ -d "$ARVORE/.git" ] || [ -f "$ARVORE/.git" ]; then
  git -C "$ARVORE" checkout -q --detach "$alvo"
  echo "    reaproveitada"
else
  git worktree add -q --detach "$ARVORE" "$alvo"
  echo "    criada"
fi

# A arvore de revisao tem de estar SEMPRE limpa - e' a coisa toda.
sujos=$(git -C "$ARVORE" status --porcelain | wc -l | tr -d ' ')
if [ "$sujos" -ne 0 ]; then
  echo "FALHA: a arvore de revisao tem $sujos ficheiro(s) sujos. Isso anula o objectivo." >&2
  exit 1
fi
echo "    limpa: 0 ficheiros por versionar"

# O .env vem ANTES do install, e nao depois. O `postinstall` corre
# `prisma generate`, que le MIGRATION_DATABASE_URL - sem .env a instalacao
# inteira falha. Escrevi a copia depois e apanhei exactamente isso a' primeira.
if [ -f "$RAIZ/.env" ] && [ ! -f "$ARVORE/.env" ]; then
  cp "$RAIZ/.env" "$ARVORE/.env"
  echo "    .env copiado (antes do install: o prisma generate precisa dele)"
fi

echo "==> Dependencias (hardlinks da loja global)"
# O .env tem de estar EXPORTADO, nao so presente: o `postinstall` corre
# `prisma generate`, e o ficheiro de configuracao do Prisma le
# MIGRATION_DATABASE_URL do AMBIENTE e estoira se ela nao la estiver. Ter o
# .env no sitio nao chega - apanhei isso a segunda tentativa, depois de ja ter
# corrigido a ordem da copia.
( cd "$ARVORE" && set -a && . ./.env && set +a && pnpm install --frozen-lockfile 2>&1 | tail -3 )

cat <<TXT

  Pronto. Para verificar este commit inteiro, sem depender de o JR estar parado:

    cd "$ARVORE"
    eval "\$(bash scripts/base-de-revisao.sh --exportar)"
    PORTA_INSPECCAO=3999 bash scripts/provar-tudo.sh

  Porto proprio, base propria, arvore propria. E' o que sobra de uma CI que
  nao pode correr - e a unica das tres que garante que o que mediste e' um
  commit, e nao um instante no meio da escrita de outra pessoa.
TXT
