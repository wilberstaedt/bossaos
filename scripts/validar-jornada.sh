#!/usr/bin/env bash
#
# Uma jornada percorre-se. Se semeia estado a meio, não é uma jornada — é uma
# soma de segmentos com outro nome.
#
# O marco E11 pede «percorra J01, J02 e J11»: criar tenant, cadastrar, importar,
# rever preço e alergénios, publicar carta, gerar QR e publicar site. A 04/09 medi
# e **11 das 13 provas partem de fixtures**; nenhuma encadeia dois passos.
#
# Provar a peça não prova o caminho. Cada segmento pode estar certo e o produto
# ser inutilizável se o estado que o passo N produz não for o que o passo N+1
# aceita — uma unidade com moeda por configurar, um menu sem secções, um endereço
# ainda nulo. Tudo isso passa nas provas de segmento, porque a fixture entrega o
# estado já bom.
set -uo pipefail
cd "$(dirname "$0")/.."

# Nomes por onde uma prova de jornada pode aparecer. Vários, porque adivinhar UM
# e falhar em silêncio seria a mesma família de defeito que ando a caçar.
CANDIDATOS=$(git ls-files 'provas/*.ts' 'inspeccao/*.ts' 2>/dev/null \
  | grep -iE 'jornada|percurso|j01|j11|fluxo' || true)

falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

echo "1. Existe uma prova de jornada?"
if [ -z "$CANDIDATOS" ]; then
  # PENDENTE e não "ok". Uma guarda que diz verde sobre um ficheiro inexistente é
  # exactamente o verde sobre população zero que este projecto passa o dia a
  # apanhar. Não reprova porque a ausência já está contada como falha 4 do marco,
  # em docs/reviews/E11.md — reprovar aqui era contar o mesmo defeito duas vezes
  # e encher o corredor de vermelho que não acrescenta informação.
  echo "  PENDENTE  não há prova de jornada — é a FALHA 4 do marco E11, e o marco"
  echo "            está reprovado por ela. Esta guarda ganha dentes quando o"
  echo "            ficheiro existir; até lá declara, não finge."
  echo
  echo "  Nada medido: 0 falhas, 1 pendência declarada."
  exit 0
fi
ok "encontrada: $(echo "$CANDIDATOS" | tr '\n' ' ')"

echo
echo "2. A jornada semeia estado a meio do caminho?"
# Semear ANTES de começar é legítimo — a base tem de existir. O que descaracteriza
# é a fixture no MEIO: dar ao passo 4 o estado que o passo 3 devia ter produzido.
sujidade=$(printf '%s\n' "$CANDIDATOS" \
  | xargs python3 scripts/sem-comentarios.py 2>/dev/null \
  | grep -inE 'fixtures|semear|semente|seed' || true)
if [ -n "$sujidade" ]; then
  erro "a prova de jornada chama semeadura — se for a meio, não percorre nada:"
  printf '%s\n' "$sujidade" | head -6 | sed 's/^/          /'
  echo "        Semear ANTES de começar é legítimo. Semear no MEIO entrega ao"
  echo "        passo seguinte o estado que o anterior devia ter produzido."
else
  ok "nenhuma semeadura no corpo da jornada"
fi

echo
echo "3. A jornada tem o controlo do elo partido — e alguém o PUXA?"
# ── Até 06/09 às 06h50 isto era um `grep` por PROSA ────────────────────────
#
# O padrão era `elo partido|CONTROLO NEGATIVO|deve parar|tem de parar` sobre o
# ficheiro da jornada. Media o texto, não o mecanismo: **um comentário com a
# frase passava**, e apagar o controlo deixando o comentário deixava isto verde.
#
# E foi por sorte que não mentiu. A 06/09 fui verificar e a linha que fazia esta
# guarda dizer "ok" era um COMENTÁRIO — `// A jornada tem de PARAR aí` — três
# linhas acima do mecanismo verdadeiro, que é `process.env.SEM_MOEDA`. O
# veredicto estava certo; a razão não tinha nada a ver com o veredicto.
#
# É a mesma família que atravessou este projecto o dia inteiro, e desta vez
# apanhei-a em produção depois de a cometer à mão minutos antes: procurei quais
# das 27 guardas tinham controlo negativo com um `grep` pela frase «controlo
# negativo» e acusei SETE em falso — todas o tinham, escrito por outras palavras.
#
# ── O que passa a medir ────────────────────────────────────────────────────
#
# Uma alavanca é a variável que o corredor **põe numa corrida e não põe noutra,
# sobre a MESMA prova**. É a definição de controlo negativo — o mesmo instrumento
# em dois mundos — e não precisa de lista de nomes nenhuma, que era a outra
# maneira de isto envelhecer: uma variável de configuração está em todas as
# corridas, uma alavanca está numa só.
CORREDORES=$(git ls-files 'scripts/*.sh' 2>/dev/null || true)

