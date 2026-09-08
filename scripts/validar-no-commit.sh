#!/usr/bin/env bash
#
# As guardas leem a ARVORE DE TRABALHO. O que se publica e o COMMIT.
#
# Escrito a 06/09 as 07h20, depois de a MESMA coisa acontecer duas vezes:
#
#   1f9675c  E07  limpo
#   95201cd  E32  COM PLANTE   <- e eu assinei o E32
#   e13b318       limpo        <- "Residuo de bancada", o commit que o corrigiu
#   de3eb52  E33  COM PLANTE   <- outra vez, DEPOIS desse commit
#
# Um defeito plantado para um controlo negativo foi reposto na bancada e nao
# commitado. Resultado: as 27 guardas verdes sobre a arvore, e o HEAD vermelho.
# Ninguem mentiu e ninguem foi descuidado - o instrumento e que apontava para o
# sitio errado. E o commit que "corrigiu" isto removeu a INSTANCIA e nao impediu
# a CLASSE, por isso voltou uma etapa depois.
#
# A mesma licao ja tinha sido aprendida no deploy: o `publicar.sh` publica um
# COMMIT via `git archive` e nao a arvore, precisamente para isto. Aprendi-a la e
# nao a trouxe para ca.
#
# Uso:  bash scripts/validar-no-commit.sh [ref]     (por omissao: HEAD)
#
# NOTA: copia as guardas DE HOJE para dentro da arvore do commit. Quero medir o
# CONTEUDO daquele commit com os instrumentos actuais - se usasse os instrumentos
# do proprio commit, um commit antigo seria julgado por uma guarda que ainda nao
# sabia procurar o que hoje sei.
set -uo pipefail
cd "$(dirname "$0")/.."
REF="${1:-HEAD}"

falhas=0
# ── As abstencoes contam-se, ainda que nao reprovem ────────────────────────
#
# O `naomedi` so imprimia. A frase final saia igual com zero abstencoes e com
# treze: «O que se publica esta medido: 0 falhas». Corri a suite inteira a 08/09
# e foram TREZE as guardas que se abstiveram - a frase dizia que o que se
# publica estava medido, e sobre treze delas nao estava nada.
#
# Nao as conto como vermelho, e o motivo esta escrito mais abaixo: contar
# abstencao como falha ensina a ignorar o vermelho. Mas nao contar de todo
# ensina pior - ensina a ler «0 falhas» como «medido», que e a mesma frase para
# duas coisas diferentes.
#
# A casa ja tinha o remedio ao lado: o `provar-prontidao.sh` conta as
# verificacoes emitidas e recusa-se a dizer «Prontidao provada» abaixo de um
# piso - «VERDE COM ZERO MEDIDO». Isto e a mesma ideia, no portao que se le mais.
abstencoes=0
erro()    { printf '  \033[31mFALHA\033[0m    %s\n' "$1"; falhas=$((falhas+1)); }
ok()      { printf '  \033[32mok\033[0m       %s\n' "$1"; }
naomedi() { printf '  NAO MEDI %s\n' "$1"; abstencoes=$((abstencoes+1)); }

GUARDAS=$(cd scripts && ls validar-*.sh | grep -v '^validar-no-commit.sh$')

