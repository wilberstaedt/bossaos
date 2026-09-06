#!/usr/bin/env bash
#
# O E07: alérgenos, preços, modificadores e edição concorrente.
#
# A régua está em `docs/architecture/catalogo-e-publicacao.md` e `dinheiro.md`,
# escritos no E00, e em `docs/reviews/ALVO-E07.md`.
#
# ── O que esta prova existe para não deixar passar ─────────────────────────
#
# > **Ausência de dados sobre alérgenos não significa ausência de alérgenos.**
#
# É a regra do produto inteiro onde o erro tem consequência física, e o par que a
# mede é o grupo 1: não declarado dá `DESCONHECIDO`, declarado-ausente dá
# `NAO_CONTEM`, e há uma asserção a exigir que os dois sejam **diferentes**.
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

GRUPOS_ESPERADOS=7
ASSERCOES_ESPERADAS=21
falhas=0
ALERG=packages/domain/src/alergenios.ts
PRECOS=packages/domain/src/precos.ts
CAT=packages/db/src/catalogo.ts
DIC=packages/i18n/src/mensagens/en.json
ORIG_ALERG=$(mktemp); ORIG_PRECOS=$(mktemp); ORIG_CAT=$(mktemp); ORIG_DIC=$(mktemp)
cp "$ALERG" "$ORIG_ALERG"; cp "$PRECOS" "$ORIG_PRECOS"; cp "$CAT" "$ORIG_CAT"; cp "$DIC" "$ORIG_DIC"
RLS_DESLIGADO=0
PORTA="${PORTA_PROVA:-3012}"
export BASE_URL="http://127.0.0.1:$PORTA"
# Sem isto a biblioteca recusa as mutações com "Invalid origin": a origem de
# confiança sai de `BETTER_AUTH_URL`, e o `.env` aponta ao porto de
# desenvolvimento. A prova de acesso do E04 faz o mesmo.
export BETTER_AUTH_URL="$BASE_URL"
PID_APP=""
ROTA="apps/web/app/api/org/[orgSlug]/produtos/[productId]/opcoes/route.ts"
ORIG_ROTA=$(mktemp); cp "$ROTA" "$ORIG_ROTA"

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── Um plante tem de VERIFICAR-SE ────────────────────────────────────────────
#
# Se a âncora já não existe, o `assert` do python dispara, o guião segue, e o
# `exigir_vermelho` corre contra um produto INTACTO: o produto passa, e o guião
# conclui que a asserção é vazia. É uma acusação falsa — e cinco das dez falhas
# do corredor de 06/09 eram exactamente isso.
#
# Aqui o código de saída do plante é lido. Se ele não pegou, a falha é do GUIÃO
# e diz-se assim, em vez de se atribuir ao produto.
plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

parar_app() {
  if [[ -n "$PID_APP" ]]; then kill "$PID_APP" 2>/dev/null || true; wait "$PID_APP" 2>/dev/null || true; PID_APP=""; fi
  local restantes; restantes=$(lsof -ti ":$PORTA" 2>/dev/null || true)
  [[ -n "$restantes" ]] && kill -9 $restantes 2>/dev/null || true
}

construir_e_subir() {
  rm -rf apps/web/.next
  if ! pnpm build >/tmp/bossaos-cat-build.log 2>&1; then
    vermelho "o build falhou — a prova por HTTP não tem o que interrogar"
    tail -12 /tmp/bossaos-cat-build.log
    return 1
  fi
  pnpm --filter @bossaos/web exec next start -p "$PORTA" >/tmp/bossaos-cat-app.log 2>&1 &
  PID_APP=$!
  for _ in $(seq 1 60); do
    curl -fsS "$BASE_URL/api/health" >/dev/null 2>&1 && return 0
    kill -0 "$PID_APP" 2>/dev/null || return 1
    sleep 0.5
  done
  return 1
}

# `--test-timeout`: uma prova que pendura é pior do que uma que falha — não dá
# diagnóstico nenhum e come a corrida inteira da CI.
correr_http() { node --test --test-timeout=180000 --test-reporter=tap \
  --experimental-strip-types provas/catalogo-http.test.ts >"$1" 2>&1; }

