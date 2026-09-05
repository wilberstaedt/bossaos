#!/usr/bin/env bash
# Dinheiro em inteiros de unidade minima. Nunca virgula flutuante.
#
# `docs/architecture/dinheiro.md` exige isto desde o E00 e nada o verificava. Ha
# um comentario no packages/domain/src/dinheiro.ts que diz porque, e diz melhor do
# que eu diria: `parseFloat('8.07') * 100` da 806.9999999999999, e o Math.round
# disfarca-o ate ao valor onde deixa de disfarcar.
#
# Construida a 2026-09-03 com a arvore LIMPA, de proposito: uma guarda que nasce
# sobre codigo certo prova-se com um defeito plantado, em vez de ser calibrada
# contra os defeitos que ja la estao - que e como se acaba com uma guarda que so
# reconhece os erros de ontem.
#
# O E22 ao E24 - TPV, caixa, pagamentos, fiscal - vao encher o schema de campos de
# dinheiro. E la que isto paga.
set -uo pipefail
cd "$(dirname "$0")/.."

SCHEMA="packages/db/prisma/schema.prisma"
NOME_DINHEIRO="preco|Preco|valor|Valor|total|Total|montante|Montante|amount|Amount|price|Price|custo|Custo|troco|Troco|taxa|Taxa"
falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

# ── O sufixo `Menor`, que e o reconhecedor ESTRUTURAL ──────────────────────
#
# A 05/09, no E22, a guarda passou a verde sobre `devidoMenor`, `unitarioMenor` e
# `recebidoMenor` - tres campos de dinheiro novos que ela NAO VIA, porque nenhum
# deles tem um dos substantivos da lista. Verde por cegueira, nao por limpeza.
#
# A lista de substantivos e um vocabulario que tem de crescer a cada etapa, e o
# que nao cresceu fica invisivel em silencio. Mas TODOS os campos de dinheiro
# deste projecto acabam em `Menor`: e a convencao que a propria dinheiro.md manda,
# e por isso reconhece-se pela FORMA e nao pelo assunto.
#
# Isto e' estritamente aditivo: alarga o que a seccao 1 ve, e nao mexe na seccao
# das conversoes - onde alargar poderia tirar protecao a nomes ja vigiados.
SUFIXO_MENOR="[a-zA-Z]+Menor"

echo "1. Campos de dinheiro no schema"
campos=$(grep -nE "^[[:space:]]+([a-zA-Z]*(${NOME_DINHEIRO})[a-zA-Z]*|${SUFIXO_MENOR})[[:space:]]+" "$SCHEMA" 2>/dev/null \
  | grep -vE "\[\]" || true)
n=$(printf '%s\n' "$campos" | grep -c . || true)
# Controlo negativo do leitor: sem campos, tudo "passa" e o verde e vacuo.
if [ "${n:-0}" -lt 2 ]; then
  erro "so vi ${n:-0} campos com cara de dinheiro - o leitor esta cego"
else
  ok "${n} campos com cara de dinheiro"
fi

# ── O `$` nao e detalhe: era um buraco ────────────────────────────────────
#
# Isto exigia espaco DEPOIS do tipo, e por isso so via campos com atributo a
# seguir. `devidoMenor Float` no fim da linha — que e Prisma valido — passava.
# Apanhado a 05/09 pelo controlo negativo desta seccao, que ate ai nao existia.
TIPOS_MAUS="[[:space:]](Float|Decimal|Real|Double)([[:space:]?]|$)"
maus=$(printf '%s\n' "$campos" | grep -E "$TIPOS_MAUS" || true)
if [ -n "$maus" ]; then
  erro "dinheiro em virgula flutuante no schema:"
  printf '%s\n' "$maus" | sed 's/^/          /'
else
  ok "nenhum Float, Decimal, Real ou Double num campo de dinheiro"
fi

echo
echo "2. parseFloat em codigo de produto"
# Tira comentarios antes de procurar: o dinheiro.ts MENCIONA parseFloat para
# explicar porque nao o usa, e uma guarda que nao distingue codigo de comentario
# obriga a uma lista de excepcoes que depois cresce.
# `inspeccao/` fica de fora com a razao dita, e nao por conveniencia: sao ajudas de
# Playwright que leem CSS - opacidade, tamanho de letra, largura de borda - e esses
# sao decimais a serio. Excluir uma pasta inteira e como as guardas ficam cegas, por
# isso a lista e curta e cada entrada tem motivo: testes, provas, e inspeccao.
achados=$(git ls-files '*.ts' '*.tsx' | grep -vE "\.test\.|^provas/|^inspeccao/" \
  | xargs python3 scripts/sem-comentarios.py 2>/dev/null | grep -E "parseFloat" || true)
