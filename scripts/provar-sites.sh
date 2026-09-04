#!/usr/bin/env bash
#
# O E10: os sites dos restaurantes, os leads e o domínio próprio.
#
# A régua está em `docs/reviews/ALVO-E10.md`, escrita antes de existir código, e
# os três ataques que ela promete são os três controlos negativos centrais deste
# script:
#
#   1. gravar rascunho e ir ao SITE PÚBLICO — não à pré-visualização;
#   2. PARTIR A GRAVAÇÃO do lead de propósito e ver se o ecrã diz sucesso;
#   3. DOIS inquilinos a disputar o mesmo domínio, com o par que separa a regra
#      certa da preguiçosa.
#
# ── A reposição é um RETRATO da base viva, e não uma lista de migrações ─────
#
# É a lição que o `provar-publico.sh` custou um dia inteiro: ele repunha "a
# função verdadeira a partir da migração", com o nome da migração escrito à mão,
# e a lista ficou para trás quando uma migração posterior corrigiu a função.
# Cada passagem da prova deixava na base a versão COM a fuga entre unidades, e o
# passo final dizia "voltou ao verde" porque nada media a fuga.
#
# Aqui não há lista para envelhecer: o retrato sai da base viva antes de se
# plantar seja o que for, e o último passo compara o fim com o princípio.
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

GRUPOS_ESPERADOS=3
# Conta CASOS (`it`) e não asserções: é o que o `# pass` do relator TAP dá, e o
# nome diz o que mede.
CASOS_ESPERADOS=27
falhas=0

LEADS=packages/db/src/leads.ts
SITES=packages/db/src/sites.ts
COPIAS=$(mktemp -d)
guardar() { cp "$1" "$COPIAS/$(echo "$1" | tr / _)"; }
repor()   { cp "$COPIAS/$(echo "$1" | tr / _)" "$1"; }
for f in "$LEADS" "$SITES"; do guardar "$f"; done

# ── O retrato das funções, tirado antes de plantar seja o que for ─────────
FUNCOES="$COPIAS/funcoes.sql"
psql "$MIGRATION_DATABASE_URL" -tAc "SELECT string_agg(pg_get_functiondef(p.oid), E';\n' ORDER BY p.oid) || ';'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind = 'f'" > "$FUNCOES"
if [[ ! -s "$FUNCOES" ]] || ! grep -q 'CREATE OR REPLACE FUNCTION' "$FUNCOES"; then
  echo "ERRO: não consegui retratar as funções da base — sem retrato não há reposição." >&2
  exit 2
fi
repor_funcoes() { psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$FUNCOES" >/dev/null; }

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  for f in "$LEADS" "$SITES"; do repor "$f"; done
  # As funções primeiro: se a prova morrer a meio de um controlo negativo, o que
  # fica na base é a versão plantada.
  repor_funcoes || echo "AVISO: não consegui repor as funções da base" >&2
  # E o índice de idempotência, que um dos controlos deixa cair.
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
CREATE UNIQUE INDEX IF NOT EXISTS "leads_organization_id_location_id_chave_idempotencia_key"
  ON leads (organization_id, location_id, chave_idempotencia);
GRANT SELECT, INSERT ON leads TO bossaos_app;
REVOKE UPDATE, DELETE ON leads FROM bossaos_app;
PY
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
DELETE FROM leads WHERE email LIKE '%@exemplo.example';
DELETE FROM custom_domains WHERE dominio LIKE 'e10-%';
DELETE FROM custom_domain_owners WHERE dominio LIKE 'e10-%';
DELETE FROM site_publications WHERE site_id IN (SELECT id FROM sites WHERE location_id IN
  (SELECT id FROM locations WHERE public_slug LIKE 'e10%'));
UPDATE locations SET public_slug = NULL WHERE public_slug LIKE 'e10%';
DELETE FROM public_slug_owners WHERE slug LIKE 'e10%';
PY
  rm -rf "$COPIAS"
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-timeout=180000 --test-reporter=tap \
    --experimental-strip-types provas/sites.test.ts >"$1" 2>&1
}

analisar() {
  local f="$1" grupos casos
  grep -q '^TAP version' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  casos=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$casos" ]] || return 2
  echo "$grupos $casos"
}

