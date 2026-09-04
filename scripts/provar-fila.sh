#!/usr/bin/env bash
#
# E15 — a fila local do Staff PWA.
#
# A régua é o `docs/architecture/offline-e-fila-local.md`, e ele acaba com uma
# exigência que não é opcional:
#
#   «Controlo negativo OBRIGATÓRIO: desligar a partição por utilizador e ver o
#    caso 1 ficar vermelho. Um teste que passa com e sem a partição não está a
#    testar a partição — está a testar que a rede voltou.»
#
# Esse é o controlo 2, e é o primeiro por isso mesmo. Os outros quatro cobrem os
# restantes casos que o contrato numera.
set -uo pipefail
cd "$(dirname "$0")/.."

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

GRUPOS_ESPERADOS=8
CASOS_ESPERADOS=18
falhas=0

FILA=packages/fila/src/fila.ts
SINC=packages/fila/src/sincronizacao.ts
ORIG_FILA=$(mktemp); ORIG_SINC=$(mktemp)
cp "$FILA" "$ORIG_FILA"; cp "$SINC" "$ORIG_SINC"

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() { cp "$ORIG_FILA" "$FILA"; cp "$ORIG_SINC" "$SINC"; rm -f "$ORIG_FILA" "$ORIG_SINC"; }
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types \
    packages/fila/src/fila.test.ts >"$1" 2>&1
}

analisar() {
  local f="$1" grupos casos
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  casos=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$casos" ]] || return 2
  echo "$grupos $casos"
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    return
  fi
  if grep -qE "^ *not ok .*$marcador" "$ficheiro"; then
    verde "$nome"
  else
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '^ *not ok' "$ficheiro" | head -4
  fi
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-fila-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-fila-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $casos casos (esperados $CASOS_ESPERADOS)"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-fila-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO OBRIGATÓRIO — a partição por UTILIZADOR desligada"
# É o que o contrato exige pelo nome. Com a partição a comparar só organização e
# unidade, os rascunhos de A seguem com a sessão de B — atribuição errada, e dado
# de uma pessoa a viajar com o nome de outra.
python3 - <<'PYPART'
import io
p = 'packages/fila/src/fila.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  return a.organizationId === b.organizationId
    && a.locationId === b.locationId
    && a.utilizadorId === b.utilizadorId;"""
assert antigo in s, 'a comparacao da particao nao esta onde se esperava'
novo = """  return a.organizationId === b.organizationId
    && a.locationId === b.locationId;"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYPART
exigir_vermelho "caiu o caso 1: os rascunhos de A seguiram com a sessão de B" \
  'NADA de A é enviado' /tmp/bossaos-fila-particao.txt
if grep -q 'not ok.*O PAR: com A de volta' /tmp/bossaos-fila-particao.txt; then
  vermelho "o PAR também caiu — o controlo não distingue as duas coisas"
else
  verde "e o PAR aguentou: com o dono de volta, os dois continuam a seguir"
fi
cp "$ORIG_FILA" "$FILA"

echo
echo "3. CONTROLO NEGATIVO — o logout deixa de limpar o que é legível"
python3 - <<'PYSAIR'
import io
p = 'packages/fila/src/fila.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return entradas.map((e) => ({ ...opacar(e), payload: undefined } as EntradaDaFila));"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  return [...entradas];"))
PYSAIR
exigir_vermelho "caiu o caso 2: o conteúdo de A ficou legível para B" \
  'OPACO — sem conteúdo nenhum' /tmp/bossaos-fila-logout.txt
cp "$ORIG_FILA" "$FILA"

echo
echo "4. CONTROLO NEGATIVO — o pendente repete sem consultar"
# «Consultar antes de repetir. Sempre, e nunca ao contrário.» Repetir primeiro já
# criou o segundo efeito quando se descobre que não era preciso.
python3 - <<'PYCONS'
import io
p = 'packages/fila/src/sincronizacao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    if (entrada.estado === 'PENDENTE_DE_CONFIRMACAO') {"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    if (false) {"))
PYCONS
exigir_vermelho "caiu o caso 3: repetiu um comando que o servidor já tinha" \
  'CONSULTA antes de repetir' /tmp/bossaos-fila-consulta.txt
cp "$ORIG_SINC" "$SINC"

echo
echo "5. CONTROLO NEGATIVO — o último evento ganha"
python3 - <<'PYEV'
import io
p = 'packages/fila/src/sincronizacao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return chegado.versao > actual.versao ? chegado : actual;"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  return chegado;"))
PYEV
exigir_vermelho "caiu o caso 5: uma versão antiga sobrepôs a nova" \
  'antigo NÃO sobrepõe o novo' /tmp/bossaos-fila-eventos.txt
cp "$ORIG_SINC" "$SINC"

echo
echo "6. CONTROLO NEGATIVO — offline passa a poder pagar"
python3 - <<'PYPAG'
import io
p = 'packages/fila/src/sincronizacao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (!exigeRede(tipo)) return { pode: true };"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  return { pode: true };\n  if (!exigeRede(tipo)) return { pode: true };"))
PYPAG
exigir_vermelho "caiu o caso 6: uma acção financeira passou offline" \
  'bloqueadas, COM o motivo dito' /tmp/bossaos-fila-pagar.txt
cp "$ORIG_SINC" "$SINC"

echo
echo "7. CONTROLO NEGATIVO — a sessao morta passa a disparar a fila"
# «Sessao expirada exige reautenticacao ANTES de sincronizar.» Sincronizar
# primeiro e autenticar depois e uma porta aberta por quem ja nao devia la estar.
python3 - <<'PYSESSAO'
import io
p = 'packages/fila/src/sincronizacao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const aEnviar = sessaoValida ? paraEnviar(entradas, actual) : [];"
assert antigo in s, 'o portao da sessao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  const aEnviar = paraEnviar(entradas, actual);"))
PYSESSAO
exigir_vermelho "caiu a asserção da sessão morta" \
  'com a sessão morta NADA sai' /tmp/bossaos-fila-sessao.txt
cp "$ORIG_SINC" "$SINC"

echo
echo "8. CONTROLO NEGATIVO — a fila junta por semelhanca"
# O par do aceite 2. Uma implementacao que junte tudo por semelhanca passa o teste
# da duplicacao e PERDE COMIDA REAL: duas pessoas a mesma mesa pediram o mesmo
# prato de proposito.
python3 - <<'PYSEM'
import io
p = 'packages/fila/src/fila.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """export function paraEnviar(
  entradas: readonly EntradaDaFila[], actual: Particao | null,
): EntradaDaFila[] {
  return entradas.filter((e) => sincronizavel(e, actual));
}"""
assert antigo in s, 'o paraEnviar nao esta onde se esperava'
novo = """export function paraEnviar(
  entradas: readonly EntradaDaFila[], actual: Particao | null,
): EntradaDaFila[] {
  const sincronizaveis = entradas.filter((e) => sincronizavel(e, actual));
  const vistos = new Set<string>();
  return sincronizaveis.filter((e) => {
    const chave = JSON.stringify((e.payload as { produto?: string })?.produto ?? e.tipo);
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYSEM
exigir_vermelho "caiu a asserção dos dois pedidos iguais" \
  'a fila não junta por semelhança' /tmp/bossaos-fila-semelhanca.txt
cp "$ORIG_FILA" "$FILA"

echo
echo "9. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-fila-reposto.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-fila-reposto.txt)"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "reposto com contagem diferente: $grupos grupos, $casos casos"
  else
    verde "reposto: $grupos grupos, $casos casos"
  fi
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-fila-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit "$falhas"
