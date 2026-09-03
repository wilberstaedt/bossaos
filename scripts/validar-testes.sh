#!/usr/bin/env bash
# Nenhum pacote pode deixar de correr testes em silencio.
#
# Nasceu de um achado da revisao do E04: `packages/auth` - o pacote que guarda a
# revogacao de sessoes - tinha ZERO ficheiros de teste. O script dele corria
# `node --test "src/**/*.test.ts"`, o padrao nao casava com nada, e o corredor
# saia a **0**. Verde por nao haver nada. A contagem do handoff somava 91 sem
# mencionar o pacote, e a CI passava.
#
# E a mesma familia do verde sobre populacao zero, so que ao nivel do pacote: nao
# e um teste que mede zero, e um PACOTE INTEIRO que desaparece da medicao.
#
# Um pacote sem testes nao e proibido. O que e proibido e nao estar DECLARADO:
# entra na lista abaixo com um motivo escrito, e a silencio vira decisao.
set -uo pipefail
cd "$(dirname "$0")/.."

# Pacotes que podem estar a zero, com o motivo. Tirar daqui quando ganharem testes.
#
# Lista simples "nome:motivo" e nao array associativo: o bash do macOS e o 3.2 e
# nao tem `declare -A`. Escrevi-o com array a primeira e rebentou aqui - mas
# TERIA PASSADO NA CI, que corre bash 5. E a mesma familia do shebang zsh de hoje
# as 13h30, ao contrario: dessa vez passava aqui e falhava la.
PERMITIDOS="worker:andaime do E01; sem logica propria ate haver trabalho assincrono (E14)"

motivo_de() { # $1 = nome do pacote; imprime o motivo, ou nada
  echo "$PERMITIDOS" | tr ' ' '\n' >/dev/null 2>&1
  printf '%s\n' "$PERMITIDOS" | while IFS= read -r linha; do
    case "$linha" in
      "$1:"*) printf '%s' "${linha#*:}" ;;
    esac
  done
}

falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

alvos=()
for p in packages/*/package.json apps/*/package.json; do
  grep -q '"test":' "$p" 2>/dev/null && alvos+=("$(basename "$(dirname "$p")")")
done

# Controlo negativo do proprio leitor: se nao encontrar pacotes, tudo "bate".
if [ "${#alvos[@]}" -lt 5 ]; then
  erro "so encontrei ${#alvos[@]} pacotes com script de teste - o leitor esta cego"
  echo; echo "  $falhas FALHA(S)."; exit "$falhas"
fi
ok "${#alvos[@]} pacotes com script de teste"

echo
for nome in "${alvos[@]}"; do
  saida=$(pnpm --filter "@bossaos/$nome" test --test-reporter=tap 2>&1 || true)
  passou=$(echo "$saida" | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+' | head -1)
  falhou=$(echo "$saida" | grep -oE '^# fail [0-9]+' | grep -oE '[0-9]+' | head -1)
  total=$(( ${passou:-0} + ${falhou:-0} ))
  if [ "${falhou:-0}" -gt 0 ]; then
    erro "$nome: $falhou teste(s) a reprovar"
  elif [ "$total" -eq 0 ]; then
    razao=$(motivo_de "$nome")
    if [ -n "$razao" ]; then
      ok "$nome: zero testes, DECLARADO — $razao"
    else
      erro "$nome: zero testes e nao esta declarado. Ou ganha testes, ou entra na lista de scripts/validar-testes.sh com um motivo."
    fi
  else
    ok "$nome: $passou testes"
  fi
done

echo
[ "$falhas" -eq 0 ] && echo "  Todos os pacotes medidos: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
