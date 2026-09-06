#!/usr/bin/env bash
#
# E18 — as 6 telas de reservas, no navegador.
#
# ── O falso verde desta etapa tem nome ────────────────────────────────────
#
# Estas seis telas são LISTAS, e uma lista vazia é o ecrã fácil: cabe em qualquer
# largura, não tem contraste para medir e não tem alvos de toque. Se a semeadura
# falhar, as seis continuam a responder 200 e a passar as cinco larguras — sobre
# a mensagem «ainda não configurou».
#
# Por isso o segundo controlo aqui é esse, e não um defeito de produto: apagar as
# linhas semeadas e exigir que a prova acenda.
set -uo pipefail
cd "$(dirname "$0")/.."

# O arnês antes de tudo. Salta sozinho em zero segundos se já estiver pronto;
# numa base fresca faz os três passos pela ordem certa — fixtures, o utilizador
# do `preparar`, e só depois a semente, que o `preparar` limparia.
#
# Sem isto, uma base sem o utilizador do arnês faz o `alvos.ts` rebentar na
# RECOLHA e o Playwright diz «No tests found» — que não aponta para nada, e me
# custou seis hipóteses a 06/09.
bash "$(dirname "$0")/arnes-pronto.sh" >/dev/null || {
  echo "ERRO: não consegui preparar o arnês — vê scripts/arnes-pronto.sh" >&2
  exit 1
}

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

# ── Uma porta ocupada dá um vermelho que não é sobre código nenhum ────────
#
# É a lição que o `provar-staff-no-navegador.sh` escreveu: o servidor não sobe, a
# suite falha inteira, e a mensagem manda procurar um defeito no produto quando
# o problema é um processo esquecido.
PORTA_DA_PROVA="${PORTA_INSPECCAO:-3010}"
if lsof -ti:"$PORTA_DA_PROVA" >/dev/null 2>&1; then
  echo "ERRO: a porta $PORTA_DA_PROVA já está ocupada." >&2
  exit 2
fi

CASOS_MINIMOS=19
falhas=0

NAV=apps/web/src/reservas/NavegacaoDeReservas.tsx
POLITICAS='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/politicas/page.tsx'
PREFERENCIAS='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/settings/reservas/page.tsx'
TURNOS='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/turnos/page.tsx'
SPEC=inspeccao/reservas.spec.ts
SEMENTE=packages/db/prisma/semente-inspeccao.ts
ORIG_NAV=$(mktemp); ORIG_POL=$(mktemp); ORIG_PREF=$(mktemp); ORIG_TUR=$(mktemp)
ORIG_SPEC=$(mktemp); ORIG_SEM=$(mktemp)
cp "$NAV" "$ORIG_NAV"; cp "$POLITICAS" "$ORIG_POL"; cp "$PREFERENCIAS" "$ORIG_PREF"
cp "$TURNOS" "$ORIG_TUR"; cp "$SPEC" "$ORIG_SPEC"; cp "$SEMENTE" "$ORIG_SEM"

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── Um plante tem de VERIFICAR-SE ────────────────────────────────────────────
#
# Se a âncora já não existe, o `assert` do python dispara, o guião segue, e o
# `exigir_vermelho` corre contra um produto INTACTO: o produto passa, e o guião
# conclui que a asserção é vazia. É uma acusação falsa — e cinco das dez falhas
# do corredor de 06/09 eram exactamente isso.
#
# Aqui o código de saída do plante é lido. Se ele não pegou, a falha é do GUIÃO
# e diz-se assim, em vez de se atribuir ao produto.
plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

