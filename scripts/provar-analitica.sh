#!/usr/bin/env bash
#
# E30 fatia 1 — analítica e agregação.
#
# O controlo que a régua põe em primeiro lugar é o 2: colapsar ausência e zero.
# Nada estoira, o ecrã fica bonito, e um gerente fecha o turno de almoço de uma
# casa que vendeu tudo — só que ninguém tinha medido.
#
# E há um com critério invulgar, o 4: ele TEM de mudar o número. Se a média de
# médias der igual, não é o código que está certo — são os dados de prova que
# não têm o caso, e aí corrige-se a semente e não se aceita a prova.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

# ── As contas PURAS vivem no DOMÍNIO, e os plantes seguem-nas ────────────
#
# A `mediaPonderada` e a `Medido` mudaram de `@bossaos/db` para
# `@bossaos/domain` quando a guarda das rotas acusou duas telas de tocar na
# base por importarem uma função pura. Os plantes ficaram a apontar ao
# ficheiro antigo, e o `plantar()` disse-o em vez de medir nada — é a segunda
# vez que este guarda-costas paga a renda, depois do E28.
MOTOR=packages/db/src/analitica.ts
PURO=packages/domain/src/agregacao.ts
PROVA=provas/analitica.test.ts
FICHEIROS=("$MOTOR" "$PROVA" "$PURO")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }
restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  psql "$MIGRATION_DATABASE_URL" -q -c "DELETE FROM locations WHERE slug = 'e30-canarias';" \
    >/dev/null 2>&1
  psql "$MIGRATION_DATABASE_URL" -q -c \
    "UPDATE locations SET fuso = 'Atlantic/Canary' WHERE slug LIKE '%canarias%';" \
    >/dev/null 2>&1
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { node --experimental-strip-types --test provas/analitica.test.ts >"$1" 2>&1; }

plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

exigir_vermelho() {
  local nome="$1" caso="$2" erro="$3" ficheiro="$4"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  if grep -qE 'SyntaxError|Cannot find|ERR_MODULE' <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO CARREGA — é um ficheiro partido"
    grep -E 'SyntaxError|Cannot find' <<<"$limpo" | head -2; return
  fi
  if ! grep -qE '^# fail [1-9]' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qE "not ok .*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E '^ +not ok' <<<"$limpo" | head -4; return
  fi
  if [[ -n "$erro" ]] && ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E "error: " <<<"$limpo" | head -3; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-anl-ligado.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-anl-ligado.txt | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "o motor não está verde com tudo ligado"
  grep -E "^ +not ok|error: " /tmp/bossaos-anl-ligado.txt | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — ausência e zero colapsam num só"
# ── O aceite que a régua põe em primeiro lugar ────────────────────────────
#
# `0 €` ao almoço diz «a casa abriu e não vendeu». Sem dados diz «ninguém
# sabe». Escrevem-se iguais se ninguém as separar, e significam o contrário.
plantar <<'PYAUSENCIA' || true
import io
p = 'packages/domain/src/agregacao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (vivos.length === 0) return SEM_DADOS;"
assert antigo in s, 'a recusa do conjunto vazio nao esta onde se esperava'
novo = "  if (vivos.length === 0) return medido({ moeda: 'EUR', somaMenor: 0n, contagem: 0 });"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYAUSENCIA
correr /tmp/bossaos-anl-ausencia.txt
exigir_vermelho "caiu a ausência: quem não mediu passou a dizer que vendeu zero" \
  'sem linhas nenhumas o agregado diz' \
  'ausência passou por zero' /tmp/bossaos-anl-ausencia.txt
cp "${COPIAS[2]}" "$PURO"

echo
echo "3. CONTROLO NEGATIVO — tudo passa a ser ausência, e o zero medido some"
plantar <<'PYSEMPRE' || true
import io
p = 'packages/domain/src/agregacao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const vivos = [...porMoeda.values()].filter((a) => a.contagem > 0);"
assert antigo in s, 'o filtro dos vivos nao esta onde se esperava'
novo = "  const vivos = [...porMoeda.values()].filter((a) => a.somaMenor > 0n);"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYSEMPRE
correr /tmp/bossaos-anl-sempre.txt
# Sem o par, «devolve sempre ausencia» passava o caso de cima — e uma casa que
# abriu e nao vendeu aparecia como nao medida, que e' o erro ao contrario.
exigir_vermelho "caiu o par: a casa que abriu e não vendeu passou por não medida" \
  'com uma linha de zero, diz' \
  'zero medido passou por ausência' /tmp/bossaos-anl-sempre.txt
cp "${COPIAS[2]}" "$PURO"

echo
echo "4. CONTROLO NEGATIVO — a média passa a ser média DE MÉDIAS"
# ── O controlo com critério invulgar ──────────────────────────────────────
#
# Este TEM de mudar o número. Se não mudar, não é o código que está certo: são
# os dados de prova que não têm o caso, e aí corrige-se a semente.
plantar <<'PYMEDIA' || true
import io
p = 'packages/domain/src/agregacao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    porMoeda.set(p.moeda, {
      moeda: p.moeda,
      somaMenor: actual.somaMenor + p.somaMenor,
      contagem: actual.contagem + p.contagem,
    });"""
assert antigo in s, 'a soma do numerador e denominador nao esta onde se esperava'
# A media de medias: cada parte contribui com a SUA media, e o denominador
# passa a ser o numero de partes em vez do numero de linhas.
novo = """    const media = p.contagem === 0 ? 0n : p.somaMenor / BigInt(p.contagem);
    porMoeda.set(p.moeda, {
      moeda: p.moeda,
      somaMenor: actual.somaMenor + media,
      contagem: actual.contagem + 1,
    });"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYMEDIA
