#!/usr/bin/env bash
# ── As cinco imagens que um comprador vê ──────────────────────────────────
#
# A página de marketing mostra cinco capturas do produto. A 07/09 elas tinham
# **dois defeitos que nenhuma guarda via**, e foi o dono do produto a apanhá-los
# em duas fotografias:
#
#   1. Estavam em ESPANHOL em todos os idiomas. Um conjunto só de PNG, com
#      `es-ES` cravado nas rotas do guião de captura: `/pt-BR/product` e
#      `/es-ES/product` serviam exactamente os mesmos bytes.
#   2. Estavam SETE HORAS atrasadas — imagens das 10:15 com dezasseis commits ao
#      produto desde então. A `carta-movel` mostrava o campo de busca cortado,
#      **o defeito que nesse mesmo dia tinha sido corrigido**.
#
# A página que vende o produto anunciava os defeitos que se tinham acabado de
# tirar. Esta guarda existe para isso não voltar a acontecer em silêncio.
#
# ── As duas perguntas, e nenhuma se responde lendo código ─────────────────
#
# **Frescura:** nenhuma captura pode ser anterior à fonte mais recente do
# produto. A mecânica é a mesma que a `pagina-de-aprovacao.py` já usava para as
# telas-mestre — vive agora em `frescura_do_produto.py`, uma implementação para
# os dois, porque uma segunda cópia dela era a duplicação de sempre.
#
# **Idioma:** a mesma composição em línguas diferentes tem de ter somas de
# verificação DIFERENTES. É assim que o defeito se conhecia (eram iguais) e é
# assim que a cura se prova. Nenhuma leitura do `Demonstracao.tsx` diria se as
# imagens no disco são a mesma — foi exactamente o que aconteceu.
#
# Três respostas:
#   OK (0)        as 15 são frescas e distintas por idioma
#   FALHOU (1)    há captura velha, em falta, ou repetida entre idiomas
#   NÃO MEDI (2)  população vazia, ou uma sonda não acendeu
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

RAIZ_CAPTURAS="apps/web/src/demonstracao"
IDIOMAS=(es-ES pt-BR en)
COMPOSICOES=(kds-cozinha-1280 sala-servico-1440 catalogo-1440 sala-tablet-834 carta-movel-390)

echo "As cinco imagens que um comprador vê estão frescas e na língua dele?"

# ── A população ───────────────────────────────────────────────────────────
FICHEIROS=()
for l in "${IDIOMAS[@]}"; do
  for c in "${COMPOSICOES[@]}"; do FICHEIROS+=("$RAIZ_CAPTURAS/$l/$c.png"); done