exigir_vermelho() {
  local descricao="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "ficou VERDE com o defeito plantado — a prova não mede isto"
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
if correr /tmp/bossaos-sites.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-sites.txt)"
  if [[ "$grupos" == "$GRUPOS_ESPERADOS" && "$casos" == "$CASOS_ESPERADOS" ]]; then
    verde "$grupos grupos verdes, $casos casos"
  else
    vermelho "contagem inesperada: $grupos / $casos (esperava $GRUPOS_ESPERADOS / $CASOS_ESPERADOS)"
  fi
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok' /tmp/bossaos-sites.txt | head -8
fi

echo
echo "2. ACEITE 1 — CONTROLO NEGATIVO: a porta pública passa a ler o RASCUNHO"
# ── O defeito que o aceite 1 existe para impedir ─────────────────────────
#
# Se a porta pública lesse as tabelas de rascunho em vez da revisão publicada,
# "guardar" passava a ser "publicar". É o defeito inteiro numa junção.
python3 - "$MIGRATION_DATABASE_URL" <<'FIMPY'
import subprocess, sys
url = sys.argv[1]
subprocess.run(['psql', url, '-q', '-v', 'ON_ERROR_STOP=1'], check=True,
  stdout=subprocess.DEVNULL, input='''
CREATE OR REPLACE FUNCTION publico_site(p_slug text)
RETURNS TABLE (organization_id uuid, location_id uuid, location_nome text, marca_nome text,
               fuso text, moeda text, revision_id uuid, revision_numero integer,
               conteudo jsonb, publicada_em timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $f$
  SELECT l.organization_id, l.id, l.nome, b.nome, l.fuso, l.moeda,
         gen_random_uuid(), 0,
         -- O DEFEITO: monta o corpo a partir do RASCUNHO, e nao da revisao.
         (SELECT coalesce(jsonb_build_object(
            'seo', jsonb_build_object('titulo', s.seo_titulo, 'descricao', s.seo_descricao),
            'redes', '[]'::jsonb,
            'paginas', coalesce((SELECT jsonb_agg(jsonb_build_object(
                 'tipo', pg.tipo, 'titulo', pg.titulo, 'corpo', pg.corpo, 'contacto', pg.contacto))
               FROM site_pages pg WHERE pg.site_id = s.id), '[]'::jsonb),
            'novidades', coalesce((SELECT jsonb_agg(jsonb_build_object(
                 'slug', po.slug, 'titulo', po.titulo, 'resumo', po.resumo,
                 'corpo', po.corpo, 'publicadoEm', po.publicado_em))
               FROM site_posts po WHERE po.site_id = s.id), '[]'::jsonb)
          ), '{}'::jsonb)),
         now()
  FROM locations l
  JOIN brands b ON b.organization_id = l.organization_id AND b.id = l.brand_id
  JOIN sites s ON s.organization_id = l.organization_id AND s.location_id = l.id
  WHERE l.public_slug = p_slug AND l.archived_at IS NULL
  LIMIT 1
$f$;
''', text=True)
FIMPY
exigir_vermelho "caiu a asserção do rascunho que não pode sair" \
  'RASCUNHO NÃO MUDA O PÚBLICO|não muda o público' /tmp/bossaos-sites-rascunho.txt
repor_funcoes

echo
echo "3. ACEITE 1 — CONTROLO NEGATIVO: retirar põe uma BANDEIRA em vez de apagar"
# A régua reprova «uma página em cache com o conteúdo antigo». Uma bandeira
# deixa o conteúdo alcançável a quem se esqueça de a ler — e aqui esquece-se.
python3 - "$SITES" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = "  const apagados = await db.sitePublication.deleteMany({ where: { siteId } });"
assert alvo in s, 'o alvo do controlo negativo mudou de forma'
p.write_text(s.replace(alvo, "  const apagados = { count: 1 };"), encoding='utf-8')
FIMPY
exigir_vermelho "caiu a asserção do site retirado que continua a responder" \
  'RETIRAR tira do ar' /tmp/bossaos-sites-retirar.txt
repor "$SITES"

echo
echo "4. ACEITE 2 — CONTROLO NEGATIVO: cai a idempotência do lead"
# Sem a restrição única, o duplo clique grava dois. É a prova de que a
# idempotência é da BASE e não de um `if` — que em série passaria à mesma.
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
DROP INDEX IF EXISTS "leads_organization_id_location_id_chave_idempotencia_key";
PY
exigir_vermelho "caiu a asserção do duplo clique" \
  'DUPLO CLIQUE' /tmp/bossaos-sites-duplo.txt
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
CREATE UNIQUE INDEX IF NOT EXISTS "leads_organization_id_location_id_chave_idempotencia_key"
  ON leads (organization_id, location_id, chave_idempotencia);