correr /tmp/bossaos-anl-media.txt
exigir_vermelho "caiu a ponderação: o denominador deixou de viajar com o numerador" \
  'NÃO é a média das médias' \
  'os denominadores não estão a contar' /tmp/bossaos-anl-media.txt
cp "${COPIAS[2]}" "$PURO"

echo
echo "5. CONTROLO NEGATIVO — as moedas somam-se num agregado só"
plantar <<'PYMOEDAS' || true
import io
p = 'packages/domain/src/agregacao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    const actual = porMoeda.get(p.moeda)"
assert antigo in s, 'a leitura por moeda nao esta onde se esperava'
s = s.replace(antigo, "    const actual = porMoeda.get('EUR')", 1)
antigo2 = "    porMoeda.set(p.moeda, {"
assert antigo2 in s, 'a escrita por moeda nao esta onde se esperava'
# A leitura E a escrita: um plante pela metade nao planta o defeito.
s = s.replace(antigo2, "    porMoeda.set('EUR', {", 1)
io.open(p, 'w', encoding='utf-8').write(s)
PYMOEDAS
correr /tmp/bossaos-anl-moedas.txt
exigir_vermelho "caiu o agrupamento: euros e dólares num total só" \
  'não se somam num agregado só' \
  'somou euros com dólares' /tmp/bossaos-anl-moedas.txt
cp "${COPIAS[2]}" "$PURO"

echo
echo "6. CONTROLO NEGATIVO — o período resolve-se DEPOIS de somar"
plantar <<'PYFUSO' || true
import io
p = 'packages/db/src/analitica.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      diaDeServico: diaDeServicoDe(momento, fuso),"
assert antigo in s, 'a resolucao por unidade nao esta onde se esperava'
# Um fuso fixo para todas: e' somar primeiro e resolver depois, com outro nome.
novo = "      diaDeServico: diaDeServicoDe(momento, 'Europe/Madrid'),"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYFUSO
correr /tmp/bossaos-anl-fuso.txt
exigir_vermelho "caiu a fronteira: o total escorregou de dia e continuou a parecer certo" \
  'dias de serviço diferentes em fusos diferentes' \
  'resolveu-se antes de somar' /tmp/bossaos-anl-fuso.txt
