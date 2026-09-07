#!/usr/bin/env bash
#
# O coral da ARTE da logo não entra em interface.
#
# São dois corais e é de propósito. O `fichas.ts` mede-os no ADR 0001: sobre o
# verde-escuro o coral do manual dá 4,71:1 e o da arte 4,23:1; sobre a areia é ao
# contrário. Cada um ganha num sítio, por isso ficam os dois — e por isso é
# preciso alguém a guardar a fronteira, senão daqui a três meses o da arte
# aparece num botão e ninguém repara.
#
# Até 07/09/2026 essa fronteira era só um comentário: «Não use esta constante em
# interface.» A promessa cumpria-se — verifiquei, zero usos — mas não havia nada
# que a fizesse continuar a cumprir-se. Uma regra sem guarda é uma regra com
# prazo de validade.
#
# Três respostas, não duas: OK, FALHOU e NÃO MEDI (exit 2). A terceira é a que
# apanha o dia em que este guião deixar de alcançar o código e ficar verde por
# não ver nada.
set -uo pipefail
cd "$(dirname "$0")/.."

CORAL_DA_ARTE='#FB4C39'
SIMBOLO='coralDaLogo'

naomedi() { echo "NAO MEDI: $*" >&2; exit 2; }

# Onde o valor PODE estar: a definição, os dois barris que a re-exportam, e as
# provas — um teste de contraste que não pode nomear a cor não testa nada.
permitido() {
  case "$1" in
    packages/ui/src/fichas.ts|packages/ui/src/index.ts|packages/ui/src/regras.ts) return 0 ;;
    *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) return 0 ;;
    *) return 1 ;;
  esac
}

# Sem `\b`: o git grep não o suporta e isso já me deu dois zeros falsos hoje.
detectar_em() { grep -nE "(${CORAL_DA_ARTE}|(^|[^A-Za-z0-9_])${SIMBOLO}([^A-Za-z0-9_]|$))" "$1" 2>/dev/null; }

echo "sonda do detector:"
sonda=$(mktemp); trap 'rm -f "$sonda"' EXIT
printf 'const cor = %s;\n' "'$CORAL_DA_ARTE'" > "$sonda"
detectar_em "$sonda" >/dev/null || naomedi "o detector nao ve o literal posto de proposito"
printf 'import { %s } from "@bossaos/ui";\n' "$SIMBOLO" > "$sonda"
detectar_em "$sonda" >/dev/null || naomedi "o detector nao ve o simbolo posto de proposito"
printf 'const outro = "#F5664D"; const cat = "catalogo";\n' > "$sonda"
detectar_em "$sonda" >/dev/null && naomedi "o detector acusa o coral APROVADO - reprova tudo e nao distingue nada"
echo "  ok    ve o literal, ve o simbolo, e nao confunde com o coral aprovado"

echo "alcance:"
lista=$(git ls-files 'apps/web/app/*' 'apps/web/src/*' 'packages/*/src/*' \
        | grep -E '\.(ts|tsx)$')
total=$(printf '%s\n' "$lista" | grep -c . || true)
# ── Um chao de populacao nao detecta uma populacao a meio ───────────────────
#
# Isto dizia `-gt 100`, e varria 709 ficheiros. Se o pathspec caisse para 200 —
# uma pasta renomeada, um glob que deixa de casar — a guarda PASSAVA, a varrer um
# terco do produto e a reportar verde.
#
# O implementador da landing encontrou a mesma forma no instrumento dele a
# 07/09: um array de modulo que o Playwright reiniciava depois de uma falha,
# escrevendo 20 registos em vez de 40. A frase dele e a que fica:
# «o meu controlo de populacao perguntava > 0, e 20 e maior do que zero».
#
# A pergunta certa nao e "ha alguma coisa" — e "estao todos". Como nao ha uma
# segunda fonte independente para o numero, declara-se: o piso so desce a mao, e
# uma queda e um sinal em vez de um silencio.
POPULACAO_DECLARADA=690   # observado 709 a 07/09; margem para ficheiros removidos
[ "$total" -gt 100 ] || naomedi "so $total ficheiros alcancados - o pathspec nao chega ao codigo"
if [ "$total" -lt "$POPULACAO_DECLARADA" ]; then
  naomedi "a populacao caiu de $POPULACAO_DECLARADA declarados para $total - ou apagaram ficheiros, ou o alcance encolheu. Confirma qual, e so entao baixa o numero a mao."
fi
# Controlo positivo de população: a lista tem de conter o sítio onde o valor
# VIVE. Se não contiver, este guião podia estar a varrer a pasta errada e a dar
# verde sobre nada.
printf '%s\n' "$lista" | grep -q '^packages/ui/src/fichas.ts$' \
  || naomedi "a lista nao inclui fichas.ts, onde o valor vive - alcance errado"
detectar_em packages/ui/src/fichas.ts >/dev/null \
  || naomedi "o valor deixou de estar em fichas.ts - a declaracao expirou, reveja este guiao"
echo "  ok    $total ficheiros, e o sitio onde o valor vive esta la dentro"

echo "interface:"
falhas=0
for f in $lista; do
  permitido "$f" && continue
  saida=$(detectar_em "$f") || continue
  [ -n "$saida" ] || continue
  printf '%s\n' "$saida" | while IFS= read -r l; do echo "  FALHA $f:$l"; done
  falhas=$((falhas+1))
done
falhas=$(for f in $lista; do permitido "$f" || detectar_em "$f"; done | grep -c . || true)

if [ "$falhas" -gt 0 ]; then
  echo "FALHOU: $falhas uso(s) do coral da arte em interface." >&2
  echo "O coral de interface e o token --bo-acento (#F5664D). Ver fichas.ts." >&2
  exit 1
fi
echo "  ok    o coral da arte nao entra em interface"
echo "OK"
