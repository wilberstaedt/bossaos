#!/usr/bin/env bash
#
# E30 fatia 2 — as 9 telas, no navegador.
#
# O controlo que a régua põe em primeiro lugar é o 2: escrever «sem dados» e
# «zero medido» da mesma maneira. Nada estoira e o ecrã fica bonito — e um
# gerente fecha o turno de almoço de uma casa que vendeu tudo, só que ninguém
# tinha medido.
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

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

INICIO='apps/web/app/[idioma]/app/[orgSlug]/page.tsx'
MEDIDA='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reports/medida/page.tsx'
TRABALHO='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reports/trabalho/page.tsx'
MODULO='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reports/page.tsx'
LAYOUT='apps/web/app/[idioma]/app/[orgSlug]/layout.tsx'
PURO=packages/domain/src/agregacao.ts
MOTOR=packages/db/src/analitica.ts
SEMENTE=packages/db/prisma/semente-inspeccao.ts
FICHEIROS=("$INICIO" "$MEDIDA" "$TRABALHO" "$MODULO" "$LAYOUT" "$PURO" "$MOTOR" "$SEMENTE")
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
  pnpm exec playwright test --project=preparar --project=painel analitica.spec.ts \
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
if correr /tmp/bossaos-anlnav-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-anlnav-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "as telas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-anlnav-ligado.txt | grep -E '✘' | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — «sem dados» passa a escrever-se como ZERO"
# ── O aceite que a régua põe em primeiro lugar ────────────────────────────
#
# As duas coisas escrevem-se iguais, o ecrã fica alinhado e bonito, e quem lê
# fecha o turno de almoço de uma casa que ninguém mediu.
plantar <<'PYAUSENCIA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '              <span data-teste="sem-dados">{t.semDados}</span>'
assert antigo in s, 'a marca do sem-dados nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '              <span data-teste="medido">0</span>', 1))
PYAUSENCIA
correr /tmp/bossaos-anlnav-ausencia.txt
exigir_vermelho "caiu a distinção: quem não mediu passou a dizer que vendeu zero" \
  'distinguem-se' 'escreve-se igual a zero' /tmp/bossaos-anlnav-ausencia.txt
repor "$INICIO"

echo
echo "3. CONTROLO NEGATIVO — a média do total passa a ser média DE MÉDIAS"
plantar <<'PYMEDIA' || true
import io
p = 'packages/domain/src/agregacao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    porMoeda.set(p.moeda, {
      moeda: p.moeda,
      somaMenor: actual.somaMenor + p.somaMenor,
      contagem: actual.contagem + p.contagem,
    });"""
assert antigo in s, 'a soma do numerador e denominador nao esta onde se esperava'
novo = """    const media = p.contagem === 0 ? 0n : p.somaMenor / BigInt(p.contagem);
    porMoeda.set(p.moeda, {
      moeda: p.moeda,
      somaMenor: actual.somaMenor + media,
      contagem: actual.contagem + 1,
    });"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYMEDIA
correr /tmp/bossaos-anlnav-media.txt
exigir_vermelho "caiu a ponderação no ecrã: o número passou a ser a média das médias" \
  'NÃO é a média das médias das unidades' \
  'os dados de prova não têm o caso' /tmp/bossaos-anlnav-media.txt
repor "$PURO"

echo
echo "4. CONTROLO NEGATIVO — a unidade sem dados entra na contagem do total"
plantar <<'PYVAZIA' || true
import io
p = 'packages/db/src/analitica.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    if (!u.agregado.medido) continue;
    partes.push(u.agregado.valor);"""
assert antigo in s, 'a exclusao da unidade vazia nao esta onde se esperava'
novo = """    if (!u.agregado.medido) {
      partes.push({ moeda: 'EUR', somaMenor: 0n, contagem: 1 });
      continue;
    }
    partes.push(u.agregado.valor);"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYVAZIA
correr /tmp/bossaos-anlnav-vazia.txt
exigir_vermelho "caiu a exclusão: a unidade vazia entrou no total como se tivesse vendido zero" \
  'NÃO entra na contagem do total' \
  'a vazia entrou como zero' /tmp/bossaos-anlnav-vazia.txt
repor "$MOTOR"

echo
echo "5. CONTROLO NEGATIVO — a exportação deixa de ser o que está na tela"
plantar <<'PYEXPORTA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reports/medida/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "  const linhas = desta?.linhas ?? [];"
assert antigo in s, 'a lista exportavel nao esta onde se esperava'
# Uma segunda consulta que pode divergir — que e' exactamente o defeito.
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "  const linhas = (desta?.linhas ?? []).slice(1);", 1))
PYEXPORTA
correr /tmp/bossaos-anlnav-exporta.txt
exigir_vermelho "caiu a exportação: o ficheiro deixou de ser o que a pessoa viu" \
  'exporta EXACTAMENTE o que mostra' \
  'defender números que não viu' /tmp/bossaos-anlnav-exporta.txt
