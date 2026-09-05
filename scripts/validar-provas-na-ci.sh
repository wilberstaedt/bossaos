#!/usr/bin/env bash
# Toda a prova ou corre na CI, ou diz aqui porque nao corre.
#
# ── O QUE ISTO APANHOU NO DIA EM QUE NASCEU (04/09) ──────────────────────────
#
# 24 provas em scripts/. A CI corria DOZE. Ficavam de fora, entre outras, a
# `provar-pedidos.sh` (o E14, validado nessa manha), a `provar-sala.sh` (E13) e
# a `provar-marco-e11.sh` (o marco Starter inteiro). Uma regressao em qualquer
# delas nao seria apanhada por maquina nenhuma - so por alguem se lembrar de
# correr o script a mao.
#
# A causa e a que o proprio provar-tudo.sh descreve no cabecalho: **uma lista
# escrita a mao deriva**. Ele resolveu-o para si DESCOBRINDO os scripts. O
# ci.yml continuou a listar doze, e a lista envelheceu em silencio - que e o
# unico modo em que estas listas envelhecem.
#
# Esta guarda nao obriga nada a correr na CI. Obriga a DECIDIR: ou o ficheiro
# aparece no ci.yml, ou aparece aqui em baixo com o motivo escrito. O que ela
# torna impossivel e a terceira hipotese, que e a que aconteceu: ninguem decidiu.
set -uo pipefail
cd "$(dirname "$0")/.."

CI=".github/workflows/ci.yml"
falhas=0
erro() { printf '  \033[31mERRO\033[0m %s\n' "$1"; falhas=$((falhas+1)); }
ok()   { printf '  \033[32mok\033[0m   %s\n' "$1"; }

# ── As excepcoes, com o motivo. Sem motivo nao e excepcao, e' esquecimento. ──
#
# Formato: nome do ficheiro, dois pontos, o porque. Uma linha.
declare -a EXCEPCOES=(
  "provar-tudo.sh:e o corredor de todas as outras; correr-se a si proprio na CI duplicava tudo"
  # Os agregadores de marco respondem a outra pergunta: nao e "as provas passam?"
  # mas "o marco AINDA esta aprovado?". Chamam provas que a CI ja corre, por isso
  # aqui so duplicariam o tempo pela mesma informacao. Correm-se a mao quando
  # alguem poe o marco em duvida - foi assim que o E21 foi reprovado e reaberto.
  "provar-marco-e11.sh:agregador de marco; chama provas que a CI ja corre, e a pergunta dele faz-se a mao"
  "provar-marco-e21.sh:agregador de marco; chama provas que a CI ja corre, e a pergunta dele faz-se a mao"
)

motivo_da_excepcao() {
  local alvo="$1" e
  for e in "${EXCEPCOES[@]}"; do
    [ "${e%%:*}" = "$alvo" ] && { echo "${e#*:}"; return 0; }
  done
  return 1
}

echo "Toda a prova corre na CI, ou declara porque nao?"
[ -f "$CI" ] || { erro "nao encontrei $CI"; exit 1; }

# ── SEM COMENTARIOS. Isto nao e' arrumacao: e' o defeito desta guarda. ──────
#
# A primeira versao fazia `cat` ao ci.yml e procurava o nome do ficheiro. Deu
# como "corre na CI" o provar-tudo.sh, que aparece la UMA vez - dentro de um
# comentario, a explicar outra coisa. Ou seja: a guarda escrita para apanhar
# provas que ninguem corre dava verde a uma prova que ninguem corre, porque
# alguem escreveu o nome dela num comentario.
#
# E' o mesmo defeito que ando a caçar o dia inteiro, desta vez meu, e escrito
# dez minutos depois de eu o nomear no cabecalho deste ficheiro: vigiar a FORMA
# DE ESCRITA em vez da propriedade. Um nome mencionado nao e' um passo corrido.
conteudo_ci="$(sed 's/#.*//' "$CI")"
total=0; na_ci=0; declaradas=0; descobertas=0

