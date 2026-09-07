#!/usr/bin/env bash
#
# E17 · as 16 telas no navegador — e o instrumento a provar-se.
#
# ── O controlo 2 é o que decide ────────────────────────────────────────────
#
# Planta o colapso — a rotação a fechar as sessões vivas — e exige que caia o
# caso da visita que CONTINUA. Se caísse o da revogação em vez desse, o detector
# estaria a medir «alguma coisa parou» e não a distinção entre os dois actos.
#
# E o controlo 1 é o que impede o falso verde que este arnês quase teve: sem a
# bolacha, as sete telas da visita redireccionam para o STATE-009, e a asserção
# do caminho final é a única coisa que separa «medi a tela» de «medi o desvio».
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

# As duas guardas do E15: um servidor órfão, ou outra passagem viva que apaga as
# fixtures desta no fecho. A segunda custou uma hora a diagnosticar.
PORTA_DA_PROVA="${PORTA_INSPECCAO:-3010}"
if lsof -ti:"$PORTA_DA_PROVA" >/dev/null 2>&1; then
  echo "ERRO: a porta $PORTA_DA_PROVA já está ocupada — servidor órfão?" >&2
  exit 2
fi
if pgrep -f 'playwright test' >/dev/null 2>&1; then
  echo "ERRO: já há uma passagem do arnês a correr; ela apaga as fixtures no fim." >&2
  exit 2
fi

VISITANTE=packages/db/src/visitante.ts
PECAS=apps/web/src/visitante/PecasDoVisitante.tsx
RENOVAR="apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/channels/qr/mesa/[tableId]/renovar/page.tsx"
SPEC=inspeccao/visitante.spec.ts
AJUDA="apps/web/app/r/[publicLocationSlug]/[locale]/mesa/ajuda/page.tsx"

ORIG_VISITANTE=$(mktemp); ORIG_PECAS=$(mktemp); ORIG_RENOVAR=$(mktemp); ORIG_SPEC=$(mktemp)
ORIG_AJUDA=$(mktemp)
LEITOR="apps/web/src/visitante/sessao-do-visitante.ts"
PORTA="apps/web/app/r/[publicLocationSlug]/api/mesa/route.ts"
ORIG_LEITOR=$(mktemp); ORIG_PORTA=$(mktemp)
cp "$VISITANTE" "$ORIG_VISITANTE"; cp "$PECAS" "$ORIG_PECAS"
cp "$RENOVAR" "$ORIG_RENOVAR"; cp "$SPEC" "$ORIG_SPEC"; cp "$AJUDA" "$ORIG_AJUDA"
cp "$LEITOR" "$ORIG_LEITOR"; cp "$PORTA" "$ORIG_PORTA"
falhas=0

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

restaurar() {
  cp "$ORIG_VISITANTE" "$VISITANTE"; cp "$ORIG_PECAS" "$PECAS"
  cp "$ORIG_RENOVAR" "$RENOVAR"; cp "$ORIG_SPEC" "$SPEC"; cp "$ORIG_AJUDA" "$AJUDA"
  cp "$ORIG_LEITOR" "$LEITOR"; cp "$ORIG_PORTA" "$PORTA"
  rm -rf "apps/web/app/api/publico/mesa"
  rm -f "$ORIG_VISITANTE" "$ORIG_PECAS" "$ORIG_RENOVAR" "$ORIG_SPEC" "$ORIG_AJUDA" "$ORIG_LEITOR" "$ORIG_PORTA"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel visitante.spec.ts \
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
    vermelho "$nome: caiu TAMBÉM o que não devia cair ($nao_esperado) — não distingue"
    return
  fi
  verde "$nome"
}

# 3 de preparação + 19 do spec.
CASOS_MINIMOS=23

