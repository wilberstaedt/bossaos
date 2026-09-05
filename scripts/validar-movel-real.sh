#!/usr/bin/env bash
#
# A frase "MÓVEL MEDIDO" na evidência é uma ALEGAÇÃO. Esta guarda cruza-a com o
# instrumento: o ID tem de aparecer numa inspecção de navegador que o meça mesmo.
#
# Porque existe: a `validar-movel.sh` aceita a frase, e a lição de 04/09 —
# repetida em sete guardas — é que prosa que nós próprios escrevemos não é uma
# verificação. Sem este cruzamento, pagar a dívida de móvel era escrever seis
# palavras na coluna certa.
#
# E nasceu de um erro meu no mesmo dia: a primeira versão deste cruzamento usava
# `[A-Z]{3,6}-[0-9]{3}` e não via `QR-001`, que tem DUAS letras. Acusei três telas
# de alegação sem prova quando estavam medidas, cada uma com marcador próprio. Foi
# preciso ir ler o spec para o descobrir - e é por isso que as isenções abaixo são
# DECLARADAS uma a uma, e não um padrão largo que me poupe o trabalho de olhar.
set -uo pipefail
cd "$(dirname "$0")/.."

# Isenções, com motivo. Cada linha é "ID:motivo", e sai daqui quem ganhar tela própria.
ISENTOS="$(cat <<'FIM'
STATE-001:componente de estado, sem rota própria; renderiza na secção de estados do catálogo, que é inspeccionada às cinco larguras
STATE-002:idem STATE-001
STATE-003:idem STATE-001
STATE-005:idem STATE-001
STATE-007:idem STATE-001
STATE-016:idem STATE-001
PUB-002:é a mesma rota da carta pública do E09, medida em inspeccao/publico.spec.ts — a evidência nomeia o ficheiro
FIM
)"

falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

analisar() {
  python3 - "$1" <<'PY'
import csv, pathlib, re, sys
PROVA = re.compile(r'm[oó]vel\s+medido', re.I)
isentos = {}
for linha in sys.argv[1].splitlines():
    if ':' in linha:
        i, m = linha.split(':', 1)
        isentos[i.strip()] = m.strip()

alega = {l['id'].strip() for l in csv.DictReader(
    open('docs/progress/coverage.csv', encoding='utf-8-sig')) if PROVA.search(l['evidencia'] or '')}

# So contam os specs que MEDEM LARGURA. A primeira versao juntava os 30 ficheiros
# num so texto e perguntava se o ID aparecia nesse bolo - ou seja, aceitava um ID
# citado num spec que so verifica permissoes como prova de que o movel foi medido.
# Verificado a 05/09: hoje os 30 medem todos, portanto o buraco nao tem vitimas.
# Fecha-se por ser latente, nao por ter mordido - a proxima inspeccao escrita sem
# larguras abriria a porta em silencio, e o silencio e o que custa a ver depois.
MEDE = re.compile(r'LARGURAS|transbordaNaHorizontal|elementosForaDoEcra|setViewportSize|viewport')
todos = list(pathlib.Path('inspeccao').glob('*.spec.ts'))
specs = [q for q in todos if MEDE.search(q.read_text(encoding='utf-8'))]
if len(specs) < 3:
    print(f'LEITOR_CEGO {len(specs)}'); raise SystemExit(2)
texto = ''.join(q.read_text(encoding='utf-8') for q in specs)
# DUAS letras no mínimo: `QR-001` existe e a primeira versão desta guarda não o via.
nomeados = set(re.findall(r'\b[A-Z]{2,8}-[0-9]{3}\b', texto))

orfaos = sorted(i for i in alega - nomeados if i not in isentos)
print(f'CONTAGENS {len(alega)} {len(nomeados)} {len(isentos)}')
for i in orfaos:
    print(f'ORFAO {i}')
PY
}

echo "1. Quem alega móvel medido aparece numa inspecção?"
saida=$(analisar "$ISENTOS")
if grep -q '^LEITOR_CEGO' <<<"$saida"; then
  erro "não encontrei ficheiros de inspecção - o leitor está cego"
else
  read -r _ n_alega n_spec n_isentos <<<"$(grep '^CONTAGENS' <<<"$saida")"
  n_orfaos=$(grep -c '^ORFAO' <<<"$saida" || true)
  if [ "${n_orfaos:-0}" -gt 0 ]; then
    erro "$n_orfaos ID(s) alegam móvel medido e não aparecem em inspecção nenhuma:"
    grep '^ORFAO' <<<"$saida" | sed 's/^ORFAO /          /'
    echo "        Ou a inspecção passa a medi-los, ou a alegação sai da evidência."
    echo "        Se houver motivo real, entra nas isenções DECLARADAS deste script."
  else
    ok "$n_alega alegações, $n_spec IDs medidos nos specs, $n_isentos isenções declaradas"
  fi
fi

# ── controlo negativo ────────────────────────────────────────────────────────
# Uma alegação inventada tem de ser apanhada. Corre sobre uma cópia do CSV, nunca
# sobre o ficheiro de trabalho: hoje já reescrevi um ficheiro que o JR estava a
# editar e só não lhe comi trabalho por sorte de temporização.
echo
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cp docs/progress/coverage.csv "$TMP/original.csv"
python3 - "$TMP" <<'PY'
import csv, sys, pathlib
d = pathlib.Path(sys.argv[1])
linhas = list(csv.DictReader(open(d / 'original.csv', encoding='utf-8-sig')))
campos = list(linhas[0].keys())
falso = dict.fromkeys(campos, '')
falso[campos[0]] = 'ZZZ-777'
falso['evidencia'] = 'móvel medido, prometo'
with open(d / 'com-falso.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=campos); w.writeheader(); w.writerows(linhas + [falso])
PY
cp "$TMP/com-falso.csv" docs/progress/coverage.csv
saida_ctl=$(analisar "$ISENTOS")
cp "$TMP/original.csv" docs/progress/coverage.csv
if grep -q '^ORFAO ZZZ-777' <<<"$saida_ctl"; then
  ok "controlo negativo: uma alegação sem inspecção que a suporte é apanhada"
else
  erro "CONTROLO NEGATIVO FALHOU: aceitou uma alegação que nenhum spec suporta"
fi

echo
[ "$falhas" -eq 0 ] && echo "  A alegação bate com o instrumento: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
