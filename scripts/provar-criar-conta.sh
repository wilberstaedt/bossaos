#!/usr/bin/env bash
#
# A ferramenta que cria contas no servidor, medida.
#
# O registo público está fechado e a política de quem pode ter conta não está
# decidida. Enquanto for «só eu crio contas», esta ferramenta é o que torna essa
# frase executável — e uma ferramenta de criar identidade que ninguém mediu é
# pior do que não a ter.
#
# ── O que se mede, e porquê cada um ───────────────────────────────────────
#
#   1. cria e a conta ENTRA        criar linhas nao e ter conta; o modo de falha
#                                  conhecido e «existe e nao entra»
#   2. email repetido e RECUSADO   duas contas com o mesmo email e um problema
#                                  de identidade, nao uma conveniencia
#   3. sem segredo FALHA e diz     com o segredo errado a conta nasce e nao
#                                  entra, e isso so aparece quando alguem tenta
#   4. senha NAO por argumento     fica no historico da shell e no `ps`
#   5. nao alcancavel por HTTP     e ferramenta de servidor
#
# Nenhuma conta real é criada: usa-se um endereço em `.invalid`, reservado pela
# RFC 2606, e conta-se a base antes e depois.
set -uo pipefail
cd "$(dirname "$0")/.."

verde()    { echo "  ok    $1"; }
vermelho() { echo "  FALHA $1"; FALHAS=$((FALHAS + 1)); }
FALHAS=0

FERRAMENTA=packages/auth/ferramentas/criar-conta.mjs
EMAIL='prova-criar-conta@bossaos.invalid'
SENHA='Prova-Criar-Conta-2026'
: "${AUTH_DATABASE_URL:=${MIGRATION_DATABASE_URL:-${DATABASE_URL:-}}}"
export AUTH_DATABASE_URL
[ -n "$AUTH_DATABASE_URL" ] || { echo "  NAO MEDI  sem ligacao a base"; exit 2; }
[ -n "${BETTER_AUTH_SECRET:-}" ] || { echo "  NAO MEDI  sem BETTER_AUTH_SECRET"; exit 2; }

echo "A ferramenta que cria contas no servidor"

correr() { fnm exec --using=22.23.2 node --experimental-strip-types "$FERRAMENTA" "$@" 2>&1; }
contar() { fnm exec --using=22.23.2 node --experimental-strip-types -e "
import('pg').then(async ({default:pg})=>{const c=new pg.Client({connectionString:process.env.AUTH_DATABASE_URL});
await c.connect();const r=await c.query('SELECT count(*)::int n FROM users');console.log(r.rows[0].n);await c.end();});" 2>/dev/null | tail -1; }
# A limpeza usa a credencial de MIGRACAO de proposito: a do runtime cria e NAO
# apaga — `permission denied for table users`. E' uma fronteira de privilegio
# deliberada, e descobri-a por a prova ter deixado sujidade e a contagem o dizer.
apagar() { fnm exec --using=22.23.2 node --experimental-strip-types -e "
import('pg').then(async ({default:pg})=>{const c=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
await c.connect();const {rows}=await c.query('SELECT id FROM users WHERE email=\$1',['$EMAIL']);
for (const {id} of rows){await c.query('DELETE FROM sessions WHERE user_id=\$1',[id]);
await c.query('DELETE FROM accounts WHERE user_id=\$1',[id]);await c.query('DELETE FROM users WHERE id=\$1',[id]);}
await c.end();});" >/dev/null 2>&1; }

# A linha de base conta-se DEPOIS de limpar. Contá-la antes trazia o que uma
# corrida falhada tivesse deixado, e a prova acusava a sujidade da anterior em
# vez da sua — foi o que aconteceu à primeira.
apagar; ANTES=$(contar)

# ── 1 · Cria, e a conta ENTRA ─────────────────────────────────────────────
SAIDA=$(printf '%s' "$SENHA" | correr "$EMAIL")
if printf '%s' "$SAIDA" | grep -q 'conta criada e verificada'; then
  verde "cria e a conta ENTRA com a senha (a propria ferramenta o verifica)"
else
  vermelho "nao criou:"; printf '%s\n' "$SAIDA" | head -3 | sed 's/^/          /'
fi

# ── 2 · Email repetido ────────────────────────────────────────────────────
SAIDA=$(printf '%s' "$SENHA" | correr "$EMAIL")
if printf '%s' "$SAIDA" | grep -q 'ja existe uma conta'; then
  verde "email repetido: RECUSADO, e nao cria um segundo em silencio"
else
  vermelho "email repetido nao foi recusado:"; printf '%s\n' "$SAIDA" | head -2 | sed 's/^/          /'
fi
apagar

# ── 3 · Sem segredo ───────────────────────────────────────────────────────
SAIDA=$(printf '%s' "$SENHA" | env -u BETTER_AUTH_SECRET fnm exec --using=22.23.2 \
  node --experimental-strip-types "$FERRAMENTA" "$EMAIL" 2>&1)
if printf '%s' "$SAIDA" | grep -q 'BETTER_AUTH_SECRET em falta'; then
  verde "sem segredo: FALHA e diz porque (nasce e nao entra)"
else
  vermelho "sem segredo nao falhou como devia:"; printf '%s\n' "$SAIDA" | head -2 | sed 's/^/          /'
fi

# ── 4 · A senha por argumento ─────────────────────────────────────────────
SAIDA=$(correr "$EMAIL" "$SENHA")
if printf '%s' "$SAIDA" | grep -q 'NAO ENTRA POR ARGUMENTO'; then
  verde "senha por argumento: RECUSADA (fica no historico e no \`ps\`)"
else
  vermelho "aceitou a senha por argumento:"; printf '%s\n' "$SAIDA" | head -2 | sed 's/^/          /'
fi

# ── 5 · Alcançável por HTTP? A resposta vem do BUILD, não de mim ──────────
MANIFESTO=apps/web/.next/app-path-routes-manifest.json
if [ ! -s "$MANIFESTO" ]; then
  echo "  NAO MEDI  sem manifesto de rotas ($MANIFESTO) — corre um build para o afirmar."
else
  N=$(python3 -c "
import json
d=json.load(open('$MANIFESTO'))
print(len([k for k, v in d.items() if 'criar-conta' in k or 'criar-conta' in str(v)]))")
  TOTAL=$(python3 -c "import json; print(len(json.load(open('$MANIFESTO'))))")
  if [ "$N" = 0 ] && [ "$TOTAL" -gt 100 ]; then
    verde "nao alcancavel por HTTP: 0 das $TOTAL rotas do build a nomeiam"
  elif [ "$TOTAL" -le 100 ]; then
    echo "  NAO MEDI  o manifesto so tem $TOTAL rotas — populacao pequena de mais para concluir."
  else
    vermelho "o manifesto de rotas NOMEIA a ferramenta — ela e alcancavel por HTTP"
  fi
fi

apagar
DEPOIS=$(contar)
if [ "$ANTES" != "$DEPOIS" ]; then
  vermelho "a prova deixou sujidade na base: $ANTES -> $DEPOIS utilizadores"
else
  verde "nenhuma conta real ficou: $ANTES utilizadores antes e depois"
fi

echo
[ "$FALHAS" -eq 0 ] && { echo "  A ferramenta faz o que diz: 0 falhas."; exit 0; }
echo "  $FALHAS FALHA(S)."; exit 1
