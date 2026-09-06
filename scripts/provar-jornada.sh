#!/usr/bin/env bash
#
# A JORNADA — correcção 4 do marco E11.
#
# ── O que a revisão do marco disse, e que continua a ser a régua ──────────
#
#   > «11 das 13 provas partem de fixtures. Cada passo está provado a partir de
#   >  estado preparado. Nenhuma prova encadeia dois passos. Provar a peça não
#   >  prova o caminho: cada segmento pode estar certo e o produto ser
#   >  inutilizável se o estado que o passo N produz não for o que o passo N+1
#   >  aceita.»
#
# Esta prova parte de uma organização que **não existe**, cria tudo pelos mesmos
# `POST` de formulário que os ecrãs submetem, e acaba com um estranho — sem
# cookie nenhum — a ver a carta e o site no ar.
#
# ── E o controlo que lhe dá sentido ───────────────────────────────────────
#
#   > «Partir um elo de propósito — a unidade sem moeda, o menu sem secções — e
#   >  exigir que a jornada PARE aí, com o ecrã a dizer o que falta. Uma jornada
#   >  que chega ao fim com um elo partido não estava a medir a corrente.»
#
# São dois elos partidos, e não um, porque falham por razões diferentes: o menu
# sem secções é uma recusa do produto, e a unidade sem moeda é um estado que o
# produto sabe representar e tem de continuar a deixar avançar. Confundir os dois
# era transformar «por configurar» em «inválido», que é o inverso da regra do E06.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

PORTA="${PORTA_JORNADA:-3013}"
export BASE_URL="http://127.0.0.1:$PORTA"
# Tem de bater certo com a porta, senão a inscrição devolve 403 e o erro não diz
# uma palavra sobre portas. Custou-me isso uma vez no arnês do navegador.
export BETTER_AUTH_URL="$BASE_URL"
# ── O segredo do adquirente, e porque é que ele nasce AQUI ─────────────────
#
# `WEBHOOK_SEGREDO_*` não estava definido em lado nenhum do repositório — só
# lido na rota. A prova do E23 chama `receberWebhook` por dentro, e a porta HTTP
# nunca tinha sido aberta. Este é descartável e vive só nesta corrida: um
# segredo de piloto no repositório era um segredo publicado.
export WEBHOOK_SEGREDO_JORNADA="jornada-$(date +%s)-descartavel"

GRUPOS_ESPERADOS=5
CASOS_ESPERADOS=34
falhas=0
PID=""

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

FONTE=apps/web/app/api/org/\[orgSlug\]/menus/route.ts
COPIAS=$(mktemp -d)
cp "$FONTE" "$COPIAS/menus.ts"
repor_fonte() { cp "$COPIAS/menus.ts" "$FONTE"; }

parar() {
  [[ -n "$PID" ]] && { kill "$PID" 2>/dev/null; wait "$PID" 2>/dev/null; }
  PID=""
  for _ in $(seq 1 20); do
    restantes=$(lsof -ti ":$PORTA" 2>/dev/null)
    [[ -z "$restantes" ]] && break
    echo "$restantes" | xargs kill 2>/dev/null
    sleep 0.25
  done
}

# ── A limpeza desliga o gatilho da auditoria, e volta a ligá-lo ──────────
#
# `audit_events` é append-only por gatilho, para toda a gente. A jornada cria uma
# organização real e deixa rasto, e sem apagar esse rasto a organização não sai
# (a chave estrangeira segura-a) — acumulava-se uma por passagem.
#
# Desliga-se de propósito, e o `trap` volta a ligar mesmo com o script morto a
# meio. O passo 6 **verifica** que ficou ligado: uma auditoria sem protecção
# deixada para trás é o tipo de coisa que sobrevive a um commit distraído, e é a
# mesma lição que o `provar-acesso.sh` já tinha aprendido com uma política.
religar_auditoria() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 \
    -c "ALTER TABLE audit_events ENABLE TRIGGER audit_events_sem_delete" || true
}