restaurar() {
  parar_app
  cp "$ORIG_ROTA" "$ROTA"; rm -f "$ORIG_ROTA"
  rm -rf apps/web/.next
  cp "$ORIG_ALERG" "$ALERG"; cp "$ORIG_PRECOS" "$PRECOS"; cp "$ORIG_CAT" "$CAT"; cp "$ORIG_DIC" "$DIC"
  rm -f "$ORIG_ALERG" "$ORIG_PRECOS" "$ORIG_CAT" "$ORIG_DIC"
  if [[ "$RLS_DESLIGADO" == "1" ]]; then
    psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE products ENABLE ROW LEVEL SECURITY' >/dev/null 2>&1
    RLS_DESLIGADO=0
    printf '  (a política de linha dos produtos foi religada)\n'
  fi
  # O que esta prova cria sai sempre, mesmo que ela morra a meio. Foi lixo de uma
  # prova minha que partiu a prova de isolamento do E03 durante o E06.
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
DELETE FROM product_modifier_groups WHERE product_id IN (SELECT id FROM products WHERE nome LIKE 'e07%');
DELETE FROM modifier_options WHERE group_id IN (SELECT id FROM modifier_groups WHERE nome LIKE 'e07%');
DELETE FROM products        WHERE nome LIKE 'e07%';
DELETE FROM modifier_groups WHERE nome LIKE 'e07%';
DELETE FROM role_assignments WHERE membership_id IN (
  SELECT id FROM memberships WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dona-cat-%@exemplo.example'));
DELETE FROM memberships WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dona-cat-%@exemplo.example');
DELETE FROM sessions    WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dona-cat-%@exemplo.example');
DELETE FROM accounts    WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dona-cat-%@exemplo.example');
DELETE FROM users       WHERE email LIKE 'dona-cat-%@exemplo.example';
PY
}
trap restaurar EXIT INT TERM

correr() { node --test --test-reporter=tap --experimental-strip-types provas/catalogo.test.ts >"$1" 2>&1; }

analisar() {
  local f="$1" grupos assercoes
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  assercoes=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$assercoes" ]] || return 2
  echo "$grupos $assercoes"
}

# Exige vermelho E que caia a asserção certa. `^ *not ok` e não só o marcador: o
# nome do teste aparece nas duas linhas, e procurar só o nome dava verde a uma
# execução vermelha por outro motivo.
exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if grep -qE "^ *not ok .*$marcador" "$ficheiro"; then
    verde "$nome"
  else
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '^ *not ok' "$ficheiro" | head -4
  fi
}

echo "0. Fixtures"
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1 \
  && verde "semeadas" || { vermelho "não foi possível semear"; exit 1; }

