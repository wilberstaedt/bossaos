#!/usr/bin/env bash
#
# O E08: publicação atómica, traduções que envelhecem, importação que não funde,
# média que recusa documentos, e exportação verificada duas vezes.
#
# A régua está em `docs/architecture/catalogo-e-publicacao.md` e
# `dados-e-accoes-sensiveis.md`, os dois escritos no E00.
#
# ── O que esta prova existe para não deixar passar ─────────────────────────
#
# > Uma falha a meio da publicação tem de deixar a revisão **anterior inteira**.
# > Publicação pela metade é pior do que publicação falhada — a carta fica com
# > metade dos preços novos e metade dos antigos, e ninguém sabe qual é qual.
#
# E as três armadilhas do CT-14, que se apresentam todas como sucesso: o CSV que
# "abre no Excel", o logótipo que "aparece na página", o link que "funciona".
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

GRUPOS_ESPERADOS=8
ASSERCOES_ESPERADAS=36
falhas=0

CSV=packages/domain/src/csv.ts
FICH=packages/domain/src/ficheiros.ts
TRAD=packages/domain/src/traducoes.ts
IMP=packages/domain/src/importacao.ts
PUB=packages/domain/src/publicacao.ts
EXP=packages/domain/src/exportacao.ts
ESC=packages/db/src/escopo.ts
MED=packages/db/src/media.ts
PUBDB=packages/db/src/publicacao.ts
COPIAS=$(mktemp -d)
# ── A cópia guarda-se pelo CAMINHO, não pelo nome do ficheiro ─────────────
#
# `packages/domain/src/publicacao.ts` e `packages/db/src/publicacao.ts` têm o
# mesmo `basename`. Com `$COPIAS/$(basename ...)` a segunda cópia esmagava a
# primeira, e a reposição escrevia o ficheiro da base POR CIMA do do domínio —
# que foi o que aconteceu: a partir do controlo 4 a prova morria em
# `Cannot find package '@bossaos/domain'`, e o guarda dizia "vermelho por outro
# motivo", que é exactamente o que ele existe para dizer.
guardar()  { cp "$1" "$COPIAS/$(echo "$1" | tr / _)"; }
repor()    { cp "$COPIAS/$(echo "$1" | tr / _)" "$1"; }

for f in "$CSV" "$FICH" "$TRAD" "$IMP" "$PUB" "$EXP" "$ESC" "$MED" "$PUBDB"; do
  guardar "$f"
done
RLS_DESLIGADO=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  for f in "$CSV" "$FICH" "$TRAD" "$IMP" "$PUB" "$EXP" "$ESC" "$MED" "$PUBDB"; do
    repor "$f"
  done
  rm -rf "$COPIAS"
  if [[ "$RLS_DESLIGADO" == "1" ]]; then
    psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY' >/dev/null 2>&1
    RLS_DESLIGADO=0
    printf '  (a política de linha da média foi religada)\n'
  fi
  # Quem faz a sujidade apanha-a. Foi lixo de uma prova minha que partiu a prova
  # de isolamento do E03 durante o E06.
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
DELETE FROM menu_publications WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE 'e08-%');
DELETE FROM menu_revisions    WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE 'e08-%');
DELETE FROM menu_categories   WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE 'e08-%');
DELETE FROM menus             WHERE nome LIKE 'e08-%';
DELETE FROM import_rows WHERE job_id IN (SELECT id FROM import_jobs WHERE ficheiro_nome LIKE 'e08-%');
DELETE FROM import_jobs WHERE ficheiro_nome LIKE 'e08-%';
DELETE FROM export_jobs WHERE formato LIKE 'e08-%';
DELETE FROM product_media  WHERE media_id IN (SELECT id FROM media_assets WHERE chave LIKE 'e08-%');
DELETE FROM media_assets   WHERE chave LIKE 'e08-%';
DELETE FROM product_translations WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '%e08-%');
DELETE FROM product_channels WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '%e08-%');
DELETE FROM price_rules WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '%e08-%');
DELETE FROM products    WHERE nome LIKE '%e08-%';
DELETE FROM categories  WHERE nome LIKE 'e08-%';
PY
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-timeout=180000 --test-reporter=tap \
    --experimental-strip-types provas/publicacao.test.ts >"$1" 2>&1
}

