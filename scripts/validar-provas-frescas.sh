#!/usr/bin/env bash
# ── Uma prova mais velha do que o produto que ela retrata ──────────────────
#
# As 25 capturas das telas-mestre foram tiradas às 10h54. A cura do RV100-024
# entrou às 11h32 e mexeu no `servidor.ts` e no `escopo.ts` — no PRODUTO. O
# `M03-erro` passou a ser a fotografia de um 500 que já não existe, e ia seguir
# para aprovação humana como retrato do produto.
#
# ── E esta armadilha é de outra família ────────────────────────────────────
#
# Todas as outras desta noite foram o INSTRUMENTO a medir mal: o alfabeto que
# perdia um alérgeno, o código de erro que mudava com o caminho, o detector que
# via a definição e julgava ser uma chamada. Esta não.
#
# Aqui a medição estava CERTA no momento em que foi feita, e deixou de descrever
# o produto **sem que nada nela mudasse**. Nenhum controlo interno a apanha: a
# captura continua nítida, o teste que a gerou continua verde, e o número que
# ela mostra continua a ser o número que foi medido. O que envelheceu foi a
# relação entre ela e o mundo — e isso não se vê por dentro dela.
#
# Por isso o que se compara aqui não é conteúdo: é TEMPO.
#
# Três respostas:
#   OK (0)        toda a prova é posterior à última alteração ao produto
#   FALHOU (1)    há prova mais velha do que o produto que retrata
#   NÃO MEDI (2)  não há prova, não há commit de produto, ou a sonda não acendeu
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "A prova é mais nova do que o produto que retrata?"

# ── 1. A referência: quando é que o produto mudou pela última vez ──────────
PRODUTO=$(git log -1 --format='%ct' -- apps packages 2>/dev/null)
PRODUTO_H=$(git log -1 --format='%h %ci' -- apps packages 2>/dev/null)
if [ -z "$PRODUTO" ]; then
  naomedi "não encontrei um commit que toque em apps/ ou packages/ — sem referência não há comparação."
  exit "$NAO_MEDI"
fi
verde "última alteração ao produto: $PRODUTO_H"

# ── 2. A população: os artefactos de prova ────────────────────────────────
#
# Se não houver nenhum, isto é NÃO MEDI e não «está tudo fresco»: um corpo de
# prova vazio passa em qualquer comparação de datas.
# `mapfile` não existe no bash 3.2 do macOS. A primeira versão usava-o, a lista
# ficou por definir, e a guarda deu VERDE com população vazia — a falha que ela
# existe para apagar, dentro dela própria. Agora a lista vem por linha, e a
# contagem é verificada antes de valer alguma coisa.
LISTA=/tmp/bossaos-provas-frescas.txt
find docs/visual -type f \( -name '*.png' -o -name '*.json' \) 2>/dev/null | sort > "$LISTA"
N_ARTEFACTOS=$(grep -c . "$LISTA" || true)
if [ "${N_ARTEFACTOS:-0}" -eq 0 ]; then
  naomedi "zero artefactos de prova em docs/visual — não há o que comparar."
  exit "$NAO_MEDI"
fi
verde "$N_ARTEFACTOS artefactos de prova a comparar"

# ── O canário: os `mtime` desta máquina querem dizer alguma coisa? ─────────
#
# Esta guarda compara `mtime` de artefacto contra data de COMMIT do produto, e
# essa mistura tem um buraco que o texto do fim já declarava e o RUNTIME não:
# num `clone` ou `worktree` fresco o git escreve todos os ficheiros AGORA, logo
# toda a prova fica «posterior ao produto» e isto dizia **ok**.
#
# Medido a 07/09, mesmo commit e os mesmos 65 artefactos:
#   cópia de trabalho -> FALHOU, 65 anteriores ao produto
#   worktree fresco   -> ok, «toda a prova é posterior»
#
# E a auto-sonda passava nos DOIS, porque força um `mtime` velho num ficheiro
# sintético: provava o mecanismo enquanto a população inteira era ilegível. Um
# detector aceso sobre um alvo que não representa a população.
#
# O discriminador não pode ser «os artefactos são todos recentes» — uma
# recaptura legítima escreve os 65 em segundos e ficava igual. Usa-se um
# CANÁRIO: um ficheiro versionado que ninguém regenera. Se ele não tem
# alterações locais e mesmo assim o seu `mtime` é muito posterior ao seu próprio
# commit, então os tempos foram reescritos por um checkout — e aí a resposta
# honesta é NÃO MEDI, nunca verde.
CANARIO="docs/bossaos/CONTRATO_TECNICO.md"
if [ -f "$CANARIO" ] && git diff --quiet -- "$CANARIO" 2>/dev/null; then
  CAN_COMMIT=$(git log -1 --format='%ct' -- "$CANARIO" 2>/dev/null)
  CAN_MTIME=$(stat -f '%m' "$CANARIO" 2>/dev/null || echo 0)
  if [ -n "$CAN_COMMIT" ] && [ "${CAN_MTIME:-0}" -gt "$((CAN_COMMIT + 120))" ]; then
    naomedi "os \`mtime\` desta cópia não são de produção: o canário \`$CANARIO\`"
    echo "           não tem alterações locais e mesmo assim está $(( (CAN_MTIME - CAN_COMMIT) / 3600 ))h"
    echo "           mais recente que o seu próprio commit. Isso é um checkout a"
    echo "           reescrever datas, e num checkout esta guarda NÃO MEDE NADA."
    echo "           Corre-a onde as capturas são produzidas."
    exit "$NAO_MEDI"
  fi
