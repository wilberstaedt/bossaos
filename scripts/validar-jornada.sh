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
echo "3. A jornada tem o controlo do elo partido?"
# Uma jornada que chega ao fim com um elo partido não estava a medir a corrente.
if printf '%s\n' "$CANDIDATOS" | xargs grep -liE 'elo partido|CONTROLO NEGATIVO|deve parar|tem de parar' >/dev/null 2>&1; then
  ok "há controlo negativo declarado"
else
  erro "sem controlo do elo partido — parta um passo de propósito e exija que a jornada PARE aí, com o ecrã a dizer o que falta"
fi

echo
[ "$falhas" -eq 0 ] && echo "  A jornada percorre-se: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
