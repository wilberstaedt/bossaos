#!/usr/bin/env bash
#
# O preço tem UMA fonte: docs/bossaos/PRECIFICACAO.json, em cêntimos inteiros.
#
# Esta guarda existe porque a `validar-dinheiro.sh` não chega aqui: ela impede
# vírgula flutuante, e o perigo dos preços é outro — um INTEIRO ERRADO. 1583 e
# 1900 são ambos inteiros, e só um deles é o preço. Nenhuma regra de tipo
# distingue o equivalente mensal (apresentação) do valor cobrado.
#
# Escrita a 04/09, no dia em que os preços entraram no repositório e ANTES de
# existir uma tela que os mostre. Uma guarda que nasce sobre código limpo prova-se
# com um defeito plantado, em vez de ser calibrada contra os defeitos que já lá
# estão.
set -uo pipefail
cd "$(dirname "$0")/.."

FONTE="docs/bossaos/PRECIFICACAO.json"
# A vitrina de componentes demonstra formatação de moeda em três línguas. Ali um
# valor em euros É o conteúdo, não um preço.
VITRINA='app/\[idioma\]/interno/'

falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

echo "1. A fonte existe e continua em cêntimos inteiros"
python3 - "$FONTE" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding='utf-8'))
planos = d['planos']
assert len(planos) >= 3, f'so {len(planos)} planos - o leitor esta cego'
maus = []
for nome, p in planos.items():
    for campo, v in p.items():
        if v is None: continue
        if not isinstance(v, int) or isinstance(v, bool):
            maus.append(f'{nome}.{campo} = {v!r} ({type(v).__name__})')
if maus:
    print('NAO_INTEIRO ' + ' · '.join(maus)); raise SystemExit(1)
print(f'OK {len(planos)} planos, todos os valores inteiros')
PY
if [ $? -ne 0 ]; then
  erro "a fonte tem valores que não são inteiros de cêntimos"
else
  ok "$(python3 -c "import json;d=json.load(open('$FONTE'));print(len(d['planos']))") planos, valores em cêntimos inteiros"
fi

echo
echo "2. Nenhum preço escrito à mão numa tela"
achados=$(git ls-files 'apps/web/app/*.tsx' 'packages/ui/src/*.tsx' 2>/dev/null \
  | grep -vE "$VITRINA" \
  | xargs python3 scripts/sem-comentarios.py 2>/dev/null \
  | grep -E '€[[:space:]]*[0-9]|[0-9][[:space:]]*€|EUR[[:space:]]*[0-9]' || true)
if [ -n "$achados" ]; then
  erro "valor em euros escrito numa tela — o preço tem de vir de $FONTE:"
  printf '%s\n' "$achados" | head -5 | sed 's/^/          /'
else
  ok "nenhum valor em euros escrito à mão fora da vitrina"
fi

# ── controlo negativo ────────────────────────────────────────────────────────
# Duas sondas, uma de cada vez em ficheiros separados: a 04/09 pus duas no mesmo
# ficheiro noutra guarda e a primeira mascarou a segunda.
echo
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
c_falha=0

# (a) um preço plantado numa tela tem de ser apanhado
mkdir -p "$TMP/telas"
printf 'export const P = () => <p>Starter: €19 por mes</p>;\n' > "$TMP/telas/p.tsx"
if ! python3 scripts/sem-comentarios.py "$TMP/telas/p.tsx" 2>/dev/null \
   | grep -qE '€[[:space:]]*[0-9]'; then
  echo "  FALHA controlo: não viu um preço plantado numa tela"; c_falha=1
fi
# (b) uma tela sem preço não pode ser acusada
printf 'export const P = () => <p>{m.planos.titulo}</p>;\n' > "$TMP/telas/p.tsx"
if python3 scripts/sem-comentarios.py "$TMP/telas/p.tsx" 2>/dev/null \
   | grep -qE '€[[:space:]]*[0-9]'; then
  echo "  FALHA controlo: acusou uma tela sem preço nenhum"; c_falha=1
fi
# (c) a fonte com um valor decimal tem de reprovar
python3 - "$FONTE" "$TMP/fonte.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding='utf-8'))
primeiro = next(iter(d['planos']))
d['planos'][primeiro]['mensal'] = 19.00
json.dump(d, open(sys.argv[2], 'w', encoding='utf-8'))
PY
if python3 - "$TMP/fonte.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding='utf-8'))
for p in d['planos'].values():
    for v in p.values():
        if v is not None and (not isinstance(v, int) or isinstance(v, bool)):
            raise SystemExit(1)
raise SystemExit(0)
PY
then
  echo "  FALHA controlo: aceitou 19.00 na fonte, que é vírgula flutuante em dinheiro"; c_falha=1
fi

if [ "$c_falha" -eq 0 ]; then
  ok "controlo negativo: apanha preço na tela, não acusa tela sem preço, e reprova decimal na fonte"
else
  falhas=$((falhas+1))
fi

echo
[ "$falhas" -eq 0 ] && echo "  O preço tem uma fonte só: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
