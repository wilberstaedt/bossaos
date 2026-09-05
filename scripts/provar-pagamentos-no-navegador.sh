#!/usr/bin/env bash
#
# E23 fatia 2 — as 12 telas, no navegador.
#
# ── O que a régua reprova à cabeça ────────────────────────────────────────
#
# «Verde sobre zero pagamentos. Declara-se a população.» É o controlo 2: sem o
# pagamento capturado, a devolução mede um ecrã vazio — que cabe em qualquer
# largura e não tem nada para ler.
#
# E «segredos de adquirente em código, em registo, ou em endereço». O controlo 5
# põe um campo de chave no ecrã de configuração, e a prova tem de acender.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

INT='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/integrations/pagamentos/page.tsx'
CARTAO='apps/web/app/[idioma]/pos/[locationId]/conta/[billId]/cartao/page.tsx'
CONFIG='apps/web/app/[idioma]/pos/[locationId]/pagamentos/page.tsx'
TERM='apps/web/app/[idioma]/pos/[locationId]/terminais/page.tsx'
TPVHOME='apps/web/app/[idioma]/pos/[locationId]/page.tsx'
SEMENTE=packages/db/prisma/semente-inspeccao.ts
SPEC=inspeccao/pagamentos.spec.ts
FICHEIROS=("$INT" "$CARTAO" "$CONFIG" "$TERM" "$TPVHOME" "$SEMENTE" "$SPEC")
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
  pnpm exec playwright test --project=preparar --project=painel pagamentos.spec.ts \
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
if correr /tmp/bossaos-pag-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pag-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "as telas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pag-ligado.txt | grep -E '✘' | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a semeadura fica SEM pagamento capturado"
plantar <<'PYPOP' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
i = s.index('    const pagamentoDaProva = await prisma.payment.create({')
j = s.index('    });', i) + len('    });\n')
assert 'gorjetaMenor' in s[i:j], 'o pagamento da semeadura nao esta onde se esperava'
# Sem o pagamento não há recibo: o alvo do arnês passa a não resolver e a suite
# morre no arranque. Por isso fica um pagamento SEM captura registada — a linha
# existe para o alvo, e a tela de devolução deixa de ter o que mostrar.
# A gorjeta a ZERO é o defeito: uma gorjeta a zero é indistinguível de «a
# gorjeta nunca aparece», e o comprovativo passa a medir um campo que não existe.
# Apagar o pagamento inteiro matava o alvo do arnês antes de medir — lição do E20.
io.open(p, 'w', encoding='utf-8').write(
    s[:i] + s[i:j].replace('gorjetaMenor: 300,', 'gorjetaMenor: 0,') + s[j:])
PYPOP
correr /tmp/bossaos-pag-pop.txt
exigir_vermelho "caiu a população: a gorjeta a zero passou por gorjeta ausente" \
  'o comprovativo mostra a GORJETA' 'não distingue zero de ausente' \
  /tmp/bossaos-pag-pop.txt
repor "$SEMENTE"

echo
echo "3. CONTROLO NEGATIVO — o INT-005 deixa de declarar a integração PENDENTE"
plantar <<'PYPEND' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/integrations/pagamentos/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<p data-teste="integracao-pendente">{p.integracaoPendente}</p>'
assert antigo in s, 'a declaracao de pendencia nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '<p data-teste="integracao-pendente">{p.ligado}</p>', 1))
PYPEND
correr /tmp/bossaos-pag-pend.txt
exigir_vermelho "caiu a declaração: o produto deixou de dizer o que NÃO faz" \
  'declara a integração como PENDENTE' 'não diz que está pendente' \
  /tmp/bossaos-pag-pend.txt
repor "$INT"

echo
echo "4. CONTROLO NEGATIVO — o cartão passa a ser oferecido SEM adquirente"
plantar <<'PYCARTAO' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/conta/[billId]/cartao/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      {conector?.activo ? ('
assert antigo in s, 'a guarda do conector nao esta onde se esperava'
# `|| true` mantem a variavel usada E compila: o operador virgula nao passa a
# verificacao de tipos, e um defeito que nao compila e' um ficheiro partido, nao
# um defeito plantado.
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '      {(conector?.activo || true) ? (', 1))
PYCARTAO
correr /tmp/bossaos-pag-cartao.txt
exigir_vermelho "caiu a guarda: há botão de cobrar sem banco do outro lado" \
  'o cartão NÃO é oferecido' 'há um botão de cobrar sem adquirente' \
  /tmp/bossaos-pag-cartao.txt
repor "$CARTAO"

echo
echo "5. CONTROLO NEGATIVO — a configuração ganha um campo para a CHAVE"
plantar <<'PYCHAVE' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/pagamentos/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <Campo rotulo={t.autoriza} name="merchantId"'
assert antigo in s, 'o campo do merchant nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, '        <Campo rotulo={t.autoriza} name="segredo" />\n' + antigo, 1))
PYCHAVE
correr /tmp/bossaos-pag-chave.txt
exigir_vermelho "caiu a regra: apareceu onde escrever um segredo de adquirente" \
  'NÃO tem campo para uma chave secreta' 'o segredo vive no servidor' \
  /tmp/bossaos-pag-chave.txt
repor "$CONFIG"

echo
echo "6. CONTROLO NEGATIVO — o terminal passa a parecer prova de pagamento"
plantar <<'PYPING' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/terminais/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="ping-nao-prova">{p.pingNaoProva}</p>'
assert antigo in s, 'a frase do ping nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPING
correr /tmp/bossaos-pag-ping.txt
exigir_vermelho "caiu a frase: um terminal a responder passou a parecer um cobro feito" \
  'terminal que responde não prova' '' /tmp/bossaos-pag-ping.txt
repor "$TERM"

echo
echo "7. CONTROLO NEGATIVO — a porta do E23 desaparece do TPV"
plantar <<'PYPORTA' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<a data-seccao="pagamentos" href={`/${idioma}/pos/${locationId}/pagamentos`}>{t.caixa}</a>'
assert antigo in s, 'a porta dos pagamentos nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPORTA
correr /tmp/bossaos-pag-porta.txt
exigir_vermelho "caiu a porta: as telas do E23 existem e ninguém lá chega" \
  'chega-se à configuração de cobros por cliques' '' /tmp/bossaos-pag-porta.txt
repor "$TPVHOME"

echo
echo "8. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
plantar <<'PYLISTA' || true
import io
p = 'inspeccao/pagamentos.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    { id: 'POS-008', caminho: `${CONTA}/misto` },\n"
assert antigo in s, 'a lista de telas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYLISTA
correr /tmp/bossaos-pag-lista.txt
exigir_vermelho "caiu a população: 11 telas deixaram de ser 12" \
  'a população é 12 telas' '' /tmp/bossaos-pag-lista.txt
repor "$SPEC"

echo
echo "9. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-pag-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pag-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pag-reposto.txt | grep -E '✘' | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1
