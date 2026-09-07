#!/usr/bin/env bash
# ── Um rótulo, duas fendas ─────────────────────────────────────────────────
#
# `publicoE09.buscar` era «¿Qué te apetece?» e servia de TRÊS coisas na carta
# pública: a sugestão do campo, o rótulo do botão ao lado, e o nome da secção de
# resultados. O campo diz *o que se procura* e o botão diz *o que faz* — a mesma
# palavra serve mal aos dois, e um botão que pergunta não diz o que acontece se
# lhe carregarem.
#
# Isto apanha o PAR: a mesma chave usada como `placeholder` e, no mesmo ficheiro,
# como texto de um `<button>`. É a classe, e não a instância — a régua pediu-a
# assim, e uma instância corrigida deixa a próxima por corrigir.
#
# Três respostas:
#   OK (0)        nenhuma chave serve de sugestão e de acção ao mesmo tempo
#   FALHOU (1)    há pelo menos uma a servir as duas
#   NÃO MEDI (2)  a varredura não vê o que devia — sonda cega
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "Algum rótulo serve de sugestão e de acção ao mesmo tempo?"

analisar() { python3 - "$@" <<'PY'
import os, re, sys

alvo = sys.argv[1] if len(sys.argv) > 1 else 'apps/web'
pares = []
ficheiros = 0
for base, _, nomes in os.walk(alvo):
    if 'node_modules' in base:
        continue
    for nome in nomes:
        if not nome.endswith('.tsx'):
            continue
        caminho = os.path.join(base, nome)
        try:
            t = open(caminho, encoding='utf-8').read()
        except OSError:
            continue
        ficheiros += 1
        # `placeholder={x.y}` — a sugestão do campo.
        sugestoes = set(re.findall(r'placeholder=\{([\w.]+)\}', t))
        if not sugestoes:
            continue
        # `<button …>{x.y}</button>` — o rótulo da acção. Sem `.*?` guloso: o
        # botão pode ter atributos, mas o filho é o texto imediato.
        accoes = set(re.findall(r'<button[^>]*>\{([\w.]+)\}</button>', t))
        for k in sorted(sugestoes & accoes):
            pares.append(f'{caminho}  «{k}» é sugestão do campo E rótulo do botão')

print(f'FICHEIROS {ficheiros}')
for p in pares:
    print(f'PAR {p}')
PY
}

# ── A SONDA: a varredura vê mesmo um par? ─────────────────────────────────
#
# Um zero que confirma o que se espera não mediu nada. Planta-se o par e
# exige-se que apareça.
SONDA='apps/web/app/__sonda-fenda__.tsx'
cat > "$SONDA" <<'TSX'
export const X = () => (<><input placeholder={c.sonda} /><button type="button">{c.sonda}</button></>);
TSX
VISTA=$(analisar | grep -c '__sonda-fenda__' || true)
rm -f "$SONDA"
if [ "${VISTA:-0}" -eq 0 ]; then
  naomedi "a sonda não acendeu: um par plantado não foi visto pela varredura."
  exit "$NAO_MEDI"
fi
verde "a sonda acendeu e saiu: um rótulo em duas fendas é visto"

RELATORIO=$(analisar)
N_FICHEIROS=$(sed -n 's/^FICHEIROS \([0-9]*\)$/\1/p' <<<"$RELATORIO")
PARES=$(grep '^PAR ' <<<"$RELATORIO" || true)
N=$(printf '%s' "$PARES" | grep -c . || true)

if [ "${N_FICHEIROS:-0}" -eq 0 ]; then
  naomedi "zero ficheiros lidos — a varredura não encontrou o que ler."
  exit "$NAO_MEDI"
fi

ambito() {
  echo "  âmbito:  $N_FICHEIROS ficheiros \`.tsx\` em \`apps/web\`."
  echo "           Apanha a chave que é \`placeholder\` E rótulo de \`<button>\` no MESMO"
  echo "           ficheiro. NÃO apanha o rótulo repartido por ficheiros diferentes,"
  echo "           nem o mesmo texto escrito duas vezes à mão em vez de vir de uma"
  echo "           chave — essas ficam por medir, e ficam ditas."
}

if [ "${N:-0}" -gt 0 ]; then
  vermelho "$N rótulo(s) a servir duas fendas:"
  sed 's/^PAR /           /' <<<"$PARES" | head -6
  ambito
  exit "$FALHOU"
fi

verde "nenhuma chave serve de sugestão e de acção ao mesmo tempo"
echo
ambito
exit "$OK"