analisar() {
  local f="$1" grupos assercoes
  grep -q '^TAP version' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  assercoes=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$assercoes" ]] || return 2
  echo "$grupos $assercoes"
}

# Exige vermelho E que caia a asserção certa. `^ *not ok` e não só o marcador: o
# nome do teste aparece nas duas linhas, e procurar só o nome dava verde a uma
# execução vermelha por outro motivo.
exigir_vermelho() {
  local descricao="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "ficou verde com o defeito plantado — a prova não mede isto"
    return
  fi
  if grep -qE "^ *not ok .*$marcador" "$ficheiro"; then
    verde "$descricao"
  else
    vermelho "ficou vermelho por outro motivo, não por: $descricao"
    grep -E '^ *not ok' "$ficheiro" | head -4
  fi
}

echo "0. Fixtures"
if node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; then
  verde "semeadas"
else
  vermelho "não foi possível semear"; exit 1
fi

echo
echo "1. Com tudo ligado"
if correr /tmp/bossaos-pub.txt; then
  read -r grupos assercoes <<<"$(analisar /tmp/bossaos-pub.txt)"
  if [[ "$grupos" == "$GRUPOS_ESPERADOS" && "$assercoes" == "$ASSERCOES_ESPERADAS" ]]; then
    verde "$grupos grupos verdes, $assercoes asserções"
  else
    vermelho "contagem inesperada: $grupos grupos / $assercoes asserções (esperava $GRUPOS_ESPERADOS / $ASSERCOES_ESPERADAS)"
  fi
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok' /tmp/bossaos-pub.txt | head -8
fi

echo
echo "2. CONTROLO NEGATIVO — a publicação deixa de ser uma transacção"
# É o mecanismo INTEIRO do aceite 1: a revisão e a troca do ponteiro no mesmo
# COMMIT. Sem transacção, a falha a meio deixa a revisão escrita e a carta com
# metade dos preços novos.
python3 - "$ESC" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
s = s.replace("""  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.organization_id', ${escopo.organizationId}, true)`;
    if (escopo.userId !== undefined) {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${escopo.userId}, true)`;
    }
    return fn(tx as unknown as ClienteComEscopo);
  });""",
"""  await prisma.$executeRaw`SELECT set_config('app.organization_id', ${escopo.organizationId}, false)`;
  if (escopo.userId !== undefined) {
    await prisma.$executeRaw`SELECT set_config('app.user_id', ${escopo.userId}, false)`;
  }
  return fn(prisma as unknown as ClienteComEscopo);""")
p.write_text(s, encoding='utf-8')
PY
exigir_vermelho "caiu a asserção da falha a meio — é ela que mede a atomicidade" \
  'A FALHA A MEIO' /tmp/bossaos-pub-sem-tx.txt
repor "$ESC"

echo
echo "3. CONTROLO NEGATIVO — publicar deixa de olhar para os bloqueios"
# A "publicação pela metade": publica o que dá e ignora o produto sem preço.
python3 - "$PUB" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
s = s.replace("""    } else if (i.precoMenor === null || i.moeda === null) {""", """    } else if (false) {""")
p.write_text(s, encoding='utf-8')
PY
exigir_vermelho "caiu a asserção do produto sem preço" \
  'SEM PREÇO devolve bloqueio' /tmp/bossaos-pub-sem-bloqueio.txt
repor "$PUB"

echo
echo "4. CONTROLO NEGATIVO — a tradução deixa de envelhecer"
python3 - "$TRAD" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
s = s.replace("  if (t.impressaoDaOrigem !== impressaoActual) return 'obsoleta';", "")
p.write_text(s, encoding='utf-8')
PY
exigir_vermelho "caiu a asserção da tradução obsoleta" \
  'MUDAR O TEXTO DE ORIGEM' /tmp/bossaos-pub-sem-obsoleta.txt
