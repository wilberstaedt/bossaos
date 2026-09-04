#!/usr/bin/env bash
#
# E12 · o ataque da régua, feito ao próprio produto.
#
# > *«Leio a cor CALCULADA pelo navegador na rota pública, não a que o CSS
# > declara — foi assim que o E09 me escondeu uma carta servida sem folha de
# > estilos.»*
#
# A prova de navegador (`inspeccao/tema.spec.ts`) lê `getComputedStyle` na carta
# e no site de um inquilino Pro, antes e depois de publicar uma cor PELO PRODUTO.
# Este script existe para responder à pergunta seguinte, que é a que interessa:
# **e se o tema não chegasse à página, esta prova dava vermelho?**
#
# Dois defeitos plantados, um em cada superfície. Um instrumento que não falha
# quando devia é um instrumento que diz verde sobre nada.
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

CARTA='apps/web/app/r/[publicLocationSlug]/[locale]/menu/page.tsx'
MOLDURA='apps/web/src/componentes/SitePublico.tsx'
TEMA_UI='packages/ui/src/tema.ts'
SEMENTE='packages/db/prisma/semente-inspeccao.ts'
ORIG_CARTA=$(mktemp); ORIG_MOLDURA=$(mktemp); ORIG_UI=$(mktemp); ORIG_SEMENTE=$(mktemp)
cp "$CARTA" "$ORIG_CARTA"; cp "$MOLDURA" "$ORIG_MOLDURA"; cp "$TEMA_UI" "$ORIG_UI"
cp "$SEMENTE" "$ORIG_SEMENTE"
falhas=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  cp "$ORIG_CARTA" "$CARTA"; cp "$ORIG_MOLDURA" "$MOLDURA"; cp "$ORIG_UI" "$TEMA_UI"
  cp "$ORIG_SEMENTE" "$SEMENTE"
  rm -f "$ORIG_CARTA" "$ORIG_MOLDURA" "$ORIG_UI" "$ORIG_SEMENTE"
}
trap restaurar EXIT INT TERM

# O `-g` apanha os grupos do tema; o `--project=preparar` abre as duas sessões.
correr() {
  pnpm exec playwright test --project=preparar --project=painel \
    -g 'tema|cor publicada|Starter não consegue|PAR da recusa|contraste é recusado' \
    --reporter=list >"$1" 2>&1
}

# Exige vermelho E que caia a asserção certa. Um build partido lê-se aqui
# exactamente como um tema que não chega à página, e não é a mesma coisa.
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

# ── A base arranca como a da CI: SEM subscrição nenhuma ──────────────────
#
# É a condição que retirou a assinatura do E12. Medir sobre uma base que já tem o
# plano deixado por uma prova anterior é medir a base e não o produto — e foi
# assim que 21 casos verdes aqui conviveram com três reprovações na CI.
psql "$MIGRATION_DATABASE_URL" -q -c 'DELETE FROM subscriptions;' >/dev/null 2>&1

echo "1. Com tudo ligado (base SEM plano, como a da CI)"
if correr /tmp/bossaos-tema-nav-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-tema-nav-ligado.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < 22 )); then
    vermelho "VERDE COM POUCO MEDIDO: só $passou casos"; exit 1
  fi
  verde "$passou casos de navegador verdes"
else
  vermelho "a prova de navegador falhou com tudo ligado"
  grep -E '✘|Error' /tmp/bossaos-tema-nav-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a CARTA deixa de aplicar o tema"
# É literalmente o defeito que o E09 escondeu do revisor: a marcação certa, a
# página a responder 200, e o estilo a não chegar. Se a prova continuar verde, o
# que ela mede é o CSS declarado e não a cor calculada.
python3 - <<'PY'
import io
p = 'apps/web/app/r/[publicLocationSlug]/[locale]/menu/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<div className="bo-publico" style={variaveisDoTema(tema) as React.CSSProperties}>'
assert antigo in s, 'a carta não aplica o tema onde se esperava'
# O tema deixa de CHEGAR ao elemento, mas a chamada e a variavel continuam
# usadas: sem isso o `noUnusedLocals` parte o build, e um build partido le-se
# aqui exactamente como um tema que nao chega a pagina. Nao e a mesma coisa.
novo = '<div className="bo-publico" data-tema={Object.keys(variaveisDoTema(tema)).length}>'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PY
exigir_vermelho "caiu a leitura do fundo calculado na carta" \
  'DEPOIS: o navegador calcula as cores novas' /tmp/bossaos-tema-nav-carta.txt
