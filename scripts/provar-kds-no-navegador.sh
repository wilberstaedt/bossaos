#!/usr/bin/env bash
#
# E16 · as 20 telas do KDS no navegador — e o instrumento a provar-se.
#
# ── Porque é que este script existe ────────────────────────────────────────
#
# A régua reprova à cabeça «uma suite que não consegue ficar vermelha», e o E15
# mostrou porquê duas vezes: o caso do pagamento dava verde com a rede ligada, e
# o marcador por tela era satisfeito pela navegação em qualquer página.
#
# Cada controlo aqui planta o defeito **no artefacto real** — a consulta, o CSS,
# a página — e exige que a asserção CERTA fique vermelha. Não basta ficar
# vermelha: uma prova que reprova por outro motivo mede outra coisa.
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

# ── A porta livre, e nenhuma outra passagem viva ──────────────────────────
#
# As duas guardas vêm do E15, e a segunda custou uma hora a diagnosticar. O arnês
# semeia no arranque e APAGA no fim: uma passagem anterior ainda viva — ou
# interrompida, a chegar ao fecho mais tarde — apaga as fixtures por baixo desta,
# e o sintoma é um 404 intermitente que não é do produto.
PORTA_DA_PROVA="${PORTA_INSPECCAO:-3010}"
if lsof -ti:"$PORTA_DA_PROVA" >/dev/null 2>&1; then
  echo "ERRO: a porta $PORTA_DA_PROVA já está ocupada — servidor órfão?" >&2
  echo "      lsof -ti:$PORTA_DA_PROVA | xargs kill -9   — ou PORTA_INSPECCAO=3012." >&2
  exit 2
fi
if pgrep -f 'playwright test' >/dev/null 2>&1; then
  echo "ERRO: já há uma passagem do arnês a correr; ela apaga as fixtures no fim." >&2
  exit 2
fi

# ── O alvo MUDOU DE FICHEIRO no E17, e o script apanhou-o ─────────────────
#
# `estadoDerivado` e `totalDoPedido` são funções puras e mudaram-se para
# `@bossaos/domain` — a guarda `rotas-com-porta.test.ts` mostrou porquê: uma tela
# pública que só queria somar um total tinha de importar o pacote da base.
#
# O plante deixou de encontrar o alvo, o `assert` do Python rebentou, o ficheiro
# ficou intacto e o controlo ficou VERDE. Foi o próprio ajudante que o disse —
# «ficou VERDE com o defeito plantado» — e é exactamente para isto que ele
# verifica as duas coisas em vez de uma.
PRODUCAO=packages/db/src/producao.ts
PURO=packages/domain/src/pedido-puro.ts
CSS=packages/ui/src/estilos.css
PECAS=apps/web/src/kds/PecasDoKds.tsx
QUADRO="apps/web/app/[idioma]/kds/[locationId]/[stationId]/page.tsx"
TUDO="apps/web/app/[idioma]/kds/[locationId]/[stationId]/tudo/page.tsx"
SPEC=inspeccao/kds.spec.ts

ORIG_PRODUCAO=$(mktemp); ORIG_CSS=$(mktemp); ORIG_PECAS=$(mktemp); ORIG_PURO=$(mktemp)
ORIG_QUADRO=$(mktemp); ORIG_SPEC=$(mktemp); ORIG_TUDO=$(mktemp)
cp "$PRODUCAO" "$ORIG_PRODUCAO"; cp "$CSS" "$ORIG_CSS"; cp "$PECAS" "$ORIG_PECAS"
cp "$PURO" "$ORIG_PURO"
cp "$QUADRO" "$ORIG_QUADRO"; cp "$SPEC" "$ORIG_SPEC"; cp "$TUDO" "$ORIG_TUDO"
falhas=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  cp "$ORIG_PRODUCAO" "$PRODUCAO"; cp "$ORIG_CSS" "$CSS"; cp "$ORIG_PECAS" "$PECAS"
  cp "$ORIG_PURO" "$PURO"
  cp "$ORIG_QUADRO" "$QUADRO"; cp "$ORIG_SPEC" "$SPEC"; cp "$ORIG_TUDO" "$TUDO"
  rm -f "$ORIG_PRODUCAO" "$ORIG_CSS" "$ORIG_PECAS" "$ORIG_QUADRO" "$ORIG_SPEC" "$ORIG_TUDO"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel kds.spec.ts \
    --workers=1 --reporter=list >"$1" 2>&1
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    return
  fi
  # Um vermelho de BUILD não é uma medição: a suite fica vermelha sem ter corrido
  # um caso. Aconteceu-me no E15 e passou por «o controlo funciona».
  if grep -q 'config.webServer was not able to start' "$ficheiro"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — a suite nem chegou a correr"
    grep -E 'error TS|Failed to type check' "$ficheiro" | head -3
    return
  fi
  if grep -qE "✘.*$marcador" "$ficheiro"; then
    verde "$nome"
  else
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '✘' "$ficheiro" | head -4
  fi
}

