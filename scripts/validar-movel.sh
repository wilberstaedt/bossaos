#!/usr/bin/env bash
#
# O móvel é obrigatório no atlas para todas as telas até ao marco, e foi assinado
# sem prova em 66 delas. Esta guarda NÃO conserta isso — congela-o.
#
# Regra: um ID `validado` cujo atlas diga que o móvel é obrigatório tem de trazer
# evidência que mencione o móvel. Os que já estão assinados sem ela vivem numa
# lista de dívida DECLARADA. Qualquer ID novo nessas condições reprova.
#
# É o padrão de sempre: a dívida existente fica visível e contada, e a dívida
# nova não entra. Sem a lista, a guarda reprovaria 66 vezes e seria desligada na
# primeira hora — que é como as guardas morrem.
set -euo pipefail
cd "$(dirname "$0")/.."

COBERTURA=docs/progress/coverage.csv
DIVIDA=docs/progress/DIVIDA-MOVEL.txt

analisar() {
  python3 - "$1" "$2" <<'PY'
import csv, re, sys, pathlib
cobertura, divida = sys.argv[1], sys.argv[2]

declarados = set()
p = pathlib.Path(divida)
if p.exists():
    for l in p.read_text(encoding='utf-8').splitlines():
        l = l.split('#', 1)[0].strip()
        if l:
            declarados.add(l)

# O que conta como prova de móvel: a evidência dizê-lo. Não basta a rota existir
# na inspecção — a inspecção mede larguras de páginas, e quem assinou tem de
# afirmar que mediu ESTA tela.
PROVA = re.compile(r'm[oó]vel|mobile|largura|360|390', re.I)

em_falta, cobertos = [], 0
for l in csv.DictReader(open(cobertura, encoding='utf-8-sig')):
    if (l['status'] or '').strip().lower() != 'validado':
        continue
    if 'obrigat' not in (l['mobile'] or '').lower():
        continue
    if PROVA.search(l['evidencia'] or ''):
        cobertos += 1
        continue
    em_falta.append((l['﻿id'] if '﻿id' in l else l['id']).strip())

novos = [i for i in em_falta if i not in declarados]
saiu  = [i for i in declarados if i not in em_falta]

print(f"validados com móvel obrigatório e prova de móvel: {cobertos}")
print(f"validados sem prova de móvel: {len(em_falta)} (declarados: {len(declarados)})")
if saiu:
    print(f"NOTA: {len(saiu)} já não estão em falta e podem sair da dívida: {', '.join(sorted(saiu)[:8])}")
if novos:
    print()
    print(f"REPROVA: {len(novos)} ID(s) assinados como validado sem prova de móvel e sem estarem na dívida declarada:")
    for i in sorted(novos):
        print(f"  - {i}")
    print()
    print("Ou se mede o móvel e se escreve na evidência, ou se declara em docs/progress/DIVIDA-MOVEL.txt")
    print("com o motivo. Declarar é honesto; assinar em silêncio não é.")
    sys.exit(1)
PY
}

echo "── móvel: dívida congelada, dívida nova reprovada"
analisar "$COBERTURA" "$DIVIDA"

# ---- controlo negativo -------------------------------------------------------
# Uma guarda que nunca reprovou não se sabe se reprova. Injecta-se um ID validado,
# com móvel obrigatório e sem prova, fora da lista de dívida: tem de falhar.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
python3 - "$COBERTURA" "$TMP/falso.csv" <<'PY'
import csv, sys
origem, destino = sys.argv[1], sys.argv[2]
linhas = list(csv.DictReader(open(origem, encoding='utf-8-sig')))
campos = list(linhas[0].keys())
falso = dict.fromkeys(campos, '')
chave_id = campos[0]
falso[chave_id] = 'ZZZ-999'
falso['status'] = 'validado'
falso['mobile'] = 'obrigatório/adaptado à superfície'
falso['evidencia'] = 'medido apenas em desktop'
with open(destino, 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=campos)
    w.writeheader(); w.writerows(linhas + [falso])
PY
cp "$DIVIDA" "$TMP/divida.txt" 2>/dev/null || : > "$TMP/divida.txt"
if analisar "$TMP/falso.csv" "$TMP/divida.txt" >/dev/null 2>&1; then
  echo "CONTROLO NEGATIVO FALHOU: a guarda aceitou um ID validado sem prova de móvel." >&2
  exit 1
fi
echo "── controlo negativo: reprova um validado sem prova de móvel, como tem de reprovar"
