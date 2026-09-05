#!/usr/bin/env bash
#
# E19 — as 11 telas do host, mais o FLOOR-006 que esta etapa REVISITA.
#
# ── O que a régua reprova à cabeça ────────────────────────────────────────
#
# «Verde sobre agenda vazia, e com 28 telas isso é fácil de esconder.» As onze
# telas do host têm todas um estado vazio legítimo — «hoje não há reservas» — que
# cabe em qualquer largura e não tem nada para medir. O controlo 2 é esse.
#
# E o controlo 3 é o da etapa: a reserva que aí vem deixa de aparecer na sala. É
# o defeito que não dá erro nenhum — o mapa diz a verdade sobre o presente e o
# host senta um walk-in na mesa das 20h.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

PORTA_DA_PROVA="${PORTA_INSPECCAO:-3010}"
if lsof -ti:"$PORTA_DA_PROVA" >/dev/null 2>&1; then
  echo "ERRO: a porta $PORTA_DA_PROVA já está ocupada." >&2; exit 2
fi

CASOS_MINIMOS=22
falhas=0

HOST=packages/db/src/host.ts
FLOOR='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/floor/page.tsx'
CHEGADA='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/[reservaId]/chegada/page.tsx'
TIMELINE='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/timeline/page.tsx'
ESPERA='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/espera/page.tsx'
SPEC=inspeccao/host.spec.ts
SEMENTE=packages/db/prisma/semente-inspeccao.ts
ORIG_HOST=$(mktemp); ORIG_FLOOR=$(mktemp); ORIG_CHEGADA=$(mktemp)
ORIG_TIMELINE=$(mktemp); ORIG_ESPERA=$(mktemp); ORIG_SPEC=$(mktemp); ORIG_SEMENTE=$(mktemp)
cp "$HOST" "$ORIG_HOST"; cp "$FLOOR" "$ORIG_FLOOR"; cp "$CHEGADA" "$ORIG_CHEGADA"
cp "$TIMELINE" "$ORIG_TIMELINE"; cp "$ESPERA" "$ORIG_ESPERA"; cp "$SPEC" "$ORIG_SPEC"
cp "$SEMENTE" "$ORIG_SEMENTE"

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  cp "$ORIG_HOST" "$HOST"; cp "$ORIG_FLOOR" "$FLOOR"; cp "$ORIG_CHEGADA" "$CHEGADA"
  cp "$ORIG_TIMELINE" "$TIMELINE"; cp "$ORIG_ESPERA" "$ESPERA"; cp "$ORIG_SPEC" "$SPEC"
  cp "$ORIG_SEMENTE" "$SEMENTE"
  rm -f "$ORIG_HOST" "$ORIG_FLOOR" "$ORIG_CHEGADA" "$ORIG_TIMELINE" "$ORIG_ESPERA" \
        "$ORIG_SPEC" "$ORIG_SEMENTE"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel host.spec.ts \
    --workers=1 --reporter=list >"$1" 2>&1
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3" nao_esperado="${4:-}"
  if correr "$ficheiro"; then vermelho "$nome: ficou VERDE com o defeito plantado"; return; fi
  if grep -q 'config.webServer was not able to start' "$ficheiro"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — a suite nem chegou a correr"
    grep -E 'error TS|Failed to type check' "$ficheiro" | head -3; return
  fi
  if ! grep -qE "✘.*$marcador" "$ficheiro"; then
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '✘' "$ficheiro" | head -4; return
  fi
  if [[ -n "$nao_esperado" ]] && grep -qE "✘.*$nao_esperado" "$ficheiro"; then
    vermelho "$nome: derrubou também o que NÃO devia cair ($nao_esperado)"; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-host-nav-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-host-nav-ligado.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "VERDE COM POUCO MEDIDO: só $passou casos (mínimo $CASOS_MINIMOS)"; exit 1
  fi
  verde "$passou casos verdes (11 telas × 5 larguras + toque, contraste, 3 idiomas, o FLOOR-006)"
else
  vermelho "a prova de navegador falhou com tudo ligado"
  grep -E '✘' /tmp/bossaos-host-nav-ligado.txt | head -10; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a agenda do dia fica VAZIA"
