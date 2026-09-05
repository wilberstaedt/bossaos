#!/usr/bin/env bash
#
# E24 fatia 2 — as 5 telas, no navegador.
#
# O controlo que mais vale é o 2: fazer o ecrã chamar documento fiscal a tudo.
# Nada estoira e nada dá erro — e um recibo por emitir passa a parecer válido.
# É o defeito LEGAL desta etapa, e é silencioso.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

DOCS='apps/web/app/[idioma]/pos/[locationId]/fiscal/page.tsx'
CONFIG='apps/web/app/[idioma]/pos/[locationId]/fiscal/configuracao/page.tsx'
CATALOGO='apps/web/app/[idioma]/app/[orgSlug]/catalogo/impostos/page.tsx'
TPVHOME='apps/web/app/[idioma]/pos/[locationId]/page.tsx'
SEMENTE=packages/db/prisma/semente-inspeccao.ts
SPEC=inspeccao/fiscal.spec.ts
FICHEIROS=("$DOCS" "$CONFIG" "$CATALOGO" "$TPVHOME" "$SEMENTE" "$SPEC")
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
  pnpm exec playwright test --project=preparar --project=painel fiscal.spec.ts \
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
if correr /tmp/bossaos-fnav-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-fnav-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "as telas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-fnav-ligado.txt | grep -E '✘' | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o ecrã chama documento fiscal a TUDO"
plantar <<'PYTUDO' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/fiscal/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '              {eDocumentoFiscal(d) ? ('
assert antigo in s, 'a distincao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '              {(eDocumentoFiscal(d) || true) ? (', 1))
PYTUDO
correr /tmp/bossaos-fnav-tudo.txt
exigir_vermelho "caiu a distinção: um documento por aceitar passou por válido" \
  'o que NÃO foi aceite diz que não é documento fiscal' \
  'a distinção não está a ser feita' /tmp/bossaos-fnav-tudo.txt
repor "$DOCS"

echo
echo "3. CONTROLO NEGATIVO — a rejeição deixa de mostrar o motivo"
plantar <<'PYMOTIVO' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/fiscal/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '                <span data-teste="motivo-rejeicao">{t.motivo}: {d.motivoRejeicao}</span>'
assert antigo in s, 'o motivo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '                <span data-teste="motivo-rejeicao">{t.motivo}</span>', 1))
PYMOTIVO
correr /tmp/bossaos-fnav-motivo.txt
exigir_vermelho "caiu o motivo: quem tem de corrigir não sabe o quê" \
  'a rejeição mostra o MOTIVO' 'mas não o motivo' /tmp/bossaos-fnav-motivo.txt
repor "$DOCS"

echo
echo "4. CONTROLO NEGATIVO — a pendência POR CONFIRMAR desaparece do ecrã"
plantar <<'PYPEND' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/fiscal/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="por-confirmar">{t.porConfirmar}</p>'
assert antigo in s, 'a pendencia nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPEND
correr /tmp/bossaos-fnav-pend.txt
exigir_vermelho "caiu a pendência: o limite deixou de estar onde o restaurante o lê" \
  'requisitos POR CONFIRMAR' '' /tmp/bossaos-fnav-pend.txt
repor "$DOCS"

echo
echo "5. CONTROLO NEGATIVO — a configuração ganha um campo para CERTIFICADO"
plantar <<'PYCERT' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/fiscal/configuracao/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <Campo rotulo={t.nif} name="nif"'
assert antigo in s, 'o campo do nif nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, '        <Campo rotulo={t.nif} name="certificado" />\n' + antigo, 1))
PYCERT
correr /tmp/bossaos-fnav-cert.txt
exigir_vermelho "caiu a regra: apareceu onde colar um certificado fiscal" \
  'NÃO tem campo para credencial' 'o segredo vive no servidor' \
  /tmp/bossaos-fnav-cert.txt
repor "$CONFIG"

echo
echo "6. CONTROLO NEGATIVO — o catálogo passa a AFIRMAR uma taxa"
plantar <<'PYTAXA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/catalogo/impostos/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="por-confirmar">{t.porConfirmar}</p>'
assert antigo in s, 'a pendencia do catalogo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYTAXA
correr /tmp/bossaos-fnav-taxa.txt
exigir_vermelho "caiu o aviso: o catálogo passou a parecer uma tabela de IVA confirmada" \
  'NÃO afirma taxas que ninguém confirmou' '' /tmp/bossaos-fnav-taxa.txt
repor "$CATALOGO"

echo
echo "7. CONTROLO NEGATIVO — a população fica sem o documento REJEITADO"
plantar <<'PYPOP' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "        motivoRejeicao: 'NIF del cliente inválido', anteriorId: docAceite.id,"
assert antigo in s, 'o documento rejeitado nao esta onde se esperava'
# Passa a ACEITE: a linha continua a existir para a contagem, mas deixa de haver
# rejeição — e o motivo nunca aparece. Apagar a linha inteira mudava a contagem
# e o vermelho vinha da população, não da distinção.
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo,
    "        numeroProvedor: 'FAC-INSP-0002', anteriorId: docAceite.id,", 1)
    .replace("        acontecimento: `${PREFIXO}doc-rejeitado`, estado: 'REJEITADO',",
             "        acontecimento: `${PREFIXO}doc-rejeitado`, estado: 'ACEITE',", 1))
PYPOP
correr /tmp/bossaos-fnav-pop.txt
exigir_vermelho "caiu a população: sem rejeitado, o motivo nunca apareceria" \
  'declara quantos havia' 'o motivo nunca apareceria' /tmp/bossaos-fnav-pop.txt
repor "$SEMENTE"

echo
echo "8. CONTROLO NEGATIVO — a porta do E24 desaparece do TPV"
plantar <<'PYPORTA' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<a data-seccao="fiscal" href={`/${idioma}/pos/${locationId}/fiscal`}>{t.conta}</a>'
assert antigo in s, 'a porta do fiscal nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPORTA
correr /tmp/bossaos-fnav-porta.txt
exigir_vermelho "caiu a porta: as 5 telas existem e ninguém lá chega" \
  'chega-se aos documentos fiscais por cliques' '' /tmp/bossaos-fnav-porta.txt
repor "$TPVHOME"

echo
echo "9. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
plantar <<'PYLISTA' || true
import io
p = 'inspeccao/fiscal.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    { id: 'POS-012', caminho: `${POS}/conta/${a.contaDoTpv}/recibo` },\n"
assert antigo in s, 'a lista de telas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYLISTA
correr /tmp/bossaos-fnav-lista.txt
exigir_vermelho "caiu a população: 4 telas deixaram de ser 5" \
  'a população é 5 telas' '' /tmp/bossaos-fnav-lista.txt
repor "$SPEC"

echo
echo "10. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-fnav-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-fnav-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-fnav-reposto.txt | grep -E '✘' | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1
