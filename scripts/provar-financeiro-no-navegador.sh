#!/usr/bin/env bash
#
# E29 fatia 2 — as 11 telas, no navegador.
#
# O controlo que mais vale é o 2: pôr o painel a ler as duas leituras pela mesma
# data. Os dois números passam a bater certo, e é isso que está errado — é o
# único sinal de avaria desta etapa que se parece com um sinal de saúde.
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

CARREGADOR=apps/web/src/financeiro/pagina.ts
F='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/finance'
PAINEL="$F/page.tsx"
CONTA="$F/contas/[accountId]/page.tsx"
CONCILIAR="$F/conciliar/[accountId]/page.tsx"
NOVADESPESA="$F/despesas/nova/page.tsx"
DOCUMENTOS="$F/documentos/page.tsx"
MODULO='apps/web/app/[idioma]/app/[orgSlug]/ir/[modulo]/page.tsx'
SEMENTE=packages/db/prisma/semente-inspeccao.ts
FICHEIROS=("$CARREGADOR" "$PAINEL" "$CONTA" "$CONCILIAR" "$NOVADESPESA" "$DOCUMENTOS" "$MODULO" "$SEMENTE")
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
  pnpm exec playwright test --project=preparar --project=painel financeiro.spec.ts \
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
if correr /tmp/bossaos-finnav-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-finnav-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "as telas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-finnav-ligado.txt | grep -E '✘' | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — as duas leituras passam a usar a MESMA data"
# ── O único sinal de avaria que se parece com um sinal de saúde ───────────
#
# Nada estoira. Os dois relatórios passam a bater certo, e quem olha para o
# ecrã fica descansado — que é exactamente o problema.
plantar <<'PYDATAS' || true
import io
p = 'apps/web/src/financeiro/pagina.ts'
s = io.open(p, encoding='utf-8').read()
# O plante mexe no OBJECTO DEVOLVIDO, e nao na chamada. Trocar a chamada deixava
# o `caixaDoPeriodo` por usar, e o `noUnusedLocals` partia a construcao — um
# plante que nao compila nao planta defeito nenhum, mede um ficheiro partido.
antigo = "    ...base, orgSlug, periodo, ...dados,"
assert antigo in s, 'o objecto devolvido nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, "    ...base, orgSlug, periodo, ...dados, caixa: dados.resultado,", 1))
PYDATAS
correr /tmp/bossaos-finnav-datas.txt
exigir_vermelho "caíram as três datas no ecrã: os dois números passaram a concordar" \
  'os dois números DISCORDAM' 'as datas colapsaram' /tmp/bossaos-finnav-datas.txt
repor "$CARREGADOR"

echo
echo "3. CONTROLO NEGATIVO — a sugestão a 100 aparece já CONFIRMADA"
plantar <<'PYAUTO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/finance/conciliar/[accountId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = """              <span data-teste={c.estado === 'CONFIRMADA' ? 'confirmada' : 'sugestao'}>"""
assert antigo in s, 'a marca do estado nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, """              <span data-teste={c.semelhanca >= 100 ? 'confirmada' : 'sugestao'}>""", 1))
PYAUTO
correr /tmp/bossaos-finnav-auto.txt
exigir_vermelho "caiu a confirmação no ecrã: a semelhança perfeita passou por conciliada" \
  'a 100 aparece como SUGESTÃO' \
  'apareceu já confirmada' /tmp/bossaos-finnav-auto.txt
repor "$CONCILIAR"