restaurar() {
  cp "$ORIG_NAV" "$NAV"; cp "$ORIG_POL" "$POLITICAS"; cp "$ORIG_PREF" "$PREFERENCIAS"
  cp "$ORIG_TUR" "$TURNOS"; cp "$ORIG_SPEC" "$SPEC"; cp "$ORIG_SEM" "$SEMENTE"
  rm -f "$ORIG_NAV" "$ORIG_POL" "$ORIG_PREF" "$ORIG_TUR" "$ORIG_SPEC" "$ORIG_SEM"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel reservas.spec.ts \
    --workers=1 --reporter=list >"$1" 2>&1
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3" nao_esperado="${4:-}"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    return
  fi
  if grep -q 'config.webServer was not able to start' "$ficheiro"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — a suite nem chegou a correr"
    grep -E 'error TS|Failed to type check' "$ficheiro" | head -3
    return
  fi
  if ! grep -qE "✘.*$marcador" "$ficheiro"; then
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '✘' "$ficheiro" | head -4
    return
  fi
  if [[ -n "$nao_esperado" ]] && grep -qE "✘.*$nao_esperado" "$ficheiro"; then
    vermelho "$nome: derrubou também o que NÃO devia cair ($nao_esperado)"
    return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-reservas-nav-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-reservas-nav-ligado.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "VERDE COM POUCO MEDIDO: só $passou casos (mínimo $CASOS_MINIMOS)"; exit 1
  fi
  verde "$passou casos verdes (6 telas × 5 larguras + toque, contraste, 3 idiomas, população)"
else
  vermelho "a prova de navegador falhou com tudo ligado"
  grep -E '✘' /tmp/bossaos-reservas-nav-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — as listas ficam VAZIAS"
# O falso verde desta etapa. Sem linhas, as seis telas respondem 200, cabem em
# todas as larguras e passam o contraste — sobre o ecrã de «ainda não
# configurou». É por isso que a guarda de população existe e é a primeira coisa
# que este script tenta derrubar.
#
# ── E o plante é na SEMEADURA, não na base ────────────────────────────────
#
# A primeira versão apagava as linhas com `psql` e ficou VERDE com razão: a
# própria passagem semeia antes de medir, e o que eu tinha apagado voltava
# sozinho antes de o navegador abrir. Estava a plantar num estado que o arnês
# reconstrói.
#
# Um defeito plantado num sítio que o alvo repõe não é um defeito plantado.
plantar <<'PYVAZIO' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = '    const SEMEAR_RESERVAS = true;'
assert antigo in s, 'a costura da semeadura do E18 nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '    const SEMEAR_RESERVAS = false;'))
PYVAZIO
exigir_vermelho "caiu a população: listas vazias deixaram de passar por medição" \
  'pelo menos uma linha cada' /tmp/bossaos-reservas-nav-vazio.txt
cp "$ORIG_SEM" "$SEMENTE"

echo
echo "3. CONTROLO NEGATIVO — o marcador da tela deixa de existir"
# A correcção que o E15 pagou caro: `data-tela` quer dizer «esta página
# identifica-se a si própria», e vive no cabeçalho.
plantar <<'PYMARCA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/politicas/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<h1 data-tela="RES-B-016">{p.politicas}</h1>'
assert antigo in s, 'o marcador nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '<h1>{p.politicas}</h1>'))
PYMARCA
exigir_vermelho "caiu o marcador: uma tela sem cabeçalho próprio deixou de passar" \
  'não transbordam|marcador' /tmp/bossaos-reservas-nav-marcador.txt
cp "$ORIG_POL" "$POLITICAS"

echo
echo "4. CONTROLO NEGATIVO — a navegação volta a levar data-tela"
# ── O defeito exacto que custou quatro sinais verdes falsos no E15 ────────
#
# A navegação aparece em todas as páginas. Com `data-tela` nas ligações, cada
# página anuncia-se como todas as outras e o marcador por tela deixa de poder
# falhar — o detector morre sem dizer nada.
plantar <<'PYNAV' || true
import io
p = 'apps/web/src/reservas/NavegacaoDeReservas.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '           data-seccao={s.tela}'
assert antigo in s, 'o atributo da ligacao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '           data-tela={s.tela}'))
PYNAV
exigir_vermelho "caiu a navegação: as ligações voltaram a fingir-se de telas" \
  'nenhuma é um data-tela' /tmp/bossaos-reservas-nav-seccao.txt
cp "$ORIG_NAV" "$NAV"

echo
echo "5. CONTROLO NEGATIVO — o depósito deixa de dizer PORQUÊ"
# «Não é uma funcionalidade em falta: é uma decisão.» Sem o motivo no ecrã,
# «desligado» lê-se como avaria — e a decisão deixa de existir num sítio que uma
# pessoa veja.
plantar <<'PYDEPOSITO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/politicas/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <p className="bo-campo__ajuda">{p.depositoAjuda}</p>\n'
assert antigo in s, 'o motivo do deposito nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYDEPOSITO
exigir_vermelho "caiu o motivo: o depósito desligado passou a parecer avaria" \
  'estado E o motivo' /tmp/bossaos-reservas-nav-deposito.txt
cp "$ORIG_POL" "$POLITICAS"

echo
echo "6. CONTROLO NEGATIVO — o SET-007 deixa de dizer o ESTADO"
# `activo` desligado é «não aceitamos reservas»; sem turnos é «não sabemos
# quando». Sem o estado no ecrã, quem configura não distingue os dois.
plantar <<'PYESTADO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/settings/reservas/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '          <p data-teste="estado-reservas">{d.activo ? p.ligado : p.desligado}</p>\n'
assert antigo in s, 'o estado das reservas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYESTADO
exigir_vermelho "caiu o estado: o ecrã deixou de dizer se a casa aceita reservas" \
  'diz se a casa aceita' /tmp/bossaos-reservas-nav-estado.txt
cp "$ORIG_PREF" "$PREFERENCIAS"

echo
echo "7. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
# Mede o leitor da matriz. Sem isto, encolher a lista era uma forma silenciosa de
# passar: menos telas, menos hipóteses de falhar.
plantar <<'PYPOP' || true
import io
p = 'inspeccao/reservas.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  { id: 'RES-B-015', caminho: `${PAINEL}/reservations/bloqueios` },\n"
assert antigo in s, 'a lista de telas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYPOP
exigir_vermelho "caiu a população: 5 telas deixaram de ser 6" \
  'população é 6 telas' /tmp/bossaos-reservas-nav-pop.txt
cp "$ORIG_SPEC" "$SPEC"

echo
echo "8. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-reservas-nav-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-reservas-nav-reposto.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "reposto mas com pouco medido: $passou casos"
  else
    verde "reposto: $passou casos verdes"
  fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '✘' /tmp/bossaos-reservas-nav-reposto.txt | head -10
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))
