#!/usr/bin/env bash
# `2>/dev/null` num passo que NAO pode falhar em silencio.
#
# ── Porque e' que isto existe ───────────────────────────────────────────────
#
# A 05/09 a mesma armadilha apanhou os dois agentes deste projecto, em quatro
# ocasioes:
#   · `git checkout` recusado por um ficheiro solto — mandei o erro para
#     /dev/null e medi o commit ERRADO durante quatro tentativas;
#   · `prisma generate` falhado em silencio — quatro vermelhos que li como
#     defeito do produto;
#   · e o JR: «o extrair-sql.py leva dois argumentos e eu passei um; o
#     2>/dev/null engoliu o erro e a restauracao nao restaurou nada.»
#
# A frase dele e' a regra: **o silenciador e' metade do defeito.**
#
# NAO reprova todo o `2>/dev/null` — a maior parte e' legitima (ver se algo
# existe, limpeza opcional). Reprova-o em passos de PREPARACAO e RESTAURACAO,
# onde uma falha silenciosa nao para nada e contamina tudo o que vem a seguir.
set -uo pipefail
cd "$(dirname "$0")/.."

# Verbos onde o silencio custa caro. Nao e' uma lista de estilo: e' a lista dos
# passos cuja falha invalida a medicao seguinte.
CRITICOS='restaurar|repor|checkout|migrate|generate|fixtures|semente|semear|prisma'

achados=""
n=0
for f in scripts/*.sh; do
  [ "$(basename "$f")" = "validar-silenciadores.sh" ] && continue
  n=$((n+1))
  while IFS= read -r linha; do
    # `|| true` e `|| eco` declaram que a falha foi PENSADA. Sem isso, e' silencio.
    echo "$linha" | grep -qE '\|\||then|&&' && continue
    # Uma excepcao DECLARADA nao e' silencio: e' uma decisao que alguem escreveu
    # e que se pode auditar. `# silenciador-ok: <razao>` na mesma linha ou na
    # anterior dispensa — e a razao fica no codigo, nao na cabeca de quem passou.
    num=${linha%%:*}
    ficheiro_alvo="$f"
    # Cinco linhas de recuo: um comando multi-linha poe a anotacao no topo do
    # bloco, e nao encostada a linha do silenciador. Foi o que aconteceu a
    # primeira vez que corri isto — a anotacao estava tres linhas acima.
    ini=$(( num - 5 )); [ "$ini" -lt 1 ] && ini=1
    if sed -n "${ini},${num}p" "$ficheiro_alvo" 2>/dev/null | grep -q 'silenciador-ok:'; then
      continue
    fi
    achados="$achados
    $(basename "$f"): $linha"
  # ── COMENTARIOS FORA, E ISTO APANHOU-ME NO DIA EM QUE NASCEU ─────────────
  #
  # A 05/09, horas depois de escrever esta guarda, ela acusou uma linha do
  # `provar-crm.sh` do JR que dizia:
  #   «Repor o SQL da migracao, e falhar ALTO se nao repuser. O 2>/dev/null que...»
  # Um COMENTARIO a explicar que ele fez a coisa certa. A guarda escrita para
  # apanhar silenciadores estava a acusar quem os documentava.
  #
  # E' a mesma familia que a `validar-provas-na-ci.sh` ja tinha apanhado em si
  # propria — vigiar a FORMA DE ESCRITA em vez da propriedade — e a cura e' a
  # mesma que ela usa: cortar os comentarios ANTES de procurar.
  # silenciador-ok: aqui o silencio e' do proprio grep a nao achar nada, e o
  # `|| true` acima ja o declara.
  done < <(sed 's/#.*//' "$f" | grep -nE "2>\s*/dev/null" | grep -iE "$CRITICOS" || true)
done

# Controlo do proprio leitor: zero scripts lidos e' cegueira, nao limpeza.
if [ "$n" -lt 10 ]; then
  printf '\033[33m  NAO MEDI\033[0m so li %s scripts — o leitor esta cego\n' "$n"
  exit 3
fi

if [ -z "$achados" ]; then
  printf '\033[32m  ok\033[0m    nenhum silenciador em passo critico (%s scripts lidos)\n' "$n"
  exit 0
fi
printf '\033[31m  FALHA\033[0m silenciador em passo que nao pode falhar calado:%s\n' "$achados"
printf '        Um erro engolido num passo de preparacao nao para nada — contamina\n'
printf '        a medicao seguinte e aparece como defeito do produto.\n'
exit 1
