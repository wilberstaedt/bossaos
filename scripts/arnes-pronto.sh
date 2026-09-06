#!/usr/bin/env bash
#
# DEIXA O ARNÊS DE INSPECÇÃO PRONTO — os três passos, pela ordem certa.
#
# Nasceu a 06/09 de seis hipóteses e quarenta minutos meus. A prova de navegador
# do E31 falhava numa base fresca e o erro dizia «a semeadura da inspecção
# correu?». Tinha corrido. O que faltava era outra coisa, e a ordem é esta:
#
#   1. `fixtures.ts`          cria as organizações, unidades e pertenças
#   2. `--project=preparar`   cria e autentica o UTILIZADOR do arnês
#   3. `semente-inspeccao.ts` cria o cenário `insp-` — carta, mesas, pedidos
#
# **A ordem 2-3 não é a óbvia, e descobri-a com este guião a acusar-me.** Pus
# primeiro a semente e o `preparar` a seguir, e o bloco de verificação disse
# «zero menus». O `preparar` corre uma limpeza no fim — «nada ficou para trás» —
# que leva o cenário da semente e **deixa o utilizador**. Semear depois dele.
#
# **O terceiro é o que ninguém adivinha.** A semente usa o email do arnês apenas
# como valor de texto (`abertoPor`); quem cria o utilizador é o projecto
# `preparar` do Playwright. E o `alvos.ts` precisa dele na RECOLHA — antes de
# qualquer projecto correr —, por isso numa base onde o `preparar` nunca passou
# nenhuma prova de navegador consegue sequer carregar, e o Playwright diz
# «No tests found», que não aponta para nada.
#
# Idempotente: correr duas vezes não faz mal.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta — carrega o ambiente da base certa}"

# ── Se já está pronto, não se refaz ─────────────────────────────────────────
# O passo do `preparar` leva ~19s e a semente reescreve o cenário. Correr isto à
# cabeça de cada prova custaria isso vinte vezes por nada.
#
# A verificação é a MESMA do fim: se as três coisas já lá estão, salta. Assim
# pode ser chamado de qualquer sítio sem se pensar no custo — que é a condição
# para ele deixar de ser um guião que ninguém chama.
ja_pronto() {
  local o m u
  o=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT count(*) FROM organizations" 2>/dev/null || echo 0)
  m=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT count(*) FROM menus" 2>/dev/null || echo 0)
  u=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT count(*) FROM users WHERE email='painel@inspeccao.example'" 2>/dev/null || echo 0)
  [ "${o:-0}" -gt 0 ] && [ "${m:-0}" -gt 0 ] && [ "${u:-0}" -gt 0 ]
}

if ja_pronto; then
  echo "==> arnês já pronto (organizações, menus e utilizador presentes) — nada a fazer"
  exit 0
fi

echo "==> 1/3 fixtures"
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null

echo "==> 2/3 utilizador do arnês"
npx playwright test --project=preparar --reporter=line >/dev/null 2>&1 || {
  echo "ERRO: o projecto 'preparar' falhou. Sem ele, nenhuma prova de navegador carrega." >&2
  exit 1
}

echo "==> 3/3 semente da inspecção (DEPOIS do preparar, que limpa atrás de si)"
node --experimental-strip-types packages/db/prisma/semente-inspeccao.ts >/dev/null

# Não basta ter corrido: confirma-se que as três coisas ficaram lá. Um guião de
# preparação que diz «pronto» sem verificar é a mesma promessa vazia que ando a
# caçar no produto.
EMAIL='painel@inspeccao.example'
for par in "organizations:organizações" "menus:menus"; do
  t="${par%%:*}"; n="${par#*:}"
  q=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT count(*) FROM $t" 2>/dev/null || echo 0)
  [ "${q:-0}" -gt 0 ] || { echo "ERRO: zero $n depois de semear" >&2; exit 1; }
  echo "  ok    $q $n"
done
u=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT count(*) FROM users WHERE email='$EMAIL'" 2>/dev/null || echo 0)
[ "${u:-0}" -gt 0 ] || { echo "ERRO: o utilizador do arnês não existe depois do 'preparar'" >&2; exit 1; }
echo "  ok    utilizador do arnês"
echo "==> arnês pronto"
