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
# As cinco de secretária mais as três estreitas do telemóvel. Uma composição
# que entre no guião de captura e não entre aqui fica sem guarda nenhuma.
COMPOSICOES=(kds-cozinha-1280 sala-servico-1440 catalogo-1440 sala-tablet-834 carta-movel-390
             catalogo-estreito-390 sala-estreita-390 kds-estreito-390)

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

# ── 1 · FRESCURA, por CONTEÚDO e não por carimbo ──────────────────────────
#
# Isto comparava `mtime` de captura contra `mtime` de fonte. A 08/09 um
# formatador gravou dois ficheiros por cima com o **mesmo texto**, e esta guarda
# ficou vermelha com 24 de 24 «anteriores ao produto» — sobre imagens que não
# tinham nada de errado. **Uma guarda que grita lobo ensina a ignorá-la**, e esta
# protege as primeiras imagens que um comprador vê.
#
# A pergunta é de conteúdo: o `provar-demonstracao.sh` carimba no
# `composicoes.json`, no momento da captura, o resumo dos ficheiros de produto, e
# aqui recalcula-se e compara-se. Mesmo desenho da página de aprovação e mesma
# peça — e os quatro casos que o justificam estão exercidos no
# `scripts/provar-frescura-por-conteudo.sh`, incluindo a REVERSÃO, que é o caso
# que a regra por data de commit deixava passar.
#
# E o canário dos `mtime` sai DESTE caminho porque aqui já não há `mtime` — mas
# **não é apagado**: a `validar-provas-frescas.sh` ainda o consulta. Uma peça só
# fica obsoleta quando o ÚLTIMO caminho que a usa deixa de a usar.
MANIFESTO="docs/visual/rv100/2026-09-06_e953a87/evidence/demonstracao/composicoes.json"
if [ ! -s "$MANIFESTO" ]; then
  naomedi "não há $MANIFESTO — sem manifesto não há carimbo com que comparar."
  exit "$NAO_MEDI"
fi
SAIDA_FRESCURA=$(python3 scripts/frescura_do_produto.py --comparar "$MANIFESTO" 2>&1)
ESTADO_FRESCURA=$?
if [ "$ESTADO_FRESCURA" -eq 2 ]; then
  naomedi "este conjunto de capturas não tem carimbo do conteúdo do produto."
  echo "           Foi tirado antes de a frescura passar a medir conteúdo. Uma"
  echo "           recaptura resolve-o de vez."
  exit "$NAO_MEDI"
fi

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
# A sonda da frescura mudou de sujeito com a pergunta: já não se planta um
# ficheiro velho, porque a data deixou de decidir. Estraga-se UMA entrada da
# impressão guardada — só na cópia em memória, sem escrever no manifesto nem
# tocar no produto — e exige-se que a comparação acuse. Um comparador cego
# devolveria «igual» também aqui, e o verde da corrida normal não queria dizer
# nada.
SONDA_FRESCURA=$(python3 scripts/frescura_do_produto.py --comparar "$MANIFESTO" --sonda >/dev/null 2>&1; echo $?)
cp "$RAIZ_CAPTURAS/${IDIOMAS[0]}/${COMPOSICOES[0]}.png" "$SONDA_DIR/a.png"
cp "$SONDA_DIR/a.png" "$SONDA_DIR/b.png"
SONDA_IDIOMA=$( [ "$(md5 -q "$SONDA_DIR/a.png")" = "$(md5 -q "$SONDA_DIR/b.png")" ] && echo acendeu || echo CEGA )
rm -rf "$SONDA_DIR"; trap - EXIT INT TERM

if [ "$SONDA_FRESCURA" != "0" ]; then
  naomedi "a sonda da frescura não acendeu: uma impressão estragada não foi vista como diferente."
  exit "$NAO_MEDI"
fi
if [ "$SONDA_IDIOMA" != "acendeu" ]; then
  naomedi "a sonda do idioma não acendeu: dois ficheiros iguais não foram vistos como iguais."
  exit "$NAO_MEDI"
fi
verde "as duas sondas acenderam e saíram"

ambito() {
  echo "  âmbito:  ${#IDIOMAS[@]} idiomas × ${#COMPOSICOES[@]} composições = $ESPERADAS capturas."
  echo "           Frescura: RESUMO DO CONTEÚDO dos ficheiros \`.ts\`/\`.tsx\`/\`.css\` de"
  echo "           \`apps/\` e \`packages/\`, carimbado no momento da captura e recalculado"
  echo "           aqui — a mesma pergunta da página de aprovação, na mesma peça. O"
  echo "           \`next-env.d.ts\` fica de fora: é gerado."
  echo "           NÃO se mede tempo: gravar por cima com o mesmo texto passa, e uma"
  echo "           REVERSÃO recusa. As duas coisas estão exercidas no"
  echo "           \`provar-frescura-por-conteudo.sh\`."
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
if [ "$ESTADO_FRESCURA" -eq 1 ]; then
  vermelho "o produto MUDOU desde que estas capturas foram tiradas:"
  # O comparador nomeia. Uma recusa que só diz «está velho» manda procurar às
  # cegas — e, quando a causa era uma data a mexer, mandava gastar um build.
  printf '%s\n' "$SAIDA_FRESCURA" | sed 's/^/           /' | head -8
  echo "           Isto NÃO é uma data a mexer: é o conteúdo a ser outro."
  echo "           A página que vende o produto mostraria o que ele já não é."
  ambito; exit "$FALHOU"
fi
if [ "${N_REPETIDAS:-0}" -gt 0 ]; then
  vermelho "a mesma imagem em idiomas diferentes:"
  printf '%s\n' "$REPETIDAS" | sed 's/^/           /'
  ambito; exit "$FALHOU"
fi

verde "as $ESPERADAS mostram o produto de agora e são distintas entre idiomas"
echo
ambito
exit "$OK"
