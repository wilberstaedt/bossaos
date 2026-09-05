#!/usr/bin/env bash
#
# E28 fatia 2 — as 11 telas, no navegador.
#
# O controlo que mais vale é o 2: pôr uma tela a oferecer a edição da marcação.
# Nada estoira, o formulário até funciona, e a hora de entrada de alguém passa a
# poder ser reescrita sem deixar marca — por quem tem mais poder do que ela.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

T='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/team'
PESSOA="$T/[membershipId]/page.tsx"
CORRECCAO="$T/correccao/page.tsx"
CORRECCOES="$T/correccoes/page.tsx"
NOVOTURNO="$T/escala/novo/page.tsx"
HORAS="$T/horas/page.tsx"
PAINEL="$T/page.tsx"
MODULO='apps/web/app/[idioma]/app/[orgSlug]/ir/[modulo]/page.tsx'
SEMENTE=packages/db/prisma/semente-inspeccao.ts
MOTOR=packages/db/src/ponto.ts
FICHEIROS=("$PESSOA" "$CORRECCAO" "$CORRECCOES" "$NOVOTURNO" "$HORAS" "$PAINEL" "$MODULO" "$SEMENTE" "$MOTOR")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }
repor() {
  local i=0
  for f in "${FICHEIROS[@]}"; do
    [[ "$f" == "$1" ]] && { cp "${COPIAS[$i]}" "$f"; return; }
    i=$((i + 1))
  done
}
restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel ponto.spec.ts \
    --workers=1 --reporter=list >"$1" 2>&1
}

plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

