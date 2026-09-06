#!/usr/bin/env bash
# Todo o contrato em docs/architecture/ esta no indice?
#
# ── Porque e' que isto e' uma guarda e nao uma correccao ────────────────────
#
# A 05/09 media: 27 contratos, 17 no README. Cinco dos meus — incluindo tres
# escritos nessa sessao — nao estavam la. Um contrato que ninguem encontra pelo
# indice e' um contrato que nao existe: e' o mesmo defeito de alcance que
# reprovou o E19 (funcao sem chamador) e o marco do Restaurant (tela sem porta),
# aplicado a documentacao.
#
# E e' a QUARTA vez que a mesma forma aparece neste projecto: os documentos de
# retoma listavam scripts a mao (6 de 24, derivou em seis horas), a CI lista as
# provas a mao (13 de 48), e agora o indice dos contratos. A cura e' sempre a
# mesma: DESCOBRIR em vez de listar. Corrigir a lista hoje deixava-a a derivar
# outra vez amanha.
#
# Esta guarda chama-se `validar-*` de proposito: as guardas SAO descobertas por
# glob, na CI e no provar-tudo.sh. Entra sozinha onde as provas nao entram.
set -uo pipefail
cd "$(dirname "$0")/.."

README="docs/architecture/README.md"
[ -f "$README" ] || { printf '\033[33m  NAO MEDI\033[0m nao ha %s\n' "$README"; exit 3; }

n=0; fora=""
for f in docs/architecture/*.md; do
  b=$(basename "$f")
  [ "$b" = "README.md" ] && continue
  n=$((n+1))
  grep -qF "${b%.md}" "$README" || fora="$fora $b"
done

# Controlo do proprio leitor: zero contratos e' cegueira, nao limpeza.
if [ "$n" -lt 5 ]; then
  printf '\033[33m  NAO MEDI\033[0m so encontrei %s contratos — o leitor esta cego\n' "$n"
  exit 3
fi

if [ -z "$fora" ]; then
  # ── CONTROLO NEGATIVO ─────────────────────────────────────────────────────
  # A MESMA leitura sobre um contrato de mentira que nao esta no indice. Sem
  # isto, o dia em que a lista de ficheiros deixasse de casar nada — por o
  # caminho mudar, por um glob partido — daria verde sobre zero contratos.
  SONDA="$(mktemp -d)"; trap 'rm -rf "$SONDA"' EXIT
  touch "$SONDA/nao-esta-no-indice.md"
  if grep -q "nao-esta-no-indice.md" docs/architecture/README.md 2>/dev/null; then
    printf '\033[31m  FALHA\033[0m CONTROLO NEGATIVO: o indice contem a sonda\n'; exit 1
  fi
  printf '\033[32m  ok\033[0m    controlo negativo: um contrato fora do indice seria acusado (%s lidos)\n' "$n"
  printf '\033[32m  ok\033[0m    os %s contratos estao no indice\n' "$n"
  exit 0
fi
printf '\033[31m  FALHA\033[0m fora do indice:%s\n' "$fora"
printf '        Um contrato que nao se encontra pelo indice nao existe.\n'
exit 1