if [ -n "$achados" ]; then
  erro "parseFloat em codigo de produto:"
  printf '%s\n' "$achados" | head -5 | sed 's/^/          /'
else
  ok "nenhum parseFloat fora de comentarios e testes"
fi

# ── as OUTRAS portas para a virgula flutuante ───────────────────────────────
#
# A 04/09 medi o que esta guarda apanha e o que deixa passar. So o parseFloat era
# apanhado - em qualquer grafia, porque a busca e por subcadeia e Number.parseFloat
# contem-no. Passavam: Number(t), +t, parseInt(t, 10) e t * 1.
#
# Number('8.07') * 100 da o MESMO 806.9999999999999 que motivou esta guarda. A
# propriedade nunca foi "nao escrever parseFloat", foi "dinheiro nao passa por
# virgula flutuante" - e eu estava a vigiar uma grafia.
#
# Mas banir Number( em todo o codigo seria ruidoso ao ponto de a guarda ser
# desligada: Number(pagina) e legitimo. Por isso a proibicao alarga-se apenas onde
# o ARGUMENTO tem nome de dinheiro, que a guarda ja sabe reconhecer. Number(preco)
# e apanhado, Number(pagina) nao.
#
# O QUE CONTINUA SEM SER VISTO, dito sem arredondar: uma conversao cujo argumento
# nao tenha nome de dinheiro - `const n = Number(bruto)` seguido de uso monetario -
# escapa. Nao ha analise de tipos aqui, e inventar heuristica sobre o nome da
# variavel seguinte trocaria um falso negativo silencioso por ruido. Esta guarda
# apanha o descuido, nao o disfarce.
#
# E ha uma excepcao que NAO e conveniencia: um nome que declara a unidade minima -
# totalEmCentimos, precoCents - e inteiro por construcao, e Number() sobre um
# inteiro e exacto. Acusa-lo seria um falso positivo, e um falso positivo gasta o
# credito da guarda tao depressa como um buraco. A propria dinheiro.md manda essa
# convencao de nomes; aqui ela paga.
outras=$(git ls-files '*.ts' '*.tsx' | grep -vE "\.test\.|^provas/|^inspeccao/" \
  | xargs python3 scripts/sem-comentarios.py 2>/dev/null \
  | grep -E "(Number|parseInt)\s*\(\s*[A-Za-z_$.]*(${NOME_DINHEIRO})" \
  | grep -vEi "centimos|centavos|cents|minor|emUnidadeMinima" || true)
if [ -n "$outras" ]; then
  erro "conversao para virgula flutuante sobre nome de dinheiro:"
  # O TIPO DECLARADO, ao lado de cada linha. Sem isto a guarda diz "suspeito" e
  # quem a le tem de ir cavar - e a 05/09 fui eu, e cavei mal: li `montanteMenor
  # Int` num modelo e conclui falso positivo, quando o modelo que a etapa
  # escrevia era o BankLine, onde e BigInt. Disse ao JR que a guarda estava
  # errada. Nao estava.
  #
  # O nome sozinho e ambiguo neste esquema, e legitimamente: ha `montanteMenor`
  # Int e `montanteMenor` BigInt em modelos diferentes. Uma guarda que acusa por
  # NOME tem de MOSTRAR essa ambiguidade em vez de a deixar para quem le.
  printf '%s\n' "$outras" | head -5 | while IFS= read -r linha; do
    printf '          %s\n' "$linha"
    # Olham-se os DOIS lados. Em `montanteMenor: Number(l.montante)` quem tem o
    # tipo e o ALVO da atribuicao, nao o argumento: `montante` nao e campo
    # nenhum, `montanteMenor` e BigInt. A primeira versao desta anotacao lia so
    # o argumento - e teria dito "nao e campo, olhar a mao" precisamente no caso
    # que me enganou, que e o unico caso que ela existe para resolver.
    alvo=$(printf '%s' "$linha" | sed -nE 's/.*[^A-Za-z_$]([A-Za-z_$]+)[[:space:]]*[:=][^=]*(Number|parseInt).*/\1/p' | head -1)
    arg=$(printf '%s' "$linha" | sed -nE 's/.*(Number|parseInt)[[:space:]]*\(([^)]*)\).*/\2/p' \
      | grep -oE '[A-Za-z_$][A-Za-z_$0-9]*' | tail -1)
    tipos=""
    for ident in $alvo $arg; do
      t=$(grep -oE "^[[:space:]]+${ident}[[:space:]]+[A-Za-z]+" packages/db/prisma/schema.prisma 2>/dev/null \
        | awk '{print $2}' | sort -u | tr '\n' '/' | sed 's|/$||')
      [ -n "$t" ] && tipos="$ident $t" && break
    done
    ident="${alvo:-$arg}"
    tipos=$(printf '%s' "$tipos" | cut -d' ' -f2-)
    [ -z "$ident" ] && continue
    if [ -z "$tipos" ]; then
      printf '            ^ %s nao e campo do esquema — olhar a mao\n' "$ident"
    else
      case "$tipos" in
        *BigInt*|*Decimal*) printf '            ^ %s declarado %s — PERDE PRECISAO\n' "$ident" "$tipos" ;;
        *)                  printf '            ^ %s declarado %s\n' "$ident" "$tipos" ;;
      esac
    fi
  done