cp "$ORIG_CARTA" "$CARTA"

echo
echo "3. CONTROLO NEGATIVO — o SITE deixa de aplicar o tema"
# A cor primária não aparece na carta: aparece no botão da home. Sem este
# segundo controlo, uma implementação que aplicasse o fundo e esquecesse a
# primária passava — medir uma parte e dar a outra por medida.
python3 - <<'PY'
import io
p = 'apps/web/src/componentes/SitePublico.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = 'style={variaveisDoTema(tema) as CSSProperties}'
assert antigo in s, 'a moldura do site não aplica o tema onde se esperava'
# `{} as CSSProperties` mantem o tipo importado em uso — sem isso o build parte
# por outro motivo, e um build partido nao prova nada sobre o tema.
novo = 'style={{} as CSSProperties} data-tema={Object.keys(variaveisDoTema(tema)).length}'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
exigir_vermelho "caiu a leitura da primária calculada no site" \
  'DEPOIS: o navegador calcula as cores novas' /tmp/bossaos-tema-nav-site.txt
cp "$ORIG_MOLDURA" "$MOLDURA"

echo
echo "4. CONTROLO NEGATIVO — uma cor de ESTADO passa a ser temável"
# «O que não é personalizável continua a não ser, mesmo no plano de cima.» Um
# cliente que repinte o vermelho de perigo passa o aceite 1 e quebra a leitura de
# um ecrã de operação: quem está ao balcão deixa de distinguir um aviso de um
# erro. A fronteira está em `variaveisDoTema`, que é a única função que
# transforma um tema em CSS — e é ali que este defeito tem de doer.
python3 - <<'PYEST'
import io
p = 'packages/ui/src/tema.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    '--bo-publico-texto': sobreFundo.cor,\n  };"
assert antigo in s, 'as variaveis do tema nao estao onde se esperava'
novo = "    '--bo-publico-texto': sobreFundo.cor,\n    '--bo-estado-perigo': acento,\n  };"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYEST
exigir_vermelho "caiu a asserção dos sete tokens fixos" \
  'os SETE fixos não mexem' /tmp/bossaos-tema-nav-estado.txt
cp "$ORIG_UI" "$TEMA_UI"

echo
echo "5. CONTROLO NEGATIVO — a semeadura deixa de estabelecer o PLANO"
# É o defeito que retirou a assinatura do E12: a prova herdava o plano do que por
# acaso estava na base — deixado lá pelas provas de base — e numa base fresca o
# portão do plano disparava antes do contraste. Três corridas iguais na CI.
#
# Com o plano fora da semeadura, quem tem de falhar é a GUARDA DO PLANO, e com a
# frase que nomeia a causa. Se em vez dela caísse a asserção do contraste, a prova
# continuava a mandar quem a lê procurar no sítio errado.
python3 - <<'PYPLANO'
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    for (const [organizationId, codigo] of ["
assert antigo in s, 'o bloco do plano nao esta onde se esperava'
fim = "      throw new Error('a semeadura nao conseguiu assinar as duas organizacoes');\n    }\n"
fim_real = [l for l in s.split('\n') if 'assinar as duas' in l]
assert fim_real, 'nao encontrei o fim do bloco do plano'
i = s.index(antigo)
j = s.index(fim_real[0]) + len(fim_real[0]) + len('\n    }\n')
io.open(p, 'w', encoding='utf-8').write(s[:i] + s[j:])
PYPLANO
exigir_vermelho "caiu a guarda do plano, e nao a do contraste" \
  'PODE mesmo editar cores' /tmp/bossaos-tema-nav-plano.txt
cp "$ORIG_SEMENTE" "$SEMENTE"

echo
echo "6. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-tema-nav-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-tema-nav-reposto.txt | grep -oE '[0-9]+' || echo 0)
  verde "reposto: $passou casos"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '✘' /tmp/bossaos-tema-nav-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit "$falhas"
