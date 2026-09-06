#!/usr/bin/env bash
#
# E27 fatia 2 — as 14 telas, no navegador.
#
# O controlo que mais vale é o 2: pôr a tela pública a inferir o consentimento
# de campanha da presença do email. Nada estoira, o formulário funciona, e quem
# deixou o email para o caso de haver resposta passa a receber publicidade.
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

PUBLICA='apps/web/app/r/[publicLocationSlug]/[locale]/menu/feedback/page.tsx'
PREFS='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/customers/[customerId]/preferencias/page.tsx'
SEGNOVO='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/customers/segmentos/novo/page.tsx'
CAMPNOVA='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/customers/campanhas/nova/page.tsx'
FICHA='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/customers/[customerId]/page.tsx'
MODULO='apps/web/app/[idioma]/app/[orgSlug]/ir/[modulo]/page.tsx'
SEMENTE=packages/db/prisma/semente-inspeccao.ts
FICHEIROS=("$PUBLICA" "$PREFS" "$SEGNOVO" "$CAMPNOVA" "$FICHA" "$MODULO" "$SEMENTE")
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
  pnpm exec playwright test --project=preparar --project=painel --project=chromium \
    crm.spec.ts crm-publico.spec.ts --workers=1 --reporter=list >"$1" 2>&1
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
if correr /tmp/bossaos-crmnav-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-crmnav-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "as telas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-crmnav-ligado.txt | grep -E '✘' | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a tela pública começa com o «sim» pré-escolhido"
# ── A caixa pré-marcada, que é o defeito clássico ─────────────────────────
#
# Nada estoira e o formulário funciona. O que muda é que quem deixa o email para
# o caso de haver resposta passa a receber publicidade, e nunca escolheu isso.
plantar <<'PYPRE' || true
import io
p = 'apps/web/app/r/[publicLocationSlug]/[locale]/menu/feedback/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = """          <option value="NAO">{t.retirado}</option>
          <option value="SIM">{t.dado}</option>"""
assert antigo in s, 'as opcoes do consentimento nao estao onde se esperava'
novo = """          <option value="SIM">{t.dado}</option>
          <option value="NAO">{t.retirado}</option>"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYPRE
correr /tmp/bossaos-crmnav-precheck.txt
exigir_vermelho "caiu a caixa pré-marcada: quem não escolheu passou a consentir" \
  'começa em «não»' 'não é consentimento' /tmp/bossaos-crmnav-precheck.txt
repor "$PUBLICA"

echo
echo "3. CONTROLO NEGATIVO — a tela pública deixa de perguntar o consentimento"
plantar <<'PYSEMPERG' || true
import io
p = 'apps/web/app/r/[publicLocationSlug]/[locale]/menu/feedback/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <Seletor rotulo={t.campanhaFinalidade} name="consenteCampanha" required>'
assert antigo in s, 'a pergunta do consentimento nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '        <Seletor rotulo={t.campanhaFinalidade} name="outraCoisa" required>', 1))
PYSEMPERG
correr /tmp/bossaos-crmnav-semperg.txt
exigir_vermelho "caiu a pergunta separada: o consentimento passou a ser inferido" \
  'a pergunta do consentimento é SEPARADA' \
  'não há pergunta separada' /tmp/bossaos-crmnav-semperg.txt
repor "$PUBLICA"

