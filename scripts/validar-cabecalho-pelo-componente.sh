#!/usr/bin/env bash
# ── O ecrã NOVO não volta a escrever o cabeçalho à mão ──────────────────────
#
# O `CabecalhoDePagina` existia três vezes — `CabecalhoDoKds`, `CabecalhoDaVisita`
# e `CabecalhoDoKiosk` eram cópias byte a byte — e além delas ficou um corpo de
# ecrãs que escreve o bloco directamente. Convertê-los é PROPAGAÇÃO, e a
# propagação está no §8.3 do RV100, explicitamente **depois** da aprovação visual
# humana: *«arruma antes de replicar»*. Não é esta guarda que a faz.
#
# ── O INVARIANTE, que é o que não apodrece ────────────────────────────────
#
# **Nenhum ecrã fora do inventário escreve o cabeçalho à mão.** É isso que aqui
# se afirma, e continua verdade com 267 ecrãs na lista ou com dois.
#
# O tamanho da dívida NÃO está escrito nesta prosa de propósito: ele é medido a
# cada corrida e sai no âmbito. Um número em presente sobre o estado do mundo
# apodrece sozinho — foi o que aconteceu hoje ao RV100-025, que dizia nove
# controlos e passou a dezassete quando a guarda das superfícies foi alargada,
# sem ninguém errar. Entre um número que exige manutenção e um que não a exige
# está muitas vezes só um verbo.
#
# ── Por isso isto é uma CATRACA e não um portão ────────────────────────────
#
# Uma guarda que nascesse vermelha em toda a dívida existente seria vermelha
# desde o primeiro dia, e
# **uma guarda permanentemente vermelha é uma guarda ignorada** — foi a razão
# escrita para a `validar-provas-frescas.sh` não medir o repositório inteiro.
#
# Aqui a dívida existente está escrita num inventário e é aceite tal como está. O
# que a guarda recusa é o **ecrã seguinte**: um ficheiro que não está na lista e
# que escreve o bloco. A dívida pode descer; não pode crescer.
#
# ── O critério, e porque é o contentor e não a sobrancelha ─────────────────
#
# Retrato datado de 07/09, e fica com a data porque é registo e não afirmação
# sobre agora: 269 ficheiros escreviam `bo-estado__cabecalho` e **todos** eles
# escrevem também `bo-estado__sobrancelha`; outros 6 usam só a sobrancelha dentro
# de outra composição — o site público, a prévia do tema, o índice interno. Esses
# **não duplicam o cabeçalho**, e o revisor chegou à mesma conclusão pelo mesmo
# caminho: *«nenhum dos quatro escreve `bo-estado__cabecalho`, logo não duplicam»*.
#
# O contentor é o que o componente possui. É esse o sinal.
#
# Três respostas:
#   OK (0)        nenhum ficheiro fora do inventário escreve o bloco
#   FALHOU (1)    há ecrã novo a escrever o cabeçalho à mão
#   NÃO MEDI (2)  a população veio a zero, ou a sonda não acendeu
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
INVENTARIO=docs/progress/cabecalho-por-converter.txt
MARCA='bo-estado__cabecalho'
SONDA=apps/web/src/.sonda-cabecalho.tsx

verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

# `--fixar` reescreve o inventário. Existe para quem CONVERTE ecrãs não ter de
# editar a lista à mão: o atrito de fazer a coisa certa tem de ser menor do que
# o de a adiar, ou a lista passa a mentir.
FIXAR=${1:-}

echo "O ecrã novo usa o componente, ou escreve o cabeçalho à mão?"

# ── A população ───────────────────────────────────────────────────────────
#
# Sem esta contagem, um `grep` que deixasse de casar devolvia zero ofensores e a
# guarda dizia OK sobre nada. Zero é NÃO MEDI, não «está tudo bem».
ecras() { grep -rl "$MARCA" apps/web --include='*.tsx' 2>/dev/null | sort; }

ACTUAIS=$(ecras)
N_ACTUAIS=$(printf '%s' "$ACTUAIS" | grep -c . || true)
if [ "${N_ACTUAIS:-0}" -eq 0 ]; then
  naomedi "zero ficheiros com \`$MARCA\` em apps/web — ou a dívida acabou, ou o detector deixou de casar."
  exit "$NAO_MEDI"
fi
verde "$N_ACTUAIS ecrãs escrevem o bloco hoje"