PY

echo
echo "5. ACEITE 2 — CONTROLO NEGATIVO: o \`catch\` largo, que é o defeito CARO"
# ── Este é o que a régua chama o mais caro dos três ──────────────────────
#
# «perde dinheiro sem barulho». O defeito não se escreve por descuido: escreve-se
# por cuidado mal dirigido — um `try/catch` à volta da escrita "para a página não
# rebentar ao cliente". A partir daí uma base em baixo devolve exactamente o
# mesmo ecrã que uma gravação bem-sucedida.
python3 - "$LEADS" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = """    if (codigo === '23505' || texto.includes('leads_organization_id_location_id_chave')) {
      return { ok: true, duplicado: true };
    }
    throw erro;"""
assert alvo in s, 'o alvo do controlo negativo mudou de forma'
p.write_text(s.replace(alvo, """    void codigo; void texto;
    return { ok: true, duplicado: true };"""), encoding='utf-8')
FIMPY
exigir_vermelho "caiu a asserção da falha real que não pode dizer sucesso" \
  'FALHA REAL NÃO DEVOLVE SUCESSO' /tmp/bossaos-sites-catch.txt
repor "$LEADS"

echo
echo "6. ACEITE 3 — CONTROLO NEGATIVO: o domínio largado volta ao mundo"
# O `@unique` impede dois AO MESMO TEMPO. Isto é dois EM SEQUÊNCIA: A larga, B
# reclama, e os cartões e anúncios de A passam a levar gente ao concorrente.
python3 - "$MIGRATION_DATABASE_URL" <<'FIMPY'
import subprocess, sys
subprocess.run(['psql', sys.argv[1], '-q', '-v', 'ON_ERROR_STOP=1'], check=True,
  stdout=subprocess.DEVNULL, input='''
CREATE OR REPLACE FUNCTION vincular_dominio(
  p_organization_id uuid, p_location_id uuid, p_dominio text, p_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE v_dominio text := lower(btrim(p_dominio)); v_em_uso uuid;
BEGIN
  IF v_dominio !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    THEN RETURN 'invalido'; END IF;
  -- O DEFEITO: so' olha a quem esta' a usar AGORA, e ignora o dono anterior.
  SELECT organization_id INTO v_em_uso FROM custom_domains WHERE dominio = v_dominio;
  IF v_em_uso IS NOT NULL AND v_em_uso <> p_organization_id THEN RETURN 'em_uso'; END IF;
  INSERT INTO custom_domain_owners (dominio, organization_id, location_id, updated_at)
  VALUES (v_dominio, p_organization_id, p_location_id, now())
  ON CONFLICT (dominio) DO UPDATE SET location_id = EXCLUDED.location_id, updated_at = now();
  INSERT INTO custom_domains (id, organization_id, location_id, dominio, estado,
                              token_verificacao, updated_at)
  VALUES (gen_random_uuid(), p_organization_id, p_location_id, v_dominio, 'PENDENTE',
          p_token, now())
  ON CONFLICT (dominio) DO UPDATE SET location_id = EXCLUDED.location_id, estado = 'PENDENTE',
    token_verificacao = EXCLUDED.token_verificacao, verificado_em = NULL, updated_at = now();
  RETURN 'ok';
END; $f$;
''', text=True)
FIMPY
exigir_vermelho "caiu a asserção de B não poder reclamar" \
  'B CONTINUA A NÃO PODER RECLAMAR|B NÃO PODE reclamar' /tmp/bossaos-sites-reclamado.txt
repor_funcoes