repor "$MEDIDA"

echo
echo "6. CONTROLO NEGATIVO — um relatório deixa de declarar os filtros"
plantar <<'PYFILTROS' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reports/trabalho/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="filtros">{t.periodo}: {b.periodo.de} — {b.periodo.ate}</p>\n'
assert antigo in s, 'a linha dos filtros nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYFILTROS
correr /tmp/bossaos-anlnav-filtros.txt
exigir_vermelho "caíram os filtros: um número que ninguém consegue contestar" \
  'declara os FILTROS e a DEFINIÇÃO' \
  'não diz que filtros estão postos' /tmp/bossaos-anlnav-filtros.txt
repor "$TRABALHO"

echo
echo "7. CONTROLO NEGATIVO — o «início» volta a ser uma entrada morta"
plantar <<'PYINICIO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/layout.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "    { href: `/${idioma}/app/${orgSlug}`, rotulo: m.navegacao.inicio, accao: null },"
assert antigo in s, 'a entrada do inicio nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "    { href: '#', rotulo: m.navegacao.inicio, accao: null },", 1))
PYINICIO
correr /tmp/bossaos-anlnav-inicio.txt
exigir_vermelho "caiu a porta: o início voltou a não levar a lado nenhum" \
  'chega-se ao início por cliques' \
  'a entrada do início é um `#`' /tmp/bossaos-anlnav-inicio.txt
repor "$LAYOUT"

echo
echo "8. CONTROLO NEGATIVO — cai UMA das sete secções do módulo"
plantar <<'PYSECCAO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reports/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "          ['medida', m.analiticaE30.medida],\n"
assert antigo in s, 'a seccao da medida nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYSECCAO
correr /tmp/bossaos-anlnav-seccao.txt
exigir_vermelho "caiu uma secção: a REP-017 ficou sem porta" \
  'chega-se às sete telas novas' 'ficou sem porta' /tmp/bossaos-anlnav-seccao.txt
repor "$MODULO"

echo
echo "9. CONTROLO NEGATIVO — a semente perde a unidade SEM DADOS"
plantar <<'PYSEMENTE' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "          nome: `${PREFIXO}Sin datos`, slug: `${PREFIXO}sin-datos`,"
assert antigo in s, 'a unidade sem dados nao esta onde se esperava'
# Dar-lhe dados: deixa de haver o par que a regua exige.
novo = "          nome: `${PREFIXO}Sin datos`, slug: `${PREFIXO}sin-datos`,"
s = s.replace("""      // E esta fica SEM movimento nenhum, de propósito: é a que tem de aparecer
      // como «sem dados» e nunca como zero.""",
"""      // PLANTE: deixa de ficar sem movimentos.""", 1)
# ── O plante tem de encher TODAS as unidades vazias ─────────────────────
#
# A primeira versao encheu so' a `Sin datos` e o controlo ficou VERDE: a Marina
# Playa tambem estava vazia, o par continuou a existir, e o defeito nunca chegou
# a existir. E a regra do plante pela metade noutra dimensao — tirar UMA
# instancia do caso nao tira o caso.
s = s.replace("""      // Denominadores desiguais: muitas linhas pequenas numa, poucas grandes
      // noutra. Sem isto a média ponderada dá o mesmo que a média de médias.""",
"""      const vazias = await prisma.location.findMany({
        where: { organizationId: IDS.orgA, archivedAt: null },
        select: { id: true },
      });
      for (const v of vazias) {
        await prisma.financialMovement.create({
          data: {
            organizationId: IDS.orgA, locationId: v.id,
            tipo: 'RECEITA', conceito: `${PREFIXO}plante`, montanteMenor: BigInt(100),
            ocorrenciaEm: new Date('2026-09-12T00:00:00Z'),
            valorEm: new Date('2026-09-12T00:00:00Z'),
            origemTipo: 'bill', origemId: v.id,
          },
        });
      }""", 1)
io.open(p, 'w', encoding='utf-8').write(s)
PYSEMENTE
correr /tmp/bossaos-anlnav-semente.txt
# Sem uma unidade sem dados, o par nao existe e o ecra mede so' o caminho feliz.
exigir_vermelho "caiu o par semeado: sem uma unidade vazia, não há o que distinguir" \
  'unidades com dados e unidades sem' \
  'o caso mau não está semeado' /tmp/bossaos-anlnav-semente.txt
repor "$SEMENTE"

echo
echo "10. Reposto"
if correr /tmp/bossaos-anlnav-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-anlnav-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "NÃO REPÔS — o artefacto ficou com defeito plantado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-anlnav-reposto.txt | grep -E '✘' | head -8
fi

CHEGOU_AO_FIM=1
echo
echo "$falhas falhas"
[[ "$falhas" -eq 0 ]]