python3 - <<'PYVAZIO'
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      const reservaDeHoje = await prisma.reservation.create({"
assert antigo in s, 'a semeadura da reserva de hoje nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, "      const reservaDeHoje = await prisma.reservation.create({", 1)
    .replace("          inicio: daquiAUmaHora,\n          fim: new Date(daquiAUmaHora.getTime() + 90 * 60 * 1000),",
             "          inicio: new Date('2030-01-01T20:00:00Z'),\n          fim: new Date('2030-01-01T21:30:00Z'),", 1))
PYVAZIO
exigir_vermelho "caiu a população: a agenda vazia deixou de passar por medição" \
  'há reserva hoje, com mesa' /tmp/bossaos-host-nav-vazio.txt
cp "$ORIG_SEMENTE" "$SEMENTE"

echo
echo "3. CONTROLO NEGATIVO — a reserva que aí vem SOME da sala"
# ── O defeito da etapa, e não dá erro nenhum ─────────────────────────────
#
# A mesa continua livre, o ecrã continua certo sobre o presente, e o host senta
# um walk-in na mesa das 20h. Só se descobre com as pessoas à porta.
python3 - <<'PYSALA'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/floor/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "                {!mesa.sessao && aChegar.get(mesa.id) ? ("
assert antigo in s, 'o aviso da reserva a chegar nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "                {false ? (", 1))
PYSALA
exigir_vermelho "caiu a ponte: a reserva deixou de aparecer na sala antes da hora" \
  'FLOOR-006: a mesa livre com reserva anuncia-a' /tmp/bossaos-host-nav-sala.txt \
  'mapa do host marca a mesa como reservada'
cp "$ORIG_FLOOR" "$FLOOR"

echo
echo "4. CONTROLO NEGATIVO — o check-in deixa de dizer que NÃO senta"
python3 - <<'PYCHEGADA'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/[reservaId]/chegada/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '{h.chegadaAjuda}'
assert antigo in s, 'a frase da chegada nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '{h.chegada}', 1))
PYCHEGADA
exigir_vermelho "caiu a frase: o host deixa de saber que a chegada não senta" \
  'não senta' /tmp/bossaos-host-nav-chegada.txt
cp "$ORIG_CHEGADA" "$CHEGADA"

echo
echo "5. CONTROLO NEGATIVO — o número perde a DEFINIÇÃO ao lado"
# «Um número sem definição não é comparável.» O «12» fica sozinho, e o dono usa-o
# para decidir sem ninguém conseguir reproduzi-lo.
python3 - <<'PYDEF'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/timeline/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = 'data-teste="definicao">{h.definicaoChegadas}</p>'
assert antigo in s, 'a definicao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, 'data-teste="definicao">{h.timeline}</p>', 1))
PYDEF
exigir_vermelho "caiu a definição: a ocupação virou um número sem significado" \
  'definição das chegadas está ao lado do número' /tmp/bossaos-host-nav-def.txt
cp "$ORIG_TIMELINE" "$TIMELINE"

echo
echo "6. CONTROLO NEGATIVO — a espera do host passa a ler-se como uma FILA"
python3 - <<'PYFILA'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/espera/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = 'data-teste="ordem-ajuda">{h.ordemAjuda}</p>'
assert antigo in s, 'a frase da ordem nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, 'data-teste="ordem-ajuda">{h.ordemChegada}</p>', 1))
PYFILA
exigir_vermelho "caiu o aviso: a lista do host passou a poder ler-se como uma fila" \
  'ordem de chegada não é a de sentar' /tmp/bossaos-host-nav-fila.txt
cp "$ORIG_ESPERA" "$ESPERA"

echo
echo "7. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
python3 - <<'PYPOP'
import io
p = 'inspeccao/host.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    { id: 'RES-B-009', caminho: `${base}/walk-in` },\n"
assert antigo in s, 'a lista de telas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYPOP
exigir_vermelho "caiu a população: 10 telas deixaram de ser 11" \
  'população é 11 telas do host' /tmp/bossaos-host-nav-pop.txt
cp "$ORIG_SPEC" "$SPEC"

echo
echo "8. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-host-nav-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-host-nav-reposto.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then vermelho "reposto mas com pouco medido: $passou casos"
  else verde "reposto: $passou casos verdes"; fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '✘' /tmp/bossaos-host-nav-reposto.txt | head -10
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))