# O número MEDIDO — 3 de preparação + 16 do `kds.spec.ts` — e não um mínimo
# folgado: um mínimo folgado deixa a suite encolher para metade sem nada acender.
#
# Escrevi 22 à primeira, por contar mal, e o script reprovou a dizer o número
# real. Foi ele a corrigir-me, que é o que um número escrito à mão deve fazer
# quando está errado.
CASOS_MINIMOS=19

echo "1. Com tudo ligado"
if correr /tmp/bossaos-kds-nav-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-kds-nav-ligado.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "VERDE COM POUCO MEDIDO: só $passou casos (mínimo $CASOS_MINIMOS)"; exit 1
  fi
  verde "$passou casos de navegador verdes (20 telas × 5 larguras + toque, contraste, 3 idiomas)"
else
  vermelho "a prova de navegador falhou com tudo ligado"
  grep -E '✘' /tmp/bossaos-kds-nav-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o limite VISÍVEL passa a esconder bilhetes"
# O erro concreto do contrato: o KDS mostra doze, chegam vinte, e os oito de
# baixo desaparecem em vez de ficarem alcançáveis. Parece limpo, e é comida que
# nunca é feita.
python3 - <<'PYLIMITE'
import io
p = 'packages/db/src/producao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    orderBy: [{ prioridade: 'desc' }, { criadaEm: 'asc' }],"
assert antigo in s, 'a ordenacao das tarefas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, antigo + "\n    take: 3,", 1))
PYLIMITE
exigir_vermelho "caiu a contagem do backlog: o total deixou de ser o total" \
  'limite visível não faz desaparecer' /tmp/bossaos-kds-nav-limite.txt
cp "$ORIG_PRODUCAO" "$PRODUCAO"

echo
echo "3. CONTROLO NEGATIVO — «pronto parcial» volta a ser pronto NO ECRÃ"
python3 - <<'PYPARCIAL'
import io
p = 'packages/domain/src/pedido-puro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (prontas === vivas.length) return { estado: 'PRONTO', prontas, total: vivas.length };"
assert antigo in s, 'a regra do pronto nao esta onde se esperava'
novo = "  if (prontas > 0) return { estado: 'PRONTO', prontas, total: vivas.length };"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYPARCIAL
exigir_vermelho "caiu o passe: disse PRONTO com trabalho por fazer" \
  'não diz pronto com metade por fazer' /tmp/bossaos-kds-nav-parcial.txt
cp "$ORIG_PURO" "$PURO"

echo
echo "4. CONTROLO NEGATIVO — o trabalho SEM ESTAÇÃO deixa de aparecer no ecrã"
# ── O que este controlo mede, e o que NÃO mede ────────────────────────────
#
# A primeira versão plantava o defeito no ROTEAMENTO — `estacoesParaProduto` a
# devolver uma estação por omissão. Ficou VERDE, e com razão: a semeadura cria a
# tarefa órfã directamente na base, sem passar pelo motor, e por isso nada no
# navegador podia notar a diferença. O controlo estava a plantar num sítio que a
# medição não alcança.
#
# O defeito de ROTEAMENTO está coberto onde ele acontece: `provar-producao.sh`,
# controlo 3, e lá fica vermelho. Aqui mede-se a propriedade do ECRÃ — que o
# trabalho sem estação é VISÍVEL a quem configura. São duas coisas, e as duas
# têm de estar guardadas: sem a segunda, uma tarefa órfã podia existir na base e
# não aparecer em ecrã nenhum, que é o mesmo que desaparecer.
python3 - <<'PYORFA'
import io
p = 'apps/web/app/[idioma]/kds/[locationId]/[stationId]/tudo/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "    semEstacao: await tarefasDaEstacao(db, unidade.id, null),"
assert antigo in s, 'a leitura do nao encaminhado nao esta onde se esperava'
# O ecrã deixa de perguntar pelo que não tem estação. Nada estoira: a tela fica
# igual, mais limpa, e o trabalho de alguém deixa de existir no produto.
novo = "    semEstacao: [] as Awaited<ReturnType<typeof tarefasDaEstacao>>,"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYORFA
exigir_vermelho "caiu o não encaminhado: o trabalho sem estação deixou de aparecer" \
  'item sem regra é visível a quem configura' /tmp/bossaos-kds-nav-omissao.txt