repor "$TRAD"

echo
echo "5. CONTROLO NEGATIVO — a importação passa a procurar pelo nome"
python3 - "$IMP" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
s = s.replace("""    const alvo = porSku.get(sku.toLowerCase());""",
              """    const alvo = porSku.get(sku.toLowerCase())
      ?? existentes.find((e) => e.nome.toLowerCase() === nome.toLowerCase());""")
p.write_text(s, encoding='utf-8')
PY
exigir_vermelho "caiu a asserção do nome igual — dois 'gazpacho' voltaram a ser um" \
  'NOME IGUAL' /tmp/bossaos-pub-funde.txt
repor "$IMP"

echo
echo "6. CONTROLO NEGATIVO — o SVG passa a ser uma imagem"
python3 - "$FICH" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
s = s.replace("export const IMAGENS_PERMITIDAS: readonly TipoDeFicheiro[] = ['png', 'jpeg', 'webp', 'gif'];",
              "export const IMAGENS_PERMITIDAS: readonly TipoDeFicheiro[] = ['png', 'jpeg', 'webp', 'gif', 'svg'];")
p.write_text(s, encoding='utf-8')
PY
exigir_vermelho "caiu a asserção do SVG renomeado" \
  'SVG RENOMEADO' /tmp/bossaos-pub-svg.txt
repor "$FICH"

echo
echo "7. CONTROLO NEGATIVO — o CSV sai sem neutralização"
python3 - "$CSV" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
s = s.replace("const neutralizar = opcoes.neutralizar ?? true;", "const neutralizar = opcoes.neutralizar ?? false;")
p.write_text(s, encoding='utf-8')
PY
exigir_vermelho "caiu a asserção da fórmula — o campo saiu como fórmula" \
  '=1\+1 SAI NEUTRALIZADO' /tmp/bossaos-pub-csv.txt
repor "$CSV"

echo
echo "8. CONTROLO NEGATIVO — a permissão só se verifica no pedido"
python3 - "$EXP" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
s = s.replace("""  if (!podeFazer(p.concessoes, p.exportacao.accaoExigida)) {
    return { ok: false, erro: 'sem_permissao' };
  }""", "")
p.write_text(s, encoding='utf-8')
PY
exigir_vermelho "caiu a asserção do segundo ponto de verificação" \
  'QUEM PERDEU O DIREITO' /tmp/bossaos-pub-exp.txt
repor "$EXP"

echo
echo "9. CONTROLO NEGATIVO — a política de linha da média desligada"
psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE media_assets DISABLE ROW LEVEL SECURITY' >/dev/null 2>&1
RLS_DESLIGADO=1
exigir_vermelho "caiu a asserção do isolamento da média" \
  'ficheiro de A não é visível a B' /tmp/bossaos-pub-sem-rls.txt
psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY' >/dev/null 2>&1
RLS_DESLIGADO=0

echo
echo "9b. CONTROLO NEGATIVO - publicar cria a revisao e NAO troca o ponteiro"
# O outro lado do aceite 1. Sem este, passava um sistema que nunca publica: a
# assercao da falha a meio ficava verde num produto onde publicar nao faz nada.
python3 - "$PUBDB" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = """    await db.menuPublication.update({
      where: { id: publicacao.id },
      data: { revisionId: revisao.id, publicadaPor: entrada.autor, publicadaEm: agora },
    });"""
assert alvo in s, 'o alvo do controlo negativo mudou de forma'
p.write_text(s.replace(alvo, ''), encoding='utf-8')
FIMPY
exigir_vermelho "caiu a assercao da troca do ponteiro" \
  'O OUTRO LADO' /tmp/bossaos-pub-sem-troca.txt
repor "$PUBDB"

