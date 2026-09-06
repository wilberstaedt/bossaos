#!/usr/bin/env bash
# Funcoes exportadas SEM chamador em codigo de produto, no intervalo de UMA etapa.
#
# ── Porque e' que isto e' um script e nao um comando que eu escrevo a mao ────
#
# Escrevi a regra depois do E20: «verificacao de alcance exaustiva por etapa,
# nao amostrada». Implementei-a tres vezes a mao e falhei as tres de maneira
# diferente:
#   E18 — nao verifiquei alcance nenhum.
#   E20 — verifiquei CINCO funcoes de oito, escolhidas a olho.
#   E23 — varri o COMMIT declarado em vez da ETAPA. O receberWebhook nasceu na
#         fatia 1, o commit que validei era a fatia 2, e passou sem chamador.
#
# Uma regra que depende de eu a executar bem de cada vez nao e' uma regra.
#
# Uso:  bash scripts/varrer-alcance-da-etapa.sh <commit-inicio> <commit-fim>
#       (inicio = ultimo commit ANTES da etapa; fim = commit declarado)
set -uo pipefail
cd "$(dirname "$0")/.."

ini="${1:-}"; fim="${2:-HEAD}"
[ -z "$ini" ] && { echo "uso: $0 <commit-inicio> [commit-fim]" >&2; exit 2; }

fich=$(git diff --name-only "$ini".."$fim" -- 'packages/*/src/*.ts' 2>/dev/null | grep -v '\.test\.' || true)
if [ -z "$fich" ]; then
  printf '\033[33m  NAO MEDI\033[0m nenhum ficheiro de pacote entre %s e %s\n' "$ini" "$fim"
  printf '           Isto NAO e um verde: ou o intervalo esta errado, ou a etapa\n'
  printf '           nao tocou em packages/. Confirmar antes de seguir.\n'
  exit 3
fi

echo "$fich" > /tmp/alcance-fich.txt
python3 - "$fim" <<'PY'
import re,pathlib,sys
fich=[l.strip() for l in open('/tmp/alcance-fich.txt') if l.strip()]
exp={}
for f in fich:
    p=pathlib.Path(f)
    if not p.exists(): continue
    for m in re.finditer(r'^export (?:async )?function (\w+)', p.read_text(), re.M):
        exp[m.group(1)]=f
# ── O SQL TAMBEM CONTA, e custou-me uma decisao errada descobri-lo ──────────
# Ate 06/09 as 06h25 isto lia so `*.ts*`. A 03h declarei a `custom_domain_owners`
# como esquema sem uso e mandei apaga-la: zero chamadores num grep de TypeScript.
# O chamador existia — a funcao `vincular_dominio`, SECURITY DEFINER, faz SELECT
# e INSERT nela, dentro da migracao do E10. O JR foi verificar a premissa em vez
# de executar, e se tivesse obedecido tinhamos apagado a defesa contra um
# restaurante ficar com o dominio de outro.
#
# As funcoes SECURITY DEFINER sao onde vive a logica que o runtime NAO pode fazer
# sozinho — o pior sitio possivel para um instrumento ter um ponto cego.
alvos=[q for q in pathlib.Path('.').rglob('*')
       if q.suffix in ('.ts','.tsx','.mts','.sql')
       and 'node_modules' not in str(q) and '.test.' not in q.name
       and not str(q).startswith(('provas/','inspeccao/','docs/'))]
txt=[q.read_text() for q in alvos]
mortas=[]
for nome,dono in sorted(exp.items()):
    pad=re.compile(r'(?<![A-Za-z0-9_])'+re.escape(nome)+r'\(')
    n=sum(1 for t in txt for l in t.splitlines()
          if pad.search(l) and 'export async function' not in l and 'export function' not in l)
    if n==0: mortas.append((nome,dono))
print(f"  ficheiros no intervalo: {len(fich)}   funcoes exportadas: {len(exp)}")
# Controlo do proprio leitor: zero funcoes num intervalo com ficheiros e' cegueira.
if fich and not exp:
    print("\033[33m  NAO MEDI\033[0m ha ficheiros mas zero funcoes exportadas — o leitor esta cego")
    sys.exit(3)
if not mortas:
    print("\033[32m  ok\033[0m       todas as funcoes da etapa tem chamador em produto")
    sys.exit(0)
print(f"\033[31m  FALHA\033[0m    {len(mortas)} sem chamador em produto:")
for n,o in mortas: print(f"             {n:28s} {o}")
sys.exit(1)
PY
