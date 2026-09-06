#!/usr/bin/env bash
#
# UMA ENTRADA DE MENU QUE NAO LEVA A LADO NENHUM TEM DE DIZER QUEM A CONSTROI.
#
# A convencao existe e funciona no menu de gestao: `href: '#'` vem sempre com
# `porConstruir: 'E30'`, e por isso da para distinguir uma porta que ainda nao
# existe de uma porta que alguem se esqueceu de ligar. As duas parecem iguais no
# ecra - e so uma delas e um defeito.
#
# Nasceu a 05/09 da divida 1 do E34: o menu da PLATAFORMA tem tres entradas a
# `#` - Suporte, Incidentes e Auditoria - sem `porConstruir` nenhum. O criterio
# foi aplicado a metade do produto e ninguem reparou, porque a `provar-portas.sh`
# nomeia UM ficheiro a mao:
#
#   LAYOUT='apps/web/app/[idioma]/app/[orgSlug]/layout.tsx'
#
# Terceira lista escrita a mao a desalinhar hoje, depois das provas na CI e do
# indice de contratos. A regra ja nao e anedota: onde ha uma lista a mao de
# coisas que crescem, ela esta desactualizada. Esta guarda DESCOBRE os layouts.
set -uo pipefail
cd "$(dirname "$0")/.."

# O leitor de comentarios e' a fonte desta guarda. Se nao correr, ela le zero
# linhas e diz "0 falhas" — cega e verde ao mesmo tempo. Prova-se uma vez, e
# alto, em vez de se engolir o erro em cada ficheiro.
if ! python3 scripts/sem-comentarios.py "$0" > /dev/null 2>&1; then
  echo "  FALHA o sem-comentarios.py nao corre — esta guarda ficaria cega" >&2
  exit 1
fi

falhas=0
erro() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas+1)); }
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }

# Descobre os layouts que definem menu. Se nao encontrar nenhum, e leitor cego -
# nao verde. Um zero de "esta tudo bem" e um zero de "nao medi" escrevem-se
# igual, e essa e a confusao que mais me custou este mes.
# Sem `mapfile`: o bash do macOS e o 3.2 e nao o tem. Guardado numa string com
# uma linha por ficheiro, que e o que este caso precisa.
LAYOUTS="$(find apps/web/app -name layout.tsx -exec grep -l "href:" {} \; 2>/dev/null | sort)"
N_LAYOUTS="$(printf '%s\n' "$LAYOUTS" | grep -c . || true)"
if [ "$N_LAYOUTS" -lt 2 ]; then
  erro "so encontrei $N_LAYOUTS layout(s) com menu - o leitor esta cego"
  echo "  $falhas falha(s)."; exit 1
fi

echo "1. Toda a entrada morta diz que etapa a constroi"
echo "   ($N_LAYOUTS layouts descobertos)"
# NAO usar `printf | while`: o corpo corre num SUB-SHELL e as contagens de falha
# morrem la dentro. A primeira versao desta guarda imprimia as tres FALHAS e
# saia a ZERO - imprimir o defeito e devolver verde e a forma mais pura do verde
# vazio, e cometi-a numa guarda escrita para cacar exactamente isso.
#
# E le CODIGO, nao prosa. A 06/09 esta guarda acusou um COMENTARIO que explicava
# porque e que o `href: '#'` era mau — castigou exactamente quem tinha acabado de
# fechar as portas. A leitura passa pelo `sem-comentarios.py`, que ja devolve
# `ficheiro:linha:texto` e mantem os numeros de linha certos. E a mesma calibragem
# do `validar-alergenios.sh`, e pela mesma razao: uma guarda que nao distingue
# codigo de comentario ensina a nao documentar.
portas_mortas() {
  python3 scripts/sem-comentarios.py "$@" \
    | grep -E "href: *'#'" || true
}

while IFS= read -r f; do
  [ -n "$f" ] || continue
  while IFS= read -r linha; do
    resto="${linha#*:}"; n="${resto%%:*}"; texto="${resto#*:}"
    case "$texto" in *porConstruir*) continue ;; esac
    erro "$f:$n entrada morta sem porConstruir — ${texto#*rotulo: }"
  done < <(portas_mortas "$f")
done <<EOF
$LAYOUTS
EOF
[ "$falhas" -eq 0 ] && ok "nenhuma entrada morta anonima"

# ── controlo negativo ────────────────────────────────────────────────────────
echo
echo "2. Controlo negativo"
SONDA="$(mktemp -d)"; trap 'rm -rf "$SONDA"' EXIT
# Tres casos numa sonda so: a anonima TEM de acusar, a declarada NAO, e o
# comentario que fala de `href: '#'` tambem NAO — este ultimo entrou a 06/09,
# no dia em que a guarda acusou prosa e nao codigo. Um controlo que nao cobre o
# caso que ja falhou uma vez e um controlo que so prova o que ja se sabia.
printf "  { href: '#', rotulo: m.x },\n  { href: '#', rotulo: m.y, porConstruir: 'E30' },\n  // um href: '#' parece clicavel e nao leva a lado nenhum\n" > "$SONDA/l.tsx"
apanhadas=$(portas_mortas "$SONDA/l.tsx" | grep -vc porConstruir || true)
if [ "$apanhadas" = "1" ]; then
  ok "apanha a anonima, e NAO acusa a declarada nem o comentario"
else
  erro "CONTROLO NEGATIVO FALHOU: apanhou $apanhadas de 1"
fi

echo
[ "$falhas" -eq 0 ] && echo "  Nenhuma porta morta anonima." || echo "  $falhas porta(s) morta(s) sem dono."
exit $([ "$falhas" -eq 0 ] && echo 0 || echo 1)
