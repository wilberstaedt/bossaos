#!/usr/bin/env bash
#
# O E09: a carta pública, o QR e o que NÃO pode sair.
#
# A régua está em `docs/reviews/ALVO-E09.md` e nos contratos do E00.
#
# ── O que esta prova existe para não deixar passar ─────────────────────────
#
# > **A armadilha desta área é o campo que vem e não se mostra.** Um `select *`
# > que chega ao navegador e é filtrado no React não é privacidade — é uma fuga
# > com uma cortina à frente.
#
# Por isso o que se mede é o CORPO da resposta, com um catálogo montado de
# propósito para ter um produto oculto, um SKU interno e um campo de custo.
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

GRUPOS_ESPERADOS=5
ASSERCOES_ESPERADAS=16
falhas=0

PROJ=packages/domain/src/projeccao.ts
CHAVES=packages/domain/src/chaves.ts
PUBDB=packages/db/src/publicacao.ts
PUBLICO=packages/db/src/publico.ts
COPIAS=$(mktemp -d)
# Indexada pelo CAMINHO e não pelo nome: `publicacao.ts` existe em dois pacotes,
# e foi assim que um guarda meu do E08 escreveu um ficheiro por cima do outro.
guardar() { cp "$1" "$COPIAS/$(echo "$1" | tr / _)"; }
repor()   { cp "$COPIAS/$(echo "$1" | tr / _)" "$1"; }
for f in "$PROJ" "$CHAVES" "$PUBDB" "$PUBLICO"; do guardar "$f"; done

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  for f in "$PROJ" "$CHAVES" "$PUBDB" "$PUBLICO"; do repor "$f"; done
  rm -rf "$COPIAS"
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
UPDATE locations SET public_slug = NULL WHERE public_slug LIKE 'e09%';
DELETE FROM menu_views WHERE revision_id IN (SELECT id FROM menu_revisions WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE 'e09-%'));
DELETE FROM menu_publications WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE 'e09-%');
DELETE FROM menu_revisions    WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE 'e09-%');
DELETE FROM menu_categories   WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE 'e09-%');
DELETE FROM menus             WHERE nome LIKE 'e09-%';
DELETE FROM product_channels WHERE product_id IN (SELECT id FROM products WHERE nome LIKE 'e09-%');
DELETE FROM price_rules      WHERE product_id IN (SELECT id FROM products WHERE nome LIKE 'e09-%');
DELETE FROM products         WHERE nome LIKE 'e09-%';
DELETE FROM categories       WHERE nome LIKE 'e09-%';
PY
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-timeout=180000 --test-reporter=tap \
    --experimental-strip-types provas/publico.test.ts >"$1" 2>&1
}

analisar() {
  local f="$1" grupos assercoes
  grep -q '^TAP version' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  assercoes=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$assercoes" ]] || return 2
  echo "$grupos $assercoes"
}

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
if correr /tmp/bossaos-pb.txt; then
  read -r grupos assercoes <<<"$(analisar /tmp/bossaos-pb.txt)"
  if [[ "$grupos" == "$GRUPOS_ESPERADOS" && "$assercoes" == "$ASSERCOES_ESPERADAS" ]]; then
    verde "$grupos grupos verdes, $assercoes asserções"
  else
    vermelho "contagem inesperada: $grupos / $assercoes (esperava $GRUPOS_ESPERADOS / $ASSERCOES_ESPERADAS)"
  fi
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok' /tmp/bossaos-pb.txt | head -8
fi

echo
echo "2. CONTROLO NEGATIVO — a projecção espalha o item em vez de o ler campo a campo"
# O defeito que a régua nomeia: o campo que vem e não se mostra. Um `...item`
# escrito por conveniência traz o SKU e o custo para dentro do corpo.
python3 - "$PROJ" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = """    const produto: ProdutoPublico = {
      id,"""
assert alvo in s, 'o alvo do controlo negativo mudou de forma'
p.write_text(s.replace(alvo, """    const produto: ProdutoPublico = {
      ...(item as object),
      id,"""), encoding='utf-8')
FIMPY
exigir_vermelho "caiu a asserção do SKU e do custo no corpo" \
  'NEM SKU NEM CUSTO' /tmp/bossaos-pb-espalha.txt
repor "$PROJ"