exigir_vermelho() {
  local nome="$1" caso="$2" erro="$3" ficheiro="$4"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  if grep -q 'config.webServer was not able to start' <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — é um ficheiro partido"
    grep -E 'error TS|Failed to type check' <<<"$limpo" | head -3; return
  fi
  if ! grep -qE '[0-9]+ failed' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qE "✘.*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E '✘' <<<"$limpo" | head -4; return
  fi
  if [[ -n "$erro" ]] && ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E 'Error:' <<<"$limpo" | head -3; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-pnav-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pnav-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "as telas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pnav-ligado.txt | grep -E '✘' | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — uma tela passa a oferecer EDITAR a marcação"
plantar <<'PYEDITAR' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/team/correccao/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <input type="hidden" name="accao" value="corrigir" />'
assert antigo in s, 'a accao de corrigir nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, antigo + '\n        <input type="hidden" name="accao" value="editar_marcacao" />', 1))
PYEDITAR
correr /tmp/bossaos-pnav-editar.txt
exigir_vermelho "caiu a ausência: a marcação passou a poder ser reescrita por um ecrã" \
  'nenhuma tela oferece EDITAR uma marcação' \
  'a marcação deixou de ser um facto' /tmp/bossaos-pnav-editar.txt
repor "$CORRECCAO"

echo
echo "3. CONTROLO NEGATIVO — a correcção deixa de exigir motivo no ecrã"
plantar <<'PYMOTIVO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/team/correccao/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<Campo rotulo={t.motivo} name="motivo" required maxLength={200} />'
assert antigo in s, 'o campo do motivo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '<Campo rotulo={t.motivo} name="motivo" maxLength={200} />', 1))
PYMOTIVO
correr /tmp/bossaos-pnav-motivo.txt
exigir_vermelho "caiu o motivo no ecrã: corrige-se sem dizer porquê a quem foi corrigido" \
  'exige MOTIVO no ecrã' 'o motivo não é obrigatório' /tmp/bossaos-pnav-motivo.txt
repor "$CORRECCAO"

echo
echo "4. CONTROLO NEGATIVO — a original DESAPARECE quando é corrigida"
plantar <<'PYSOME' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/team/[membershipId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '          {b.marcacoes.map((m) => ('
assert antigo in s, 'a lista de marcacoes nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '          {b.marcacoes.filter((m) => !m.corrigida).map((m) => (', 1))
PYSOME
correr /tmp/bossaos-pnav-some.txt
exigir_vermelho "caiu o rasto: a original sumiu e ficou só a versão nova" \
  'a original CONTINUA no ecrã' 'o rasto perdeu-se' /tmp/bossaos-pnav-some.txt
repor "$PESSOA"

echo
echo "5. CONTROLO NEGATIVO — a autocorrecção deixa de se distinguir no ecrã"
plantar <<'PYAUTO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/team/correccoes/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = """              <span data-teste={c.autorMembershipId === c.membershipId
                ? 'autocorreccao' : 'por-terceiro'}>"""
assert antigo in s, 'a distincao no ecra nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '              <span data-teste="autocorreccao">', 1))
PYAUTO
correr /tmp/bossaos-pnav-auto.txt
exigir_vermelho "caiu a distinção no ecrã: quem revê deixou de ver quem corrigiu" \
  'autocorrecção distingue-se da correcção por terceiro' \
  'não aparece como tal' /tmp/bossaos-pnav-auto.txt
repor "$CORRECCOES"

echo
echo "6. CONTROLO NEGATIVO — a tela do turno ganha um selector de RELÓGIO"
# ── É o defeito que corta o turno ao meio ─────────────────────────────────
#
# Um `input type="time"` obriga a decidir se `01:00` é hoje ou amanhã, e a
# decisão é sempre «hoje». O turno da sexta passa a acabar à meia-noite.
plantar <<'PYRELOGIO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/team/escala/novo/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <Campo rotulo={t.fim} name="fimMinutos" type="text" inputMode="numeric" required />'
assert antigo in s, 'o campo do fim nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '        <Campo rotulo={t.fim} name="fimMinutos" type="time" required />', 1))
PYRELOGIO
correr /tmp/bossaos-pnav-relogio.txt
exigir_vermelho "caiu a fronteira no ecrã: o relógio obriga a decidir, e decide mal" \
  'escala mostra um turno que passa das 24h' \
  'obriga a decidir se 01:00 é hoje ou amanhã' /tmp/bossaos-pnav-relogio.txt
repor "$NOVOTURNO"

echo
echo "7. CONTROLO NEGATIVO — a equipa sai da tabela de destinos"
plantar <<'PYPORTA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/ir/[modulo]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "  equipa: { rotulo: (m) => m.navegacao.equipa, caminho: 'team' },\n"
assert antigo in s, 'o destino da equipa nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPORTA
correr /tmp/bossaos-pnav-porta.txt
exigir_vermelho "caiu a porta: onze telas que só se alcançam a escrever o endereço" \
  'chega-se à equipa por cliques' '' /tmp/bossaos-pnav-porta.txt
repor "$MODULO"

echo
echo "8. CONTROLO NEGATIVO — cai UMA das oito secções do painel"
# A porta do módulo não chega: dez telas atrás de uma só entrada seriam nove
# telas sem porta. Foi o que o E27 apanhou com catorze.
plantar <<'PYSECCAO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/team/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <a className="bo-botao" data-seccao="relatorio" href={`${base}/relatorio`}>{t.relatorio}</a>\n'
assert antigo in s, 'a seccao do relatorio nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYSECCAO
correr /tmp/bossaos-pnav-seccao.txt
exigir_vermelho "caiu uma secção: a HR-011 ficou sem porta e ninguém dava por isso" \
  'chega-se às oito secções' 'ficou sem porta' /tmp/bossaos-pnav-seccao.txt
repor "$PAINEL"

echo
echo "9. CONTROLO NEGATIVO — a semeadura deixa de plantar a correcção por TERCEIRO"
plantar <<'PYPAR' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """          membershipId: trabalhador, autorMembershipId: chefe,
          tipo: 'ENTRADA', momento: naCasa(18, 0),"""
assert antigo in s, 'a correccao por terceiro nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, """          membershipId: trabalhador, autorMembershipId: trabalhador,
          tipo: 'ENTRADA', momento: naCasa(18, 0),""", 1))
PYPAR
correr /tmp/bossaos-pnav-par.txt
# Sem uma correccao feita por outra pessoa, a prova mede so' autocorreccoes — e
# «tudo e' autocorreccao» passava sem ninguem notar.
exigir_vermelho "caiu o par semeado: sem correcção de terceiro, tudo parece autocorrecção" \
  'UMA delas é correcção por terceiro' \
  'falta o caso de terceiro' /tmp/bossaos-pnav-par.txt
repor "$SEMENTE"

echo
echo "10. Reposto"
if correr /tmp/bossaos-pnav-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pnav-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "NÃO REPÔS — o artefacto ficou com defeito plantado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pnav-reposto.txt | grep -E '✘' | head -8
fi

CHEGOU_AO_FIM=1
echo
echo "$falhas falhas"
[[ "$falhas" -eq 0 ]]
