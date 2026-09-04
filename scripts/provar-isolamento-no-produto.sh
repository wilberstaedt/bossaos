#!/usr/bin/env bash
#
# O acesso cruzado entre inquilinos, negado NO PRODUTO — com controlo negativo.
#
# ── Porque é que este script existe além do `provar-isolamento.sh` ─────────
#
# O `provar-isolamento.sh` tem 54 asserções contra o PostgreSQL e prova que **a
# base** recusa. A revisão do marco E11 reprovou o aceite com essa distinção:
#
#   > «O aceite pede a negação vista NO PRODUTO. No navegador só existe o
#   >  contrário — o painel a provar que a sessão vê os dados do próprio.»
#
# `inspeccao/isolamento.spec.ts` mostra a recusa no ecrã, com duas contas reais e
# o par que lhe dá sentido. Este script é o que torna essa prova uma prova.
#
# ── Os controlos negativos, e porque são DOIS ─────────────────────────────
#
# A régua desta casa diz que desligar a verificação tem de fazer os casos de
# recusa ficarem verdes — e que, se não ficarem, o que está a recusar é outra
# coisa. Aqui a verificação não é um `if` que se possa comentar, por isso os
# defeitos plantam-se onde eles viveriam de verdade.
#
# **E são dois porque as recusas não são todas a mesma coisa.** Escrevi este
# script com um só, à espera de derrubar as três de uma vez, e uma delas ficou
# verde. Não era falha da prova: era eu a confundir duas defesas diferentes.
# O detalhe está escrito ao lado de cada controlo, mais abaixo.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

ORG_B='22222222-2222-4222-8222-222222222222'
EMAIL_A='painel@inspeccao.example'
CASOS_ESPERADOS=9
falhas=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── DOIS controlos negativos, porque as recusas não são todas a mesma ─────
#
# Descobri isto a correr, e é a parte que interessa deste script.
#
# As recusas por **endereço de organização alheia** (`/marina-barcelona/…`) caem
# quando o utilizador ganha pertença nessa organização: passa a ter acesso
# legítimo, e o produto deixa de o mandar escolher.
#
# A recusa por **recurso alheio dentro da minha própria organização**
# (`/marina-oropesa/…/unidades/{de B}`) **não cai** com a pertença — e está
# certa que não caia. O pedido continua a correr no âmbito de A, e a unidade de
# B continua fora dele. Plantei a pertença à espera que caísse, e ficou verde.
#
# São duas defesas diferentes e precisam de dois defeitos diferentes. Um único
# controlo negativo aqui teria dado uma de duas conclusões erradas: ou «a prova
# não mede nada» (se eu contasse a que não caiu como falha), ou «mede tudo» (se
# eu contasse as duas que caíram como suficientes).
RECUSAS_POR_PERTENCA=(
  'ORGANIZAÇÃO de B: nunca lá entra'
  'catálogo de B também não'
)
RECUSA_POR_ESCOPO='UNIDADE DE B pelo endereço de A'

despromover() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<SQL
DELETE FROM role_assignments WHERE membership_id IN (
  SELECT m.id FROM memberships m JOIN users u ON u.id = m.user_id
   WHERE u.email = '${EMAIL_A}' AND m.organization_id = '${ORG_B}');
DELETE FROM memberships WHERE organization_id = '${ORG_B}'
   AND user_id = (SELECT id FROM users WHERE email = '${EMAIL_A}');
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
SQL
}
trap despromover EXIT INT TERM

correr() {
  pnpm exec playwright test inspeccao/isolamento.spec.ts --reporter=list >"$1" 2>&1
}

echo "1. Com o isolamento a funcionar"
if correr /tmp/bossaos-iso.txt; then
  passaram=$(grep -cE '^\s+✓' /tmp/bossaos-iso.txt || true)
  if [[ "$passaram" == "$CASOS_ESPERADOS" ]]; then
    verde "$passaram casos verdes no navegador, com duas sessões reais"
  else
    vermelho "contagem inesperada: $passaram (esperava $CASOS_ESPERADOS)"
  fi
else
  vermelho "a prova falhou com o isolamento a funcionar"
  grep -E '^\s+✘' /tmp/bossaos-iso.txt | head -6
fi