limpar_jornada() {
  # ── A limpeza corre DENTRO de uma transacção, e é isso que a torna segura ──
  #
  # Metade destas tabelas recusa `DELETE` por gatilho — o rasto da caixa, os
  # pagamentos, os reembolsos, os acontecimentos do adquirente e a auditoria são
  # imutáveis **para toda a gente, incluindo a credencial de migração**. Para
  # limpar é preciso desligá-los.
  #
  # A primeira versão desligava uma LISTA escrita à mão e voltava a ligá-la no
  # fim. Duas corridas seguidas mostraram o defeito: a J14 trouxe duas tabelas
  # novas (`provider_events`, `refunds`), a limpeza abortou ao bater na primeira
  # que faltava na lista, e o `ENABLE` do fim **nunca chegou a correr** — a base
  # ficou com cinco gatilhos desligados, e só o passo 8 deu por isso.
  #
  # Duas mudanças, e a segunda é a que fecha a classe:
  #
  #   1. os gatilhos descobrem-se na BASE (`pg_trigger` sobre as tabelas que esta
  #      limpeza toca), em vez de se escreverem à mão. Uma tabela nova entra
  #      sozinha;
  #   2. tudo dentro de `BEGIN`/`COMMIT`. `ALTER TABLE ... DISABLE TRIGGER` é
  #      transaccional: se qualquer `DELETE` falhar, o `ROLLBACK` repõe os
  #      gatilhos. **Deixar a base sem protecção deixa de ser possível**, em vez
  #      de depender de o guião chegar ao fim.
  #
  # (`session_replication_role = replica` seria mais curto e o `bossaos_migrate`
  # não tem permissão para o usar — medido.)
  psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 >/tmp/bossaos-jornada-limpeza.log 2>&1 <<'SQL'
BEGIN;
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tgrelid::regclass AS tabela, tgname FROM pg_trigger
     WHERE NOT tgisinternal AND tgrelid::regclass::text IN ('public_slug_owners', 'site_publications', 'site_revisions', 'site_pages', 'sites', 'menu_publications', 'menu_revisions', 'menu_categories', 'menus', 'product_channels', 'price_rules', 'products', 'categories', 'audit_events', 'role_assignments', 'memberships', 'cash_movements', 'cash_register_events', 'cash_registers', 'provider_events', 'refunds', 'payments', 'payment_attempts', 'bill_adjustments', 'bill_lines', 'bills', 'locations', 'brands', 'entitlement_grants', 'subscriptions', 'organizations', 'users')
  LOOP
    EXECUTE format('ALTER TABLE %s DISABLE TRIGGER %I', t.tabela, t.tgname);
  END LOOP;
END $$;

DELETE FROM public_slug_owners WHERE slug LIKE 'jornada-%';
DELETE FROM site_publications WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM site_revisions    WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM site_pages        WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM sites             WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM menu_publications WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM menu_revisions    WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM menu_categories   WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM menus             WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM product_channels  WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM price_rules       WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM products          WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM categories        WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM audit_events      WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM role_assignments  WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM memberships       WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM cash_movements        WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM cash_register_events  WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM cash_registers        WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM provider_events       WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM refunds               WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM payments              WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM payment_attempts      WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM bill_adjustments      WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM bill_lines            WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM bills                 WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM locations         WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM brands            WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM entitlement_grants WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM audit_events      WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM subscriptions     WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'jornada-%');
DELETE FROM organizations     WHERE slug LIKE 'jornada-%';
DELETE FROM users WHERE email LIKE '%@jornada.example';

DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tgrelid::regclass AS tabela, tgname FROM pg_trigger
     WHERE NOT tgisinternal AND tgrelid::regclass::text IN ('public_slug_owners', 'site_publications', 'site_revisions', 'site_pages', 'sites', 'menu_publications', 'menu_revisions', 'menu_categories', 'menus', 'product_channels', 'price_rules', 'products', 'categories', 'audit_events', 'role_assignments', 'memberships', 'cash_movements', 'cash_register_events', 'cash_registers', 'provider_events', 'refunds', 'payments', 'payment_attempts', 'bill_adjustments', 'bill_lines', 'bills', 'locations', 'brands', 'entitlement_grants', 'subscriptions', 'organizations', 'users')
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE TRIGGER %I', t.tabela, t.tgname);
  END LOOP;
END $$;
COMMIT;
SQL
  religar_auditoria
}

restaurar() { parar; repor_fonte; limpar_jornada; religar_auditoria; rm -rf "$COPIAS"; }
trap restaurar EXIT INT TERM

