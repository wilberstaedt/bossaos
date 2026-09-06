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

# O leitor de comentarios e' a fonte desta guarda. Se nao correr, ela le zero
# linhas e diz "0 falhas" — cega e verde ao mesmo tempo. Prova-se uma vez, e
# alto, em vez de se engolir o erro em cada ficheiro.
if ! python3 scripts/sem-comentarios.py "$0" > /dev/null 2>&1; then
  echo "  FALHA o sem-comentarios.py nao corre — esta guarda ficaria cega" >&2
  exit 1
fi

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
#
# E as TRES aspas, nao so a plica. A 04/09 este padrao so casava 'NAO_CONTEM' e
# deixava passar "NAO_CONTEM", que e TypeScript igualmente valido: mesma linha,
# mesmo ficheiro, so mudava a aspa - com plica reprovava, com aspa dizia 0 falhas.
# Apanhei-o vinte minutos depois de reter o E09 exactamente pelo mesmo defeito no
# codigo do JR, o que diz que a familia e minha tambem: casar TEXTO de codigo
# obriga a cobrir todas as formas validas de o escrever, senao a guarda vigia um
# estilo em vez de uma propriedade.
# A busca e uma funcao para o controlo negativo la em baixo lhe poder passar
# ficheiros proprios. Sem isso, o controlo teria de mexer no indice do git para
# que o `git ls-files` visse a sonda - e uma guarda nao deve escrever no indice.
procurar_queda() {
  printf '%s\n' "$@" \
    | xargs python3 scripts/sem-comentarios.py \
    | grep -E "(\?\?|\|\|)[[:space:]]*[\"'\`]NAO_CONTEM[\"'\`]|:[[:space:]]*[\"'\`]NAO_CONTEM[\"'\`][[:space:]]*[,;)]" || true
}

# shellcheck disable=SC2046
queda=$(procurar_queda $(git ls-files '*.ts' '*.tsx' | grep -vE "\.test\.|^provas/"))
if [ -n "$queda" ]; then
  erro "ausencia a cair em NAO_CONTEM:"
  printf '%s\n' "$queda" | head -4 | sed 's/^/          /'
else
  ok "nenhum valor por omissao a transformar ausencia em 'nao contem'"
fi

echo
echo "4. A regra nao pode ter copia na superficie PUBLICA"
# O defeito que isto fecha: a tela publica do produto reimplementava os estados
# num encadeado de ternarios. A guarda lia o modulo do dominio e dizia 0 falhas,
# mas plantar um defeito no dominio nao mudava NADA do que a pessoa alergica le -
# a guarda vigiava o lado que nao corre, e o controlo acendia noutro sitio a
# PARECER que funcionava.
#
# Regra: quem le a carta nao decide o estado; pede-o ao dominio. Comparar os
# estados a mao em apps/web/app/r/ e ter a regra em dois sitios outra vez.
copiar_regra() {
  printf '%s\n' "$@" \
    | xargs python3 scripts/sem-comentarios.py \
    | grep -E "estado[[:space:]]*===[[:space:]]*[\"'\`](CONTEM|PODE_CONTER|NAO_CONTEM|DESCONHECIDO)[\"'\`]" || true
}

# shellcheck disable=SC2046
copia=$(copiar_regra $(git ls-files 'apps/web/app/r/*'))
if [ -n "$copia" ]; then
  erro "superficie publica a decidir o estado por si:"
  printf '%s\n' "$copia" | head -4 | sed 's/^/          /'
else
  ok "nenhuma superficie publica compara os estados a mao"
fi

# E o outro lado da mesma moeda: nao basta nao copiar, tem de CHAMAR.
# Sem isto, apagar o bloco dos alergenos da tela passava a guarda a verde -
# a ausencia de copia tambem se consegue nao mostrando nada.
TELA="apps/web/app/r/[publicLocationSlug]/[locale]/menu/produto/[produtoId]/page.tsx"
if [ ! -f "$TELA" ]; then
  erro "nao encontrei a tela publica do produto"
elif python3 scripts/sem-comentarios.py "$TELA" | grep -q "avisosPorAlergenio"; then
  ok "a tela publica do produto pede o aviso ao dominio"
else
  erro "$TELA nao chama avisosPorAlergenio - a regra voltou a ter duas casas"
fi

# ── controlo negativo ────────────────────────────────────────────────────────
# Esta guarda correu verde durante semanas sem nunca ter provado que reprova. A
# 04/09 descobriu-se que so via a plica: "NAO_CONTEM" com aspas passava-lhe ao
# lado. Agora prova-se em CADA execucao, e nas TRES formas de escrever a cadeia -
# porque foi exactamente uma forma nao coberta que abriu o buraco.
SONDA="$(mktemp -d)"
trap 'rm -rf "$SONDA"' EXIT
for aspa in "'" '"' '`'; do
  printf 'export const a = (x: any) => x.e ?? %sNAO_CONTEM%s;\n' "$aspa" "$aspa" > "$SONDA/s.ts"
  if [ -z "$(procurar_queda "$SONDA/s.ts")" ]; then
    echo "  CONTROLO NEGATIVO FALHOU: a queda escrita com [$aspa] passou despercebida." >&2
    falhas=$((falhas + 1))
  fi
done
# E o outro lado: um valor inofensivo NAO pode acusar, senao a guarda reprova tudo.
printf "export const a = (x: any) => x.e ?? 'DESCONHECIDO';\n" > "$SONDA/s.ts"
if [ -n "$(procurar_queda "$SONDA/s.ts")" ]; then
  echo "  CONTROLO NEGATIVO FALHOU: acusou um valor inofensivo." >&2
  falhas=$((falhas + 1))
fi
# A seccao 4 prova-se pelo mesmo criterio: uma copia da regra tem de acusar, e o
# codigo que pede ao dominio tem de passar. Sem isto ficava uma guarda nova sem
# nunca ter reprovado nada - que foi como a queda em NAO_CONTEM viveu semanas.
printf "export const a = (x: any) => x.estado === 'CONTEM' ? 1 : 0;\n" > "$SONDA/s.tsx"
if [ -z "$(copiar_regra "$SONDA/s.tsx")" ]; then
  echo "  CONTROLO NEGATIVO FALHOU: a regra copiada passou despercebida." >&2
  falhas=$((falhas + 1))
fi
printf "export const a = (f: any) => avisosPorAlergenio(f);\n" > "$SONDA/s.tsx"
if [ -n "$(copiar_regra "$SONDA/s.tsx")" ]; then
  echo "  CONTROLO NEGATIVO FALHOU: acusou quem pede ao dominio." >&2
  falhas=$((falhas + 1))
fi
[ "$falhas" -eq 0 ] && ok "controlo negativo: apanha as tres aspas e a regra copiada, e nao acusa o inofensivo"

echo
[ "$falhas" -eq 0 ] && echo "  A distincao esta trancada: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
