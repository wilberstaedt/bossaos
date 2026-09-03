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
# A frase EXACTA, e não a palavra. A 04/09 o padrão largo casou "móvel" dentro de
# uma nota minha que dizia "esta tela NUNCA foi renderizada... ver DIVIDA-MOVEL.txt",
# e classificou cinco telas por medir como medidas. Um detector que casa a palavra
# num texto que afirma o CONTRÁRIO é a mesma família do grep que acusava parseFloat
# dentro do comentário a explicar que não se usa parseFloat.
#
# "móvel medido" é uma afirmação que alguém teve de escrever de propósito. Uma
# menção não é uma medição.
PROVA = re.compile(r'm[oó]vel\s+medido', re.I)

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
    # Sair da dívida tem DUAS causas e elas não são a mesma coisa: ou a tela foi
    # medida, ou deixou de estar assinada como validada. A primeira é progresso;
    # a segunda é uma retirada de assinatura e a tela continua por medir. Dizer
    # só "podem sair" convidava a apagar a linha e a perder o rasto de uma tela
    # que ninguém mediu — que é exactamente como uma dívida desaparece sem ser paga.
    por_estado = {}
    for l in csv.DictReader(open(cobertura, encoding='utf-8-sig')):
        por_estado[l['id'].strip()] = ((l['status'] or '').strip().lower(),
                                       PROVA.search(l['evidencia'] or '') is not None)
    medidos    = [i for i in saiu if por_estado.get(i, ('', False))[1]]
    retirados  = [i for i in saiu if not por_estado.get(i, ('', False))[1]]
    if medidos:
        print(f"PAGAS: {len(medidos)} foram medidas e podem sair da dívida: {', '.join(sorted(medidos)[:8])}")
    if retirados:
        print(f"NÃO PAGAS: {len(retirados)} saíram por a assinatura ter sido RETIRADA, não por medição —")
        print(f"           continuam por medir e a linha fica: {', '.join(sorted(retirados)[:8])}")
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
cp "$DIVIDA" "$TMP/divida.txt" 2>/dev/null || : > "$TMP/divida.txt"

# UMA sonda de cada vez, e a razao e um erro de 04/09: pus as duas no mesmo
# ficheiro e a primeira fazia a guarda falhar sozinha, MASCARANDO a segunda - o
# controlo passava com o detector partido. Uma sonda que tapa outra e um controlo
# que mede a sonda mais facil e nao a propriedade.
sondar() {
  python3 -c '
import csv, sys
origem, destino, ident, evidencia = sys.argv[1:5]
linhas = list(csv.DictReader(open(origem, encoding="utf-8-sig")))
campos = list(linhas[0].keys())
falso = dict.fromkeys(campos, "")
falso[campos[0]] = ident
falso["status"] = "validado"
falso["mobile"] = "obrigatorio/adaptado a superficie"
falso["evidencia"] = evidencia
with open(destino, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=campos)
    w.writeheader(); w.writerows(linhas + [falso])
' "$COBERTURA" "$TMP/falso.csv" "$1" "$2"
  if analisar "$TMP/falso.csv" "$TMP/divida.txt" >/dev/null 2>&1; then
    echo "CONTROLO NEGATIVO FALHOU: $3" >&2
    exit 1
  fi
}

sondar 'ZZZ-999' 'medido apenas em desktop' \
  'a guarda aceitou um ID validado sem prova de movel.'

# Esta tranca o defeito de 04/09: uma evidencia que MENCIONA o movel sem o ter
# medido. Foi assim que uma nota minha a dizer "esta tela NUNCA foi renderizada,
# ver DIVIDA-MOVEL.txt" passou por prova de movel. Mencao nao e medicao.
sondar 'ZZZ-998' 'assinatura retirada; nunca renderizada - ver docs/progress/DIVIDA-MOVEL.txt' \
  'uma evidencia que so MENCIONA movel passou por medicao.'

echo "── controlo negativo: reprova um validado sem prova de móvel, como tem de reprovar"
