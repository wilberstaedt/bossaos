#!/usr/bin/env bash
#
# O AVISO DO RV100 TEM DE ESTAR ONDE ALGUÉM O LÊ.
#
# O Matheus deixou o `docs/RV100.md` a 06/09 às 03h20 e pediu para ser avisado
# quando chegarmos aos 100%. Armei o aviso em DOIS sítios «para não depender de
# eu me lembrar» — e às 05h50 descobri que tinha desaparecido do HANDOFF.
#
# **Os dois sítios eram ficheiros que se reescrevem.** É redundância com modo de
# falha partilhado: dois avisos que morrem da mesma causa não são dois avisos. O
# ficheiro de 841 linhas sobreviveu; o que leva alguém até ele, não.
#
# Uma guarda é a única coisa que sobrevive a reescritas — porque não depende de
# ninguém preservar um parágrafo, depende de alguém reparar num vermelho.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas+1)); }
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }

echo "1. O documento existe e está inteiro"
if [ -f docs/RV100.md ] && [ "$(wc -l < docs/RV100.md)" -gt 800 ]; then
  ok "docs/RV100.md com $(wc -l < docs/RV100.md | tr -d ' ') linhas"
else
  erro "docs/RV100.md em falta ou truncado"
fi

echo "2. O aviso está no HANDOFF, que é o que se lê a cada tick"
grep -q "RV100" docs/progress/HANDOFF.md \
  && ok "o HANDOFF aponta para ele" \
  || erro "o HANDOFF NÃO menciona o RV100 — o gatilho desapareceu numa reescrita"

echo "3. A ordem e a promessa de aviso estão escritas"
grep -q "Mandar push quando chegarmos aos 100" docs/progress/DEPOIS-DOS-100.md 2>/dev/null \
  && ok "o DEPOIS-DOS-100 guarda a promessa de o avisar" \
  || erro "a promessa de avisar o Matheus não está escrita"

# ── controlo negativo ────────────────────────────────────────────────────────
echo
echo "4. Controlo negativo"
SONDA="$(mktemp)"; trap 'rm -f "$SONDA"' EXIT
printf '# um handoff qualquer, sem o aviso\n' > "$SONDA"
grep -q "RV100" "$SONDA" \
  && erro "CONTROLO NEGATIVO FALHOU: viu RV100 onde não está" \
  || ok "num handoff sem o aviso, a mesma leitura acusa"

echo
[ "$falhas" -eq 0 ] && echo "  Gatilho do RV100 armado." || echo "  $falhas falha(s) — o Matheus pode não ser avisado."
exit $([ "$falhas" -eq 0 ] && echo 0 || echo 1)