echo "1. Com tudo ligado"
if correr /tmp/bossaos-visita-nav-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-visita-nav-ligado.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "VERDE COM POUCO MEDIDO: só $passou casos (mínimo $CASOS_MINIMOS)"; exit 1
  fi
  verde "$passou casos verdes (16 telas × 5 larguras + toque, contraste, 3 idiomas, os dois actos)"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '✘' /tmp/bossaos-visita-nav-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO OBRIGATÓRIO — RODAR passa a REVOGAR, no produto"
# O colapso, medido onde a pessoa o veria: a visita que estava aberta deixa de
# abrir depois de o QR ser trocado.
plantar <<'PYCOLAPSO' || true
import io
p = 'packages/db/src/visitante.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const sessoesQueContinuam = await db.guestSession.count({"
assert antigo in s, 'a contagem da rotacao nao esta onde se esperava'
novo = """  await db.guestSession.updateMany({
    where: { tableId: mesa.id, estado: 'ACTIVA' },
    data: { estado: 'REVOGADA', revogadaEm: new Date(), revogadaPor: dados.actor.email },
  });
  const sessoesQueContinuam = await db.guestSession.count({"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYCOLAPSO
exigir_vermelho "caiu a visita: rodar expulsou quem estava sentado" \
  'rodar não expulsa quem está sentado' /tmp/bossaos-visita-nav-colapso.txt
cp "$ORIG_VISITANTE" "$VISITANTE"

echo
echo "3. CONTROLO NEGATIVO — o ecrã deixa de dizer o NÚMERO antes de confirmar"
plantar <<'PYNUMERO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/channels/qr/mesa/[tableId]/renovar/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = """        <p data-teste="vao-cair">
          <strong>{s.vaoCair}</strong>: {vivas.length}
        </p>"""
assert antigo in s, 'a linha do numero nao esta onde se esperava'
# O botão fica; o número desaparece. Nada estoira — e quem revoga passa a
# descobrir depois, que é exactamente o que o E13 proibiu.
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYNUMERO
exigir_vermelho "caiu o aviso: revogar deixou de dizer quantas caem" \
  'NÚMERO das sessões que caem' /tmp/bossaos-visita-nav-numero.txt
cp "$ORIG_RENOVAR" "$RENOVAR"

echo
echo "4. CONTROLO NEGATIVO — os dois actos colapsam num só no ECRÃ"
# A regra da base continua certa; o produto é que passa a oferecer um botão só.
# Sem este controlo, o colapso podia voltar pela interface sem nada acender.
plantar <<'PYUMBOTAO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/channels/qr/mesa/[tableId]/renovar/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = """        <p className="bo-campo__ajuda" data-teste="revogar-ajuda">{s.revogarAjuda}</p>"""
assert antigo in s, 'a ajuda da revogacao nao esta onde se esperava'
# As duas passam a ser explicadas com as MESMAS palavras: dois botões que dizem
# a mesma coisa são um botão com duas cores.
novo = """        <p className="bo-campo__ajuda" data-teste="revogar-ajuda">{s.rodarAjuda}</p>"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYUMBOTAO
exigir_vermelho "caiu a distinção: os dois actos passaram a dizer o mesmo" \
  'dois actos, e o ecrã di-lo' /tmp/bossaos-visita-nav-umbotao.txt
cp "$ORIG_RENOVAR" "$RENOVAR"

echo
echo "5. CONTROLO NEGATIVO — o marcador da tela deixa de existir"
# O marcador MUDOU DE CASA a 07/09: os tres cabecalhos identicos —
# CabecalhoDoKds, CabecalhoDaVisita e CabecalhoDoKiosk — foram
# consolidados no `CabecalhoDePagina` de `packages/ui`, e o `PecasDoVisitante.tsx`
# deixou de o escrever. O plante ficou em letra morta: o `exigir_vermelho`
# corria contra um produto intacto, passava, e o guiao concluia que a
# assercao era vazia. Re-ancorado no sitio onde o marcador vive AGORA,
# que e' o que o plante quer mudar — nao no ficheiro onde vivia.
plantar <<'PYMARCA' || true
import io
p = 'packages/ui/src/componentes/CabecalhoDePagina.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "        <h1 data-tela={tela}>{titulo}</h1>"
assert antigo in s, 'o marcador do cabecalho nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "        <h1 data-titulo-de={tela}>{titulo}</h1>"))
PYMARCA
exigir_vermelho "caiu o marcador: uma tela sem cabeçalho próprio deixou de passar" \
  '16 telas' /tmp/bossaos-visita-nav-marcador.txt
