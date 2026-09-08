#!/usr/bin/env bash
#
# O MOTOR DE PROVA, medido — semeadura de demonstração e capturas comerciais.
#
# ── As quatro coisas que isto verifica, e nenhuma por fé ──────────────────
#
#   1. DETERMINISMO      semeia DUAS vezes e compara a impressão do cenario.
#                        Iguais = deterministico. E' o que o 6.4 pede.
#   2. CAPTURAS LIMPAS   nenhuma composicao pode conter `insp-`, um dominio de
#                        fantasia, "Aun no medido" ou "sin configurar". O
#                        capturador reprova sozinho se alguma aparecer.
#   3. O KDS EXISTE      o 6.4 nomeia-o e e' a superficie com menos folga.
#   4. A LIMPEZA DEVOLVE contam-se as linhas ANTES de semear e DEPOIS de limpar.
#                        Diferentes = a demonstracao deixou sujidade na base.
#
# Tres respostas: OK, FALHOU e NAO MEDI (saida 2).
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro()    { printf '  FALHA %s\n' "$1"; falhas=$((falhas+1)); }
verde()   { printf '  ok    %s\n' "$1"; }
naomedi() { printf '  NAO MEDI %s\n' "$1"; exit 2; }

if [ -z "${MIGRATION_DATABASE_URL:-}${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then set -a; . ./.env; set +a
  else naomedi "sem MIGRATION_DATABASE_URL e sem .env"; fi
fi
command -v psql >/dev/null || naomedi "psql nao encontrado"

PORTA="${PORTA_DEMO:-3019}"
SEMENTE="node --experimental-strip-types packages/db/prisma/semente-demonstracao.ts"

# ── 0. O estado da base ANTES de tudo ───────────────────────────────────────
contar() {
  psql "$MIGRATION_DATABASE_URL" -tAc "
    SELECT (SELECT count(*) FROM organizations) || '/' ||
           (SELECT count(*) FROM locations)     || '/' ||
           (SELECT count(*) FROM products)      || '/' ||
           (SELECT count(*) FROM orders)        || '/' ||
           (SELECT count(*) FROM production_tasks) || '/' ||
           (SELECT count(*) FROM users)"
}
# LIMPA PRIMEIRO, e so depois conta. A primeira versao contava com a
# demonstracao ja semeada de uma corrida anterior, e por isso o "depois" ficava
# MENOR que o "antes" — a limpeza aparecia como falha estando certa. Um estado
# inicial que ja contem o que se vai medir nao e' uma linha de base.
LIMPAR='
  import { abrirPrisma, limparDemonstracao, restosDaDemonstracao } from "./packages/db/prisma/demonstracao-comum.ts";
  const p = abrirPrisma();
  try {
    await limparDemonstracao(p);
    const r = await restosDaDemonstracao(p);
    if (r !== 0) { console.error("ficaram " + r + " linhas"); process.exit(1); }
  } finally { await p.$disconnect(); }
'
node --experimental-strip-types -e "$LIMPAR" >/dev/null 2>&1
ANTES=$(contar)
[ -n "$ANTES" ] || naomedi "nao consegui contar a base — a ligacao esta viva?"
echo "0. Base antes (ja sem demonstracao): $ANTES  (orgs/unidades/produtos/pedidos/tarefas/utilizadores)"

# ── 1. Determinismo ─────────────────────────────────────────────────────────
echo
echo "1. A semeadura e' determinista?"
impressao() {
  node --experimental-strip-types -e '
    import { abrirPrisma, impressaoDaDemonstracao } from "./packages/db/prisma/demonstracao-comum.ts";
    const p = abrirPrisma();
    try { process.stdout.write(await impressaoDaDemonstracao(p)); }
    finally { await p.$disconnect(); }
  ' 2>/dev/null
}
$SEMENTE >/dev/null 2>&1 || { erro "a primeira semeadura falhou"; $SEMENTE 2>&1 | tail -5; }
UMA=$(impressao)
$SEMENTE >/dev/null 2>&1 || erro "a segunda semeadura falhou"
DUAS=$(impressao)
if [ -n "$UMA" ] && [ "$UMA" = "$DUAS" ]; then
  verde "duas corridas, a mesma impressao ($UMA)"
else
  erro "duas corridas deram cenarios diferentes: $UMA vs $DUAS"
fi

# ── CONTROLO NEGATIVO: a impressao tem de MUDAR quando os dados mudam ──────
# Sem isto, uma impressao que devolvesse sempre a mesma coisa — por erro, ou
# por ler zero linhas — daria "determinista" sobre o vazio.
psql "$MIGRATION_DATABASE_URL" -q -c \
  "UPDATE products SET nome = nome || ' (sonda)'
   WHERE organization_id = 'd0000000-0000-4000-8000-000000000001'
     AND nome LIKE 'Café%'" >/dev/null 2>&1
SONDA=$(impressao)
if [ -n "$SONDA" ] && [ "$SONDA" != "$UMA" ]; then
  verde "controlo negativo: a impressao muda quando um prato muda"
else
  erro "a impressao NAO mudou com os dados alterados — nao mede nada"
fi
$SEMENTE >/dev/null 2>&1

# ── 2. O servidor, e as capturas ────────────────────────────────────────────
echo
echo "2. As capturas do produto a correr"
# ── Reconstroi-se SEMPRE, e agora e' de proposito ──────────────────────────
#
# Isto era `if [ ! -d .next ]`, a olhar para a RAIZ — e o build vive em
# `apps/web/.next`. A condicao nunca encontrava nada e reconstruia sempre: um
# defeito, e por acaso o comportamento certo.
#
# Deixar um acidente protector como esta' e' uma armadilha para quem o ler a
# seguir: parece um caminho errado trivial, alguem arruma-o com a melhor das
# intencoes, e a partir dai o guiao passa a aceitar um build velho e a fotografar
# dele. Capturar de um build velho E' O DEFEITO que este trabalho veio fechar —
# as cinco imagens do marketing estiveram sete horas atrasadas.
#
# Por isso a condicao morta sai e fica escrita a decisao. O custo e' um build a
# cada corrida; o que ele compra e' a certeza de que a fotografia e' do produto
# que esta' aqui agora.
echo "   (a construir — sempre, para nao fotografar um build velho)"
pnpm build >/tmp/demo-build.log 2>&1 || naomedi "o build falhou; ver /tmp/demo-build.log"
# BETTER_AUTH_URL TEM de bater certo com a porta. O `.env` aponta ao 3000; sem
# isto a biblioteca recusa a origem e devolve **403 ao inscrever**, sem dizer uma
# palavra sobre portas. Esta' escrito no `playwright.config.ts` e apanhou-me na
# mesma — pela mesma razao e no mesmo sitio.
BETTER_AUTH_URL="http://127.0.0.1:$PORTA" \
  pnpm --filter @bossaos/web exec next start -p "$PORTA" >/tmp/demo-servidor.log 2>&1 &
SERVIDOR=$!
trap 'kill "$SERVIDOR" 2>/dev/null' EXIT INT TERM
pronto=0
for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$PORTA/api/health" >/dev/null 2>&1 && { pronto=1; break; }
  sleep 1
done
[ "$pronto" -eq 1 ] || naomedi "o servidor nao subiu na porta $PORTA; ver /tmp/demo-servidor.log"

if PORTA_DEMO="$PORTA" node --experimental-strip-types scripts/capturar-demonstracao.mjs 2>&1 \
     | grep -vE "ExperimentalWarning|trace-warnings" ; then
  verde "todas as composicoes passaram o controlo de sujidade"
else
  erro "o capturador reprovou — ver as linhas acima"
fi

# ── O carimbo da impressao do produto, LOGO a seguir a captura ─────────────
#
# O mesmo que o `provar-mestres.sh` faz, e pela mesma razao: a frescura destas
# imagens passa a ser uma pergunta de CONTEUDO. Antes comparava-se `mtime`, e um
# formatador a gravar por cima com o mesmo texto punha esta guarda a gritar lobo
# — sobre as imagens que um comprador ve primeiro.
#
# LIMITE declarado, igual: entre o build e esta linha ha uma janela de segundos.
# Fecha-se nao editando o produto enquanto se captura, nao com outra regra.
MANIFESTO_MKT="docs/visual/rv100/2026-09-06/evidence/demonstracao/composicoes.json"
if [ -s "$MANIFESTO_MKT" ]; then
  if python3 scripts/frescura_do_produto.py --carimbar "$MANIFESTO_MKT" >/tmp/mkt-carimbo.txt 2>&1; then
    verde "$(cat /tmp/mkt-carimbo.txt)"
  else
    erro "o carimbo da impressao falhou — as capturas ficam sem com que comparar"
    tail -3 /tmp/mkt-carimbo.txt
  fi
else
  erro "nao ha composicoes.json para carimbar"
fi

# As composicoes vivem DENTRO da aplicacao, que e' quem as importa.
DESTINO="apps/web/src/demonstracao"
# ── 3. O KDS existe EM CADA IDIOMA, e nao e' um ficheiro vazio ─────────────
#
# Isto olhava para "$DESTINO/kds-cozinha-1280.png", o caminho plano de quando
# havia um conjunto so. Com um conjunto por idioma esse ficheiro deixou de
# existir e a assercao passou a reprovar — apanhou a mudanca, que e' para o que
# serve. Agora pergunta pelos TRES: um KDS em espanhol e nenhum em portugues
# seria exactamente o defeito que este trabalho veio fechar.
faltam_kds=""
for l in es-ES pt-BR en; do
  [ -s "$DESTINO/$l/kds-cozinha-1280.png" ] || faltam_kds="$faltam_kds $l"
done
if [ -z "$faltam_kds" ]; then
  verde "a composicao do KDS existe nos tres idiomas ($(wc -c < "$DESTINO/es-ES/kds-cozinha-1280.png" | tr -d ' ') bytes em es-ES)"
else
  erro "nao ha composicao de KDS em:$faltam_kds — e' a superficie que o 6.4 nomeia"
fi

kill "$SERVIDOR" 2>/dev/null; wait "$SERVIDOR" 2>/dev/null

# ── 4. A limpeza devolve a base ────────────────────────────────────────────
echo
echo "4. A limpeza devolve a base ao que era?"
# ── A JANELA APERTADA, e a razao de ela ser apertada ───────────────────────
#
# A primeira versao contava a base no inicio do guiao e no fim, com um `pnpm
# build` e uma passagem de navegador pelo meio. Deu vermelho — e a limpeza estava
# certa: o arnes de inspeccao correu noutro processo entretanto e levou o cenario
# DELE, que entrava nas mesmas contagens. Media atividade concorrente e chamava-
# lhe defeito meu.
#
# Agora conta-se o que NAO e' da demonstracao imediatamente antes e imediatamente
# depois da limpeza, sem nada pelo meio. E' a unica forma de a contagem falar da
# limpeza em vez de falar do que mais estivesse a acontecer na maquina.
DEMO_ORG='d0000000-0000-4000-8000-000000000001'
alheias() {
  psql "$MIGRATION_DATABASE_URL" -tAc "
    SELECT (SELECT count(*) FROM organizations WHERE id <> '$DEMO_ORG') || '/' ||
           (SELECT count(*) FROM locations     WHERE organization_id <> '$DEMO_ORG') || '/' ||
           (SELECT count(*) FROM products      WHERE organization_id <> '$DEMO_ORG') || '/' ||
           (SELECT count(*) FROM orders        WHERE organization_id <> '$DEMO_ORG') || '/' ||
           (SELECT count(*) FROM production_tasks WHERE organization_id <> '$DEMO_ORG') || '/' ||
           (SELECT count(*) FROM schedule_days WHERE organization_id <> '$DEMO_ORG')"
}
ALHEIAS_ANTES=$(alheias)
# ── O estado de saida vem do NODE, e nao do grep ───────────────────────────
#
# Estava `node ... | grep -v ruido || erro`, e o estado de uma pipeline e' o do
# ULTIMO comando: quando a limpeza corria bem e nao imprimia nada, o `grep` nao
# encontrava linhas, devolvia 1, e o guiao acusava "a limpeza deixou linhas para
# tras" — com a limpeza perfeita e a organizacao ja apagada. Um guarda que
# reprova quando tudo corre bem ensina a ignora-lo.
if node --experimental-strip-types -e "$LIMPAR" >/tmp/demo-limpar.log 2>&1; then
  verde "a limpeza correu e nao deixou restos"
else
  erro "a limpeza deixou linhas para tras"
  grep -vE "ExperimentalWarning|trace-warnings" /tmp/demo-limpar.log | tail -5
fi
ALHEIAS_DEPOIS=$(alheias)

if [ "$ALHEIAS_ANTES" = "$ALHEIAS_DEPOIS" ]; then
  verde "a limpeza nao tocou em nada alheio: $ALHEIAS_DEPOIS"
else
  erro "a limpeza apagou linhas de OUTROS: antes $ALHEIAS_ANTES, depois $ALHEIAS_DEPOIS"
fi

# E a demonstracao tem mesmo de ter desaparecido — o par da verificacao acima.
# So a primeira passaria tambem com uma limpeza que nao apagasse nada.
SOBRA=$(psql "$MIGRATION_DATABASE_URL" -tAc \
  "SELECT count(*) FROM organizations WHERE id = '$DEMO_ORG'" | tr -d ' ')
if [ "$SOBRA" = "0" ]; then
  verde "e a demonstracao saiu inteira"
else
  erro "a organizacao de demonstracao ficou na base"
fi

DEPOIS=$(contar)
echo "   base no fim: $DEPOIS (informativo — outras corridas mexem nela)"

echo
if [ "$falhas" -eq 0 ]; then echo "OK"; exit 0; fi
echo "FALHOU: $falhas"; exit 1
