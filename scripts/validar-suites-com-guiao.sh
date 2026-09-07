#!/usr/bin/env bash
# Nenhuma suite de navegador pode falhar sem aparecer em relatorio nenhum.
#
# Nasceu de um achado da revisao do E34, a 06/09. O `divida-movel` estava
# partido e ninguem sabia - nao porque o corredor o corresse e ignorasse, mas
# porque NENHUM `provar-*.sh` o nomeia. Uma suite sem guiao nao aparece no
# corredor: nao da verde nem vermelho, DESAPARECE. E a mesma familia do pacote a
# zero que a `validar-testes.sh` guarda, um andar acima: nao e um teste que mede
# nada, e uma suite inteira fora da medicao.
#
# Ao medir isto errei duas vezes seguidas, e as duas estao aqui como aviso:
#   1. Procurei o nome do ficheiro dentro dos guioes e conclui que ninguem o
#      corria; depois vi `--project=painel "$@"` e "corrigi" para o contrario.
#      Errado - aquele "$@" esta DENTRO de uma funcao que faz `shift`, e os dois
#      sitios que a chamam passam ficheiros. Li a definicao e chamei-lhe a
#      chamada.
#   2. A primeira contagem deu 9 porque `publico.spec.ts` e substring de
#      `crm-publico.spec.ts`. Sem fronteira a esquerda, um nome curto esconde-se
#      dentro de um nome longo.
#
# LIMITE DITO EM VOZ ALTA: isto mede "nomeado no texto de um guiao", nao
# "executado". Um nome dentro de um comentario conta como coberto. Portanto a
# divida que esta guarda conta e um PISO - a real e igual ou maior.
set -uo pipefail
cd "$(dirname "$0")/.."

# ── As excepcoes, em DUAS categorias, porque nao sao a mesma coisa ──────────
#
# POR_DESENHO: nao ha guiao e esta certo assim. Tem de ter motivo escrito.
# EM_DIVIDA:   devia ter guiao e nao tem. E divida, conta-se, e o tecto nao sobe
#              sem alguem levantar o numero a mao - o que aparece num diff.
POR_DESENHO="rv100-baseline.spec.ts:medicao de base do RV100, escrita a 06/09 no diagnostico da seccao 2; o guiao vem com a etapa do RV100 e nao antes
expansao.spec.ts:TEM corredor - o scripts/validar-expansao-de-texto.sh - mas a descoberta aqui so varre provar-*.sh. Alargar o glob a validar-*.sh seria errado e nao e esquecimento: esta guarda LISTA os nove nomes de EM_DIVIDA dentro dela propria, e o grep passaria a ver-se a si mesma como corredor deles. A divida toda ficava verde por auto-referencia. Fica declarado ate a descoberta saber distinguir quem CORRE um ficheiro de quem apenas o NOMEIA
alcance.spec.ts:mesma razao que o expansao.spec.ts acima - o corredor e o scripts/validar-alcance-das-composicoes.sh, uma guarda validar-* que a descoberta daqui nao varre
foco.spec.ts:pago a 07/09 - passou a ter corredor, o scripts/validar-foco-nos-momentos.sh. Mesma razao dos dois acima para nao ser descoberto: a descoberta so varre provar-*.sh
acessibilidade-dinamica.spec.ts:mesma razao das tres acima - o corredor e o scripts/validar-acessibilidade-dinamica.sh, uma guarda validar-* que a descoberta daqui nao varre"

EM_DIVIDA="capturas.spec.ts
divida-movel-auth.spec.ts
divida-movel.painel.spec.ts
larguras.spec.ts
marketing.spec.ts
painel.spec.ts
publico.spec.ts
sites-publicos.spec.ts"

# O tecto. Nao e decorativo: subir isto e um acto deliberado que fica no diff.
TECTO=8