construir_e_subir() {
  if ! pnpm build >/tmp/bossaos-jornada-build.log 2>&1; then
    vermelho "o build falhou — a jornada não tem o que percorrer"
    tail -15 /tmp/bossaos-jornada-build.log
    return 1
  fi
  pnpm --filter @bossaos/web exec next start -p "$PORTA" >/tmp/bossaos-jornada-app.log 2>&1 &
  PID=$!
  for _ in $(seq 1 60); do
    curl -fsS "$BASE_URL/api/health" >/dev/null 2>&1 && return 0
    kill -0 "$PID" 2>/dev/null || return 1
    sleep 0.5
  done
  return 1
}

correr() {
  node --test --test-timeout=180000 --test-reporter=tap \
    --experimental-strip-types provas/jornada.test.ts >"$1" 2>&1
}

analisar() {
  local f="$1" grupos casos
  grep -q '^TAP version' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  casos=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$casos" ]] || return 2
  echo "$grupos $casos"
}

echo "0. A aplicação, construída e no ar"
limpar_jornada
if construir_e_subir; then
  verde "a correr em $BASE_URL"
else
  vermelho "não consegui subir a aplicação"; exit 1
fi

echo
echo "1. A jornada inteira, de organização inexistente a site publicado"
if correr /tmp/bossaos-jornada.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-jornada.txt)"
  if [[ "$grupos" == "$GRUPOS_ESPERADOS" && "$casos" == "$CASOS_ESPERADOS" ]]; then
    verde "$grupos jornadas, $casos passos — e o fim é um estranho a ver a carta e o site"
  else
    vermelho "contagem inesperada: $grupos / $casos (esperava $GRUPOS_ESPERADOS / $CASOS_ESPERADOS)"
  fi
else
  vermelho "a jornada não chegou ao fim"
  grep -E '^ *not ok' /tmp/bossaos-jornada.txt | head -8
fi

echo
echo "2. ELO PARTIDO — o menu deixa de nascer com as secções"
# ── O elo exacto que a revisão nomeou ────────────────────────────────────
#
# «Um menu vazio existe na lista, faz o item do arranque ficar verde, e não pode
# ser publicado — e a pessoa só descobre isso três ecrãs depois.»
#
# Parte-se onde ele viveria: a rota de publicação passa a aceitar o que quer que
# lhe cheguem. Se a jornada continuar a chegar ao fim, ela não estava a medir a
# corrente — estava a medir os segmentos outra vez.
limpar_jornada
parar
python3 - "$FONTE" <<'FIMPY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
alvo = "  const juntar = dados.getAll('juntar').filter((x): x is string => typeof x === 'string');"
assert alvo in s, 'o alvo do elo partido mudou de forma'
# O menu passa a nascer VAZIO, que e' o elo que a revisao nomeou: «um menu vazio
# existe na lista, faz o item do arranque ficar verde, e nao pode ser publicado».
p.write_text(s.replace(alvo, "  const juntar: string[] = [];"), encoding='utf-8')
FIMPY
if construir_e_subir; then
  if correr /tmp/bossaos-jornada-elo.txt; then
    vermelho "a jornada chegou ao fim com o elo partido — não estava a medir a corrente"
  elif grep -qE '^ *not ok .*(publicar a carta|ESTRANHO VÊ A CARTA)' /tmp/bossaos-jornada-elo.txt; then
    verde "a jornada parou onde o elo partiu: a carta não chegou ao estranho"
  else
    vermelho "parou noutro sítio, não no elo partido"
    grep -E '^ *not ok' /tmp/bossaos-jornada-elo.txt | head -4
  fi
else
  vermelho "não consegui subir a aplicação com o elo partido"
fi
repor_fonte
parar