cp "$ORIG_PECAS" "$PECAS"

echo
echo "6. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
plantar <<'PYPOP' || true
import io
p = 'inspeccao/visitante.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    { id: 'MENU-012', caminho: `${publico}/mesa/ajuda`, marcador: marcador('MENU-012'), comVisita: true },\n"
assert antigo in s, 'a linha do MENU-012 nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYPOP
exigir_vermelho "caiu a população: 15 telas deixaram de ser 16" \
  'população é 16 telas' /tmp/bossaos-visita-nav-populacao.txt
cp "$ORIG_SPEC" "$SPEC"

echo
echo "7. CONTROLO NEGATIVO — a prova deixa de pôr a bolacha do visitante"
# ── É o falso verde que este arnês quase teve ─────────────────────────────
#
# Sem a bolacha, as sete telas da visita redireccionam para o STATE-009. A
# asserção do CAMINHO FINAL é a única coisa que separa «medi a tela» de «medi o
# desvio» — e sem ela seriam cinco larguras verdes sobre o ecrã errado.
plantar <<'PYBOLACHA' || true
import io
p = 'inspeccao/visitante.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (tela.comVisita) await comBolachaDeVisita(pagina.context());"
assert antigo in s, 'a colocacao da bolacha nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  void tela.comVisita;"))
PYBOLACHA
exigir_vermelho "caiu o desvio: sem bolacha, as telas da visita mediam o STATE-009" \
  '16 telas não transbordam' /tmp/bossaos-visita-nav-bolacha.txt
cp "$ORIG_SPEC" "$SPEC"

echo
echo "8. CONTROLO NEGATIVO — a porta do visitante sai do endereco do restaurante"
# ── O defeito que a prova de navegador apanhou, plantado de volta ───────────
#
# A bolacha do visitante tem `path=/r/<slug>` de proposito: uma bolacha a raiz
# viajava para os outros restaurantes servidos pelo mesmo dominio. Com a porta
# fora desse caminho, o navegador simplesmente NAO A ENVIA — e o formulario
# chegava la sem credencial.
#
# Nada dava erro: a rota respondia 303, a pagina carregava, e o pedido
# desaparecia. Nenhuma prova de base o podia ver, porque do lado do servidor a
# bolacha estava sempre la. So carregar num botao o mostrava.
plantar <<'PYPORTA' || true
import io, pathlib
# A porta muda de sitio; o formulario passa a apontar para fora do `path` da
# bolacha, que e' exactamente o defeito.
p = 'apps/web/app/r/[publicLocationSlug]/[locale]/mesa/ajuda/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = 'action={`/r/${publicLocationSlug}/api/mesa`}'
assert antigo in s, 'o endereco da porta nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, 'action="/api/publico/mesa"'))
PYPORTA
# ── Apaga-se SÓ o que este controlo cria ──────────────────────────────────
#
# A primeira versão fazia `rm -rf apps/web/app/api/publico` — e essa pasta é do
# E10: leva o `demo` e o `lead`, que são rotas a sério. Apagou as duas, e só o
# `git status` mo disse.
#
# Um script de prova que destrói trabalho é pior do que uma prova em falta: a
# prova em falta não mente sobre o repositório. Agora remove-se a pasta `mesa`
# que ele próprio criou, e mais nada.
mkdir -p "apps/web/app/api/publico/mesa"
cp "apps/web/app/r/[publicLocationSlug]/api/mesa/route.ts" /tmp/bossaos-porta-visitante.ts
plantar <<'PYCOPIA' || true
import io
s = io.open('/tmp/bossaos-porta-visitante.ts', encoding='utf-8').read()
# A copia na raiz precisa de um nivel a menos nos caminhos.
s = s.replace("'../../../../../src/", "'../../../../src/")
io.open('apps/web/app/api/publico/mesa/route.ts', 'w', encoding='utf-8').write(s)
PYCOPIA
exigir_vermelho "caiu o ciclo: a bolacha deixou de chegar a porta, e a chamada evaporou-se" \
  'primeiro toque diz' /tmp/bossaos-visita-nav-porta.txt
