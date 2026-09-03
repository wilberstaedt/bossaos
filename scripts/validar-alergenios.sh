#!/usr/bin/env bash
# A regra mais seria do produto, trancada por estrutura e nao por convencao.
#
# CT-07: "ausencia de dados sobre alergenos NAO significa ausencia de alergenos.
# Nao gere declaracoes a partir de nomes/fotos." Um campo vazio e DESCONHECIDO,
# nunca "nao contem" - e a diferenca entre as duas e alguem no hospital.
#
# Esta guarda existe porque esta e a regra que alguem vai querer "melhorar" daqui
# a um ano, com a melhor das intencoes: mostrar "sem gluten" num prato que ninguem
# declarou, ou inferir do nome. Uma tarte de amendoa pode nao levar amendoa; uma
# salada verde pode levar mostarda no molho.
#
# Nao verifica comportamento - para isso ha testes. Verifica que as TRES portas
# por onde a distincao se perde continuam fechadas.
set -uo pipefail
cd "$(dirname "$0")/.."

F="packages/domain/src/alergenios.ts"
falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

if [ ! -f "$F" ]; then erro "nao encontrei $F"; echo; echo "  1 FALHA(S)."; exit 1; fi
n=$(grep -c . "$F"); [ "$n" -lt 40 ] && { erro "$F tem $n linhas - o leitor esta cego"; } || ok "$F com $n linhas"

echo
echo "1. Inferir tem de ser IMPOSSIVEL, nao proibido"
# A assinatura de estadoDoAlergenio nao pode receber nada de onde se possa inferir.
assinatura=$(sed -n '/export function estadoDoAlergenio(/,/):/p' "$F")
proibidos=$(printf '%s\n' "$assinatura" | grep -inE "nome|descricao|descrição|titulo|título|foto|imagem|produto|ingrediente" || true)
if [ -n "$proibidos" ]; then
  erro "a assinatura aceita algo de onde se pode inferir:"
  printf '%s\n' "$proibidos" | sed 's/^/          /'
else
  ok "estadoDoAlergenio so ve declaracoes e o alergenio pedido"
fi

echo
echo "2. Nao se pode DECLARAR desconhecido"
# Se Declaracao.estado alargar para EstadoDeAlergenio, passa a ser possivel gravar
# DESCONHECIDO como se fosse uma declaracao - e a distincao colapsa no tipo.
if grep -qE "^\s*estado:\s*EstadoDeclarado;" "$F"; then
  ok "Declaracao.estado e EstadoDeclarado - desconhecido e a AUSENCIA, nao um valor"
else
  erro "Declaracao.estado deixou de ser EstadoDeclarado - a distincao pode ter colapsado"
fi
if grep -qE "EstadoDeclarado\s*=\s*'CONTEM'\s*\|\s*'PODE_CONTER'\s*\|\s*'NAO_CONTEM'" "$F"; then
  ok "os tres estados declaraveis estao intactos"
else
  erro "EstadoDeclarado mudou de forma - confirmar a mao"
fi

echo
echo "3. Ausencia nunca vira 'nao contem'"
# Tira comentarios antes de procurar - mesma calibragem do validar-dinheiro.sh, e
# pela mesma razao: o catalogo.ts MENCIONA `?? 'NAO_CONTEM'` para explicar que nao
# o faz. Uma guarda que nao distingue codigo de comentario castiga quem documenta.
queda=$(git ls-files '*.ts' '*.tsx' | grep -vE "\.test\.|^provas/" \
  | xargs python3 scripts/sem-comentarios.py 2>/dev/null \
  | grep -E "(\?\?|\|\|)[[:space:]]*'NAO_CONTEM'|:[[:space:]]*'NAO_CONTEM'[[:space:]]*[,;)]" || true)
if [ -n "$queda" ]; then
  erro "ausencia a cair em NAO_CONTEM:"
  printf '%s\n' "$queda" | head -4 | sed 's/^/          /'
else
  ok "nenhum valor por omissao a transformar ausencia em 'nao contem'"
fi

echo
[ "$falhas" -eq 0 ] && echo "  A distincao esta trancada: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
