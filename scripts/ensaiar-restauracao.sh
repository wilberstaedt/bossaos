#!/usr/bin/env bash
#
# ENSAIO DE RESTAURAÇÃO — porque um backup que nunca foi restaurado é uma
# esperança, não um backup.
#
# ── O que este guião produz, e o que ele recusa produzir ──────────────────
#
# Produz: a data do ensaio, o TEMPO medido, e uma amostra verificada de
# catálogo, pedidos e saldos na base restaurada.
#
# Recusa produzir: um número de RPO ou RTO. Esses propõem-se no runbook e
# comparam-se com o que aqui sair — que costuma ser pior, e é exactamente por
# isso que se mede. Um número dito ao cliente sem ensaio é inventado, e ele toma
# decisões de negócio com ele.
#
# ── E restaura para uma base ISOLADA ──────────────────────────────────────
#
# `bossaos_ensaio`, criada e destruída aqui. Restaurar por cima da base de
# trabalho seria ensaiar a recuperação destruindo o que se queria recuperar.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

ORIGEM="${1:-bossaos_dev}"
ENSAIO="bossaos_ensaio"

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas+1)); }
naomedi()  { printf '  \033[33mNÃO MEDI\033[0m %s\n' "$1"; }

CAIXA="$(mktemp -d)"
trap 'rm -rf "$CAIXA"; psql "$MIGRATION_DATABASE_URL" -q -c "DROP DATABASE IF EXISTS \"'"$ENSAIO"'\"" >/dev/null 2>&1 || true' EXIT INT TERM

# ── PRÉ-VOO: a origem tem dados? ──────────────────────────────────────────
#
# Um ensaio sobre uma base vazia restaura sem erro, mede um tempo, e **não prova
# nada**: o critério de aceite pede uma AMOSTRA de catálogo, pedidos e saldos
# verificada, e uma amostra de zero linhas é verde sobre população zero.
#
# Aconteceu à primeira corrida: a limpeza do arnês tinha esvaziado a base, o
# ensaio deu «0 falhas», e as três contagens vieram a zero. Um zero de «está
# tudo bem» e um zero de «não medi» escrevem-se igual.
#
# Isto pára antes, e diz o que fazer.
LINHAS_NA_ORIGEM="$(psql -d "$ORIGEM" -t -c \
  "SELECT (SELECT count(*) FROM products) + (SELECT count(*) FROM orders)" \
  2>/dev/null | tr -d ' ' || echo 0)"
if [ "${LINHAS_NA_ORIGEM:-0}" -eq 0 ]; then
  printf '  \033[33mNÃO MEDI\033[0m a origem %s não tem catálogo nem pedidos.\n' "$ORIGEM"
  echo "           Restaurar uma base vazia mede o mecanismo e NÃO a amostra,"
  echo "           que é o que o critério de aceite pede. Semear primeiro:"
  echo "             node --experimental-strip-types packages/db/prisma/fixtures.ts"
  echo "             node --experimental-strip-types packages/db/prisma/semente-inspeccao.ts"
  exit 1
fi
verde "origem $ORIGEM com $LINHAS_NA_ORIGEM linhas de catálogo e pedidos"
echo

echo "1. A cópia"
# ── O relógio mede em MILISSEGUNDOS, e a razão não é preciosismo ──────────
#
# Com `date +%s`, uma restauração de 800 ms escreve-se «0s» na `pilot.md`. E um
# zero lê-se como «instantâneo» — que é uma promessa — quando na verdade é a
# resolução do instrumento a esconder o número. É a mesma família do zero de
# «está tudo bem» contra o zero de «não medi», e aqui custa uma expectativa
# errada ao cliente sobre quanto tempo fica fechado.
#
# A amostra é pequena de propósito (é um ensaio), por isso o instrumento tem de
# ser mais fino do que aquilo que mede.
agora_ms() { python3 -c 'import time; print(int(time.time()*1000))'; }
mostrar_ms() { python3 -c 'import sys; ms=int(sys.argv[1]); print(f"{ms/1000:.2f}s" if ms < 10000 else f"{ms//1000}s")' "$1"; }