echo
echo "3. CONTROLO NEGATIVO — a revisão deixa de filtrar o canal (catálogo oculto)"
python3 - "$PUBDB" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = "        canais: { some: { canal, visivel: true } },"
assert alvo in s, 'o alvo do controlo negativo mudou de forma'
p.write_text(s.replace(alvo, ''), encoding='utf-8')
FIMPY
exigir_vermelho "caiu a asserção do produto oculto na carta pública" \
  'PRODUTO OCULTO' /tmp/bossaos-pb-oculto.txt
repor "$PUBDB"

echo
echo "4. CONTROLO NEGATIVO — a chave de cache esquece a publicação"
# É o aceite 1 do E08 a falhar por outra porta: a transacção fica certa e o que
# o cliente vê fica velho.
python3 - "$CHAVES" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = "return chaveDeCache(escopo, 'carta', revisionId, idioma, canal);"
assert alvo in s, 'o alvo do controlo negativo mudou de forma'
p.write_text(s.replace(alvo, "return chaveDeCache(escopo, 'carta', idioma, canal);"), encoding='utf-8')
FIMPY
exigir_vermelho "caiu a asserção da publicação na chave" \
  'A PUBLICAÇÃO ENTRA NA CHAVE' /tmp/bossaos-pb-chave.txt
repor "$CHAVES"

echo
echo "5. CONTROLO NEGATIVO — a consulta volta a falhar em silêncio"
# O defeito que este caminho já teve: `set_config` local à transacção com duas
# chamadas soltas. Contava zero e não se queixava.
python3 - "$PUBLICO" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = "    await prisma.$transaction(async (tx) => {"
assert alvo in s, 'o alvo do controlo negativo mudou de forma'
s = s.replace(alvo, "    await (async (tx: typeof prisma) => {")
s = s.replace("    });\n    return { contou: true };", "    })(prisma);\n    return { contou: true };")
p.write_text(s, encoding='utf-8')
FIMPY
exigir_vermelho "caiu a asserção da consulta contada" \
  'ESCREVE' /tmp/bossaos-pb-consulta.txt
repor "$PUBLICO"

echo
echo "6. CONTROLO NEGATIVO — a porta pública deixa de exigir publicação"
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'SQL'
CREATE OR REPLACE FUNCTION publico_carta(p_slug text, p_canal "Canal")
RETURNS TABLE (organization_id uuid, location_id uuid, location_nome text, marca_nome text,
               fuso text, moeda text, revision_id uuid, revision_numero integer,
               conteudo jsonb, publicada_em timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $f$
  SELECT l.organization_id, l.id, l.nome, b.nome, l.fuso, l.moeda,
         r.id, r.numero, r.conteudo, r.created_at
  FROM locations l
  JOIN brands b ON b.organization_id = l.organization_id AND b.id = l.brand_id
  JOIN menu_revisions r ON r.organization_id = l.organization_id
  WHERE l.public_slug = p_slug AND l.archived_at IS NULL
  ORDER BY r.created_at DESC LIMIT 1
$f$;
SQL
exigir_vermelho "caiu a asserção do que está publicado" \
  'só devolve o que está publicado' /tmp/bossaos-pb-sem-publicacao.txt
# Repor a função verdadeira, a partir da migração.
psql "$MIGRATION_DATABASE_URL" -q -f packages/db/prisma/migrations/20260904091000_e09_porta_publica/migration.sql >/dev/null 2>&1
psql "$MIGRATION_DATABASE_URL" -q -f packages/db/prisma/migrations/20260904093000_e09_horario_por_configurar/migration.sql >/dev/null 2>&1

echo
echo "7. Reposto — tem de voltar ao verde"
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1
if correr /tmp/bossaos-pb-reposto.txt; then
  read -r grupos assercoes <<<"$(analisar /tmp/bossaos-pb-reposto.txt)"
  verde "reposto: $grupos grupos, $assercoes asserções"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-pb-reposto.txt | head -6
fi

echo
echo "8. A árvore ficou limpa?"
RESTOS=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT
  (SELECT count(*) FROM menus WHERE nome LIKE 'e09-%')
+ (SELECT count(*) FROM products WHERE nome LIKE 'e09-%')
+ (SELECT count(*) FROM locations WHERE public_slug LIKE 'e09%')" 2>/dev/null)
if [[ "$RESTOS" == "0" ]]; then
  verde "nada de prova ficou para trás"
else
  vermelho "ficaram $RESTOS linhas de prova"
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas falhas"; fi
exit $(( falhas > 0 ? 1 : 0 ))
