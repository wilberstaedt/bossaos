#!/usr/bin/env bash
#
# E33 no navegador — e o controlo 2 é o que decide.
#
# «Visível ao inquilino» é a única das quatro condições que não vive na base: as
# outras três são restrições, esta é um ecrã que tem de existir. Um acesso que
# só aparece do nosso lado é um acesso que o cliente não pode contestar — e
# esconder essa tela é o plante que o contrato manda fazer.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

ACESSO="apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/settings/acesso/page.tsx"
RETENCAO="apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/settings/retencao/page.tsx"
SUPORTE="apps/web/app/[idioma]/platform/suporte/page.tsx"
SESSAO="apps/web/app/[idioma]/platform/suporte/[sessionId]/page.tsx"
MODELOS="apps/web/app/[idioma]/platform/modelos/page.tsx"
PURO="packages/domain/src/plataforma.ts"
FICHEIROS=("$ACESSO" "$RETENCAO" "$SUPORTE" "$SESSAO" "$MODELOS" "$PURO")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    printf 'Ficheiros repostos.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { npx playwright test inspeccao/plataforma.spec.ts --reporter=line >"$1" 2>&1; }

plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

exigir_vermelho() {
  local nome="$1" caso="$2" ficheiro="$3"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  # Um plante que não compila NÃO é um controlo verde — a lição do E31.
  if grep -qE 'SyntaxError|Cannot find|Type error|Failed to compile|webServer was not able to start' <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA ou não arrancou — é o guião, não o produto"
    grep -E 'SyntaxError|Cannot find|Type error|webServer' <<<"$limpo" | head -2; return
  fi
  if ! grep -qE '[0-9]+ failed' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qF "$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E '›.*›' <<<"$limpo" | tail -4; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-platweb-ligado.txt; then
  verde "$(grep -oE '[0-9]+ passed' /tmp/bossaos-platweb-ligado.txt | head -1)"
else
  vermelho "o navegador não está verde com tudo ligado"
  grep -E '›|Error' /tmp/bossaos-platweb-ligado.txt | tail -8; exit 1
fi

echo
echo "2. CONTROLO QUE DECIDE — a entrada esconde-se do lado do inquilino"
# ── O que o contrato manda plantar, com as palavras dele ─────────────────
#
# «Um acesso que só aparece do nosso lado é um acesso que o cliente não pode
# contestar. Controlo: escondê-la do lado do inquilino e ver acender.»
plantar <<'PY' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/settings/acesso/page.tsx'
s = io.open(p, encoding='utf-8').read()
# O plante tem de COMPILAR: devolver um array vazio com outro tipo quebra a
# desestruturacao. Pede-se a mesma leitura com um identificador impossivel — que
# e o defeito realista, alguem a filtrar de mais.
antigo = "    comEscopoDoPedido(sessao, (db) => sessoesDaCasa(db, org)),"
assert antigo in s, 'a leitura das sessoes nao esta onde se esperava'
novo = "    comEscopoDoPedido(sessao, (db) => sessoesDaCasa(db, '00000000-0000-4000-8000-000000000000')),"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-platweb-c2.txt || true
exigir_vermelho "caiu a visibilidade: a casa deixa de ver quem entrou" \
  "a casa vê quem entrou" /tmp/bossaos-platweb-c2.txt
cp "${COPIAS[0]}" "$ACESSO"

echo
echo "3. CONTROLO — a sessão esquecida passa a aparecer como VIVA"
# «Uma sessão que só termina quando alguém se lembra é permanente na prática.»
# No ecrã, isso lê-se como uma sessão caducada a dizer «em curso».
plantar <<'PY' || true
import io
p = 'packages/domain/src/plataforma.ts'
s = io.open(p, encoding='utf-8').read()
# O plante mantem os TRES valores na uniao — senao o TypeScript estreita o tipo
# e as telas que comparam com 'expirada' deixam de compilar. O defeito e o
# realista: a expiracao deixa de contar, e a esquecida aparece em curso.
antigo = "  return sessao.expiraEm > agora ? 'viva' : 'expirada';"
assert antigo in s, 'a derivacao do estado nao esta onde se esperava'
novo = "  return sessao.expiraEm > agora || true ? 'viva' : 'expirada';"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-platweb-c3.txt || true
exigir_vermelho "caiu a expiração no ecrã: a sessão esquecida parece em curso" \
  "uma sessão em curso e uma CADUCADA" /tmp/bossaos-platweb-c3.txt
cp "${COPIAS[5]}" "$PURO"

echo
echo "4. CONTROLO — a PLAT-008 passa a mostrar os dados da casa"
# «Saber que algo está mal não exige ver o quê.» Uma tela de suporte que mostra
# o conteúdo do restaurante convida a olhar sem motivo — e o motivo é uma das
# quatro condições.
plantar <<'PY' || true
import io
p = 'apps/web/app/[idioma]/platform/suporte/[sessionId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="ambito">{s.ambito}: {sessao.ambito.join(\', \')}</p>'
assert antigo in s, 'a linha do ambito nao esta onde se esperava'
novo = antigo + '\n      <p>Café · Tortilla · A104</p>'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-platweb-c4.txt || true
exigir_vermelho "caiu a contenção: a tela de suporte mostra o conteúdo da casa" \
  "NÃO mostra os dados da casa" /tmp/bossaos-platweb-c4.txt
cp "${COPIAS[3]}" "$SESSAO"

echo
echo "5. CONTROLO — a exportação fica atrás do plano NO ECRÃ"
# ── A única exigência da régua que não é técnica ─────────────────────────
#
# «Começa por "a exportação em massa é uma funcionalidade Pro" e acaba com um
# cliente sem forma de sair.» O plante é o portão que alguém acrescentaria com
# a melhor das intenções comerciais.
plantar <<'PY' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/settings/retencao/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '''      <form method="post" action={`/api/org/${orgSlug}/exportar`}>
        <button className="bo-botao" type="submit" data-teste="exportar">{s.exportar}</button>
      </form>'''
assert antigo in s, 'o botao de exportar nao esta onde se esperava'
novo = '''      {false ? (
        <form method="post" action={`/api/org/${orgSlug}/exportar`}>
          <button className="bo-botao" type="submit" data-teste="exportar">{s.exportar}</button>
        </form>
      ) : <p>Pro</p>}'''
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-platweb-c5.txt || true
exigir_vermelho "caiu a promessa: a exportação passa a depender do plano" \
  "botão de exportar, sem portão" /tmp/bossaos-platweb-c5.txt
cp "${COPIAS[1]}" "$RETENCAO"

echo
echo "6. CONTROLO — a retenção vazia passa a aparecer como ZERO"
# «Vazio significa sem decidir, não para sempre.» Um zero no ecrã lê-se como
# uma política de apagar tudo hoje.
plantar <<'PY' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/settings/retencao/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "defaultValue={c.valor === null || c.valor === undefined ? '' : String(c.valor)}"
assert antigo in s, 'o valor por omissao do campo nao esta onde se esperava'
novo = "defaultValue={String(c.valor ?? 0)}"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-platweb-c6.txt || true
exigir_vermelho "caiu a ausência: «sem decidir» passa a ler-se como zero dias" \
  "vazio aparece como VAZIO" /tmp/bossaos-platweb-c6.txt
cp "${COPIAS[1]}" "$RETENCAO"

echo
echo "7. CONTROLO — a PLAT-017 mostra uma máscara do segredo"
# Uma máscara é pior do que nada: diz que o valor está do lado de cá.
plantar <<'PY' || true
import io
p = 'apps/web/app/[idioma]/platform/modelos/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '              <p className="bo-campo__ajuda">{g.descricao}</p>'
assert antigo in s, 'a descricao do segredo nao esta onde se esperava'
novo = antigo + '\n              <p className="bo-campo__ajuda">sk_live_••••••</p>'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-platweb-c7.txt || true
exigir_vermelho "caiu a regra do segredo: apareceu uma máscara, que diz que ele está cá" \
  "NUNCA o valor" /tmp/bossaos-platweb-c7.txt
cp "${COPIAS[4]}" "$MODELOS"

echo
echo "8. Reposto"
i=0; for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; i=$((i+1)); done
if correr /tmp/bossaos-platweb-reposto.txt; then
  verde "reposto: $(grep -oE '[0-9]+ passed' /tmp/bossaos-platweb-reposto.txt | head -1)"
else
  vermelho "não voltou ao verde depois dos plantes"
  grep -E '›' /tmp/bossaos-platweb-reposto.txt | tail -5
fi

# ── E a fronteira do E05 continua fechada? ────────────────────────────────
#
# Nenhum plante deste guião mexe em permissões, mas a prova de navegador corre a
# aplicação inteira — e é barato confirmar que a fronteira com vinte e oito
# etapas continua onde estava.
echo
echo "9. A fronteira do E05, depois de tudo"
n=$(psql "$MIGRATION_DATABASE_URL" -t -c \
  "select count(*) from information_schema.role_table_grants
    where table_name in ('entitlement_grants','subscriptions','support_sessions')
      and grantee='bossaos_app' and privilege_type in ('INSERT','UPDATE','DELETE');" | tr -d ' ')
if [[ "$n" == "0" ]]; then
  verde "o runtime continua sem escrita nas três tabelas"
else
  vermelho "$n permissão(ões) de escrita a mais — a fronteira abriu-se"
fi

CHEGOU_AO_FIM=1
echo
[[ "$falhas" -eq 0 ]] && echo "  0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