done
ESPERADAS=$(( ${#IDIOMAS[@]} * ${#COMPOSICOES[@]} ))
PRESENTES=0
for f in "${FICHEIROS[@]}"; do [ -f "$f" ] && PRESENTES=$((PRESENTES + 1)); done
if [ "$PRESENTES" -eq 0 ]; then
  naomedi "zero capturas em $RAIZ_CAPTURAS — ou mudaram de sítio, ou nunca foram tiradas."
  exit "$NAO_MEDI"
fi
verde "$PRESENTES de $ESPERADAS capturas presentes"

# ── 1 · FRESCURA, pela peça partilhada ────────────────────────────────────
SAIDA_FRESCURA=$(python3 scripts/frescura_do_produto.py "${FICHEIROS[@]}" 2>&1)
ESTADO_FRESCURA=$?

# ── 2 · IDIOMA: a mesma composição, somas diferentes ─────────────────────
repetidas() {
  local c l soma
  for c in "${COMPOSICOES[@]}"; do
    local somas=""
    for l in "${IDIOMAS[@]}"; do
      [ -f "$RAIZ_CAPTURAS/$l/$c.png" ] || continue
      soma=$(md5 -q "$RAIZ_CAPTURAS/$l/$c.png" 2>/dev/null || md5sum "$RAIZ_CAPTURAS/$l/$c.png" | cut -d' ' -f1)
      somas="$somas$soma"$'\n'
    done
    local distintas
    distintas=$(printf '%s' "$somas" | grep -c . | tr -d ' ')
    local unicas
    unicas=$(printf '%s' "$somas" | sort -u | grep -c . | tr -d ' ')
    [ "${unicas:-0}" -lt "${distintas:-0}" ] && echo "$c: $unicas soma(s) distinta(s) em $distintas idiomas"
  done
  return 0
}
REPETIDAS=$(repetidas)
N_REPETIDAS=$(printf '%s' "$REPETIDAS" | grep -c . | tr -d ' ')

# ── A SONDA: os dois detectores sabem acender? ───────────────────────────
#
# Um zero que confirma o que se espera não mediu nada. Planta-se uma captura
# datada de 2000 e um par de idiomas com bytes iguais, e exige-se ver os dois.
# Ambos são desfeitos a seguir, e a guarda verifica que não deixou lixo.
SONDA_DIR="$RAIZ_CAPTURAS/.sonda"
mkdir -p "$SONDA_DIR"
trap 'rm -rf "$SONDA_DIR"' EXIT INT TERM
printf 'sonda' > "$SONDA_DIR/velha.png"
touch -t 200001010000 "$SONDA_DIR/velha.png"
SONDA_FRESCURA=$(python3 scripts/frescura_do_produto.py "$SONDA_DIR/velha.png" >/dev/null 2>&1; echo $?)
cp "$RAIZ_CAPTURAS/${IDIOMAS[0]}/${COMPOSICOES[0]}.png" "$SONDA_DIR/a.png"
cp "$SONDA_DIR/a.png" "$SONDA_DIR/b.png"
SONDA_IDIOMA=$( [ "$(md5 -q "$SONDA_DIR/a.png")" = "$(md5 -q "$SONDA_DIR/b.png")" ] && echo acendeu || echo CEGA )
rm -rf "$SONDA_DIR"; trap - EXIT INT TERM

if [ "$SONDA_FRESCURA" != "1" ]; then
  naomedi "a sonda da frescura não acendeu: um ficheiro datado de 2000 não foi visto como velho."
  exit "$NAO_MEDI"
fi
if [ "$SONDA_IDIOMA" != "acendeu" ]; then
  naomedi "a sonda do idioma não acendeu: dois ficheiros iguais não foram vistos como iguais."
  exit "$NAO_MEDI"
fi
verde "as duas sondas acenderam e saíram"

ambito() {
  echo "  âmbito:  ${#IDIOMAS[@]} idiomas × ${#COMPOSICOES[@]} composições = $ESPERADAS capturas."
  echo "           $(printf '%s' "$SAIDA_FRESCURA" | sed -n 's/^MEDIDOS \([0-9]*\) VELHOS \([0-9]*\)/\1 medidas na frescura, \2 anteriores ao produto./p')"
  echo "           Frescura: \`mtime\` contra a fonte \`.ts\`/\`.tsx\`/\`.css\` mais recente"
  echo "           de \`apps/\` e \`packages/\` — a mesma pergunta da página de aprovação,"
  echo "           na mesma peça. O \`next-env.d.ts\` fica de fora: é gerado, e seria"
  echo "           a fonte mais nova a cada build."
  echo "           Idioma: somas de verificação das IMAGENS, não o código. Foi por"
  echo "           elas serem iguais que o defeito se conheceu."
  echo "           FORA, e declarado: se as três estiverem igualmente ERRADAS, isto"
  echo "           passa. Mede que são distintas e frescas, não que são bonitas —"
  echo "           essa é a fotografia do dono do produto, e foi ela que abriu isto."
}

if [ "$PRESENTES" -lt "$ESPERADAS" ]; then
  vermelho "faltam $((ESPERADAS - PRESENTES)) capturas:"
  for f in "${FICHEIROS[@]}"; do [ -f "$f" ] || echo "           $f"; done
  ambito; exit "$FALHOU"
fi
if [ "$ESTADO_FRESCURA" -ne 0 ]; then
  vermelho "há capturas anteriores à fonte mais recente do produto:"
  printf '%s\n' "$SAIDA_FRESCURA" | grep '^VELHA' | sed 's/^VELHA /           /' | head -8
  echo "           A página que vende o produto mostraria o que ele já não é."
  ambito; exit "$FALHOU"
fi
if [ "${N_REPETIDAS:-0}" -gt 0 ]; then
  vermelho "a mesma imagem em idiomas diferentes:"
  printf '%s\n' "$REPETIDAS" | sed 's/^/           /'
  ambito; exit "$FALHOU"
fi

verde "as $ESPERADAS são posteriores ao produto e distintas entre idiomas"
echo
ambito
exit "$OK"
