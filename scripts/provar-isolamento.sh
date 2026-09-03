#!/usr/bin/env bash
#
# A prova de isolamento do E03, com o controlo negativo obrigatório.
#
# O alvo está em `docs/architecture/prova-de-isolamento.md`, escrito no E00 antes
# de esta etapa começar. Este script não o reescreve: corre-o, e depois **desliga
# a política** para exigir que ele fique vermelho.
#
#   Se os casos 2 e 3 continuarem verdes com o RLS desligado, eles não estavam a
#   medir o RLS — estavam a medir outra coisa qualquer.
#
# A prova corre com o papel REAL de runtime (DATABASE_URL). Ligar e desligar
# políticas é DDL e exige a credencial de migração: são duas ligações
# diferentes de propósito, e é essa separação que dá sentido ao resto.
#
# Uso: ./scripts/provar-isolamento.sh
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

# ── A versão do Node, verificada à cabeça ──────────────────────────────────
#
# Esta verificação nasceu de um defeito real deste ficheiro. O passo 1 contava
# linhas TAP (`^ok `, `# pass N`) e, num Node cujo relatório por omissão é `spec`
# em vez de TAP, contava **zero** — e imprimia "ok  0 grupos verdes, asserções".
# Verde, sem ter medido uma única linha, na prova mais perigosa do produto.
#
# Duas defesas, porque uma sozinha não chega: exigir a versão fixada, e pedir o
# relatório TAP **explicitamente** em vez de contar com o que vier por omissão.
NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  cat >&2 <<TXT
ERRO: esta prova exige o Node do .nvmrc.

  esperado: $NODE_ESPERADO
  em uso:   $NODE_ACTUAL

