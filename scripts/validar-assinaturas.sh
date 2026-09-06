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
# ── A sonda passou a ser SINTETICA, e foi por ter ficado sem materia-prima ──
#
# A primeira versao fixava a etapa E12 no codigo, e no minuto em que o E12 foi
# validado o controlo passou a plantar uma sonda LEGITIMA. A segunda escolhia a
# primeira etapa por validar DA MATRIZ — melhor, e ainda dependente do
# repositorio conter uma.
#
# A 06/09 ficou sem nenhuma: com 36 etapas e o atlas fechado, a primeira por
# validar era a E34, que **nao tem telas**. O `sem tela da E34 para a sonda`
# saiu, o CSV nunca chegou a ser escrito, e o controlo reportou que o produto
# tinha falhado — quando quem tinha falhado era ele.
#
# Um controlo que precisa que o defeito JA EXISTA no repositorio para de
# funcionar exactamente quando tudo fica pronto. Agora inventa as duas coisas:
# uma etapa que nao existe e uma tela dela. Nao depende de nada que se mova.
import re

# A leitura da matriz — precisa dela para escolher a etapa VALIDADA da sonda boa.
etapas = {}
for linha in open('docs/progress/ETAPAS.md', encoding='utf-8'):
    m = re.match(r'\|\s*(E\d{2})\s*\|([^|]*)\|', linha)
    if m:
        etapas[m.group(1)] = re.sub(r'[*_`]', '', m.group(2)).strip().lower()

campos_etapa = 'E99'

# A etapa sintetica entra na COPIA da matriz, por validar.
copia = d / 'etapas.md'
texto = copia.read_text(encoding='utf-8')
copia.write_text(texto.rstrip() + f"\n| {campos_etapa} | planejado |  |\n", encoding='utf-8')

modelo = dict(linhas[0])

# ── A SONDA MA: tem de ser apanhada ──────────────────────────────────────
ma = dict(modelo)
ma[campos[0]] = 'ZZZ-996'
ma['etapa_principal'] = campos_etapa
ma['status'] = 'validado'

# ── E A SONDA BOA, que TEM de passar ─────────────────────────────────────
#
# Sem ela, uma leitura que acusasse TUDO passava o controlo — e o guarda-costas
# do guarda-costas seria o proximo a nao existir. E a regra que o senior fixou a
# 06/09: escreve-se sempre a sonda que tem de passar ao lado das que devem
# falhar.
#
# Aponta a uma etapa VALIDADA da matriz, e por isso e legitima.
validada = next((e for e, st in sorted(etapas.items()) if st == 'validado'), None)
if validada is None:
    raise SystemExit('nao ha etapa validada nenhuma: o controlo nao consegue montar a sonda boa')
boa = dict(modelo)
boa[campos[0]] = 'ZZZ-997'
boa['etapa_principal'] = validada
boa['status'] = 'validado'

with open(d / 'cobertura.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=campos); w.writeheader(); w.writerows(linhas + [ma, boa])
PY
SAIDA_DA_SONDA="$(analisar "$TMP/etapas.md" "$TMP/cobertura.csv")"
if ! grep -q '^MAU ZZZ-996' <<<"$SAIDA_DA_SONDA"; then
  erro "CONTROLO NEGATIVO FALHOU: aceitou uma tela validada com a etapa por validar"
elif grep -q '^MAU ZZZ-997' <<<"$SAIDA_DA_SONDA"; then
  # A metade que faltava. Uma leitura que acuse tudo apanha a sonda ma por
  # acidente, e o controlo dava-se por satisfeito.
  erro "CONTROLO NEGATIVO FALHOU: acusou a sonda LEGITIMA — a leitura reprova tudo"
else
  ok "controlo negativo: apanha a assinada antes da etapa e NAO acusa a legitima"
fi

echo
[ "$falhas" -eq 0 ] && echo "  Ninguem assinou a frente: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