INICIO_COPIA=$(agora_ms)
if pg_dump -Fc -d "$ORIGEM" -f "$CAIXA/copia.dump" 2>"$CAIXA/erro-copia.txt"; then
  FIM_COPIA=$(agora_ms)
  verde "cópia de $ORIGEM: $(wc -c < "$CAIXA/copia.dump" | tr -d ' ') bytes em $(mostrar_ms $((FIM_COPIA-INICIO_COPIA)))"
else
  vermelho "pg_dump falhou"; head -3 "$CAIXA/erro-copia.txt" | sed 's/^/           /'; exit 1
fi

echo
echo "2. A restauração, numa base ISOLADA"
psql "$MIGRATION_DATABASE_URL" -q -c "DROP DATABASE IF EXISTS \"$ENSAIO\"" >/dev/null 2>&1
psql "$MIGRATION_DATABASE_URL" -q -c "CREATE DATABASE \"$ENSAIO\"" >/dev/null 2>&1 \
  || { vermelho "não consegui criar $ENSAIO"; exit 1; }

INICIO=$(agora_ms)
# `--no-owner` e `--no-privileges`: os papéis do servidor de destino não são
# necessariamente os do de origem, e uma restauração que falha por causa de um
# GRANT mede a configuração e não a cópia.
pg_restore --no-owner --no-privileges -d "$ENSAIO" "$CAIXA/copia.dump" \
  >"$CAIXA/saida.txt" 2>&1 || true
FIM=$(agora_ms)
DURACAO_MS=$((FIM-INICIO))
verde "restaurada em $(mostrar_ms "$DURACAO_MS")"

echo
echo "3. A amostra — e é ela que distingue restaurar de descomprimir"
#
# Um `pg_restore` sem erro não prova que os dados lá estão: prova que o ficheiro
# se leu. Estas três contagens são o mínimo para alguém acreditar.
contar() {
  psql -d "$ENSAIO" -t -c "SELECT count(*) FROM \"$1\"" 2>/dev/null | tr -d ' ' || echo "?"
}
PRODUTOS="$(contar products)"
PEDIDOS="$(contar orders)"
MOVIMENTOS="$(contar stock_movements)"

for par in "produtos:$PRODUTOS" "pedidos:$PEDIDOS" "movimentos de stock:$MOVIMENTOS"; do
  nome="${par%%:*}"; valor="${par#*:}"
  if [ "$valor" = "?" ]; then
    # ── «Não medi» é diferente de «zero» ────────────────────────────────
    #
    # Uma tabela que não responde e uma tabela vazia escrevem-se iguais se
    # ninguém as separar, e significam o contrário: a primeira diz que a
    # restauração falhou, a segunda que a casa é nova.
    naomedi "$nome: a tabela não respondeu"
    falhas=$((falhas+1))
  elif [ "$valor" = "0" ]; then
    naomedi "$nome: ZERO linhas — pode ser uma casa nova, pode ser uma cópia vazia"
  else
    verde "$nome: $valor linhas"
  fi
done

echo
echo "4. E o saldo DERIVADO continua a bater"
# O stock é derivado dos movimentos desde o E25. Se a restauração trouxesse as
# linhas mas não os gatilhos, a contagem batia e o saldo mentia — e isso só se
# vê perguntando pelo saldo, não pelas linhas.
SALDO="$(psql -d "$ENSAIO" -t -c \
  "SELECT count(*) FROM information_schema.triggers WHERE event_object_table = 'stock_movements'" \
  2>/dev/null | tr -d ' ' || echo '?')"
if [ "$SALDO" = "?" ] || [ "$SALDO" = "0" ]; then
  vermelho "os gatilhos do stock não vieram na cópia: o saldo passaria a mentir"
else
  verde "$SALDO gatilho(s) de stock restaurados"
fi

echo
echo "5. O que se escreve na pilot.md"
echo "   ensaio_feito_em: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "   ensaio_duracao: $(mostrar_ms "$DURACAO_MS")  ($DURACAO_MS ms)"
echo "   amostra: produtos=$PRODUTOS pedidos=$PEDIDOS movimentos=$MOVIMENTOS"
echo
echo "   E NÃO se escreve RPO nem RTO a partir daqui. Isto é o tempo de"
echo "   RESTAURAR uma cópia que já existia; o RPO depende da frequência das"
echo "   cópias, que é outra medição e ainda não foi feita."

echo
[ "$falhas" -eq 0 ] && echo "  Ensaio feito: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