Não é rigidez: o formato do relatório do corredor de testes muda com a versão, e
uma contagem que não encontra o formato que espera conta zero — e zero, sem esta
guarda, lia-se como "tudo bem". Corra \`fnm use\` antes.
TXT
  exit 2
fi

TABELAS=(organizations brands locations memberships role_assignments users)
falhas=0
DESLIGADO=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

politica() { # ENABLE | DISABLE
  local accao="$1"
  for t in "${TABELAS[@]}"; do
    psql "$MIGRATION_DATABASE_URL" -q -c "ALTER TABLE \"$t\" $accao ROW LEVEL SECURITY" >/dev/null 2>&1
  done
}

# Religar SEMPRE. Um script que morra a meio com as políticas desligadas deixa a
# base aberta — e é uma base de desenvolvimento hoje, mas o hábito é o que segue
# para o sítio onde há dados de clientes.
restaurar() {
  if [[ "$DESLIGADO" == "1" ]]; then
    politica ENABLE
    DESLIGADO=0
    printf '  (políticas religadas)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() { # devolve 0 se a prova passou; guarda a saída em $1
  # `--test-reporter=tap` explícito: o formato é um contrato entre esta prova e
  # quem a lê, não uma consequência da versão que calhar estar instalada.
  node --test --test-reporter=tap --experimental-strip-types provas/isolamento.test.ts >"$1" 2>&1
}

# Lê grupos e asserções de um relatório TAP.
#   0 → ecoa "<grupos> <asserções>"
#   2 → o ficheiro NÃO é um relatório TAP legível
#
# É esta função que impede o verificador de dizer verde sem ter medido. A guarda
# que faltava não era contra uma base vazia — essa já lá estava, no passo 2 — era
# contra a própria prova não ter corrido.
analisar() {
  local f="$1" grupos assercoes
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  assercoes=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$assercoes" ]] || return 2
  echo "$grupos $assercoes"
}

echo "0. Fixtures (dois inquilinos com nomes parecidos)"
if node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; then
  verde "semeados"
else
  vermelho "não foi possível semear"; exit 1
fi

echo
echo "1. Com as políticas LIGADAS — os quatro casos têm de passar"
if correr /tmp/bossaos-iso-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-iso-ligado.txt); then
    vermelho "a prova saiu a zero mas o relatório não é TAP legível — não se mediu nada"
    head -5 /tmp/bossaos-iso-ligado.txt
    exit 1
  fi
  read -r grupos assercoes <<<"$leitura"

  # A parte que faltava. Um código de saída zero diz que nada rebentou; não diz
  # que alguma coisa foi medida. São perguntas diferentes.
  if (( grupos == 0 )) || (( assercoes == 0 )); then
    vermelho "VERDE COM ZERO MEDIDO: $grupos grupos, $assercoes asserções. A prova não correu."
    exit 1
  fi
  # E não é só "acima de zero": os quatro casos e os três grupos de apoio têm de
  # lá estar. Se um desaparecer por um ficheiro mal renomeado, isto vê-o.
  if (( grupos < 7 )) || (( assercoes < 28 )); then
    vermelho "medido a menos: $grupos grupos (esperados 7), $assercoes asserções (esperadas 28)"
    exit 1
  fi
  verde "$grupos grupos verdes, $assercoes asserções"
else
  vermelho "a prova falhou com as políticas ligadas"
  grep -E 'not ok|error:' /tmp/bossaos-iso-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — políticas DESLIGADAS, a prova tem de ficar vermelha"
politica DISABLE
DESLIGADO=1

if correr /tmp/bossaos-iso-desligado.txt; then
  vermelho "a prova passou com o RLS DESLIGADO — não está a medir a política"
else
  verde "a prova ficou vermelha, como tem de ficar"

  # Antes de concluir seja o que for a partir de marcadores TAP, confirmar que
  # eles existem. Sem isto, um relatório noutro formato faz os `grep` abaixo não
  # encontrarem nada e a prova ACUSA o produto de um defeito que ele não tem —
  # foi o que aconteceu ao sénior, com um Node diferente.
  if ! analisar /tmp/bossaos-iso-desligado.txt >/dev/null; then
    vermelho "o relatório do controlo negativo não é TAP legível — não se pode concluir nada dele"
    exit 1
  fi

  # E não basta ficar vermelha em qualquer sítio: têm de ser os casos que
  # dependem da política. Um erro de ligação também poria tudo vermelho.
  for caso in 'caso 2' 'caso 3'; do
    if grep -q "^not ok .*$caso" /tmp/bossaos-iso-desligado.txt; then
      verde "$caso ficou vermelho (é ele que mede o RLS)"
    else
      vermelho "$caso continuou verde sem política — não estava a medir o RLS"
    fi
  done

  # E é preciso provar que o que partiu foi a POLÍTICA e não a ligação. A
  # primeira versão deste script exigia que o caso 1 continuasse verde — errado:
  # sem política, A passa a ver as marcas de B e o caso 1, que espera UMA linha,
  # falha com razão.
  #
  # O discriminador certo é directo: o papel de runtime, SEM contexto nenhum,
  # conta as marcas. Com política = 0. Sem política = todas. É a mesma pergunta
  # do caso 3, feita sem passar por teste nenhum.
  sem_politica=$(psql "$DATABASE_URL" -tAc 'SELECT count(*) FROM brands' 2>/dev/null | tr -d ' ')
  if [[ "$sem_politica" -gt 0 ]]; then
    verde "sem política e sem contexto, o runtime vê $sem_politica marcas — a base está viva e cheia"
  else
    vermelho "sem política continua a ver 0: o vazio do caso 3 não vinha da política"
  fi
fi

politica ENABLE
DESLIGADO=0

# Limpeza depois do controlo negativo. Com a política desligada, uma escrita que
# escape à contenção fica gravada — e a corrida seguinte encontraria o mundo
# alterado e culparia a política. Semear é idempotente e repõe o dono.
psql "$MIGRATION_DATABASE_URL" -q \
  -c "DELETE FROM brands WHERE slug LIKE 'intrusa%' OR slug = 'sem-contexto'" \
  -c "DELETE FROM locations WHERE slug LIKE 'intrusa%'" >/dev/null 2>&1
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1

echo
echo "3. Religadas — tem de voltar ao verde"
if correr /tmp/bossaos-iso-religado.txt; then
  verde "de volta ao verde"
else
  vermelho "não voltou ao verde depois de religar"
  grep -E 'not ok|error:' /tmp/bossaos-iso-religado.txt | head -10
fi


# ── 4. Controlo negativo DO CONTROLO NEGATIVO ──────────────────────────────
#
# Os passos 1 a 3 medem o produto. Este mede o INSTRUMENTO, e existe porque ele
# já falhou: numa máquina com outra versão do Node o relatório deixou de ser TAP,
# as contagens deram zero, e o passo 1 imprimiu "0 grupos verdes" em verde.
#
# A guarda contra medir uma base vazia já cá estava ("o runtime vê 2 marcas").
# Faltava a guarda contra a prova não ter corrido. É esta.
if [[ "${BOSSAOS_SEM_AUTOTESTE:-0}" != "1" ]]; then
  echo
  echo "4. O verificador falha alto quando não consegue medir?"

  # (a) Um relatório noutro formato — `spec`, que é o que um Node diferente dá.
  #     Não é uma imitação: é o corredor a sério, com o outro relator.
  node --test --test-reporter=spec --experimental-strip-types \
    provas/isolamento.test.ts >/tmp/bossaos-iso-spec.txt 2>&1 || true

  if grep -q '^ok ' /tmp/bossaos-iso-spec.txt; then
    vermelho "o relatório 'spec' trouxe linhas TAP — este controlo não está a testar nada"
  else
    verde "o relatório 'spec' não tem marcadores TAP (é a condição que partiu o passo 1)"
  fi

  if analisar /tmp/bossaos-iso-spec.txt >/dev/null 2>&1; then
    vermelho "o leitor ACEITOU um relatório que não é TAP — voltaria a dizer verde com zero"
  else
    verde "o leitor recusa o que não sabe ler, em vez de contar zero"
  fi

  # (a2) Um relatório TAP **válido** mas com contagens a zero. É o outro ramo da
  #      guarda, e não se alcança pelo caminho de (a): ali o leitor recusa o
  #      formato; aqui aceita-o, e o que tem de disparar é a contagem.
  printf 'TAP version 13\n1..0\n# tests 0\n# pass 0\n# fail 0\n' > /tmp/bossaos-iso-tapzero.txt
  if leitura_zero=$(analisar /tmp/bossaos-iso-tapzero.txt); then
    read -r g_zero a_zero <<<"$leitura_zero"
    if (( g_zero == 0 )) && (( a_zero == 0 )); then
      verde "um TAP válido com contagens a zero é lido como zero, não como verde"
    else
      vermelho "o leitor inventou contagens onde não havia ($g_zero/$a_zero)"
    fi
  else
    vermelho "o leitor recusou um TAP válido — o ramo do zero deixou de ser alcançável"
  fi

  # (b) Um Node com outra versão. Postiço de propósito: a alternativa seria
  #     depender de haver duas versões instaladas na máquina, e um controlo que
  #     só corre às vezes não é um controlo.
  postico=$(mktemp -d)
  cat >"$postico/node" <<'SHIM'
#!/usr/bin/env bash
if [[ "${1:-}" == "--version" ]]; then echo "v0.0.0-postico"; exit 0; fi
exec /usr/bin/env -i false
SHIM
  chmod +x "$postico/node"

  saida=$(BOSSAOS_SEM_AUTOTESTE=1 PATH="$postico:$PATH" bash "$0" 2>&1)
  codigo=$?
  rm -rf "$postico"

  if (( codigo == 0 )); then
    vermelho "com um Node de outra versão a prova PASSOU — é o defeito que fechámos, de volta"
  else
    verde "com um Node de outra versão a prova recusa correr (saída $codigo)"
  fi
  if [[ "$saida" == *"v0.0.0-postico"* && "$saida" == *".nvmrc"* ]]; then
    verde "e diz qual é a versão errada e onde está a certa"
  else
    vermelho "falhou sem explicar porquê — uma recusa que não se percebe volta a ser ignorada"
  fi
fi

echo
if (( falhas == 0 )); then
  echo "Isolamento provado: 0 falhas."
else
  echo "Isolamento NÃO provado: $falhas falha(s)."
  exit 1
fi