# ── E o mesmo para as provas de no, que ate 06/09 nao tinham guarda nenhuma ──
#
# A correccao 4 pos a CI a descobrir os guioes por glob e a alcançar 39 das 40
# provas de `provas/`. A que sobra e um ORFAO que o JR encontrou e documentou:
# existe `provar-reserva-publica-no-navegador.sh`, que corre o SPEC, e ninguem
# corre o `provas/reserva-publica.test.ts`. Um ficheiro de prova sem guiao nao da
# verde nem vermelho - desaparece, tal e qual as suites de navegador.
EM_DIVIDA_PROVAS="reserva-publica.test.ts"
TECTO_PROVAS=1

falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
naomedi() { echo "  NAO MEDI $1"; exit 2; }

[ -d inspeccao ] || naomedi "a pasta inspeccao/ nao existe"
ls scripts/provar-*.sh >/dev/null 2>&1 || naomedi "nao ha guioes provar-*.sh"

# ── O detector, isolado numa funcao para que os controlos o possam exercitar ──
#
# Fronteira a esquerda: nada de [A-Za-z0-9._-] antes do nome. E o que separa
# `publico.spec.ts` de `crm-publico.spec.ts`.
coberto_por_algum() { # $1 = nome do ficheiro; 0 se algum guiao o nomeia
  local padrao
  padrao=$(printf '%s' "$1" | sed 's/[.[\*^$]/\\&/g')
  grep -qE "(^|[^A-Za-z0-9._-])${padrao}" scripts/provar-*.sh 2>/dev/null
}

# ── CONTROLOS, antes de medir seja o que for ────────────────────────────────
#
# Um detector que nunca foi visto a acertar e a errar nao mede nada. O positivo
# apanha um detector partido (que diria "nada coberto" e a guarda ficava verde
# por dentro da divida); o negativo apanha um detector cego (que diria "tudo
# coberto" e a guarda ficava verde por vazio).
echo "controlos do detector:"
if coberto_por_algum "staff-telas.spec.ts"; then
  echo "  ok    positivo: staff-telas.spec.ts e visto como coberto"
else
  naomedi "o controlo POSITIVO falhou - o detector nao ve o staff-telas, que o provar-staff nomeia. Instrumento partido."
fi
if coberto_por_algum "nao-existe-de-todo.spec.ts"; then
  naomedi "o controlo NEGATIVO falhou - o detector ve um ficheiro inventado como coberto. Instrumento cego."
else
  echo "  ok    negativo: um nome inventado nao e visto como coberto"
fi

declarado_em() { # $1 = nome; imprime POR_DESENHO, EM_DIVIDA ou nada
  case "$POR_DESENHO" in "$1:"*|*"
$1:"*) printf 'POR_DESENHO'; return ;; esac
  printf '%s\n' "$EM_DIVIDA" | while IFS= read -r l; do
    [ "$l" = "$1" ] && printf 'EM_DIVIDA'
  done
}

