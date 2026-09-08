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

# ── 6 · A documentacao nao pode ensinar a janela ──────────────────────────
#
# A ferramenta recusa a senha em argumento, e o runbook abria com
# `echo -n 'a-senha' | …`. O `echo` e builtin, portanto o `ps` esta a salvo — mas
# a linha fica no `.zsh_history` com a senha literal, que e exactamente o que a
# recusa existe para impedir. **Fechar a porta da frente e documentar a janela.**
#
# Varre TODOS os runbooks e nao so este: a classe e «ensinar um segredo escrito
# na linha de comando», e o proximo runbook a nascer tem a mesma tentacao.
#
# AMBITO declarado: procura a FORMA `echo …| <ferramenta de credencial>`. Um
# segredo ensinado de outra maneira passa aqui — mede-se a forma conhecida, nao
# todas as formas possiveis.
# So conta o que esta DENTRO de um bloco de codigo. A primeira versao varria o
# ficheiro inteiro e acusou a minha propria PROSA — a frase que explica o perigo
# tem a mesma forma da linha que o comete. Um detector que nao distingue o aviso
# do acto ensina a ignora-lo.
segredos_na_linha() {
  python3 - "$@" <<'PYX'
import glob, sys, re
alvos = sys.argv[1:] or sorted(glob.glob('docs/runbooks/*.md'))
padrao = re.compile(r'echo[^|]*\|[^|]*(criar-conta|senha|password|secret)')
for f in alvos:
    dentro = False
    for n, linha in enumerate(open(f, encoding='utf-8'), 1):
        if linha.lstrip().startswith('```'):
            dentro = not dentro
            continue
        if dentro and padrao.search(linha):
            print(f'{f}:{n}:{linha.rstrip()}')
PYX
}
ACHADOS=$(segredos_na_linha)
if [ -n "$ACHADOS" ]; then
  vermelho 'um runbook ENSINA a passar um segredo por `echo` na linha de comando:'
  printf '%s\n' "$ACHADOS" | head -4 | sed 's/^/          /'
  echo '          O `echo` salva o `ps` e deixa a senha no historico da shell.'
else
  N_RUNBOOKS=$(ls docs/runbooks/*.md 2>/dev/null | wc -l | tr -d ' ')
  if [ "${N_RUNBOOKS:-0}" -eq 0 ]; then
    echo "  NAO MEDI  nao ha runbooks para varrer — populacao vazia."
  else
    verde "nenhum dos $N_RUNBOOKS runbooks ensina um segredo na linha de comando"
  fi
fi

# A sonda: um runbook de mentira com a linha que se teme, DENTRO de um bloco de
# codigo. Sem o ponto no nome — `docs/runbooks/*.md` nao casa com ficheiros
# ocultos, e a primeira sonda nao acendeu por isso e nao por o grep estar mal.
SONDA=docs/runbooks/sonda-do-segredo.md
printf '```bash\necho -n a-senha | node criar-conta.mjs a@b.cd\n```\n' > "$SONDA"
if segredos_na_linha "$SONDA" | grep -q 'sonda-do-segredo'; then
  verde "a sonda acendeu: a forma que se teme e' mesmo vista"
else
  vermelho "a sonda NAO acendeu — o varrimento nao ve a linha que existe para ver"
fi
# E o outro lado: a PROSA que explica o perigo nao pode ser acusada.
printf 'um `echo -n a-senha | criar-conta` deixa a senha no historico.\n' > "$SONDA"
if [ -z "$(segredos_na_linha "$SONDA")" ]; then
  verde "a prosa que explica o perigo NAO e' acusada (so conta o bloco de codigo)"
else
  vermelho "acusou prosa fora de bloco de codigo — o aviso nao pode contar como o acto"
fi
rm -f "$SONDA"

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