cp "$ORIG_AJUDA" "$AJUDA"
rm -rf "apps/web/app/api/publico/mesa"

echo "9. CONTROLO NEGATIVO — a porta deixa de RECUSAR quem não tem bolacha"
# ── O par vivo da regra nova da pasta pública ─────────────────────────────
#
# A `provar-publico.sh` verifica isto por leitura do ficheiro, e a leitura não
# distingue uma porta que recusa de uma porta que lê a credencial e continua à
# mesma. Aqui a recusa é exercida contra a porta a correr.
#
# ── Duas guardas, e por isso o plante tem duas linhas ─────────────────────
#
# Tentei três plantes antes deste, e os dois primeiros ensinaram-me alguma coisa:
#
#  1. apagar o `if (!visitante) return …` da rota **não compila** — sem a recusa,
#     `visitante` fica anulável a jusante. Um defeito que não compila não é um
#     defeito plantado: é um ficheiro partido, e o ajudante disse-o em vez de o
#     contar como vermelho;
#  2. fazer o leitor devolver «qualquer visita ACTIVA» com o cliente do runtime
#     ficou VERDE, porque sem escopo de inquilino a política de linha recusa em
#     silêncio. O RLS estava a anular o defeito — a mesma lição que já mordeu no
#     E17;
#  3. mandar o leitor pela porta estreita ficou verde na mesma, e aí a razão é
#     do produto: a rota **não usa** o objecto do visitante para escrever. Usa o
#     TOKEN que veio no pedido, e sem bolacha esse token é vazio.
#
# São duas guardas independentes em série: uma identifica a visita, a outra
# autoriza a escrita com a credencial do próprio pedido. É melhor assim — e
# significa que nenhum plante de uma linha abre a porta.
#
# Por isso este controlo planta as duas. Continua a ser UM defeito — «a porta
# deixa de exigir a credencial» — e a alternativa era ter uma asserção viva sem
# controlo nenhum, que é a guarda que ninguém pode verificar.
plantar <<'PYRECUSA' || true
import io
p = 'apps/web/src/visitante/sessao-do-visitante.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (!bolacha) return null;"
assert antigo in s, 'a recusa do leitor da credencial nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, "  if (!bolacha) return visitanteActivo(obterBase(), 'insp-token-do-visitante-para-medir');", 1))

p = 'apps/web/app/r/[publicLocationSlug]/api/mesa/route.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const bolachaDoVisitante = (await cookies()).get(BOLACHA_DO_VISITANTE)?.value ?? '';"
assert antigo in s, 'a leitura do token do pedido nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo,
    "  const bolachaDoVisitante = (await cookies()).get(BOLACHA_DO_VISITANTE)?.value ?? 'insp-token-do-visitante-para-medir';", 1))
PYRECUSA
exigir_vermelho "caiu a recusa: uma escrita sem credencial chegou ao produto" \
  'sem bolacha é RECUSADA' /tmp/bossaos-visita-nav-recusa.txt
cp "$ORIG_LEITOR" "$LEITOR"; cp "$ORIG_PORTA" "$PORTA"

echo "10. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-visita-nav-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-visita-nav-reposto.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "reposto mas com pouco medido: $passou casos"
  else
    verde "reposto: $passou casos verdes"
  fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '✘' /tmp/bossaos-visita-nav-reposto.txt | head -10
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))