echo
echo "1. Com tudo ligado"
if correr /tmp/bossaos-cat-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-cat-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos assercoes <<<"$leitura"
  if (( grupos == 0 )) || (( assercoes == 0 )); then
    vermelho "VERDE COM ZERO MEDIDO: $grupos grupos, $assercoes asserções."; exit 1
  fi
  if (( grupos != GRUPOS_ESPERADOS )) || (( assercoes != ASSERCOES_ESPERADAS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $assercoes asserções (esperadas $ASSERCOES_ESPERADAS)"
    exit 1
  fi
  verde "$grupos grupos verdes, $assercoes asserções"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-cat-ligado.txt | head -12
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a ausência de alérgeno passa a ler-se como 'não contém'"
# O defeito exacto que o contrato proíbe, e o que qualquer pessoa escreveria sem
# pensar. Tem de fazer cair o par — e SÓ o par.
# ── A âncora mudou de sítio porque a REGRA mudou de sítio ─────────────────
#
# Plantava em `fichaDeAlergenios`, onde a linha era `d ? d.estado :
# 'DESCONHECIDO'` — a mesma regra escrita duas vezes. O E34 tirou a cópia e a
# ficha passou a chamar o `estadoDoAlergenio`, e o plante ficou em letra morta:
# o `assert` disparava, o guião não lia o código de saída, e o `exigir_vermelho`
# corria contra um produto INTACTO. O produto passava, e o guião concluía que a
# asserção era vazia — uma acusação falsa ao caso mais perigoso deste produto.
#
# Agora aponta ao ÚNICO sítio onde a regra vive, que é o que o refactor
# conseguiu: um alérgeno sem linha passa a ler-se como «não contém».
plantar <<'PY'
import io
p = 'packages/domain/src/alergenios.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return d ? d.estado : 'DESCONHECIDO';"
assert antigo in s, 'a regra do alergénio nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  return d ? d.estado : 'NAO_CONTEM';", 1))
PY
exigir_vermelho "caiu a asserção dos catorze desconhecidos" \
  'TODOS os catorze são DESCONHECIDO' /tmp/bossaos-cat-sem-desconhecido.txt
if grep -qE '^ *ok .*a segunda vê conflito|^ *ok .*bloquear tira da venda' /tmp/bossaos-cat-sem-desconhecido.txt; then
  verde "o resto continuou verde: caiu a leitura dos alérgenos, não a prova toda"
else
  vermelho "caiu demasiada coisa — o vermelho não vem dos alérgenos"
fi
cp "$ORIG_ALERG" "$ALERG"

echo
echo "3. CONTROLO NEGATIVO — o empate de preços resolvido pelo primeiro"
plantar <<'PY' || true
import io
p = 'packages/domain/src/precos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    if (desteNivel.length > 1) {"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    if (false) {"))
PY
exigir_vermelho "caiu a asserção do conflito" \
  'dois overrides do MESMO nível' /tmp/bossaos-cat-sem-conflito.txt
if grep -qE '^ *ok .*uma regra só desse nível resolve' /tmp/bossaos-cat-sem-conflito.txt; then
  verde "o lado positivo continuou verde: é o par que separa os dois"
else
  vermelho "caiu também o lado positivo — a prova não distingue empate de resolução"
fi
cp "$ORIG_PRECOS" "$PRECOS"

echo
echo "4. CONTROLO NEGATIVO — a validação de modificadores deixa de olhar para a base"
# Uma rota que "valide" com os limites que o cliente enviou não valida nada. Isto
# simula o caso extremo: a validação devolve sempre vazio.
plantar <<'PY' || true
import io
p = 'packages/db/src/catalogo.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return validarEscolhas(await gruposDoProduto(db, productId), escolhas);"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  void db; void productId; void escolhas; return [];"))
PY
exigir_vermelho "caiu a asserção do grupo obrigatório" \
  'sem escolher nada' /tmp/bossaos-cat-sem-modificadores.txt
cp "$ORIG_CAT" "$CAT"

echo
echo "5. CONTROLO NEGATIVO — o conflito de versão deixa de ser verificado"
plantar <<'PY' || true
import io
p = 'packages/db/src/catalogo.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    where: { id, version: versao },"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    where: { id },"))
PY
exigir_vermelho "caiu a asserção da edição concorrente" \
  'a MESMA versão' /tmp/bossaos-cat-sem-versao.txt
cp "$ORIG_CAT" "$CAT"

echo
echo "6. CONTROLO NEGATIVO — a política de linha dos produtos desligada"
psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE products DISABLE ROW LEVEL SECURITY' >/dev/null 2>&1
RLS_DESLIGADO=1
exigir_vermelho "caiu a asserção do isolamento" \
  'as tabelas novas têm política de linha' /tmp/bossaos-cat-sem-rls.txt
psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE products ENABLE ROW LEVEL SECURITY' >/dev/null 2>&1
RLS_DESLIGADO=0

echo
echo "7. Reposto — tem de voltar ao verde"
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1
if correr /tmp/bossaos-cat-reposto.txt; then
  read -r grupos assercoes <<<"$(analisar /tmp/bossaos-cat-reposto.txt)"
  verde "reposto: $grupos grupos, $assercoes asserções"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-cat-reposto.txt | head -6
fi

echo
echo "8. O dicionário de alérgenos acompanha o domínio?"
# ── Porque é que isto é uma asserção e não uma revisão de código ───────────
#
# A ficha faz `dicionario[codigo] ?? codigo`. Sem entrada, mostra o código cru —
# "frutos-de-casca" a um cliente inglês. Numa tabela qualquer seria feio; **na
# ficha de alérgenos é uma linha que a pessoa não lê**, e pode ser a dela.
#
# Nada mais o apanha: o TypeScript não vê dentro de um índice de cadeia, e a
# paridade de chaves compara as três línguas ENTRE SI — as três erradas da mesma
# maneira está alinhado. A comparação tem de ser contra a lista do DOMÍNIO.
correr_i18n() { pnpm --filter @bossaos/i18n exec node --test --test-reporter=tap \
  --experimental-strip-types "src/**/*.test.ts" >"$1" 2>&1; }

if correr_i18n /tmp/bossaos-cat-i18n.txt; then
  verde "os catorze do Anexo II estão nomeados nas três línguas"
else
  vermelho "o dicionário de alérgenos não bate certo com o domínio"
  grep -E '^ *not ok' /tmp/bossaos-cat-i18n.txt | head -4
fi

echo
echo "9. CONTROLO NEGATIVO — um alérgeno por traduzir"
# Apaga "sesamo" do inglês, que é exactamente o que acontece quando alguém
# acrescenta um alérgeno ao domínio e traduz só duas línguas.
python3 - "$DIC" <<'FIM'
import json, sys, collections
p = sys.argv[1]
d = json.load(open(p, encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
d['alergenios'].pop('sesamo', None)
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
FIM
if correr_i18n /tmp/bossaos-cat-i18n-sem.txt; then
  vermelho "ficou verde com um alérgeno por traduzir — a guarda não mede nada"
else
  if grep -qE '^ *not ok .*(nomeia os catorze|Anexo II)' /tmp/bossaos-cat-i18n-sem.txt; then
    verde "caiu a asserção do dicionário — é ela que mede"
  else
    vermelho "ficou vermelho por outro motivo, não pelo dicionário"
    grep -E '^ *not ok' /tmp/bossaos-cat-i18n-sem.txt | head -4
  fi
  # A paridade de chaves TAMBÉM tem de cair: apagar do inglês desalinha as três.
  if grep -qE '^ *not ok .*mesmas chaves' /tmp/bossaos-cat-i18n-sem.txt; then
    verde "e a paridade de chaves apanhou o desalinhamento"
  else
    vermelho "a paridade de chaves não viu uma chave apagada de uma língua"
  fi
fi
cp "$ORIG_DIC" "$DIC"

echo
echo "10. Por HTTP: a rota valida modificadores, com sessão real"
# ── Porque é que a prova de cima não bastava ───────────────────────────────
#
# `catalogo.test.ts` chama `validarEscolhasDoProduto` — a FUNÇÃO. Isso mostra
# que o motor está certo; não mostra que a ROTA o usa. O sénior pediu
# *"validados também por chamada direta da API"*, e no E04 essa exigência
# significou HTTP com sessões a sério. Significa o mesmo aqui.
if construir_e_subir; then
  if correr_http /tmp/bossaos-cat-http.txt; then
    verde "$(grep -m1 -oE '^# pass [0-9]+' /tmp/bossaos-cat-http.txt | grep -oE '[0-9]+') asserções por HTTP"
  else
    vermelho "a prova por HTTP falhou"
    grep -E '^ *not ok' /tmp/bossaos-cat-http.txt | head -6
  fi
else
  vermelho "não foi possível subir a aplicação para a prova por HTTP"
fi

echo
echo "11. CONTROLO NEGATIVO — a rota passa a acreditar nos limites do corpo"
# O defeito que o aceite 2 existe para proibir, escrito como alguém o escreveria
# a partir do formulário: os grupos vêm no pedido, e a rota valida contra eles.
parar_app
python3 - "$ROTA" <<'FIM'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
s = s.replace("""  const problemas = await comEscopoDoPedido(sessao, (db) =>
    validarEscolhasDoProduto(db, productId, escolhas),
  );""",
"""  const doCorpo = (corpo as { grupos?: unknown })?.grupos;
  const problemas = Array.isArray(doCorpo)
    ? validarEscolhas(doCorpo as never, escolhas)
    : await comEscopoDoPedido(sessao, (db) => validarEscolhasDoProduto(db, productId, escolhas));""")
s = s.replace("import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';",
              "import { corpoDaResposta, estadoHttp, exigirAccao, validarEscolhas } from '@bossaos/domain';")
p.write_text(s, encoding='utf-8')
FIM
if construir_e_subir; then
  if correr_http /tmp/bossaos-cat-http-mau.txt; then
    vermelho "ficou verde com a rota a acreditar no corpo — a prova não mede o aceite"
  else
    if grep -qE '^ *not ok .*limites do corpo são ignorados' /tmp/bossaos-cat-http-mau.txt; then
      verde "caiu a asserção dos limites do corpo — é ela que carrega o aceite"
    else
      vermelho "ficou vermelho por outro motivo, não pelos limites"
      grep -E '^ *not ok' /tmp/bossaos-cat-http-mau.txt | head -4
    fi
    if grep -qE '^ *not ok .*uma escolha válida passa' /tmp/bossaos-cat-http-mau.txt; then
      vermelho "o lado positivo também caiu — não é o par que separa os dois"
    else
      verde "o lado positivo continuou verde: caiu a origem dos limites, não a rota"
    fi
  fi
else
  vermelho "não foi possível subir a aplicação com o defeito plantado"
fi
parar_app
cp "$ORIG_ROTA" "$ROTA"

echo
echo "12. A árvore ficou limpa?"
# A guarda que o E06 ensinou: quem faz a sujidade é quem a tem de apanhar, não a
# prova seguinte. Uma prova que deixa produtos para trás faz a de isolamento
# contar os dela.
RESTOS=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT
  (SELECT count(*) FROM products WHERE nome LIKE 'e07%')
+ (SELECT count(*) FROM modifier_groups WHERE nome LIKE 'e07%')
+ (SELECT count(*) FROM users WHERE email LIKE 'dona-cat-%@exemplo.example')" 2>/dev/null)
if [[ "$RESTOS" == "0" ]]; then
  verde "nada de prova ficou para trás (produtos, grupos e contas)"
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