fi
verde "os \`mtime\` desta cópia são de produção (o canário confere com o seu commit)"

# ── 3. A comparação, por DUAS medidas e não uma ───────────────────────────
#
# O `mtime` é a verdade nesta máquina e MENTE num clone: o git não guarda datas
# de ficheiro, e num `clone` fresco tudo fica com a hora do checkout — mais nova
# do que qualquer commit, e a guarda ficava verde para sempre sem medir nada.
#
# A primeira versão somava-lhe a data do COMMIT do artefacto, para cobrir o
# clone. Deu 24 falsos: recapturei as telas-mestre, 23 saíram byte a byte iguais,
# o git não vê alteração nenhuma e o commit continua o antigo — e elas descrevem
# o produto actual. Uma segunda medida que acusa quem está certo é pior do que
# uma medida só.
#
# Fica o `mtime`, que é a pergunta certa: **quando é que isto foi produzido**.
# E fica escrito o que ele não sabe, em vez de o disfarçar com uma regra que
# inventa vermelhos.
velhos() {
  local a mt
  while IFS= read -r a; do
    [ -n "$a" ] || continue
    mt=$(stat -f '%m' "$a" 2>/dev/null || echo 0)
    [ "${mt:-0}" -lt "$PRODUTO" ] && echo "$a"
  done < "$LISTA"
  return 0
}

VELHOS=$(velhos)
N_VELHOS=$(printf '%s' "$VELHOS" | grep -c . || true)

# ── 4. A SONDA: a guarda sabe ver um artefacto velho? ─────────────────────
#
# Um zero aqui confirma o que se espera — e um zero que confirma o que se espera
# não mediu nada. Planta-se uma captura com data anterior ao produto e exige-se
# que ela apareça. Sem isto, uma guarda com o `find` errado ficava verde para
# sempre e ninguém dava por ela.
SONDA=docs/visual/.sonda-frescura.png
printf 'sonda' > "$SONDA"
touch -t 200001010000 "$SONDA"
SONDA_VISTA=$(
  mt=$(stat -f '%m' "$SONDA" 2>/dev/null || echo 0)
  [ "${mt:-0}" -lt "$PRODUTO" ] && echo sim || echo nao
)
rm -f "$SONDA"
if [ "$SONDA_VISTA" != 'sim' ]; then
  naomedi "a sonda não acendeu: um ficheiro datado de 2000 não foi visto como velho."
  exit "$NAO_MEDI"
fi
if [ -e "$SONDA" ]; then
  naomedi "a sonda não foi removida — a guarda deixou lixo na árvore."
  exit "$NAO_MEDI"
fi
verde "a sonda acendeu e saiu: um artefacto anterior ao produto é visto"

ambito() {
  echo "  âmbito:  $N_ARTEFACTOS artefactos em docs/visual — $((N_ARTEFACTOS - N_VELHOS)) posteriores"
  echo "           ao produto e ${N_VELHOS:-0} anteriores. Referência: $PRODUTO_H."
  echo "           Medida: \`mtime\` — quando o artefacto foi produzido nesta máquina."
  echo "           LIMITE declarado: num clone fresco o git não guarda datas de"
  echo "           ficheiro e todos ficam com a hora do checkout. Nessa máquina esta"
  echo "           guarda não mede nada, e é por isso que corre onde se captura."
  echo "           FORA: o CONTEÚDO da prova. Isto não diz que a captura está certa —"
  echo "           diz que não é anterior ao produto que retrata. Uma prova fresca e"
  echo "           errada passa aqui, e é outra guarda que a apanha."
}

if [ "${N_VELHOS:-0}" -gt 0 ]; then
  vermelho "$N_VELHOS artefacto(s) de prova são anteriores à última alteração ao produto:"
  # Por pasta, porque é a pasta que diz de quem é o artefacto e quem o recaptura.
  printf '%s\n' "$VELHOS" | sed 's|/[^/]*$||' | sort | uniq -c \
    | sort -rn | head -8 | sed 's/^/           /'
  echo "           Uma prova assim continua nítida e continua a mostrar o que mediu."
  echo "           O que ela já não mostra é o produto — e nada dentro dela o diz."
  ambito
  exit "$FALHOU"
fi

verde "toda a prova é posterior à última alteração ao produto"
echo
ambito
exit "$OK"