if [ "$FIXAR" = '--fixar' ]; then
  printf '%s\n' "$ACTUAIS" > "$INVENTARIO"
  echo "  inventário reescrito com $N_ACTUAIS entradas."
  exit "$OK"
fi

if [ ! -f "$INVENTARIO" ]; then
  naomedi "não há inventário em $INVENTARIO — corre \`$0 --fixar\` uma vez para o criar."
  exit "$NAO_MEDI"
fi

CONHECIDOS=$(sort "$INVENTARIO")
N_CONHECIDOS=$(printf '%s' "$CONHECIDOS" | grep -c . || true)

NOVOS=$(comm -23 <(printf '%s\n' "$ACTUAIS") <(printf '%s\n' "$CONHECIDOS"))
N_NOVOS=$(printf '%s' "$NOVOS" | grep -c . || true)
CURADOS=$(comm -13 <(printf '%s\n' "$ACTUAIS") <(printf '%s\n' "$CONHECIDOS"))
N_CURADOS=$(printf '%s' "$CURADOS" | grep -c . || true)

# ── A SONDA: esta guarda sabe ver um ecrã novo? ───────────────────────────
#
# Um zero que confirma o que se espera não mediu nada. Planta-se um ficheiro que
# escreve o bloco e exige-se que apareça como NOVO. É julgada aqui, pelo que a
# função devolve — e não por procurar texto no relatório, que foi como já me
# enganei a mim próprio três vezes.
#
# Fica em `apps/web/src` e com nome escondido: não é uma rota, e nada o compila.
trap 'rm -f "$SONDA"' EXIT INT TERM
printf 'export const x = <div className="%s" />;\n' "$MARCA" > "$SONDA"
SONDA_VISTA=$(ecras | grep -c "^${SONDA}$" || true)
rm -f "$SONDA"
if [ "${SONDA_VISTA:-0}" -ne 1 ]; then
  naomedi "a sonda não acendeu: um ficheiro novo com o bloco não foi visto."
  exit "$NAO_MEDI"
fi
if [ -e "$SONDA" ]; then
  naomedi "a sonda não saiu — a guarda deixou lixo na árvore."
  exit "$NAO_MEDI"
fi
verde "a sonda acendeu e saiu: um ecrã novo com o bloco é visto"

ambito() {
  echo "  âmbito:  $N_ACTUAIS ecrãs escrevem o bloco; $N_CONHECIDOS estão no inventário"
  echo "           como dívida aceite, e ${N_CURADOS:-0} já foram convertidos."
  echo "           Critério: \`$MARCA\` escrito em \`apps/web/**/*.tsx\`. É o"
  echo "           CONTENTOR que o componente possui — os 6 ficheiros que usam só"
  echo "           \`bo-estado__sobrancelha\` noutra composição não são duplicação."
  echo "           FORA, e declarado: isto NÃO obriga ninguém a converter os 267."
  echo "           Essa é propagação e vive depois do portão de aprovação humana"
  echo "           (§8.3 do RV100). Esta guarda só impede o 268.º."
  echo "           FORA também: um cabeçalho copiado com classes NOVAS em vez"
  echo "           destas. A catraca vê esta marca, e uma marca só."
}

if [ "${N_NOVOS:-0}" -gt 0 ]; then
  vermelho "$N_NOVOS ecrã(s) novo(s) escrevem o cabeçalho à mão em vez de usar o \`CabecalhoDePagina\`:"
  printf '%s\n' "$NOVOS" | sed 's/^/           /'
  echo
  echo "           Usa \`import { CabecalhoDePagina } from '@bossaos/ui'\` e passa"
  echo "           \`sobrancelha\`, \`titulo\` e \`tela\`. O \`data-tela\` no \`h1\` é o que a"
  echo "           inspecção usa para provar que chegou a esta tela — não o percas."
  ambito
  exit "$FALHOU"
fi

if [ "${N_CURADOS:-0}" -gt 0 ]; then
  # Progresso, e NÃO uma falha. Uma medida que acusa quem está certo é pior do
  # que medida nenhuma — quem converte um ecrã não pode ficar com a guarda
  # vermelha na mão. Fica dito, com o comando que o resolve numa linha.
  verde "$N_CURADOS ecrã(s) do inventário já foram convertidos:"
  printf '%s\n' "$CURADOS" | sed 's/^/           /'
  echo "           Corre \`$0 --fixar\` para a lista deixar de os contar."
fi

verde "nenhum ecrã fora do inventário escreve o cabeçalho à mão"
echo
ambito
exit "$OK"
