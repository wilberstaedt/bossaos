#!/usr/bin/env bash
# As tres linguas tem de ter as MESMAS chaves, e o silencio nao pode escondê-lo.
#
# Aceite 4 do E34 pede ES/PT/EN. Medido a 06/09: 2343 chaves em cada um dos tres
# catalogos, zero em falta, zero a mais.
#
# PORQUE E' QUE ISTO PRECISA DE GUARDA E NAO CHEGA A MEDICAO: o `tradutor()` cai
# para espanhol quando a chave falta - e cai DE PROPOSITO, porque um ecra com
# `estado.carga.titulo` escrito no meio e' pior do que um ecra em espanhol. E a
# escolha esta certa. Mas torna a falta INVISIVEL: ninguem ve um erro, ve um
# pedaco de espanhol no meio do ingles e assume que e' assim.
#
# E ha um caminho pior: `mensagensDe(idioma)` devolve o catalogo CRU, sem recurso
# nenhum. Uma chave em falta ali nao cai para espanhol - da `undefined`, que
# renderiza NADA. O ecra fica com um buraco silencioso.
#
# O QUE ESTA GUARDA NAO PROMETE: que o texto esteja bem traduzido. Mede chaves,
# nao qualidade. O que consegue dizer e' quantos textos sao IDENTICOS ao espanhol,
# e ate isso com cuidado - 344 dos 360 identicos em pt-BR tem uma ou duas palavras
# e sao cognatos legitimos ("Total", "Menu", nomes proprios). Os de tres ou mais
# palavras sao os que valem a pena olhar, e a 06/09 os 16 estavam todos certos
# ("Catalogo de componentes", "Rubik / Noto Sans").
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro() { printf '  FALHA %s\n' "$1"; falhas=$((falhas+1)); }

medir() { python3 - "$1" <<'PY'
import json, io, sys, os
raiz = sys.argv[1]
def folhas(o, p=''):
    r = {}
    if isinstance(o, dict):
        for k, v in o.items(): r.update(folhas(v, f'{p}{k}.' if p else f'{k}.'))
    elif isinstance(o, str): r[p[:-1]] = o
    return r
try:
    d = {n: folhas(json.load(io.open(os.path.join(raiz, n + '.json'), encoding='utf-8')))
         for n in ('es-ES','pt-BR','en')}
except Exception as e:
    print('ILEGIVEL', e); raise SystemExit(0)
es = set(d['es-ES'])
print('BASE', len(es))
for n in ('pt-BR','en'):
    o = set(d[n])
    longas = sum(1 for k in (es & o) if d[n][k] == d['es-ES'][k] and len(d[n][k].split()) >= 3)
    print('IDIOMA', n, len(o), len(es - o), len(o - es), longas)
    for k in sorted(es - o)[:5]: print('  FALTA', n, k)
    for k in sorted(o - es)[:5]: print('  EXTRA', n, k)
PY
}

DIC=packages/i18n/src/mensagens
[ -d "$DIC" ] || { echo "  NAO MEDI $DIC nao existe"; exit 2; }

# ── As sondas: o detector tem de ver a falta E o equilibrio ─────────────────
S=$(mktemp -d); trap 'rm -rf "$S"' EXIT
mkdir -p "$S/limpo" "$S/partido"
cp "$DIC"/es-ES.json "$DIC"/pt-BR.json "$DIC"/en.json "$S/limpo/"
cp "$DIC"/es-ES.json "$DIC"/pt-BR.json "$DIC"/en.json "$S/partido/"
python3 - "$S/partido/en.json" <<'PY'
import json, io, sys
p = sys.argv[1]; d = json.load(io.open(p, encoding='utf-8'))
# tira UMA folha, a primeira que encontrar, para o detector ter o que apanhar
def tirar(o):
    for k, v in list(o.items()):
        if isinstance(v, str): del o[k]; return True
        if isinstance(v, dict) and tirar(v): return True
    return False
tirar(d)
json.dump(d, io.open(p, 'w', encoding='utf-8'), ensure_ascii=False)
PY
f_limpo=$(medir "$S/limpo" | awk '$1=="IDIOMA"{s+=$4} END{print s+0}')
f_part=$(medir "$S/partido" | awk '$1=="IDIOMA"{s+=$4} END{print s+0}')
if [ "$f_limpo" -eq 0 ] && [ "$f_part" -eq 1 ]; then
  echo "  ok    o detector ve a chave tirada e nao inventa faltas no catalogo intacto"
else
  printf '  NAO MEDI o detector viu %s faltas no intacto e %s no partido, e devia ver 0 e 1\n' "$f_limpo" "$f_part"; exit 2
fi

# ── A medicao ───────────────────────────────────────────────────────────────
saida=$(medir "$DIC")
base=$(printf '%s\n' "$saida" | awk '$1=="BASE"{print $2}')
[ "${base:-0}" -gt 500 ] || { printf '  NAO MEDI so %s chaves em es-ES — o achatador esta cego\n' "${base:-0}"; exit 2; }
echo "  ok    $base chaves em es-ES, que e' a fonte da verdade"

printf '%s\n' "$saida" | awk '$1=="IDIOMA"' | while read -r _ nome n falta extra longas; do
  if [ "$falta" -eq 0 ] && [ "$extra" -eq 0 ]; then
    printf '  ok    %-6s %s chaves, nenhuma em falta nem a mais  (%s textos de 3+ palavras iguais ao espanhol)\n' "$nome" "$n" "$longas"
  else
    printf '  FALHA %s tem %s chave(s) em FALTA e %s a mais\n' "$nome" "$falta" "$extra"
  fi
done
printf '%s\n' "$saida" | grep -E '^  (FALTA|EXTRA)' | sed 's/^  /           /'
if printf '%s\n' "$saida" | awk '$1=="IDIOMA" && ($4>0 || $5>0){e=1} END{exit !e}'; then
  falhas=$((falhas+1))
  echo "        Uma chave em falta NAO da erro: o tradutor cai para espanhol, e o"
  echo "        mensagensDe() da undefined, que renderiza NADA. E' invisivel nos dois."
fi

[ "$falhas" -eq 0 ] && { echo "OK"; exit 0; }
echo "FALHOU: $falhas"; exit 1
