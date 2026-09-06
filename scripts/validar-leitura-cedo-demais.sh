#!/usr/bin/env bash
# Um valor lido no corpo do `describe` congela vazio e nunca mais muda.
#
# 06/09. O JR encontrou-o dentro do proprio codigo dele: o `cookieOperador` da
# J15 estava congelado na cadeia vazia. O corpo do `describe` corre na RECOLHA,
# antes de o `before` correr - a constante capturava o valor de antes da sessao
# existir, e todos os pedidos do suporte iam sem cookie. Medido: 401 em vez de
# 201, com a jornada a ACUSAR O PRODUTO de recusar quem tinha acesso.
#
# E o que faz esta armadilha valer uma guarda: o defeito nao aparece como defeito.
# Aparece como uma suite a dizer que o produto esta partido. Passamos a tarde
# inteira a caçar exactamente esta forma noutro sitio.
#
# A DISTINCAO QUE DEFINE A CLASSE: `const x = feito.y` le AGORA e congela.
# `const f = () => feito.y` le QUANDO FOR CHAMADA, e essa esta certa. Um detector
# que nao distinga as duas acusa metade do ficheiro.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro() { printf '  FALHA %s\n' "$1"; falhas=$((falhas+1)); }

varrer() { python3 - "$@" <<'PY'
import io, re, sys
FUNC  = re.compile(r'^\s*(async\s*)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|^\s*(async\s+)?function\b')
# Sem ancora de inicio de linha, de proposito: a primeira versao so via atribuicoes
# no comeco da linha e o autoteste apanhou-a - um `before(async () => { x = 1; })`
# de UMA linha nao casava, e o detector dava zero com um defeito a frente dele.
ATRIB = re.compile(r'(?<![=!<>])\b(?:([A-Za-z_$][\w$]*)|\w+\.([A-Za-z_$][\w$]*))\s*=(?![=>])')
def varre(linhas):
    dentro=False; prof=0; atribuidos=set(); achados=[]
    for l in linhas:
        if re.search(r'\b(before|beforeAll|beforeEach)\s*\(', l): dentro=True; prof=0
        if dentro:
            for m in ATRIB.finditer(l):
                n = m.group(1) or m.group(2)
                if n: atribuidos.add(n)
            prof += l.count('{') - l.count('}')
            if prof <= 0 and '}' in l: dentro=False
    emdescribe=False
    for i,l in enumerate(linhas,1):
        if re.match(r'^describe\(', l): emdescribe=True; continue
        if re.match(r'^\}\)', l): emdescribe=False; continue
        if not emdescribe: continue
        m = re.match(r'^  (const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+)$', l)
        if not m: continue
        ini = m.group(3)
        if FUNC.match(ini): continue
        if re.match(r'^\s*(\{|\[|[\'"`]|\d|null|true|false|new )', ini): continue
        if set(re.findall(r'\b([A-Za-z_$][\w$]*)\b', ini)) & atribuidos:
            achados.append((i, m.group(2), ini.strip()[:56]))
    return achados
for f in sys.argv[1:]:
    try: linhas = io.open(f, encoding='utf-8').read().splitlines()
    except Exception: continue
    for i, nome, ini in varre(linhas):
        print('CONGELA %s:%d %s | %s' % (f, i, nome, ini))
PY
}

# ── As sondas, antes de julgar ──────────────────────────────────────────────
S=$(mktemp -d); trap 'rm -rf "$S"' EXIT
cat > "$S/mau.ts" <<'SONDA'
describe('x', () => {
  const cookieOperador = sessao.cookie;
  const feitoAgora = feito.locationId;
  const ler = async () => sessao.cookie;
  before(async () => { sessao = await entrar(); feito.locationId = '1'; });
});
SONDA
cat > "$S/bom.ts" <<'SONDA'
describe('x', () => {
  const constante = 'texto';
  const f = () => outra.coisa;
  before(async () => { outra = 1; });
});
SONDA
mau=$(varrer "$S/mau.ts" | grep -c '^CONGELA' || true)
bom=$(varrer "$S/bom.ts" | grep -c '^CONGELA' || true)
if [ "$mau" -ne 2 ]; then
  printf '  NAO MEDI o controlo positivo deu %s de 2 — o detector nao ve o defeito que existe para ver\n' "$mau"; exit 2
fi
if [ "$bom" -ne 0 ]; then
  printf '  NAO MEDI o controlo negativo acendeu %s vezes — o detector acusa uma funcao, que le quando e chamada\n' "$bom"; exit 2
fi
echo "  ok    o detector ve os dois que congelam e salta a funcao que nao congela"

# ── A varredura ─────────────────────────────────────────────────────────────
ficheiros=$(git ls-files 'provas/*.test.ts' 'inspeccao/*.spec.ts')
n=$(printf '%s\n' "$ficheiros" | grep -c . || true)
[ "$n" -gt 10 ] || { printf '  NAO MEDI so %s ficheiros de prova alcancados\n' "$n"; exit 2; }
echo "  ok    $n ficheiros de prova varridos"

saida=$(varrer $(printf '%s ' $ficheiros))
achados=$(printf '%s\n' "$saida" | grep -c '^CONGELA' || true)
if [ "$achados" -gt 0 ]; then
  erro "$achados valor(es) lido(s) no corpo do describe, que correm na RECOLHA:"
  printf '%s\n' "$saida" | grep '^CONGELA' | sed 's/^CONGELA /           /'
  echo "        Isto congela o valor de ANTES do before. O sintoma nao e' um erro:"
  echo "        e' a suite a acusar o produto de recusar quem tinha acesso."
  echo "        Move para dentro do it, ou embrulha numa funcao que le quando corre."
fi

[ "$falhas" -eq 0 ] && { echo "OK"; exit 0; }
echo "FALHOU: $falhas"; exit 1
