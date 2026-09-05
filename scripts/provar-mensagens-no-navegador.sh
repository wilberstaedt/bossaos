#!/usr/bin/env bash
#
# E19 — as 6 telas da mensageria e do relatório, no navegador.
#
# ── O que a régua reprova à cabeça, e este guião tem de impedir ───────────
#
# «Mensageria externa activa sem contrato.» O conector fica desligado e **visível
# como desligado** — não a fingir que enviou. Os controlos 2 e 3 tiram essa
# visibilidade do ecrã, um de cada vez.
#
# E o ponto 3: «a definição escrita ao lado do número». O controlo 4 tira-a, e o
# 5 põe as duas telas do relatório a discordar — que é a forma clássica de uma
# organização discutir números em vez de decidir.
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

CASOS_MINIMOS=24
falhas=0

INT='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/integrations/mensageria/page.tsx'
HIST='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/mensagens/historico/page.tsx'
REL='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/relatorio/page.tsx'
REP='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reports/reservas/page.tsx'
HOST=packages/db/src/host.ts
TPL='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/mensagens/page.tsx'
SPEC=inspeccao/mensagens.spec.ts
SEMENTE=packages/db/prisma/semente-inspeccao.ts
ORIG_INT=$(mktemp); ORIG_HIST=$(mktemp); ORIG_REL=$(mktemp); ORIG_REP=$(mktemp)
ORIG_HOST=$(mktemp); ORIG_SPEC=$(mktemp); ORIG_SEMENTE=$(mktemp); ORIG_TPL=$(mktemp)
cp "$INT" "$ORIG_INT"; cp "$HIST" "$ORIG_HIST"; cp "$REL" "$ORIG_REL"; cp "$REP" "$ORIG_REP"
cp "$HOST" "$ORIG_HOST"; cp "$SPEC" "$ORIG_SPEC"; cp "$SEMENTE" "$ORIG_SEMENTE"
cp "$TPL" "$ORIG_TPL"

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  cp "$ORIG_INT" "$INT"; cp "$ORIG_HIST" "$HIST"; cp "$ORIG_REL" "$REL"; cp "$ORIG_REP" "$REP"
  cp "$ORIG_HOST" "$HOST"; cp "$ORIG_SPEC" "$SPEC"; cp "$ORIG_SEMENTE" "$SEMENTE"
  cp "$ORIG_TPL" "$TPL"
  rm -f "$ORIG_INT" "$ORIG_HIST" "$ORIG_REL" "$ORIG_REP" "$ORIG_HOST" "$ORIG_SPEC" "$ORIG_SEMENTE" "$ORIG_TPL"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel mensagens.spec.ts \
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
if correr /tmp/bossaos-msg-nav-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-msg-nav-ligado.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "VERDE COM POUCO MEDIDO: só $passou casos (mínimo $CASOS_MINIMOS)"; exit 1
  fi
  verde "$passou casos verdes (6 telas × 5 larguras + toque, contraste, 3 idiomas, as 28 da matriz)"
else
  vermelho "a prova de navegador falhou com tudo ligado"
  grep -E '✘' /tmp/bossaos-msg-nav-ligado.txt | head -10; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o conector deixa de dizer a CONSEQUÊNCIA"
# «Desligado» sozinho lê-se como um pormenor de configuração. A frase que
# importa é a outra: nada é enviado, e nenhuma mensagem aparecerá como enviada.
python3 - <<'PYAJUDA'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/integrations/mensageria/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<p data-teste="conector-ajuda">{g.conectorAjuda}</p>'
assert antigo in s, 'a consequencia do conector nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '<p data-teste="conector-ajuda">{g.conector}</p>', 1))
PYAJUDA
exigir_vermelho "caiu a consequência: o conector desligado virou um pormenor" \
  'diz que está desligado E diz a consequência' /tmp/bossaos-msg-nav-ajuda.txt
cp "$ORIG_INT" "$INT"

echo
echo "3. CONTROLO NEGATIVO — quem escreve os textos deixa de ver o aviso"
# Quem escreve é quem vai perguntar porque é que os clientes não recebem.
python3 - <<'PYTEMPLATES'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/mensagens/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      {!conector.activo ? ('
assert antigo in s, 'o aviso do conector nos templates nao esta onde se esperava'
# A condicao INVERTE-SE em vez de desaparecer: `{false ? ...}` deixa o `conector`
# por usar e o TypeScript recusa o ficheiro — um defeito que nao compila e' um
# ficheiro partido, e nao um defeito plantado.
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '      {conector.activo ? (', 1))
PYTEMPLATES
exigir_vermelho "caiu o aviso: escreve-se e ninguém sabe que nada sai" \
  'quem escreve os textos vê o mesmo aviso' /tmp/bossaos-msg-nav-templates.txt