echo
echo "4. CONTROLO NEGATIVO — as quatro respostas colapsam numa só"
plantar <<'PYQUATRO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/customers/[customerId]/preferencias/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        {base.consentimentos.estado.map((e) => ('
assert antigo in s, 'a lista das quatro respostas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '        {base.consentimentos.estado.slice(0, 1).map((e) => (', 1))
PYQUATRO
correr /tmp/bossaos-crmnav-quatro.txt
exigir_vermelho "caiu a separação: uma resposta só passou a valer pelas quatro" \
  'as quatro respostas mostram-se separadas' \
  'não estão separadas no ecrã' /tmp/bossaos-crmnav-quatro.txt
repor "$PREFS"

echo
echo "5. CONTROLO NEGATIVO — o ecrã mostra campanha viva a quem só deu serviço"
plantar <<'PYVIVO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/customers/[customerId]/preferencias/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '            <span data-teste={e.vivo ? \'vivo\' : \'nao-vivo\'}>{e.vivo ? t.dado : t.retirado}</span>'
assert antigo in s, 'o marcador do vivo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "            <span data-teste=\"vivo\">{t.dado}</span>", 1))
PYVIVO
correr /tmp/bossaos-crmnav-vivo.txt
exigir_vermelho "caiu a leitura: o telefone da porta apareceu como permissão de marketing" \
  'quem só deu o telefone à porta aparece SEM campanha' \
  'aparece com campanha viva' /tmp/bossaos-crmnav-vivo.txt
repor "$PREFS"

echo
echo "6. CONTROLO NEGATIVO — o histórico deixa de mostrar a ORIGEM"
plantar <<'PYORIGEM' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/customers/[customerId]/preferencias/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '            <span data-teste="origem">{h.origem}</span>'
assert antigo in s, 'a origem do historico nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '            <span data-teste="origem">{t.historico}</span>', 1))
PYORIGEM
correr /tmp/bossaos-crmnav-origem.txt
exigir_vermelho "caiu a origem: um consentimento que não se consegue defender a ninguém" \
  'o histórico mostra a ORIGEM' \
  'não de onde veio o consentimento' /tmp/bossaos-crmnav-origem.txt
repor "$PREFS"

echo
echo "7. CONTROLO NEGATIVO — o segmento ganha um campo para colar contactos"
plantar <<'PYLISTA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/customers/segmentos/novo/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <Campo rotulo={t.origem} name="origem" maxLength={60} />'
assert antigo in s, 'o campo da origem nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, antigo + '\n        <Campo rotulo={t.contactos} name="lista" maxLength={4000} />', 1))
PYLISTA
correr /tmp/bossaos-crmnav-lista.txt
exigir_vermelho "caiu a ausência: entrou o caminho da lista sem origem de consentimento" \
  'o segmento não tem campo para contactos' \
  'entra a lista sem origem' /tmp/bossaos-crmnav-lista.txt
repor "$SEGNOVO"

echo
echo "8. CONTROLO NEGATIVO — a ficha da pessoa ganha um interruptor de marketing"
plantar <<'PYSWITCH' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/customers/[customerId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="saldo-derivado">{t.saldoDerivado}</p>'
assert antigo in s, 'o texto do saldo derivado nao esta onde se esperava'
novo = antigo + '\n      <form><input name="marketing" type="checkbox" /></form>'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYSWITCH
correr /tmp/bossaos-crmnav-switch.txt
exigir_vermelho "caiu a ausência: a permissão voltou a ser um interruptor" \
  'não tem interruptor de «aceita campanhas»' \
  'a permissão voltou a ser uma coluna' /tmp/bossaos-crmnav-switch.txt
repor "$FICHA"

echo
echo "9. CONTROLO NEGATIVO — a campanha passa a escolher pessoas à mão"
plantar <<'PYPESSOAS' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/customers/campanhas/nova/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <Seletor rotulo={t.segmento} name="segmentId" required>'
assert antigo in s, 'o seletor do segmento nao esta onde se esperava'
novo = ('        <Seletor rotulo={t.cliente} name="customerId">\n'
        '          {base.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}\n'
        '        </Seletor>\n' + antigo)
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYPESSOAS
correr /tmp/bossaos-crmnav-pessoas.txt
exigir_vermelho "caiu a regra: a campanha passou a escolher pessoas, e a origem perdeu-se" \
  'a campanha escolhe um SEGMENTO' \
  'escolhe pessoas à mão' /tmp/bossaos-crmnav-pessoas.txt
repor "$CAMPNOVA"

echo
echo "10. CONTROLO NEGATIVO — os clientes saem da tabela de destinos"
plantar <<'PYPORTA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/ir/[modulo]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "  clientes: { rotulo: (m) => m.navegacao.clientes, caminho: 'customers' },\n"
assert antigo in s, 'o destino dos clientes nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPORTA
correr /tmp/bossaos-crmnav-porta.txt
exigir_vermelho "caiu a porta: catorze telas que só se alcançam a escrever o endereço" \
  'chega-se aos clientes por cliques' '' /tmp/bossaos-crmnav-porta.txt
repor "$MODULO"

echo
echo "11. CONTROLO NEGATIVO — a semeadura deixa de plantar quem SÓ consentiu serviço"
plantar <<'PYPAR' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """        { organizationId: IDS.orgA, customerId: soServico.id, finalidade: 'SERVICO',
          canal: 'SMS', accao: 'DADO', origem: 'lista de espera' },"""
assert antigo in s, 'o consentimento so de servico nao esta onde se esperava'
novo = """        { organizationId: IDS.orgA, customerId: soServico.id, finalidade: 'CAMPANHA',
          canal: 'EMAIL', accao: 'DADO', origem: 'lista de espera' },
        { organizationId: IDS.orgA, customerId: soServico.id, finalidade: 'SERVICO',
          canal: 'SMS', accao: 'DADO', origem: 'lista de espera' },"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYPAR
correr /tmp/bossaos-crmnav-par.txt
# Sem alguem que so consentiu servico, a prova mede so quem consentiu tudo — e
# «a campanha vai a toda a gente» passava sem ninguem notar.
exigir_vermelho "caiu o par semeado: sem quem recusou campanha, a prova só mede quem aceitou" \
  'quem só deu o telefone à porta aparece SEM campanha' \
  'aparece com campanha viva' /tmp/bossaos-crmnav-par.txt
repor "$SEMENTE"

echo
echo "12. Reposto"
if correr /tmp/bossaos-crmnav-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-crmnav-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "NÃO REPÔS — o artefacto ficou com defeito plantado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-crmnav-reposto.txt | grep -E '✘' | head -8
fi

CHEGOU_AO_FIM=1
echo
echo "$falhas falhas"
[[ "$falhas" -eq 0 ]]