# ── A medicao ───────────────────────────────────────────────────────────────
echo "suites:"
sem_guiao=""; n_divida=0; n_desenho=0; n_cobertas=0
for f in inspeccao/*.spec.ts; do
  nome=$(basename "$f")
  if coberto_por_algum "$nome"; then n_cobertas=$((n_cobertas+1)); continue; fi
  d=$(declarado_em "$nome")
  case "$d" in
    POR_DESENHO) n_desenho=$((n_desenho+1)) ;;
    EM_DIVIDA)   n_divida=$((n_divida+1)); sem_guiao="$sem_guiao $nome" ;;
    *) erro "$nome nao e nomeado por guiao nenhum E nao esta declarado. Uma suite assim nao da verde nem vermelho: desaparece. Declara-a em EM_DIVIDA com o tecto subido, ou escreve-lhe um guiao." ;;
  esac
done

# ── A declaracao tem de CADUCAR sozinha ─────────────────────────────────────
#
# A licao esta escrita na validar-testes.sh: uma lista de excepcoes que ninguem
# revisita protege o que ja nao precisa de proteccao e esconde o que passou a
# precisar. Por isso uma entrada que ganhou guiao, ou cujo ficheiro morreu, e
# uma FALHA - obriga a revisitar.
printf '%s\n' "$EM_DIVIDA" | while IFS= read -r nome; do
  [ -n "$nome" ] || continue
  if [ ! -f "inspeccao/$nome" ]; then
    echo "  FALHA declaracao obsoleta: $nome esta em EM_DIVIDA e o ficheiro ja nao existe. Tira-o da lista e baixa o tecto."
  elif coberto_por_algum "$nome"; then
    echo "  FALHA declaracao obsoleta: $nome ja tem guiao e continua declarado como divida. Tira-o da lista e BAIXA O TECTO - senao a divida so parece encolher."
  fi
done > /tmp/bossaos-suites-obsoletas.txt
if [ -s /tmp/bossaos-suites-obsoletas.txt ]; then
  cat /tmp/bossaos-suites-obsoletas.txt
  falhas=$((falhas+$(wc -l < /tmp/bossaos-suites-obsoletas.txt | tr -d ' ')))
fi
rm -f /tmp/bossaos-suites-obsoletas.txt

if [ "$n_divida" -gt "$TECTO" ]; then
  erro "a divida subiu: $n_divida suites sem guiao, e o tecto e $TECTO. Subir o tecto e um acto deliberado - se e mesmo para subir, sobe-o a mao no ficheiro."
fi

# ── A mesma pergunta, na pasta das provas de no ─────────────────────────────
p_cobertas=0; p_divida=0; p_sem=""
for f in provas/*.test.ts; do
  [ -e "$f" ] || continue
  nome=$(basename "$f")
  if coberto_por_algum "$nome"; then p_cobertas=$((p_cobertas+1)); continue; fi
  case "$EM_DIVIDA_PROVAS" in
    "$nome"|*"
$nome"|"$nome
"*|*"
$nome
"*) p_divida=$((p_divida+1)); p_sem="$p_sem $nome" ;;
    *) erro "provas/$nome nao e nomeado por guiao nenhum E nao esta declarado. Um ficheiro de prova assim nao da verde nem vermelho: desaparece." ;;
  esac
done
printf '%s\n' "$EM_DIVIDA_PROVAS" | while IFS= read -r nome; do
  [ -n "$nome" ] || continue
  if [ ! -f "provas/$nome" ]; then echo "  FALHA declaracao obsoleta: provas/$nome ja nao existe."
  elif coberto_por_algum "$nome"; then echo "  FALHA declaracao obsoleta: provas/$nome ja tem guiao. Tira-o e BAIXA O TECTO."
  fi
done > /tmp/bossaos-provas-obsoletas.txt
if [ -s /tmp/bossaos-provas-obsoletas.txt ]; then
  cat /tmp/bossaos-provas-obsoletas.txt
  falhas=$((falhas+$(wc -l < /tmp/bossaos-provas-obsoletas.txt | tr -d ' ')))
fi
rm -f /tmp/bossaos-provas-obsoletas.txt
if [ "$p_divida" -gt "$TECTO_PROVAS" ]; then
  erro "a divida das provas subiu: $p_divida sem guiao, e o tecto e $TECTO_PROVAS."
fi

echo "  ok    $n_cobertas nomeadas por algum guiao"
echo "  ok    $n_desenho sem guiao POR DESENHO"
echo "  DIVIDA $n_divida sem guiao (tecto $TECTO):$sem_guiao"
echo "         estas falham sem aparecer em relatorio nenhum - foi assim que o divida-movel ficou partido em silencio"

echo "  ok    $p_cobertas provas de no nomeadas por algum guiao"
echo "  DIVIDA $p_divida prova(s) de no sem guiao (tecto $TECTO_PROVAS):$p_sem"

if [ "$falhas" -gt 0 ]; then echo "FALHOU: $falhas"; exit 1; fi
echo "OK"