echo
echo "3. SEGUNDO ELO PARTIDO — a unidade sem moeda"
# ── O outro elo que a revisão nomeou ─────────────────────────────────────
#
# «partir um elo de propósito — a unidade SEM MOEDA, o menu sem secções — e
#  exigir que a jornada PARE aí, com o ecrã a dizer o que falta.»
#
# E este parte de maneira diferente do outro: não é uma recusa de validação, é o
# E06 a deixar a unidade nascer **por configurar** e o E07/E08 a recusarem
# publicar preços numa moeda que a unidade não tem. Os dois elos partem em
# sítios diferentes da corrente, e é por isso que são dois.
#
# O par que mantém isto honesto é o passo 1: com a moeda posta, a mesma jornada
# chega ao fim. Sem esse par, apertar tudo passaria aqui e partiria o produto.
limpar_jornada
parar
if construir_e_subir; then
  SEM_MOEDA=1 node --test --test-timeout=180000 --test-reporter=tap \
    --experimental-strip-types provas/jornada.test.ts >/tmp/bossaos-jornada-moeda.txt 2>&1
  if grep -qE '^ *ok .*ESTRANHO VÊ A CARTA' /tmp/bossaos-jornada-moeda.txt; then
    vermelho "a carta foi publicada com a unidade sem moeda — a jornada não mediu este elo"
  elif grep -qE '^ *not ok .*publicar a carta' /tmp/bossaos-jornada-moeda.txt; then
    verde "a jornada parou na publicação, que é onde a moeda em falta se sente"
    # E o produto tem de DIZER o que falta. Uma paragem sem motivo é um beco.
    if grep -qiE 'moeda' /tmp/bossaos-jornada-moeda.txt; then
      verde "e o motivo registado nomeia a moeda — o ecrã diz o que falta"
    else
      vermelho "parou, e não disse que era a moeda: quem lá chega fica sem saber"
      grep -m1 -oE "Registado: [^·]*" /tmp/bossaos-jornada-moeda.txt | sed "s/^/          /"
    fi
  else
    vermelho "parou noutro sítio, não na publicação"
    grep -E '^ *not ok' /tmp/bossaos-jornada-moeda.txt | head -4
  fi
else
  vermelho "não consegui subir a aplicação"
fi

echo "4. TERCEIRO ELO PARTIDO — fechar a caixa SEM contar"
# ── O elo da J09, e parte-se onde dói ────────────────────────────────────
#
# «Abrir, movimentar, contar, reconciliar, encerrar.» Tira-se a CONTAGEM e o
# fecho tem de parar — e o motivo tem de NOMEAR a contagem. Uma paragem que não
# diz o que falta é um beco, e quem está ao balcão às duas da manhã não tem como
# adivinhar.
#
# E o par que mantém isto honesto é o passo 1: com a contagem feita, a mesma
# jornada encerra o turno. Sem esse par, um produto que recusasse SEMPRE fechar
# passava aqui.
limpar_jornada
parar
if construir_e_subir; then
  SEM_CONTAGEM=1 node --test --test-timeout=180000 --test-reporter=tap \
    --experimental-strip-types provas/jornada.test.ts >/tmp/bossaos-jornada-contagem.txt 2>&1
  if grep -qE '^ *ok .*A CAIXA ENCERRA' /tmp/bossaos-jornada-contagem.txt; then
    vermelho "a caixa encerrou SEM contagem — a jornada não mediu este elo"
  elif grep -qE '^ *not ok .*o fecho RECUSA' /tmp/bossaos-jornada-contagem.txt; then
    verde "a jornada parou no fecho, que é onde a contagem em falta se sente"
    # E o produto tem de DIZER o que falta, pelo nome.
    if grep -qE 'SEM_CONTAGEM' /tmp/bossaos-jornada-contagem.txt; then
      verde "e o motivo NOMEIA a contagem — quem lá chega sabe o que fazer"
    else
      vermelho "parou, e não disse que era a contagem: quem lá chega fica sem saber"
      grep -m1 -oE 'veio «[^»]*»' /tmp/bossaos-jornada-contagem.txt | sed 's/^/          /'
    fi
  else
    vermelho "parou noutro sítio, não no fecho"
    grep -E '^ *not ok' /tmp/bossaos-jornada-contagem.txt | head -4
  fi
else
  vermelho "não consegui subir a aplicação"
fi

