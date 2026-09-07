#!/usr/bin/env bash
# ── O item aceso sai da ROTA, e não de uma posição escrita à mão ───────────
#
# O defeito apareceu QUATRO vezes: `activa: i === navegacao.length - 1` no layout
# da organização, `activa: true` na barra inferior, `activa: true` no layout da
# plataforma, e `activa: true` na barra inferior da plataforma. Nas três
# primeiras o `aria-current="page"` ia com ele: quem navega por leitor de ecrã
# era informado, em todas as páginas, de que estava noutro sítio.
#
# A cura foi o `EstruturaAdmin` derivar o activo do caminho **quando o chamador
# não diz nada**. E a quarta instância sobreviveu exactamente aí: na porta de
# fuga da própria cura. Uma excepção legítima é um sítio onde o defeito se
# esconde — as três corrigidas calaram-se, e a que ficou continuou a gritar.
#
# Esta guarda fecha a porta a quem não é o catálogo de desenho, que é o único
# que precisa de forçar (as ligações dele são `#` e não há rota que case).
#
# Três respostas:
#   OK (0)        ninguém força o item activo fora do catálogo de desenho
#   FALHOU (1)    alguém força — e o item aceso deixa de dizer onde se está
#   NÃO MEDI (2)  a varredura não encontrou o que devia, ou a sonda não acendeu
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "Alguém força o item activo do menu?"

CATALOGO='apps/web/app/[idioma]/interno/estruturas'
# Três armadilhas na primeira versão desta varredura, e as três deram falso:
#   1. o `[idioma]` do caminho é uma CLASSE DE CARACTERES no grep — a exclusão
#      do catálogo não excluía nada. `grep -vF` trata-o como texto.
#   2. `activa: boolean` numa declaração de TIPO não é passar `activa` a lado
#      nenhum. Só conta um valor literal.
#   3. apanhava os meus próprios COMENTÁRIOS a explicar a correcção. Um guarda
#      que lê comentários acusa quem documentou o que arranjou.
varrer() {
  grep -rn "activa: *\(true\|false\)" apps/web --include='*.tsx' 2>/dev/null \
    | grep -vF "$CATALOGO" \
    | grep -vE ':[0-9]+: *(//|\*|/\*)' \
    || true
}

# ── A SONDA primeiro: a varredura vê mesmo um `activa` forçado? ────────────
#
# Um zero aqui confirma o que se espera, e um zero que confirma o que se espera
# não mediu nada. Planta-se um e exige-se que apareça.
SONDA='apps/web/app/[idioma]/__sonda-menu__.tsx'
printf 'export const x = [{ href: "/a", rotulo: "a", activa: true }];\n' > "$SONDA"
VISTA=$(varrer | grep -c '__sonda-menu__' || true)
rm -f "$SONDA"
if [ "${VISTA:-0}" -eq 0 ]; then
  naomedi "a sonda não acendeu: um \`activa: true\` plantado não foi visto pela varredura."
  exit "$NAO_MEDI"
fi
if [ -e "$SONDA" ]; then
  naomedi "a sonda não foi removida — a guarda deixou lixo na árvore."
  exit "$NAO_MEDI"
fi
verde "a sonda acendeu e saiu: um \`activa\` forçado é visto"

FORCADOS=$(varrer)
N=$(printf '%s' "$FORCADOS" | grep -c . || true)

ambito() {
  echo "  âmbito:  varre \`apps/web/**/*.tsx\` à procura de quem passe \`activa\` ao menu."
  echo "           FORA, e por desenho: \`$CATALOGO\`, o catálogo"
  echo "           de desenho — as ligações dele são \`#\` e não há rota que case,"
  echo "           portanto forçar ali é a única maneira de mostrar o estado."
  echo "           E não mede a barra inferior do TELEMÓVEL em execução: partilha"
  echo "           a derivação mas é outro array, e essa fica por medir."
}

if [ "${N:-0}" -gt 0 ]; then
  vermelho "$N sítio(s) forçam o item activo em vez de o deixar sair da rota:"
  printf '%s\n' "$FORCADOS" | head -6 | sed 's/^/           /'
  ambito
  exit "$FALHOU"
fi

verde "ninguém força o item activo fora do catálogo de desenho"
echo
ambito
exit "$OK"
