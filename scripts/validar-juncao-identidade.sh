#!/usr/bin/env bash
#
# O runtime nao junta `users`. Ha uma porta para isso, e usa-se a porta.
#
# Escrita a 04/09, depois de o MESMO defeito aparecer duas vezes com tres etapas
# de intervalo. No E11 foi o ORG-007 a devolver 500; no E13 foi o FLOOR-008, e o
# executor apanhou-o sozinho e escreveu "escrevi o defeito do ORG-007 outra vez".
#
# O mecanismo e o que o torna repetivel: `include: { user: ... }` compila, corre,
# e o Prisma devolve a relacao a **null SEM SE QUEIXAR**, porque a politica
# `identidade_propria` limita o runtime a sua propria linha. Nada avisa - a tela
# rebenta mais a frente com "cannot read properties of null", longe da causa.
#
# Um defeito que volta depois de fechado quer dizer que o fecho nao foi
# estrutural. O E11 criou a porta `identidades_da_organizacao`; nada impedia
# alguem de escrever a juncao outra vez. Isto impede.
set -uo pipefail
cd "$(dirname "$0")/.."

# O modulo de autenticacao liga-se com `bossaos_auth`, que TEM privilegio em
# `users` por desenho (CT-04). Ali a juncao e legitima e a isencao e por caminho,
# com motivo, e nao por padrao largo.
ISENTOS='packages/db/src/autenticacao\.ts'

falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas + 1)); }
ok()   { echo "  ok    $1"; }

procurar() { # $1 = raiz
  git ls-files "$1/*.ts" 2>/dev/null \
    | grep -vE "\.test\.|$ISENTOS" \
    | xargs python3 scripts/sem-comentarios.py 2>/dev/null \
    | grep -nE 'include:[^}]*\buser\b|user:[[:space:]]*\{[[:space:]]*select' || true
}

echo "1. Nenhuma junção a \`users\` pelo cliente do runtime"
achados=$(procurar 'packages/db/src')
if [ -n "$achados" ]; then
  erro "junção a \`users\` no acesso a dados:"
  printf '%s\n' "$achados" | head -5 | sed 's/^/          /'
  echo "        O runtime vê UMA linha de \`users\` — a dele. O Prisma devolve a"
  echo "        relação a null sem se queixar, e a tela rebenta longe da causa."
  echo "        Usa \`identidades_da_organizacao\`, que é a porta que o E11 abriu."
else
  ok "nenhuma junção a users fora do módulo de autenticação"
fi

# ── controlo negativo ────────────────────────────────────────────────────────
# O defeito REAL, escrito como ele o escreveu duas vezes. Numa copia, porque hoje
# ja reescrevi ficheiros que outro agente estava a usar.
echo
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/db/src"
cat > "$TMP/db/src/sonda.ts" <<'TS'
export const pessoas = (db: any) => db.membership.findMany({
  include: { user: { select: { nome: true, email: true } } },
});
TS
if python3 scripts/sem-comentarios.py "$TMP/db/src/sonda.ts" 2>/dev/null \
   | grep -qE 'include:[^}]*\buser\b|user:[[:space:]]*\{[[:space:]]*select'; then
  ok "controlo negativo: apanha a junção exacta que já falhou duas vezes"
else
  erro "CONTROLO NEGATIVO FALHOU: não viu a junção plantada"
fi
# E o outro lado: um comentario a EXPLICAR o defeito nao pode ser acusado - o
# sala.ts tem um, e castigar quem documenta ensina a nao documentar.
cat > "$TMP/db/src/sonda.ts" <<'TS'
// Escrevi isto como include: { user: { select: { nome } } } e o ecrã rebentou.
export const pessoas = (db: any) => db.membership.findMany({ select: { id: true } });
TS
if python3 scripts/sem-comentarios.py "$TMP/db/src/sonda.ts" 2>/dev/null \
   | grep -qE 'include:[^}]*\buser\b'; then
  erro "CONTROLO NEGATIVO FALHOU: acusou um comentário que explica o defeito"
else
  ok "controlo negativo: não acusa quem documenta o defeito num comentário"
fi

echo
[ "$falhas" -eq 0 ] && echo "  A identidade passa pela porta: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
