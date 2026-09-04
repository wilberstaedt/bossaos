#!/usr/bin/env bash
#
# Uma tela não pode estar `validado` se a ETAPA dela ainda não foi validada.
#
# Nasceu a 04/09, de um caso real: as sete telas do E12 apareceram `validado` na
# cobertura enquanto o E12 estava «implementado aguardando validação» na matriz —
# e eu não tinha revisto nada. O medidor somou-as e eu reportei 30% com sete telas
# que ninguém assinou.
#
# **Não é um detector de culpa, é de estado.** A divisão do projecto tem uma razão:
# quem implementa não assina a própria revisão. Quando as duas fontes discordam, a
# que conta é a matriz — porque é lá que a assinatura do revisor vive.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas + 1)); }
ok()   { echo "  ok    $1"; }

analisar() { # $1 = ETAPAS.md, $2 = coverage.csv
  python3 - "$1" "$2" <<'PY'
import csv, re, sys

etapas = {}
for linha in open(sys.argv[1], encoding='utf-8'):
    m = re.match(r'\|\s*(E\d{2})\s*\|([^|]*)\|', linha)
    if m:
        etapas[m.group(1)] = re.sub(r'[*_`]', '', m.group(2)).strip().lower()

if len(etapas) < 30:
    print(f'LEITOR_CEGO {len(etapas)}')
    raise SystemExit(2)

maus = []
for l in csv.DictReader(open(sys.argv[2], encoding='utf-8-sig')):
    etapa = (l['etapa_principal'] or '').strip()
    if (l['status'] or '').strip().lower() != 'validado':
        continue
    estado = etapas.get(etapa)
    # Etapa fora da matriz nao se julga aqui - a validar-cobertura ja o faz.
    if estado is None:
        continue
    if estado != 'validado':
        maus.append(f"{l['id'].strip()} ({etapa} esta '{estado}')")

print(f'CONTAGENS {len(etapas)} {len(maus)}')
for m in maus[:12]:
    print(f'MAU {m}')
PY
}

echo "1. Nenhuma tela assinada antes da etapa dela"
saida=$(analisar docs/progress/ETAPAS.md docs/progress/coverage.csv)
if grep -q '^LEITOR_CEGO' <<<"$saida"; then
  erro "li poucas etapas na matriz - o leitor esta cego"
else
  read -r _ n_etapas n_maus <<<"$(grep '^CONTAGENS' <<<"$saida")"
  if [ "${n_maus:-0}" -gt 0 ]; then
    erro "$n_maus tela(s) marcadas validado com a etapa por validar:"
    grep '^MAU' <<<"$saida" | sed 's/^MAU /          /'
    echo "        Quem implementa nao assina a propria revisao. Ou a etapa e"
    echo "        validada pelo revisor, ou as telas voltam a aguardar."
  else
    ok "as telas validadas pertencem todas a etapas validadas ($n_etapas etapas lidas)"
  fi
fi

# ── controlo negativo ────────────────────────────────────────────────────────
# Numa COPIA, nunca nos ficheiros de trabalho: hoje ja reescrevi duas vezes
# estado que o JR estava a usar e so nao lhe comi trabalho por sorte.
echo
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cp docs/progress/ETAPAS.md "$TMP/etapas.md"
python3 - "$TMP" <<'PY'
import csv, pathlib, sys
d = pathlib.Path(sys.argv[1])
linhas = list(csv.DictReader(open('docs/progress/coverage.csv', encoding='utf-8-sig')))
campos = list(linhas[0].keys())
# Uma tela de uma etapa POR VALIDAR, marcada validado: tem de ser apanhada.
#
# A etapa escolhe-se DA MATRIZ, em vez de vir fixa no codigo. A primeira versao
# fixava E12, e no minuto em que validei o E12 o controlo passou a plantar uma
# sonda LEGITIMA - a guarda nao a acusava, e com razao, mas o controlo dizia que
# ela tinha falhado. Um controlo que depende de um facto que se move mede o
# calendario e nao a propriedade.
import re
etapas = {}
for linha in open('docs/progress/ETAPAS.md', encoding='utf-8'):
    m = re.match(r'\|\s*(E\d{2})\s*\|([^|]*)\|', linha)
    if m:
        etapas[m.group(1)] = re.sub(r'[*_`]', '', m.group(2)).strip().lower()
por_validar = next((e for e, s in sorted(etapas.items()) if e != 'E00' and s != 'validado'), None)
if por_validar is None:
    print('CONTAGENS 0 0')  # tudo validado: nao ha etapa para a sonda, e isso diz-se
    raise SystemExit(0)
alvo = next((l for l in linhas if (l['etapa_principal'] or '').strip() == por_validar), None)
if alvo is None:
    raise SystemExit(f'sem tela da {por_validar} para a sonda')
alvo = dict(alvo); alvo[campos[0]] = 'ZZZ-996'; alvo['status'] = 'validado'
with open(d / 'cobertura.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=campos); w.writeheader(); w.writerows(linhas + [alvo])
PY
if grep -q '^MAU ZZZ-996' <<<"$(analisar "$TMP/etapas.md" "$TMP/cobertura.csv")"; then
  ok "controlo negativo: apanha uma tela assinada antes da etapa"
else
  erro "CONTROLO NEGATIVO FALHOU: aceitou uma tela validada com a etapa por validar"
fi

echo
[ "$falhas" -eq 0 ] && echo "  Ninguem assinou a frente: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