else
  ok "nenhuma conversao Number/parseInt sobre nome de dinheiro"
fi

# ── controlo negativo ───────────────────────────────────────────────────────
# Esta guarda nasceu a 03/09 sobre codigo limpo e nunca tinha provado que reprova.
# Agora prova-o em CADA corrida, e nas duas direccoes - porque uma guarda que so
# mostra que acusa podia estar a acusar tudo.
#
# Uma expressao de cada vez, em ficheiros separados: a 04/09 pus duas sondas no
# mesmo ficheiro noutra guarda e a primeira mascarou a segunda, e o controlo
# passava com o detector partido.
echo
SONDA="$(mktemp -d)"; trap 'rm -rf "$SONDA"' EXIT
ve() { printf 'export const f = (x: any) => %s;\n' "$1" > "$SONDA/s.ts"
       python3 scripts/sem-comentarios.py "$SONDA/s.ts" 2>/dev/null \
         | grep -E "parseFloat|(Number|parseInt)\s*\(\s*[A-Za-z_$.]*(${NOME_DINHEIRO})" \
         | grep -vEi "centimos|centavos|cents|minor|emUnidadeMinima" | grep -q . ; }
c_falha=0

# ── O controlo da seccao 1: um campo de dinheiro em virgula flutuante ─────
#
# A seccao 1 nunca tinha provado que reprova. Passava por nunca haver um Float no
# schema — e uma guarda que so mostra verde sobre codigo limpo nao mostra nada.
ve_schema() {  # $1 linha de schema; verdadeiro se a guarda a apanha
  printf 'model Sonda {\n%s\n}\n' "$1" > "$SONDA/schema.prisma"
  grep -nE "^[[:space:]]+([a-zA-Z]*(${NOME_DINHEIRO})[a-zA-Z]*|${SUFIXO_MENOR})[[:space:]]+" \
    "$SONDA/schema.prisma" | grep -vE "\[\]" | grep -qE "$TIPOS_MAUS"
}
for mau in '  devidoMenor Float' '  totalMenor Decimal @map("t")' '  precoDaLinha Float?'; do
  ve_schema "$mau" || { echo "  FALHA controlo: schema deixou passar$mau"; c_falha=1; }
done
for bom in '  devidoMenor Int' '  quantidade Float' '  pesoEmGramas Decimal @db.Decimal(6,2)'; do
  ve_schema "$bom" && { echo "  FALHA controlo: schema acusou$bom, que e legitimo"; c_falha=1; }
done

for mau in 'parseFloat(t)' 'Number(precoTexto)' 'parseInt(valorBruto, 10)'; do
  ve "$mau" || { echo "  FALHA controlo: deixou passar $mau"; c_falha=1; }
done
for bom in 'Number(pagina)' 'Number(totalEmCentimos)' 'parseInt(idDaLinha, 10)'; do
  ve "$bom" && { echo "  FALHA controlo: acusou $bom, que e legitimo"; c_falha=1; }
done
if [ "$c_falha" -eq 0 ]; then
  ok "controlo negativo do schema: apanha os tres campos em virgula flutuante e nao acusa os tres legitimos"
  ok "controlo negativo das conversoes: apanha as tres de dinheiro e nao acusa as tres legitimas"
else
  falhas=$((falhas+1))
fi

echo
[ "$falhas" -eq 0 ] && echo "  Dinheiro em inteiros: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
