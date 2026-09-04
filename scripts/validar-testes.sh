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
# Vazia desde o E05: o `worker` deixou de ser andaime quando ganhou o varrimento
# de descidas, e a declaracao "sem logica propria" passou a ser falsa. Uma lista
# de excepcoes que ninguem revisita e uma lista que protege o que ja nao precisa
# de proteccao - e esconde o que passou a precisar.
PERMITIDOS="web:as provas dele vivem na raiz e correm na CI em trabalhos proprios — provas/ contra o PostgreSQL e inspeccao/ no navegador; um script de teste no pacote duplicaria a execucao sem medir nada de novo"

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

# ── controlo negativo do leitor de declaracoes ─────────────────────────────
# A regra nova - um pacote sem script de teste tem de estar DECLARADO - depende
# toda deste leitor. Se ele devolvesse sempre algo, qualquer pacote passaria por
# declarado e a regra nao existia. Custa nada e corre em cada passagem.
if [ -z "$(motivo_de web)" ]; then
  erro "CONTROLO: o leitor nao encontra a declaracao de 'web' que esta na lista"
fi
if [ -n "$(motivo_de pacote-que-nao-existe)" ]; then
  erro "CONTROLO: o leitor devolveu motivo para um pacote NAO declarado - tudo passaria"
fi
[ "$falhas" -eq 0 ] && ok "controlo: o leitor de declaracoes distingue declarado de nao declarado"

alvos=()
sem_script=()
for p in packages/*/package.json apps/*/package.json; do
  nome="$(basename "$(dirname "$p")")"
  if grep -q '"test":' "$p" 2>/dev/null; then
    alvos+=("$nome")
  else
    sem_script+=("$nome")
  fi
done

# ── o pacote que NAO TEM script de teste ────────────────────────────────────
#
# A 04/09 medi o alcance desta guarda e encontrei o buraco no sitio mais caro
# possivel: `apps/web` NAO TEM script de teste, por isso nunca entrava na lista de
# alvos e desaparecia da medicao por inteiro. E o pacote maior do projecto - as
# 396 telas, a carta publica, as rotas de API.
#
# Ou seja: a guarda que nasceu para impedir que um PACOTE INTEIRO desaparecesse da
# medicao era cega ao pacote mais importante a desaparecer. Ela contava os que se
# apresentavam e nunca perguntou quem faltava a chamada.
#
# E nao e teorico: os dois defeitos que o E09 escondeu de mim - a carta servida sem
# folha de estilos e a consulta a servir o menu de outra unidade - viviam aqui.
#
# A regra e a mesma do resto do ficheiro: nao ter testes nao e proibido, nao estar
# DECLARADO e que e.
echo
for nome in "${sem_script[@]:-}"; do
  [ -z "$nome" ] && continue
  razao=$(motivo_de "$nome")
  if [ -n "$razao" ]; then
    ok "$nome: sem script de teste, DECLARADO — $razao"
  else
    erro "$nome: NAO TEM script de teste e nao esta declarado — desaparece da medicao em silencio."
  fi
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
