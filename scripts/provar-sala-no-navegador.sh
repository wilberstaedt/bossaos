#!/usr/bin/env bash
#
# E13 · as dezassete telas da sala, no navegador — e o instrumento a provar-se.
#
# Existe por causa de um defeito real: `pessoasDaUnidade` foi escrito a ler
# `users` pela relação do Prisma, e o ecrã FLOOR-008 respondeu **500**. O runtime
# não lê `users` — a política `identidade_propria` limita-o à linha dele próprio —
# e o Prisma devolve a relação a `null` sem se queixar. É **o mesmo defeito do
# ORG-007** que o marco do E11 fechou com a porta `identidades_da_organizacao`.
#
# A prova de base não o apanha: ela usa o identificador da pertença e nunca toca
# no nome. Só o navegador o vê. Por isso este script existe, e por isso o primeiro
# controlo é exactamente esse defeito plantado de volta.
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

SALA=packages/db/src/sala.ts
SPEC=inspeccao/sala.spec.ts
ORIG_SALA=$(mktemp); ORIG_SPEC=$(mktemp)
cp "$SALA" "$ORIG_SALA"; cp "$SPEC" "$ORIG_SPEC"
falhas=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  cp "$ORIG_SALA" "$SALA"; cp "$ORIG_SPEC" "$SPEC"
  rm -f "$ORIG_SALA" "$ORIG_SPEC"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel sala.spec.ts \
    --reporter=list >"$1" 2>&1
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    return
  fi
  if grep -qE "✘.*$marcador" "$ficheiro"; then
    verde "$nome"
  else
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '✘' "$ficheiro" | head -4
  fi
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-sala-nav-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-sala-nav-ligado.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < 12 )); then
    vermelho "VERDE COM POUCO MEDIDO: só $passou casos"; exit 1
  fi
  verde "$passou casos de navegador verdes (17 telas × 5 larguras + toque e contraste)"
else
  vermelho "a prova de navegador falhou com tudo ligado"
  grep -E '✘|Error' /tmp/bossaos-sala-nav-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o leitor de pessoas volta a ler \`users\` pela relação"
# O defeito que este script existe para vigiar. A prova de BASE não o vê: ela usa
# o identificador da pertença e nunca toca no nome. O navegador vê um 500.
python3 - <<'PYPESSOAS'
import io, re
p = 'packages/db/src/sala.ts'
s = io.open(p, encoding='utf-8').read()
i = s.index('export async function pessoasDaUnidade')
j = s.index('export function listarTiposDeServico')
directo = '''export async function pessoasDaUnidade(db: ClienteComEscopo, organizationId: string) {
  void organizationId;
  const pertencas = await db.membership.findMany({
    where: { estado: 'ACTIVO' },
    select: { id: true, user: { select: { nome: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return pertencas.map((p) => ({
    id: p.id,
    nome: (p as { user: { nome: string | null } | null }).user!.nome,
    email: (p as { user: { email: string } | null }).user!.email,
  }));
}

'''
io.open(p, 'w', encoding='utf-8').write(s[:i] + directo + s[j:])
PYPESSOAS
exigir_vermelho "caiu a visita ao FLOOR-008 (a ficha da sessão)" \
  'não transbordam a 360 px' /tmp/bossaos-sala-nav-pessoas.txt
if grep -q '500' /tmp/bossaos-sala-nav-pessoas.txt; then
  verde "e a falha é um 500 na ficha da sessão — o defeito do ORG-007 outra vez"
else
  vermelho "ficou vermelha sem 500: o defeito plantado não é o que se pensava"
fi
cp "$ORIG_SALA" "$SALA"

echo
echo "3. CONTROLO NEGATIVO — a lista de telas encolhe"
# O anti-verde-vazio desta prova. Uma lista que encolhesse — por um erro de
# edição, por um `filter` distraído — deixava telas por medir e os casos de
# largura continuavam todos verdes.
python3 - <<'PYLISTA'
import io
p = 'inspeccao/sala.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    { id: 'SET-003', caminho: `${BASE}/settings/servicos` },\n"
assert antigo in s, 'a ultima tela da lista nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYLISTA
exigir_vermelho "caiu o contador das dezassete" \
  'a lista tem as DEZASSETE' /tmp/bossaos-sala-nav-lista.txt
cp "$ORIG_SPEC" "$SPEC"

echo
echo "4. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-sala-nav-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-sala-nav-reposto.txt | grep -oE '[0-9]+' || echo 0)
  verde "reposto: $passou casos"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '✘' /tmp/bossaos-sala-nav-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit "$falhas"