alavancas() {
  python3 - "$@" <<'PYALAV'
import re, sys
jornadas, corredores, alvo = [], [], None
for a in sys.argv[1:]:
    if a == '--jornadas':   alvo = jornadas;   continue
    if a == '--corredores': alvo = corredores; continue
    if alvo is not None:    alvo.append(a)

# Juntar as continuações de linha ANTES de olhar. Sem isto, `SEM_MOEDA=1 node \`
# e o caminho da prova ficam em linhas diferentes, e a invocação que tem a
# alavanca parece não ter prefixo nenhum — o detector via o contrário do que há.
def logicas(texto):
    return re.sub(r'\\\n\s*', ' ', texto).splitlines()

PREFIXO = re.compile(r'^([A-Za-z_][A-Za-z0-9_]*)=(?:"[^"]*"|\'[^\']*\'|\S*)\s+')

invocacoes = {}
for c in corredores:
    try: texto = open(c, encoding='utf-8').read()
    except OSError: continue
    for linha in logicas(texto):
        for j in jornadas:
            if j not in linha: continue
            resto = linha.strip()
            if resto.startswith('#'): continue
            nomes = set()
            while True:
                m = PREFIXO.match(resto)
                if not m: break
                nomes.add(m.group(1)); resto = resto[m.end():]
            invocacoes.setdefault(j, []).append(nomes)

achou = False
for j, conjuntos in invocacoes.items():
    if len(conjuntos) < 2:   # uma corrida só não tem com o que comparar
        continue
    for nome in sorted(set().union(*conjuntos)):
        if any(nome in s for s in conjuntos) and any(nome not in s for s in conjuntos):
            print(f'{j}:{nome}'); achou = True
raise SystemExit(0 if achou else 1)
PYALAV
}

# ── E o detector prova-se nos TRÊS sentidos, antes de julgar ───────────────
#
# Cada sonda no seu próprio directório: a 04/09 duas sondas no mesmo ficheiro
# fizeram a primeira mascarar a segunda noutra guarda desta casa.
auto=0
S=$(mktemp -d); trap 'rm -rf "$S"' EXIT

# (a) só a PROSA — é exactamente o que a versão antiga aceitava.
mkdir -p "$S/a"
printf '// CONTROLO NEGATIVO: a jornada tem de PARAR no elo partido\nit("percorre", async () => {});\n' > "$S/a/j.ts"
printf 'node --test %s/a/j.ts\n' "$S" > "$S/a/correr.sh"
alavancas --jornadas "$S/a/j.ts" --corredores "$S/a/correr.sh" >/dev/null 2>&1 && auto=1

# (b) a alavanca a sério: mesma prova, duas corridas, posta numa e não na outra.
mkdir -p "$S/b"
printf 'const parte = process.env.PARTE_O_ELO === "1";\n' > "$S/b/j.ts"
{ printf 'node --test %s/b/j.ts\n' "$S"
  printf 'PARTE_O_ELO=1 node --test \\\n  %s/b/j.ts\n' "$S"; } > "$S/b/correr.sh"
alavancas --jornadas "$S/b/j.ts" --corredores "$S/b/correr.sh" >/dev/null 2>&1 || auto=1

# (c) o VIZINHO QUALQUER: uma variável posta em TODAS as corridas é configuração,
# não é alavanca. Sem esta sonda, um `DATABASE_URL=` certificava a jornada.
mkdir -p "$S/c"
printf 'const u = process.env.DATABASE_URL;\n' > "$S/c/j.ts"
{ printf 'DATABASE_URL=x node --test %s/c/j.ts\n' "$S"
  printf 'DATABASE_URL=x node --test %s/c/j.ts\n' "$S"; } > "$S/c/correr.sh"
alavancas --jornadas "$S/c/j.ts" --corredores "$S/c/correr.sh" >/dev/null 2>&1 && auto=1

if [ "$auto" -ne 0 ]; then
  erro "o detector de alavancas está cego: aceita prosa, não vê a alavanca, ou toma configuração por controlo"
else
  ok "o detector distingue prosa, alavanca e configuração"
fi

# shellcheck disable=SC2086
if achadas=$(alavancas --jornadas $CANDIDATOS --corredores $CORREDORES 2>/dev/null); then
  ok "elo partido puxado: $(echo "$achadas" | tr '\n' ' ')"
else
  erro "sem controlo do elo partido — parta um passo de propósito e exija que a jornada PARE aí, com o ecrã a dizer o que falta"
  echo "        Não basta escrevê-lo num comentário: tem de haver uma variável que o"
  echo "        corredor põe numa corrida da jornada e NÃO põe noutra."
fi

echo
[ "$falhas" -eq 0 ] && echo "  A jornada percorre-se: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