# ── `git checkout` NÃO repõe um ficheiro que ainda não foi commitado ──────
#
# Foi o que escrevi primeiro, e não repôs nada: a tela é nova nesta fatia, não
# está no índice, e o `checkout` passou em silêncio. O plante ficou lá e os cinco
# controlos seguintes falharam todos a compilar — cinco vermelhos que não eram
# sobre código nenhum.
#
# A cópia de `mktemp` não tem esse buraco, e é o que todos os outros já usavam.
cp "$ORIG_TPL" "$TPL"

echo
echo "4. CONTROLO NEGATIVO — o número perde a DEFINIÇÃO"
# «Um número sem definição não é comparável.» O no-show fica sozinho, e ninguém
# consegue reproduzir o que ele conta.
# ── O plante e' na TELA, e nao no motor ──────────────────────────────────
#
# Plantei primeiro em `packages/db/src/host.ts` e ficou VERDE. Nao investiguei
# porque: o que esta asercao mede e' o ECRA, e a tela e' quem decide o que
# escreve na coluna. Plantar no motor era medir a canalizacao.
python3 - <<'PYDEF'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reservations/relatorio/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "          definicao: texto(n.definicao),"
assert antigo in s, 'a definicao ao lado do numero nao esta onde se esperava'
# A coluna passa a repetir o NOME do numero. Continua a haver cinco celulas, e
# nenhuma diz o que o numero conta.
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "          definicao: texto(n.chave),", 1))
PYDEF
exigir_vermelho "caiu a definição: o no-show deixou de dizer o que conta" \
  'RES-B-019: as cinco definições' /tmp/bossaos-msg-nav-def.txt \
  'REP-008: as cinco definições'
cp "$ORIG_REL" "$REL"

echo
echo "5. CONTROLO NEGATIVO — as duas telas do relatório DISCORDAM"
# Dois relatórios com a mesma pergunta e contas diferentes é a forma clássica de
# uma organização discutir números em vez de decidir.
# ── Mudar o PERÍODO nao chega, e a razao e' do cenario ───────────────────
#
# Foi o que plantei primeiro — 30 dias para 7 — e ficou VERDE, com razao: a
# semeadura so tem reservas de hoje, e os dois periodos devolvem os mesmos
# numeros. Um plante que nao muda o resultado nao e' um plante.
#
# O que muda sempre e' a lista: o REP-008 deixa de mostrar um dos cinco numeros.
python3 - <<'PYDISCORDA'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/reports/reservas/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "        linhas={numeros.map((n) => ({"
assert antigo in s, 'a lista do REP-008 nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "        linhas={numeros.slice(1).map((n) => ({", 1))
PYDISCORDA
exigir_vermelho "caíram as contas: as duas telas passaram a dizer números diferentes" \
  'as duas telas dizem o MESMO' /tmp/bossaos-msg-nav-discorda.txt
cp "$ORIG_REP" "$REP"

echo
echo "6. CONTROLO NEGATIVO — o histórico fica sem MENSAGENS"
python3 - <<'PYVAZIO'
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      const mensagemInsp = await prisma.reservationMessage.create({"
assert antigo in s, 'a semeadura da mensagem nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, "      const mensagemInsp = await prisma.reservationMessage.create({", 1)
    .replace("          estado: 'PENDENTE', erro: 'sem provedor configurado',",
             "          estado: 'PENDENTE', erro: 'sem provedor configurado', locationId: null,", 1))
PYVAZIO
exigir_vermelho "caiu a população: o histórico mediu o ecrã vazio" \
  'histórico tem linhas' /tmp/bossaos-msg-nav-vazio.txt
cp "$ORIG_SEMENTE" "$SEMENTE"

echo
echo "7. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
python3 - <<'PYPOP'
import io
p = 'inspeccao/mensagens.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  { id: 'INT-004', caminho: `${PAINEL}/integrations/mensageria` },\n"
assert antigo in s, 'a lista de telas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYPOP
exigir_vermelho "caiu a população: 5 telas deixaram de ser 6" \
  'população é 6 telas' /tmp/bossaos-msg-nav-pop.txt
cp "$ORIG_SPEC" "$SPEC"

echo
echo "8. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-msg-nav-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-msg-nav-reposto.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then vermelho "reposto mas com pouco medido: $passou casos"
  else verde "reposto: $passou casos verdes"; fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '✘' /tmp/bossaos-msg-nav-reposto.txt | head -10
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))