cp "$ORIG_TUDO" "$TUDO"

echo
echo "5. CONTROLO NEGATIVO — o marcador da tela deixa de existir"
# A correcção que o E15 pagou caro: `data-tela` quer dizer «esta página
# identifica-se a si própria», e as ligações levam `data-seccao`. Se alguém
# voltar a escrever `data-tela` numa ligação, este controlo não muda — mas se o
# CABEÇALHO perder o marcador, tem de acender.
python3 - <<'PYMARCA'
import io
p = 'apps/web/src/kds/PecasDoKds.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "        <h1 data-tela={tela}>{titulo}</h1>"
assert antigo in s, 'o marcador do cabecalho nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "        <h1 data-titulo-de={tela}>{titulo}</h1>"))
PYMARCA
exigir_vermelho "caiu o marcador: uma tela sem cabeçalho próprio deixou de passar" \
  '20 telas' /tmp/bossaos-kds-nav-marcador.txt
cp "$ORIG_PECAS" "$PECAS"

echo
echo "6. CONTROLO NEGATIVO — o texto do KDS volta a ser INVISÍVEL"
# 1.00:1 é texto da cor do fundo. O navegador não se queixa, o build passa, os
# tipos passam — e o ecrã que se lê a um metro e meio não tem lá nada escrito.
# Foi a medição de contraste que o apanhou, e nada mais o podia apanhar.
python3 - <<'PYCONTRASTE'
import io
p = 'packages/ui/src/estilos.css'
s = io.open(p, encoding='utf-8').read()
antigo = """.bo-kds .bo-publico__produto > a,
.bo-kds .bo-publico__nome,
.bo-kds .bo-publico__preco,
.bo-kds .bo-lista,
.bo-kds h1, .bo-kds h2, .bo-kds h3, .bo-kds p { color: var(--bo-texto-inverso); }"""
assert antigo in s, 'as cores do KDS nao estao onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYCONTRASTE
exigir_vermelho "caiu o contraste: o texto voltou a ser da cor do fundo" \
  'contraste cumpre a WCAG' /tmp/bossaos-kds-nav-contraste.txt
cp "$ORIG_CSS" "$CSS"

echo
echo "7. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
python3 - <<'PYPOP'
import io
p = 'inspeccao/kds.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    { id: 'KDS-006', caminho: '/cursos', marcador: marcador('KDS-006') },\n"
assert antigo in s, 'a linha do KDS-006 nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYPOP
exigir_vermelho "caiu a população: 19 telas deixaram de ser 20" \
  'população é 20 telas' /tmp/bossaos-kds-nav-populacao.txt
cp "$ORIG_SPEC" "$SPEC"

echo
echo "8. CONTROLO NEGATIVO — a tela deixa de dizer os DOIS números"
# «Os dois números ditos em voz alta — não "o backlog tem itens".» Com um só, o
# ecrã volta a poder mostrar doze de vinte sem que nada o revele.
python3 - <<'PYDOIS'
import io
p = 'apps/web/app/[idioma]/kds/[locationId]/[stationId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<strong data-teste="no-total">{total}</strong>'
assert antigo in s, 'a contagem do total nao esta onde se esperava'
# Passa a mostrar o que está no ECRÃ como se fosse o total — que é exactamente a
# mentira que o contrato descreve.
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '<strong data-teste="no-total">{visiveis.length}</strong>'))
PYDOIS
exigir_vermelho "caiu a contagem: o ecrã passou a dizer que mostra tudo" \
  'limite visível não faz desaparecer' /tmp/bossaos-kds-nav-dois.txt
cp "$ORIG_QUADRO" "$QUADRO"

echo
echo "9. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-kds-nav-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-kds-nav-reposto.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "reposto mas com pouco medido: $passou casos"
  else
    verde "reposto: $passou casos verdes"
  fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '✘' /tmp/bossaos-kds-nav-reposto.txt | head -10
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))