echo
echo "7. ACEITE 3 — CONTROLO NEGATIVO: a regra PREGUIÇOSA, que proíbe todos"
# ── O par que o sénior pediu por escrito ─────────────────────────────────
#
# Uma implementação que recusasse QUALQUER domínio já usado passa no controlo de
# cima e está errada: impede o dono de voltar depois de uma pausa. Sem este par,
# a versão preguiçosa era indistinguível da certa.
python3 - "$MIGRATION_DATABASE_URL" <<'FIMPY'
import subprocess, sys
subprocess.run(['psql', sys.argv[1], '-q', '-v', 'ON_ERROR_STOP=1'], check=True,
  stdout=subprocess.DEVNULL, input='''
CREATE OR REPLACE FUNCTION vincular_dominio(
  p_organization_id uuid, p_location_id uuid, p_dominio text, p_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE v_dominio text := lower(btrim(p_dominio)); v_dono uuid;
BEGIN
  IF v_dominio !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    THEN RETURN 'invalido'; END IF;
  SELECT organization_id INTO v_dono FROM custom_domain_owners WHERE dominio = v_dominio;
  -- O DEFEITO: recusa a QUALQUER um, incluindo ao proprio dono.
  IF v_dono IS NOT NULL THEN RETURN 'reservado_por_outra_organizacao'; END IF;
  INSERT INTO custom_domain_owners (dominio, organization_id, location_id, updated_at)
  VALUES (v_dominio, p_organization_id, p_location_id, now());
  INSERT INTO custom_domains (id, organization_id, location_id, dominio, estado,
                              token_verificacao, updated_at)
  VALUES (gen_random_uuid(), p_organization_id, p_location_id, v_dominio, 'PENDENTE',
          p_token, now());
  RETURN 'ok';
END; $f$;
''', text=True)
FIMPY
exigir_vermelho "caiu a asserção do dono retomar — é o par que separa as duas" \
  'A RETOMA o domínio dele' /tmp/bossaos-sites-preguicosa.txt
repor_funcoes

echo
echo "8. ACEITE 3 — CONTROLO NEGATIVO: a porta serve sem prova de controlo"
# Regra 1: escrever o domínio numa caixa não prova nada. Se a porta servisse
# PENDENTE, qualquer inquilino apontava o DNS de outro para nós e servia o site
# dele no domínio que escreveu.
python3 - "$MIGRATION_DATABASE_URL" <<'FIMPY'
import subprocess, sys
url = sys.argv[1]
defn = subprocess.run(['psql', url, '-tAc',
  "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'publico_site_por_dominio'"],
  capture_output=True, text=True, check=True).stdout
linhas = defn.splitlines()
sem = [l for l in linhas if "d.estado IN" not in l]
assert len(sem) == len(linhas) - 1, 'o alvo do controlo negativo mudou de forma'
subprocess.run(['psql', url, '-q', '-v', 'ON_ERROR_STOP=1'], check=True,
               stdout=subprocess.DEVNULL, input='\n'.join(sem) + ';\n', text=True)
FIMPY
exigir_vermelho "caiu a asserção do domínio pendente que não serve" \
  'PENDENTE NÃO SERVE CONTEÚDO' /tmp/bossaos-sites-pendente.txt
repor_funcoes

echo
echo "9. Reposto — tem de voltar ao verde"
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1
if correr /tmp/bossaos-sites-reposto.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-sites-reposto.txt)"
  verde "reposto: $grupos grupos, $casos casos"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-sites-reposto.txt | head -6
fi

echo
echo "10. A árvore ficou limpa?"
RESTOS=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT
  (SELECT count(*) FROM sites WHERE location_id IN (SELECT id FROM locations WHERE public_slug LIKE 'e10%'))
+ (SELECT count(*) FROM custom_domains WHERE dominio LIKE 'e10-%')
+ (SELECT count(*) FROM custom_domain_owners WHERE dominio LIKE 'e10-%')
+ (SELECT count(*) FROM locations WHERE public_slug LIKE 'e10%')" 2>/dev/null)
if [[ "$RESTOS" == "0" ]]; then
  verde "nada de prova ficou para trás"
else
  vermelho "ficaram $RESTOS linhas de prova"
fi

echo
echo "11. As funções da base ficaram como as encontrei?"
# Esta prova substitui funções cinco vezes. Uma prova que deixa a base pior do
# que a encontrou é uma prova que faz mal — e já aconteceu neste projecto.
DEPOIS=$(mktemp)
psql "$MIGRATION_DATABASE_URL" -tAc "SELECT string_agg(pg_get_functiondef(p.oid), E';\n' ORDER BY p.oid) || ';'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind = 'f'" > "$DEPOIS"
if diff -q "$FUNCOES" "$DEPOIS" >/dev/null 2>&1; then
  verde "as $(grep -c 'CREATE OR REPLACE FUNCTION' "$FUNCOES") funções estão como estavam"
else
  vermelho "a prova deixou funções diferentes das que encontrou"
  diff "$FUNCOES" "$DEPOIS" | head -20
fi
rm -f "$DEPOIS"

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas falhas"; fi
exit $(( falhas > 0 ? 1 : 0 ))