cp "${COPIAS[0]}" "$MOTOR"

echo
echo "7. CONTROLO NEGATIVO — a unidade sem dados entra na conta como zero"
plantar <<'PYVAZIA' || true
import io
p = 'packages/db/src/analitica.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    if (!u.agregado.medido) continue;
    partes.push(u.agregado.valor);"""
assert antigo in s, 'a exclusao da unidade vazia nao esta onde se esperava'
novo = """    if (!u.agregado.medido) {
      partes.push({ moeda: 'EUR', somaMenor: 0n, contagem: 1 });
      continue;
    }
    partes.push(u.agregado.valor);"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYVAZIA
correr /tmp/bossaos-anl-vazia.txt
exigir_vermelho "caiu a exclusão: a unidade sem dados puxou o total para baixo" \
  'NÃO puxa o total da organização para baixo' \
  'entrou na conta como se tivesse vendido zero' /tmp/bossaos-anl-vazia.txt
cp "${COPIAS[0]}" "$MOTOR"

echo
echo "8. CONTROLO NEGATIVO — o indicador deixa de descer à transacção"
plantar <<'PYORIGEM' || true
import io
p = 'packages/db/src/analitica.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "        origemTipo: l.origemTipo, origemId: l.origemId,"
assert antigo in s, 'a origem das linhas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "        origemTipo: null, origemId: null,", 1))
PYORIGEM
correr /tmp/bossaos-anl-origem.txt
exigir_vermelho "caiu a descida: um número que ninguém consegue contestar" \
  'diz de onde veio' 'não diz de onde veio' /tmp/bossaos-anl-origem.txt
cp "${COPIAS[0]}" "$MOTOR"

echo
echo "9. CONTROLO NEGATIVO — a semente perde a unidade do OUTRO fuso"
plantar <<'PYSEMENTE' || true
import io
p = 'provas/analitica.test.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "     VALUES (gen_random_uuid(), $1, $2, $3, $3, 'EUR', 'Atlantic/Canary', now())"
assert antigo in s, 'o fuso das canarias nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "     VALUES (gen_random_uuid(), $1, $2, $3, $3, 'EUR', 'Europe/Madrid', now())", 1))
PYSEMENTE
# ── E tira o caso da POPULAÇÃO inteira, não de uma instância ─────────────
#
# A primeira versão mudou só o fuso que a prova insere, e o controlo ficou
# VERDE: a unidade das Canárias da semeadura da inspecção continuava na base,
# o segundo fuso sobrevivia, e o defeito nunca chegou a existir.
#
# É a regra do plante pela metade noutra dimensão — tirar UMA instância do caso
# não tira o caso. Aqui achata-se a população toda, e repõe-se a seguir.
psql "$MIGRATION_DATABASE_URL" -q -c \
  "UPDATE locations SET fuso = 'Europe/Madrid' WHERE fuso <> 'Europe/Madrid';" \
  >/dev/null 2>&1
correr /tmp/bossaos-anl-semente.txt
# Foi assim que a primeira corrida caiu, e a regua manda corrigir a SEMENTE e
# nao aceitar a prova. O caso diz por palavras que o caso mau nao esta la'.
exigir_vermelho "caiu o caso mau: sem dois fusos, a prova mede o caminho feliz" \
  'dias de serviço diferentes em fusos diferentes' \
  'o caso mau não está semeado' /tmp/bossaos-anl-semente.txt
cp "${COPIAS[1]}" "$PROVA"
psql "$MIGRATION_DATABASE_URL" -q -c \
  "UPDATE locations SET fuso = 'Atlantic/Canary' WHERE slug LIKE '%canarias%';" \
  >/dev/null 2>&1

echo
echo "10. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-anl-reposto.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-anl-reposto.txt | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E "^ +not ok|error: " /tmp/bossaos-anl-reposto.txt | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1