echo
echo "4. CONTROLO NEGATIVO — o extracto mostra a linha como conciliada sem confirmação"
plantar <<'PYCONC' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/finance/contas/[accountId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = """            <span data-teste={l.conciliada ? 'conciliada' : 'por-conciliar'}>"""
assert antigo in s, 'a marca da conciliada nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, """            <span data-teste="conciliada">""", 1))
PYCONC
correr /tmp/bossaos-finnav-conc.txt
exigir_vermelho "caiu a derivação no ecrã: tudo apareceu conciliado sem ninguém confirmar" \
  'continua POR CONCILIAR no extracto' \
  'sem ninguém ter confirmado' /tmp/bossaos-finnav-conc.txt
repor "$CONTA"

echo
echo "5. CONTROLO NEGATIVO — a tela ganha uma caixinha de «conciliado»"
plantar <<'PYCAIXA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/finance/contas/[accountId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="conciliado-derivado">{t.conciliadoDerivado}</p>'
assert antigo in s, 'o texto do conciliado derivado nao esta onde se esperava'
novo = antigo + '\n      <form><input name="conciliado" type="checkbox" /></form>'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYCAIXA
correr /tmp/bossaos-finnav-caixa.txt
exigir_vermelho "caiu a ausência: conciliado voltou a ser uma caixinha que alguém marca" \
  'nenhuma tela oferece MARCAR como conciliado' \
  'voltou a ser uma caixinha' /tmp/bossaos-finnav-caixa.txt
repor "$CONTA"

echo
echo "6. CONTROLO NEGATIVO — o formulário da despesa fica com UMA data só"
plantar <<'PYUMADATA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/finance/despesas/nova/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <Campo rotulo={t.valor} name="valorEm" type="text" defaultValue={hoje} required />\n'
assert antigo in s, 'o campo da data-valor nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYUMADATA
correr /tmp/bossaos-finnav-umadata.txt
exigir_vermelho "caiu a segunda data: o produto passou a inventar a que falta" \
  'pede as DUAS datas' '' /tmp/bossaos-finnav-umadata.txt
repor "$NOVADESPESA"

echo
echo "7. CONTROLO NEGATIVO — o total do painel SOMA as moedas"
plantar <<'PYMOEDAS' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/finance/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = """        {b.totalResultado.map((x) => (
          <li key={`r-${x.moeda}`}>
            <span data-teste="moeda">{x.moeda}</span>"""
assert antigo in s, 'o total do resultado nao esta onde se esperava'
novo = """        {b.totalResultado.map((x) => (
          <li key={`r-${x.moeda}`}>
            <span data-teste="moeda">EUR</span>"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYMOEDAS
correr /tmp/bossaos-finnav-moedas.txt
exigir_vermelho "caiu o agrupamento no ecrã: duas moedas com o mesmo rótulo" \
  'agrupado, com uma linha por moeda' 'não agrupou' /tmp/bossaos-finnav-moedas.txt
repor "$PAINEL"

echo
echo "8. CONTROLO NEGATIVO — reabrir deixa de exigir motivo"
plantar <<'PYMOTIVO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/finance/documentos/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<Campo rotulo={t.motivo} name="motivo" required maxLength={200} />'
assert antigo in s, 'o campo do motivo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '<Campo rotulo={t.motivo} name="motivo" maxLength={200} />', 1))
PYMOTIVO
correr /tmp/bossaos-finnav-motivo.txt
exigir_vermelho "caiu o motivo: reabrir voltou a ser um interruptor" \
  'reabrir exige motivo no ecrã' \
  'um interruptor com outro nome' /tmp/bossaos-finnav-motivo.txt
repor "$DOCUMENTOS"

echo
echo "9. CONTROLO NEGATIVO — o financeiro sai da tabela de destinos"
plantar <<'PYPORTA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/ir/[modulo]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "  financeiro: { rotulo: (m) => m.financeiroE29.financeiro, caminho: 'finance' },\n"
assert antigo in s, 'o destino do financeiro nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPORTA
correr /tmp/bossaos-finnav-porta.txt
exigir_vermelho "caiu a porta: onze telas que só se alcançam a escrever o endereço" \
  'chega-se ao financeiro por cliques' '' /tmp/bossaos-finnav-porta.txt
repor "$MODULO"

echo
echo "10. CONTROLO NEGATIVO — a semeadura perde a SEGUNDA linha igual"
plantar <<'PYPAR' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """        { organizationId: IDS.orgA, accountId: contaDoBanco.id, importId: importacao.id,
          dataValor: new Date('2026-09-28T00:00:00Z'), montanteMenor: BigInt(4500),
          referencia: 'TPV', ordemNoDia: 2, descricao: `${PREFIXO}menu do dia` },
"""
assert antigo in s, 'a segunda linha igual nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPAR
correr /tmp/bossaos-finnav-par.txt
# Sem a segunda linha legitima, a prova mede um extracto sem o caso mau — e um
# detector de duplicados que apagasse factos reais passava despercebido.
exigir_vermelho "caiu o par semeado: sem duas linhas iguais, o caso mau não existe" \
  'DUAS são iguais no mesmo dia' \
  'não há duas linhas iguais no mesmo dia' /tmp/bossaos-finnav-par.txt
repor "$SEMENTE"

echo
echo "11. Reposto"
if correr /tmp/bossaos-finnav-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-finnav-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "NÃO REPÔS — o artefacto ficou com defeito plantado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-finnav-reposto.txt | grep -E '✘' | head -8
fi

CHEGOU_AO_FIM=1
echo
echo "$falhas falhas"
[[ "$falhas" -eq 0 ]]