# DESCOBERTA E' DECISAO — a mesma regra que esta guarda ja aceita nas guardas.
# Ate 05/09 exigia o NOME de cada prova escrito no ci.yml, e por isso 45 das 56
# nao tinham decisao nenhuma: o ci.yml descobria as guardas por glob e listava as
# provas a mao, metade convertida e metade por converter no mesmo ficheiro.
# Exigir a lista a mao para sempre era exigir aquilo que envelheceu.
#
# Uma prova esta decidida se o ci.yml CORRE o classificador para a categoria
# dela. A categoria vem do conteudo do ficheiro, nao do nome — quatro provas
# usam Playwright sem o sufixo `-no-navegador`.
#
# Cuidado que quase falhei: procurar so "provas-por-categoria.sh" dava por
# decidida uma prova de navegador num ci.yml que so descobrisse as de base.
# Pergunta-se pela CATEGORIA, nao pela ferramenta.
# As tres listas calculam-se UMA vez. A primeira versao chamava o classificador
# tres vezes por prova, 177 vezes ao todo, e pior: com `| grep -q`. O `grep -q`
# sai ao primeiro achado, fecha o tubo, o classificador leva SIGPIPE e o
# `pipefail` transforma isso em falha da pipeline — so passavam as provas cujo
# achado calhava ser o ultimo. Dizia "2 por descoberta" onde sao 51, e eu ia a
# tempo de ler isso como "a ligacao a CI nao funcionou" em vez de "nao medi".
LISTA_BASE="$(./scripts/provas-por-categoria.sh base || true)"
LISTA_APP="$(./scripts/provas-por-categoria.sh app || true)"
LISTA_NAV="$(./scripts/provas-por-categoria.sh navegador || true)"

coberta_por_descoberta() {
  cat=""
  case "
$LISTA_BASE" in *"
scripts/$1"*) cat=base ;; esac
  [ -n "$cat" ] || case "
$LISTA_APP" in *"
scripts/$1"*) cat=app ;; esac
  [ -n "$cat" ] || case "
$LISTA_NAV" in *"
scripts/$1"*) cat=navegador ;; esac
  [ -n "$cat" ] || return 1
  # Pergunta-se pela CATEGORIA, nao pela ferramenta: procurar so o nome do
  # classificador daria por decidida uma prova de navegador num ci.yml que so
  # descobrisse as de base.
  printf '%s' "$conteudo_ci" | grep -qE "provas-por-categoria\\.sh +$cat([^a-z]|$)" || return 1
  printf '%s' "$cat"
}

for f in scripts/provar-*.sh; do
  nome="$(basename "$f")"
  total=$((total+1))
  if printf '%s' "$conteudo_ci" | grep -qF "$nome"; then
    na_ci=$((na_ci+1))
  elif cat=$(coberta_por_descoberta "$nome"); then
    descobertas=$((descobertas+1))
  elif motivo=$(motivo_da_excepcao "$nome"); then
    declaradas=$((declaradas+1))
    echo "  ── $nome fora da CI: $motivo"
  else
    erro "$nome existe e NAO corre na CI, nem esta declarada aqui"
  fi
done

echo
echo "  $total provas: $na_ci nomeadas na CI, $descobertas por descoberta, $declaradas declaradas fora."

# ── CONTROLO NEGATIVO, por dentro ────────────────────────────────────────────
# Uma guarda que nunca viu a avaria nao e uma guarda. Invento um ficheiro que
# nao existe no ci.yml nem nas excepcoes e confirmo que ESTE codigo o acusaria.
inventado="provar-nome-que-nao-existe-em-lado-nenhum.sh"
if printf '%s' "$conteudo_ci" | grep -qF "$inventado" || motivo_da_excepcao "$inventado" >/dev/null; then
  erro "o controlo negativo nao vale: o nome inventado foi encontrado"
else
  ok "controlo negativo: um nome nao declarado seria acusado"
fi

[ "$falhas" -eq 0 ] && echo "  Nenhuma prova esquecida." || echo "  $falhas prova(s) sem decisao."
exit $((falhas > 0))
