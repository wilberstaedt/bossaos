#!/usr/bin/env bash
#
# E19 — as 11 telas do fluxo público, no navegador.
#
# ── O que a régua reprova à cabeça ────────────────────────────────────────
#
# «Verde sobre agenda vazia, e com 28 telas isso é fácil de esconder.» Todas as
# telas deste fluxo têm um estado vazio legítimo — «não temos mesa», «não
# encontramos esta reserva» — que cabe em qualquer largura e não tem nada para
# medir. O controlo 8 é esse, e não é um defeito de produto.
#
# E o ponto 1 da régua é o mais fácil de cumprir com uma palavra e falhar na
# prática: a incerteza tem de estar no TEXTO. Os controlos 2, 3 e 4 tiram-na de
# lá, um de cada vez.
set -uo pipefail
cd "$(dirname "$0")/.."

# O arnês antes de tudo. Salta sozinho em zero segundos se já estiver pronto;
# numa base fresca faz os três passos pela ordem certa — fixtures, o utilizador
# do `preparar`, e só depois a semente, que o `preparar` limparia.
#
# Sem isto, uma base sem o utilizador do arnês faz o `alvos.ts` rebentar na
# RECOLHA e o Playwright diz «No tests found» — que não aponta para nada, e me
# custou seis hipóteses a 06/09.
bash "$(dirname "$0")/arnes-pronto.sh" >/dev/null || {
  echo "ERRO: não consegui preparar o arnês — vê scripts/arnes-pronto.sh" >&2
  exit 1
}

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

PORTA_DA_PROVA="${PORTA_INSPECCAO:-3010}"
if lsof -ti:"$PORTA_DA_PROVA" >/dev/null 2>&1; then
  echo "ERRO: a porta $PORTA_DA_PROVA já está ocupada." >&2
  exit 2
fi

CASOS_MINIMOS=23
falhas=0

I18N=packages/i18n/src/mensagens/es-ES.json
ESTADO='apps/web/app/r/[publicLocationSlug]/[locale]/reserve/espera/estado/page.tsx'
HORARIOS='apps/web/app/r/[publicLocationSlug]/[locale]/reserve/horarios/page.tsx'
SEMMESA='apps/web/app/r/[publicLocationSlug]/[locale]/reserve/sem-mesa/page.tsx'
PREFS='apps/web/app/r/[publicLocationSlug]/[locale]/reserve/preferencias/page.tsx'
SPEC=inspeccao/reserva-publica.spec.ts
SEMENTE=packages/db/prisma/semente-inspeccao.ts
ORIG_I18N=$(mktemp); ORIG_ESTADO=$(mktemp); ORIG_HOR=$(mktemp); ORIG_SEM=$(mktemp)
ORIG_PREFS=$(mktemp); ORIG_SPEC=$(mktemp); ORIG_SEMENTE=$(mktemp)
cp "$I18N" "$ORIG_I18N"; cp "$ESTADO" "$ORIG_ESTADO"; cp "$HORARIOS" "$ORIG_HOR"
cp "$SEMMESA" "$ORIG_SEM"; cp "$PREFS" "$ORIG_PREFS"; cp "$SPEC" "$ORIG_SPEC"
cp "$SEMENTE" "$ORIG_SEMENTE"

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  cp "$ORIG_I18N" "$I18N"; cp "$ORIG_ESTADO" "$ESTADO"; cp "$ORIG_HOR" "$HORARIOS"
  cp "$ORIG_SEM" "$SEMMESA"; cp "$ORIG_PREFS" "$PREFS"; cp "$ORIG_SPEC" "$SPEC"
  cp "$ORIG_SEMENTE" "$SEMENTE"
  rm -f "$ORIG_I18N" "$ORIG_ESTADO" "$ORIG_HOR" "$ORIG_SEM" "$ORIG_PREFS" "$ORIG_SPEC" "$ORIG_SEMENTE"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=chromium reserva-publica.spec.ts \
    --workers=1 --reporter=list >"$1" 2>&1
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3" nao_esperado="${4:-}"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    return
  fi
  if grep -q 'config.webServer was not able to start' "$ficheiro"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — a suite nem chegou a correr"
    grep -E 'error TS|Failed to type check' "$ficheiro" | head -3
    return
  fi
  if ! grep -qE "✘.*$marcador" "$ficheiro"; then
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '✘' "$ficheiro" | head -4
    return
  fi
  if [[ -n "$nao_esperado" ]] && grep -qE "✘.*$nao_esperado" "$ficheiro"; then
    vermelho "$nome: derrubou também o que NÃO devia cair ($nao_esperado)"
    return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-rp-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-rp-ligado.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "VERDE COM POUCO MEDIDO: só $passou casos (mínimo $CASOS_MINIMOS)"; exit 1
  fi
  verde "$passou casos verdes (11 telas × 5 larguras + toque, contraste, 3 idiomas, o par da estimativa)"