echo "5. QUARTO ELO PARTIDO — o adquirente reenvia com identidade NOVA"
# ── O elo da J14, e é o dinheiro que SAI ─────────────────────────────────
#
# «Preservar facto, sinalizar, reprocessar SEM duplicar e reconciliar.» A
# identidade do acontecimento é a única coisa que impede o reprocessamento de
# duplicar — e dói mais na devolução do que na captura, por uma assimetria que
# está no `estadoAutorizado`: o capturado é uma ATRIBUIÇÃO (o último carimbo
# manda) e o devolvido é uma SOMA (devoluções parciais acumulam).
#
# Com a alavanca, o mesmo facto volta com outro `eventoId`: o devolvido passa de
# 40,00 a 80,00, a chave idempotente do reembolso muda, e nasce um SEGUNDO
# reembolso. A jornada tem de parar aí.
#
# E o par que mantém isto honesto é o passo 1: sem a alavanca, a mesma jornada
# chega ao fim com uma devolução só.
limpar_jornada
parar
if construir_e_subir; then
  REENVIO_COM_IDENTIDADE_NOVA=1 node --test --test-timeout=180000 --test-reporter=tap \
    --experimental-strip-types provas/jornada.test.ts >/tmp/bossaos-jornada-identidade.txt 2>&1
  if grep -qE '^ *ok .*REENVIA a devolução' /tmp/bossaos-jornada-identidade.txt; then
    vermelho "o reenvio com identidade nova não duplicou nada — a jornada não mediu este elo"
  elif grep -qE '^ *not ok .*REENVIA a devolução' /tmp/bossaos-jornada-identidade.txt; then
    verde "a jornada parou na devolução reprocessada — onde a identidade é a ÚNICA defesa"
    # E tem de DIZER o que aconteceu: duplicou, e em quê.
    # E tem de dizer o que duplicou, com o número: dois reembolsos onde havia um.
    if grep -qF 'reprocessar duplicou o dinheiro que SAI' /tmp/bossaos-jornada-identidade.txt; then
      verde "e diz o que aconteceu ao DINHEIRO, e não só ao mecanismo"
    else
      vermelho "parou, e não disse que tinha duplicado"
      grep -m1 -E '^ +[a-z].*' /tmp/bossaos-jornada-identidade.txt | sed 's/^/          /'
    fi
  else
    vermelho "parou noutro sítio, não no reprocessamento"
    grep -E '^ *not ok' /tmp/bossaos-jornada-identidade.txt | head -4
  fi
else
  vermelho "não consegui subir a aplicação"
fi

echo "6. A árvore ficou limpa?"
limpar_jornada
RESTOS=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT
  (SELECT count(*) FROM organizations WHERE slug LIKE 'jornada-%')
+ (SELECT count(*) FROM users WHERE email LIKE '%@jornada.example')
+ (SELECT count(*) FROM public_slug_owners WHERE slug LIKE 'jornada-%')" 2>/dev/null)
if [[ "$RESTOS" == "0" ]]; then
  verde "nada da jornada ficou para trás"
else
  vermelho "ficaram $RESTOS linhas da jornada"
  tail -3 /tmp/bossaos-jornada-limpeza.log 2>/dev/null | sed "s/^/          /"
fi

echo
echo "7. A rota de menus ficou como estava?"
if diff -q "$COPIAS/menus.ts" "$FONTE" >/dev/null 2>&1; then
  verde "o elo partido foi reposto"
else
  vermelho "a prova deixou a rota de menus alterada"
fi

echo
echo "8. O gatilho da auditoria voltou a ligar?"
# A limpeza desliga-o de propósito. Deixá-lo desligado seria tirar a protecção do
# registo de quem fez o quê — e ninguém daria por isso até precisar dele.
# Os CINCO, e não só a auditoria: a J09 obriga a desligar também os do rasto da
# caixa, e um deles desligado é dinheiro que passa a poder apagar-se.
DESLIGADOS=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT string_agg(tgname, ' ')
  FROM pg_trigger WHERE tgenabled <> 'O' AND tgname IN (
    'audit_events_sem_delete', 'acontecimentos_de_caixa_sao_imutaveis',
    'movimentos_sao_imutaveis', 'payments_sao_imutaveis',
    'linhas_de_conta_paga_nao_se_mexem', 'bill_lines_derivam_devido',
    'eventos_do_provedor_sao_imutaveis')")
LIDOS=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT count(*) FROM pg_trigger WHERE tgname IN (
    'audit_events_sem_delete', 'acontecimentos_de_caixa_sao_imutaveis',
    'movimentos_sao_imutaveis', 'payments_sao_imutaveis',
    'linhas_de_conta_paga_nao_se_mexem', 'bill_lines_derivam_devido',
    'eventos_do_provedor_sao_imutaveis')")
if [[ "$LIDOS" != "7" ]]; then
  # Zero desligados sobre zero lidos é verde sobre população zero: se um gatilho
  # mudar de nome, esta verificação passava a não medir nada.
  vermelho "só encontrei $LIDOS dos 7 gatilhos — a verificação não mede o que diz"
elif [[ -z "$DESLIGADOS" ]]; then
  verde "os 7 gatilhos do rasto voltaram a recusar DELETE"
else
  vermelho "GATILHOS DESLIGADOS: $DESLIGADOS"
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas falhas"; fi
exit $(( falhas > 0 ? 1 : 0 ))