# ── Sem isto o instrumento acusa em falso, e acusou ────────────────────────
#
# A primeira corrida disto deu quatro pacotes a reprovar no HEAD e verdes na
# bancada: auth, config, i18n e worker. Parecia exactamente o que este guiao
# existe para apanhar. Era `ERR_MODULE_NOT_FOUND` - uma arvore nova nao tem
# `node_modules`, e as provas nao arrancam.
#
# As DEPENDENCIAS vem da bancada, de proposito, e fica dito: o que esta em
# revisao e o CONTEUDO do commit, e o `pnpm-lock.yaml` desse commit continua a
# ser lido pelas guardas que o leem. Instalar de raiz por cada corrida custava
# minutos e nao media nada de novo.
ligar_modulos() {
  local wt="$1" raiz; raiz=$(pwd)
  [ -d "$raiz/node_modules" ] && ln -s "$raiz/node_modules" "$wt/node_modules" 2>/dev/null
  local d
  for d in packages/* apps/*; do
    [ -d "$raiz/$d/node_modules" ] && [ -d "$wt/$d" ] \
      && ln -s "$raiz/$d/node_modules" "$wt/$d/node_modules" 2>/dev/null
  done
  return 0
}

# Corre <guardas...> contra o conteudo de <ref>. Devolve 0 se todas verdes.
correr_em() {
  local ref="$1"; shift
  local base wt rc=0
  base=$(mktemp -d); wt="$base/arvore"
  if ! git worktree add --detach "$wt" "$ref" >/dev/null 2>&1; then
    rm -rf "$base"; return 99
  fi
  ligar_modulos "$wt"
  for g in "$@"; do cp "scripts/$g" "$wt/scripts/$g" 2>/dev/null || true; done
  for g in "$@"; do
    ( cd "$wt" && bash "scripts/$g" >"$base/$g.txt" 2>&1 ) || rc=1
    cp "$base/$g.txt" "/tmp/bossaos-no-commit-$g.txt" 2>/dev/null || true
  done
  git worktree remove --force "$wt" >/dev/null 2>&1
  rm -rf "$base"
  return $rc
}

echo "1. O detector consegue distinguir um commit VERMELHO de um VERDE?"
# ── O controlo negativo e a propria historia deste repositorio ────────────
#
# Nao ha sonda fabricada mais honesta do que um commit real que se SABE que
# carrega o defeito, ao lado do commit que o corrigiu. E imutavel: uma sonda
# escrita a mao envelhece, um SHA nao.
VERMELHO_CONHECIDO=de3eb52   # E33 com o bo-condicional-inexistente la dentro
VERDE_CONHECIDO=e13b318      # o commit imediatamente anterior, sem ele
if ! git cat-file -e "$VERMELHO_CONHECIDO^{commit}" 2>/dev/null \
   || ! git cat-file -e "$VERDE_CONHECIDO^{commit}" 2>/dev/null; then
  naomedi "os commits de controlo nao existem nesta copia — a historia foi reescrita"
  echo "           Sem eles nao sei se este detector ve alguma coisa, e um verde"
  echo "           por baixo disto nao valeria nada."
  exit 2
fi
correr_em "$VERMELHO_CONHECIDO" validar-classes.sh; rc_v=$?
correr_em "$VERDE_CONHECIDO"    validar-classes.sh; rc_l=$?
if [ "$rc_v" = "99" ] || [ "$rc_l" = "99" ]; then
  naomedi "nao consegui criar a arvore de controlo — nao declaro nada"
  exit 2
elif [ "$rc_v" -ne 0 ] && [ "$rc_l" -eq 0 ]; then
  ok "ve vermelho no $VERMELHO_CONHECIDO e verde no $VERDE_CONHECIDO"
else
  erro "o detector nao distingue: $VERMELHO_CONHECIDO deu $rc_v, $VERDE_CONHECIDO deu $rc_l"
  echo "           Um instrumento que da o mesmo nos dois lados nao mede lado nenhum."
  echo
  echo "  $falhas FALHA(S)."
  exit "$falhas"
fi

echo
echo "2. As guardas contra o conteudo de $REF ($(git log -1 --format=%h "$REF" 2>/dev/null))"
base=$(mktemp -d); wt="$base/arvore"
if ! git worktree add --detach "$wt" "$REF" >/dev/null 2>&1; then
  erro "nao consegui pôr $REF numa arvore"
  echo; echo "  $falhas FALHA(S)."; exit "$falhas"
fi
ligar_modulos "$wt"
for g in $GUARDAS; do cp "scripts/$g" "$wt/scripts/$g" 2>/dev/null || true; done
vermelhas=""
for g in $GUARDAS; do
  if ( cd "$wt" && bash "scripts/$g" >"/tmp/bossaos-no-commit-$g.txt" 2>&1 ); then
    :
  else
    c=$?
    # Sair a 2 e' NAO MEDI declarado, e nao e uma falha: a guarda disse que lhe
    # faltava a base ou a rede. Contar isso como vermelho ensinaria a ignorar o
    # vermelho, que e a maneira mais cara de perder uma guarda.
    if [ "$c" = "2" ]; then
      naomedi "$g — declarou que nao mediu (/tmp/bossaos-no-commit-$g.txt)"
    else
      vermelhas="$vermelhas $g"
    fi
  fi
done
git worktree remove --force "$wt" >/dev/null 2>&1; rm -rf "$base"

if [ -n "$vermelhas" ]; then
  for g in $vermelhas; do erro "$g vermelha em $REF — /tmp/bossaos-no-commit-$g.txt"; done
else
  ok "todas as guardas verdes sobre o COMMIT, e nao so sobre a bancada"
fi

echo
if [ "$falhas" -ne 0 ]; then
  echo "  $falhas FALHA(S)."
elif [ "$abstencoes" -eq 0 ]; then
  echo "  O que se publica esta medido: 0 falhas, e nenhuma guarda se absteve."
else
  echo "  0 falhas ENTRE AS QUE MEDIRAM. $abstencoes guarda(s) nao mediram."
  echo "  Sobre o que essas cobrem, isto nao diz nada - nem verde nem vermelho."
fi
exit "$falhas"