echo
echo "9c. CONTROLO NEGATIVO - buscar por URL nao reclassifica o endereco resolvido"
# A porta que a forma do URL nao consegue ver: um nome publico que resolve para
# 127.0.0.1. E a que fica de fora de quase todas as implementacoes.
python3 - "$MED" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = """    const interno = algumEnderecoInterno(enderecos);
    if (interno.interno) return { ok: false, erro: 'destino_interno', detalhe: interno.classe };"""
assert alvo in s, 'o alvo do controlo negativo mudou de forma'
p.write_text(s.replace(alvo, ''), encoding='utf-8')
FIMPY
exigir_vermelho "caiu a assercao do nome que resolve para dentro" \
  'NOME público que resolve para dentro' /tmp/bossaos-pub-ssrf.txt
repor "$MED"

echo
echo "9d. CONTROLO NEGATIVO - o redireccionamento passa a ser seguido"
# ── A camada que derrota as outras duas, e que nao tinha vigia ─────────────
#
# Um endereco publico passa a forma do URL e passa a resolucao, e depois responde
# 302 para 169.254.169.254. As duas primeiras camadas nao veem isso: a decisao ja
# foi tomada quando o redireccionamento chega.
#
# Quem impede e uma palavra — `redirect: 'manual'` — e ate o E08 ser retido
# nenhum teste do repositorio a mencionava. O senior trocou-a por `follow` e tudo
# continuou verde. O CT-14 pede "nao fornecer um proxy aberto para rede interna",
# e o que o garantia era uma palavra que ninguem vigiava.
python3 - "$MED" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = "redirect: 'manual',"
assert alvo in s, 'o alvo do controlo negativo mudou de forma'
p.write_text(s.replace(alvo, "redirect: 'follow',"), encoding='utf-8')
FIMPY
exigir_vermelho "caiu a assercao do 302 para dentro" \
  '302 PARA UM ENDERECO INTERNO' /tmp/bossaos-pub-302.txt
# E o par tem de continuar verde: uma implementacao que recusasse TUDO passava no
# caso de cima e a busca por URL deixava de servir para nada.
if grep -qE '^ *not ok .*sem redireccionamento, um destino publico entra' /tmp/bossaos-pub-302.txt; then
  vermelho "o lado positivo tambem caiu — nao e o par que separa os dois"
else
  verde "o destino publico sem redireccionamento continuou a entrar"
fi
repor "$MED"

echo
echo "9e. CONTROLO NEGATIVO - a revisao deixa de olhar para a visibilidade do canal"
# O buraco que o E09 fez encontrar: a revisao da CARTA levava produtos escondidos
# da CARTA. Enquanto a carta era interna era um bug; com a carta na internet
# aberta e exposicao.
python3 - "$PUBDB" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = "        canais: { some: { canal, visivel: true } },"
assert alvo in s, 'o alvo do controlo negativo mudou de forma'
p.write_text(s.replace(alvo, ''), encoding='utf-8')
FIMPY
exigir_vermelho "caiu a assercao do produto oculto" \
  'PRODUTO OCULTO NO CANAL' /tmp/bossaos-pub-oculto.txt
repor "$PUBDB"

echo
echo "10. Reposto — tem de voltar ao verde"
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1
if correr /tmp/bossaos-pub-reposto.txt; then
  read -r grupos assercoes <<<"$(analisar /tmp/bossaos-pub-reposto.txt)"
  verde "reposto: $grupos grupos, $assercoes asserções"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-pub-reposto.txt | head -6
fi

echo
echo "11. A árvore ficou limpa?"
RESTOS=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT
  (SELECT count(*) FROM menus WHERE nome LIKE 'e08-%')
+ (SELECT count(*) FROM products WHERE nome LIKE '%e08-%')
+ (SELECT count(*) FROM media_assets WHERE chave LIKE 'e08-%')
+ (SELECT count(*) FROM export_jobs WHERE formato LIKE 'e08-%')" 2>/dev/null)
if [[ "$RESTOS" == "0" ]]; then
  verde "nada de prova ficou para trás"
else
  vermelho "ficaram $RESTOS linhas de prova — a próxima prova vai medir outra coisa"
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit $(( falhas > 0 ? 1 : 0 ))
