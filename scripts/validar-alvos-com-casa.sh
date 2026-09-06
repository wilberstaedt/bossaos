#!/usr/bin/env bash
# Um alvo de teste que nao diz de que casa e' pode cair na casa errada.
#
# 06/09. A suite `staff` estava morta e a raiz era esta: o `productId` resolvia
# `SELECT id FROM products WHERE nome LIKE 'insp-%' ORDER BY nome` sem dizer a
# organizacao, e o `insp-Arroz de sepia y alcachofas` — que e' da casa B, que
# existe para provar o isolamento — ordena antes dos pratos da casa A. A prova
# pedia um produto da B dentro de uma unidade da A e recebia 404. O 404 ESTAVA
# CERTO: era o isolamento a funcionar. O defeito era o alvo.
#
# A correccao deu casa ao menuId, categoryId e productId. Ao verificar isso medi
# a populacao real e encontrei CINCO tabelas com linhas em duas organizacoes -
# brands, categories, locations, menus, products - e uma consulta que escapou: a
# da unidade ARQUIVADA, em `locations`, sem filtro. Hoje acerta porque so existe
# uma unidade arquivada e e' da casa A. ACERTA POR POPULACAO DE UM, NAO POR
# DESENHO: no dia em que a semente criar uma arquivada na casa B, a lotaria
# volta em silencio.
#
# Por isso esta guarda nao tem lista de tabelas escrita a mao. PERGUNTA A BASE
# quais e' que vivem em duas casas, e exige filtro so a essas. Se a semente puser
# `devices` em duas organizacoes amanha, a guarda fica vermelha ate o alvo dizer
# de que casa e' - sem ninguem se lembrar de a actualizar.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro() { printf '  FALHA %s\n' "$1"; falhas=$((falhas+1)); }
naomedi() { printf '  NAO MEDI %s\n' "$1"; exit 2; }

[ -f inspeccao/alvos.ts ] || naomedi "inspeccao/alvos.ts nao existe"
set -a; . ./.env 2>/dev/null || true; set +a
URL="${MIGRATION_DATABASE_URL:-${DATABASE_URL:-}}"
[ -n "$URL" ] || naomedi "sem MIGRATION_DATABASE_URL nem DATABASE_URL — a pergunta e' sobre a POPULACAO e nao se responde sem a base"
command -v psql >/dev/null || naomedi "psql nao esta instalado"

# ── Quais e' que vivem em duas casas? Pergunta-se, nao se decora ────────────
lista=$(psql "$URL" -At -c "
  SELECT string_agg(format('SELECT %L::text AS t, count(DISTINCT organization_id)::int AS n FROM %I', table_name, table_name), ' UNION ALL ')
  FROM information_schema.columns
  WHERE table_schema='public' AND column_name='organization_id'" 2>/dev/null)
[ -n "$lista" ] || naomedi "nao consegui listar as tabelas com organization_id"
duas=$(psql "$URL" -At -c "SELECT t FROM ($lista) x WHERE n > 1 ORDER BY t" 2>/dev/null)
n_duas=$(printf '%s\n' "$duas" | grep -c . || true)
[ "$n_duas" -gt 0 ] || naomedi "NENHUMA tabela com linhas em duas organizacoes — ou a base esta vazia, ou a semente do isolamento nao correu. Sem casa B nao ha o que medir."
echo "  ok    $n_duas tabela(s) com linhas em mais de uma casa, perguntadas a base"

# ── As consultas dos alvos, lidas como literais e nao linha a linha ─────────
#
# Duas das consultas atravessam linhas. Um grep linha a linha via a linha do FROM
# sem ver o filtro que estava duas linhas abaixo, e acusava alvos que estao bem.
saida=$(python3 - "$duas" <<'PY'
import io, re, sys
duas = set(x.strip() for x in sys.argv[1].splitlines() if x.strip())
s = io.open('inspeccao/alvos.ts', encoding='utf-8').read()
linha_de = lambda i: s.count('\n', 0, i) + 1
for m in re.finditer(r'`([^`]*)`', s, re.S):
    q = m.group(1)
    if 'SELECT' not in q.upper(): continue
    for t in re.findall(r'\bFROM\s+([a-z_]+)', q):
        if t in duas and 'organization_id' not in q:
            print('SEMCASA %d %s %s' % (linha_de(m.start()), t, ' '.join(q.split())[:90]))
        elif t in duas:
            print('COMCASA %d %s' % (linha_de(m.start()), t))
PY
)

# ── O controlo: o detector tem de ver as duas coisas ────────────────────────
com=$(printf '%s\n' "$saida" | grep -c '^COMCASA' || true)
sem=$(printf '%s\n' "$saida" | grep -c '^SEMCASA' || true)
[ "$com" -gt 0 ] || naomedi "o detector nao viu UMA consulta com filtro de casa — ou o leitor de literais esta cego, ou nenhum alvo toca nas tabelas de duas casas"
echo "  ok    $com consulta(s) a dizer de que casa sao"

if [ "$sem" -gt 0 ]; then
  erro "$sem consulta(s) a tabela de DUAS casas sem dizer de qual:"
  printf '%s\n' "$saida" | grep '^SEMCASA' | sed 's/^SEMCASA /           alvos.ts:/'
  echo "        Hoje pode acertar por so haver um candidato. Isso e' acertar por"
  echo "        populacao, nao por desenho: basta a semente criar o segundo."
fi

[ "$falhas" -eq 0 ] && { echo "OK"; exit 0; }
echo "FALHOU: $falhas"; exit 1