echo
echo "2a. CONTROLO NEGATIVO — o utilizador de A ganha pertença em B"
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<SQL
INSERT INTO memberships (id, organization_id, user_id, estado, updated_at)
SELECT gen_random_uuid(), '${ORG_B}', u.id, 'ACTIVO', now() FROM users u
 WHERE u.email = '${EMAIL_A}'
ON CONFLICT (organization_id, user_id) DO UPDATE SET estado = 'ACTIVO', updated_at = now();
INSERT INTO role_assignments (id, organization_id, membership_id, papel, updated_at)
SELECT gen_random_uuid(), '${ORG_B}', m.id, 'OWNER', now()
  FROM memberships m JOIN users u ON u.id = m.user_id
 WHERE u.email = '${EMAIL_A}' AND m.organization_id = '${ORG_B}'
   AND NOT EXISTS (SELECT 1 FROM role_assignments r WHERE r.membership_id = m.id);
SQL

correr /tmp/bossaos-iso-cn.txt
caiu=0
for recusa in "${RECUSAS_POR_PERTENCA[@]}"; do
  if grep -qE "^\s+✘.*${recusa}" /tmp/bossaos-iso-cn.txt; then
    caiu=$((caiu + 1))
  else
    vermelho "continuou verde com A dentro de B: $recusa"
  fi
done
if (( caiu == ${#RECUSAS_POR_PERTENCA[@]} )); then
  verde "as ${#RECUSAS_POR_PERTENCA[@]} recusas por endereço caíram — é a pertença que elas medem"
fi
# E o PAR deste controlo: a recusa por escopo NÃO pode cair, porque o pedido
# continua a correr no âmbito de A. Se caísse, ela estaria a medir a pertença —
# e ficaria sem nada a vigiar o escopo do recurso.
if grep -qE "^\s+✓.*${RECUSA_POR_ESCOPO}" /tmp/bossaos-iso-cn.txt; then
  verde "e a recusa por escopo aguentou — mede outra coisa, e é por isso que existe"
else
  vermelho "a recusa por escopo caiu com a pertença: mede a pertença, não o escopo"
fi
despromover

echo
echo "2b. CONTROLO NEGATIVO — a política de linha das unidades, desligada"
# O defeito que a recusa por escopo existe para apanhar. É o mesmo controlo que
# o `provar-isolamento.sh` usa contra a base, agora medido no ECRÃ.
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'SQL'
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
SQL
if correr /tmp/bossaos-iso-rls.txt; then
  vermelho "ficou VERDE com a política desligada — a recusa por escopo não mede o escopo"
elif grep -qE "^\s+✘.*${RECUSA_POR_ESCOPO}" /tmp/bossaos-iso-rls.txt; then
  verde "a recusa por escopo caiu — o produto deixou de esconder a unidade alheia"
else
  vermelho "ficou vermelho por outro motivo, não pela recusa por escopo"
  grep -E '^\s+✘' /tmp/bossaos-iso-rls.txt | head -4
fi
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'SQL'
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
SQL

echo
echo "3. Reposto — tem de voltar ao verde"
despromover
if correr /tmp/bossaos-iso-reposto.txt; then
  passaram=$(grep -cE '^\s+✓' /tmp/bossaos-iso-reposto.txt || true)
  verde "reposto: $passaram casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^\s+✘' /tmp/bossaos-iso-reposto.txt | head -6
fi

echo
echo "4. A pertença plantada saiu, e a política voltou a ligar?"
RESTOS=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT count(*) FROM memberships m
  JOIN users u ON u.id = m.user_id
 WHERE u.email = '${EMAIL_A}' AND m.organization_id = '${ORG_B}'" 2>/dev/null)
RLS=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT relrowsecurity FROM pg_class WHERE relname = 'locations'" 2>/dev/null)
if [[ "$RESTOS" == "0" && "$RLS" == "t" ]]; then
  verde "nada de prova ficou para trás, e a política de linha está ligada"
elif [[ "$RLS" != "t" ]]; then
  vermelho "A POLÍTICA DE LINHA DAS UNIDADES FICOU DESLIGADA — a prova deixou a base pior"
else
  vermelho "ficou $RESTOS pertença(s) plantada(s) — o utilizador do arnês continua dentro de B"
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas falhas"; fi
exit $(( falhas > 0 ? 1 : 0 ))