else
  vermelho "a prova de navegador falhou com tudo ligado"
  grep -E '✘' /tmp/bossaos-rp-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a estimativa deixa de se dizer estimativa"
# ── O ponto 1 da régua, plantado onde ele falha na vida real ─────────────
#
# «Quem espera à porta com 20 minutos no ecrã volta aos 21 a reclamar.» O texto
# passa a prometer, e o número continua exactamente igual — que é o defeito: a
# promessa não muda nada no código, só na frase.
python3 - <<'PYPROMESSA'
import json, io, collections
p = 'packages/i18n/src/mensagens/es-ES.json'
d = json.load(open(p), object_pairs_hook=collections.OrderedDict)
assert 'estimativaTexto' in d['reservaE19'], 'o texto da estimativa nao esta onde se esperava'
d['reservaE19']['estimativaTexto'] = 'Tu mesa estará lista en {minutos} minutos.'
with io.open(p, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')
PYPROMESSA
exigir_vermelho "caiu a incerteza: a estimativa passou a prometer uma hora" \
  'o TEXTO diz que o número pode mudar' /tmp/bossaos-rp-promessa.txt
cp "$ORIG_I18N" "$I18N"

echo
echo "3. CONTROLO NEGATIVO — o FACTO passa a dizer-se como a estimativa"
# A outra metade do par. «Se as duas se disserem igual, a distinção não existe.»
python3 - <<'PYFACTO'
import json, io, collections
p = 'packages/i18n/src/mensagens/es-ES.json'
d = json.load(open(p), object_pairs_hook=collections.OrderedDict)
assert 'prontoTexto' in d['reservaE19'], 'o texto do facto nao esta onde se esperava'
d['reservaE19']['prontoTexto'] = 'Calculamos que tu mesa estará lista enseguida, puede cambiar.'
with io.open(p, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')
PYFACTO
exigir_vermelho "caiu a distinção: o facto passou a soar a estimativa" \
  'o texto é um FACTO' /tmp/bossaos-rp-facto.txt
cp "$ORIG_I18N" "$I18N"

echo
echo "4. CONTROLO NEGATIVO — a posição perde o DENOMINADOR"
# «É o 3.º» é a fila outra vez. Sem o denominador, a frase deixa de ser
# verificável por quem a lê — e volta a não sobreviver ao grupo de 2 passar à
# frente.
python3 - <<'PYDENOM'
import json, io, collections
p = 'packages/i18n/src/mensagens/es-ES.json'
d = json.load(open(p), object_pairs_hook=collections.OrderedDict)
assert '{de}' in d['reservaE19']['posicao'], 'o denominador nao esta onde se esperava'
d['reservaE19']['posicao'] = 'Eres el {posicao} de la lista'
with io.open(p, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')
PYDENOM
exigir_vermelho "caiu o denominador: «é o 2.º de 3» virou «é o 2.º»" \
  'diz o DENOMINADOR' /tmp/bossaos-rp-denom.txt
cp "$ORIG_I18N" "$I18N"

echo
echo "5. CONTROLO NEGATIVO — a lista de horas deixa de se dizer ORIENTATIVA"
# «Disponibilidade da tela nunca substitui verificação de servidor.» Sem o aviso,
# a lista parece uma garantia — e a recusa no fim parece uma avaria.
python3 - <<'PYAVISO'
import io
p = 'apps/web/app/r/[publicLocationSlug]/[locale]/reserve/horarios/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="aviso-informativo">{p.horaAjuda}</p>'
assert antigo in s, 'o aviso da lista de horas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '      <p data-teste="aviso-informativo">{p.hora}</p>', 1))
PYAVISO
exigir_vermelho "caiu o aviso: a lista de horas passou a parecer uma garantia" \
  'ORIENTATIVA antes de a pessoa escolher' /tmp/bossaos-rp-aviso.txt
cp "$ORIG_HOR" "$HORARIOS"

echo
echo "6. CONTROLO NEGATIVO — a recusa deixa de dar ALTERNATIVAS"
# «Recusado» sozinho manda a pessoa recomeçar, e recomeçar é onde ela desiste.
python3 - <<'PYALT'
import io
p = 'apps/web/app/r/[publicLocationSlug]/[locale]/reserve/sem-mesa/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "  const alternativas = (typeof busca.alt === 'string' && busca.alt !== ''\n    ? busca.alt.split(',') : []).filter((h) => /^\\d{2}:\\d{2}$/.test(h));"
assert antigo in s, 'a leitura das alternativas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  const alternativas: string[] = [];", 1))
PYALT
exigir_vermelho "caiu a saída: a recusa passou a ser um beco" \
  'ALTERNATIVAS, e nunca um beco' /tmp/bossaos-rp-alt.txt
cp "$ORIG_SEM" "$SEMMESA"

echo
echo "7. CONTROLO NEGATIVO — o marketing nasce MARCADO"
# «Marketing é opcional e separado do contacto necessário à reserva.» Marcado por
# omissão, aceitar a reserva passa a ser aceitar o marketing por distracção.
python3 - <<'PYMKT'
import io
p = 'apps/web/app/r/[publicLocationSlug]/[locale]/reserve/preferencias/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "                 defaultChecked={passo.marketing === '1'} />"
assert antigo in s, 'a caixa do marketing nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "                 defaultChecked />", 1))
PYMKT
exigir_vermelho "caiu o consentimento: a caixa do marketing veio marcada" \
  'a caixa nasce vazia' /tmp/bossaos-rp-mkt.txt
cp "$ORIG_PREFS" "$PREFS"

echo
echo "8. CONTROLO NEGATIVO — a semeadura deixa de pôr a espera e a reserva"
# O falso verde da régua: sem dados, as telas com estado medem «não encontramos
# esta reserva» e «não temos mesa» — ecrãs reais, e os ecrãs FÁCEIS.
#
# ── E o plante é na RESERVA, não na espera ────────────────────────────────
#
# Tirei primeiro a espera, e o vermelho veio pelo sítio errado: `resolverAlvos`
# exige uma espera viva e recusa continuar sem ela, por isso a suite morria antes
# de medir seja o que for. Essa é uma guarda a sério, mas é a do arnês.
#
# A reserva não tem alvo — o segredo é uma constante —, e por isso é ela que a
# guarda de população protege sozinha. Sem este plante, o RES-C-007 podia passar
# a medir «não encontramos esta reserva» em cinco larguras, em silêncio.
python3 - <<'PYVAZIO'
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      await prisma.reservation.create({"
assert antigo in s, 'a semeadura da reserva publica nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "      if (false as boolean) await prisma.reservation.create({", 1))
PYVAZIO
exigir_vermelho "caiu a população: as telas com estado mediram o ecrã vazio" \
  'TÊM estado' /tmp/bossaos-rp-vazio.txt
cp "$ORIG_SEMENTE" "$SEMENTE"

echo
echo "9. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
python3 - <<'PYPOP'
import io
p = 'inspeccao/reserva-publica.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    { id: 'RES-C-008', caminho: `${base}/sem-mesa?${passo}&alt=21:00,21:30` },\n"
assert antigo in s, 'a lista de telas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYPOP
exigir_vermelho "caiu a população: 10 telas deixaram de ser 11" \
  'população é 11 telas' /tmp/bossaos-rp-pop.txt
cp "$ORIG_SPEC" "$SPEC"

echo
echo "10. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-rp-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-rp-reposto.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "reposto mas com pouco medido: $passou casos"
  else
    verde "reposto: $passou casos verdes"
  fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '✘' /tmp/bossaos-rp-reposto.txt | head -10
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))
