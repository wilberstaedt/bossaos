#!/usr/bin/env bash
#
# E15 · o Staff PWA no navegador — e o instrumento a provar-se.
#
# ── Porque é que este script existe ────────────────────────────────────────
#
# A régua do E15 abre com a frase que decide a etapa: *«nas outras etapas um
# defeito dava erro. Aqui o defeito típico é o sistema a dizer que correu bem»*.
# E fecha com o que ela reprova à cabeça: *«uma suite que não consegue ficar
# vermelha»*.
#
# Aconteceu duas vezes nesta etapa, e as duas do meu lado:
#
#  - o caso «offline não paga» clicava no botão com a rede LIGADA e dava verde,
#    porque a recusa era incondicional. Apagar a lógica de offline inteira
#    deixava-o exactamente igual;
#  - a `validar-classes.sh` não lia `apps/web/src/` e dizia «todas definidas»
#    sobre metade do JSX.
#
# Por isso cada controlo aqui planta o defeito **no artefacto real** — a página, o
# componente, o CSS — e exige que a asserção CERTA fique vermelha. Não basta ficar
# vermelha: uma prova que reprova por outro motivo mede outra coisa.
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

# ── A porta tem de estar LIVRE antes de começar ────────────────────────────
#
# Este script corre onze vezes o arnês, e cada corrida levanta o seu servidor. Um
# servidor órfão de uma corrida anterior — interrompida a meio, que acontece — faz
# o Playwright dizer «is already used» e o script responde «a prova de navegador
# falhou com tudo ligado». É verdade e é inútil: manda procurar um defeito no
# produto quando o problema é um processo esquecido.
#
# Aconteceu-me hoje, e custou uma leitura de logs para descobrir que o vermelho
# não era sobre código nenhum. Um vermelho que não significa o que diz é pior do
# que nenhum: ensina a desconfiar do vermelho.
PORTA_DA_PROVA="${PORTA_INSPECCAO:-3010}"
if lsof -ti:"$PORTA_DA_PROVA" >/dev/null 2>&1; then
  echo "ERRO: a porta $PORTA_DA_PROVA já está ocupada." >&2
  echo "      Provavelmente um servidor órfão de uma corrida interrompida." >&2
  echo "      lsof -ti:$PORTA_DA_PROVA | xargs kill -9   — ou PORTA_INSPECCAO=3012 para outra." >&2
  exit 2
fi

# ── E nenhuma outra passagem do arnês pode estar VIVA ──────────────────────
#
# Este é o defeito que me custou mais tempo hoje, e o diagnóstico só apareceu
# porque a mensagem do 404 passou a perguntar à base: **«a sessão JÁ NÃO EXISTE
# na base: alguém a apagou a meio da passagem»**.
#
# O arnês semeia no arranque e **apaga no fim** (`globalTeardown`). Uma passagem
# anterior que ainda esteja viva — ou que tenha sido interrompida e chegue ao
# fecho mais tarde — apaga as fixtures **por baixo** desta. O sintoma é um 404
# numa rota com identificador, intermitente, em telas diferentes a cada corrida.
#
# Foi isto que fez uma passagem completa dar 404 no STAFF-005 e a seguinte dar
# verde sem eu tocar em nada. Passei a ter a causa em vez da teoria, e a causa
# não estava no produto.
if pgrep -f 'playwright test' >/dev/null 2>&1; then
  echo "ERRO: já há uma passagem do arnês a correr." >&2
  echo "      Ela SEMEIA no arranque e APAGA no fim — as fixtures desta iam" >&2
  echo "      desaparecer a meio, e o sintoma seria um 404 que não é do produto." >&2
  exit 2
fi

PAINEL=apps/web/src/staff/PainelDaFila.tsx
NAVEG=packages/fila/src/navegador.ts
CSS=packages/ui/src/estilos.css
PROCURAR="apps/web/app/[idioma]/staff/[locationId]/procurar/page.tsx"

ORIG_PAINEL=$(mktemp); ORIG_NAVEG=$(mktemp); ORIG_CSS=$(mktemp); ORIG_PROCURAR=$(mktemp)
cp "$PAINEL" "$ORIG_PAINEL"; cp "$NAVEG" "$ORIG_NAVEG"
cp "$CSS" "$ORIG_CSS"; cp "$PROCURAR" "$ORIG_PROCURAR"
falhas=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  cp "$ORIG_PAINEL" "$PAINEL"; cp "$ORIG_NAVEG" "$NAVEG"
  cp "$ORIG_CSS" "$CSS"; cp "$ORIG_PROCURAR" "$PROCURAR"
  rm -f "$ORIG_PAINEL" "$ORIG_NAVEG" "$ORIG_CSS" "$ORIG_PROCURAR"
}
trap restaurar EXIT INT TERM

# `staff.spec.ts` e `staff-telas.spec.ts` de uma vez: os controlos abaixo atingem
# ora um ora outro, e correr só um deixava metade dos defeitos sem detector.
correr() {
  pnpm exec playwright test --project=preparar --project=painel \
    staff.spec.ts staff-telas.spec.ts --reporter=list >"$1" 2>&1
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    return
  fi
  # ── Um vermelho de BUILD não é uma medição ───────────────────────────────
  #
  # Aconteceu-me a 04/09 neste mesmo script: o defeito plantado deixou uma
  # variável por usar, o `tsc` reprovou e o servidor não arrancou. A suite ficou
  # vermelha sem ter corrido um caso — e sem esta linha eu teria lido isso como
  # «o controlo funciona».
  if grep -q 'config.webServer was not able to start' "$ficheiro"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — a suite nem chegou a correr"
    grep -E 'error TS|Failed to type check' "$ficheiro" | head -3
    return
  fi
  if grep -qE "✘.*$marcador" "$ficheiro"; then
    verde "$nome"
  else
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '✘' "$ficheiro" | head -4
  fi
}

# O número MEDIDO hoje, e não um mínimo folgado.
#
# 3 de preparação + 15 do `staff.spec.ts` + 13 do `staff-telas.spec.ts`. Um
# mínimo folgado — «pelo menos 12» — deixa a suite encolher para metade sem que
# nada acenda, e encolher em silêncio é como uma suite deixa de medir. Quando a
# etapa entregar mais casos, este número sobe com eles; é uma linha a mudar, e a
# alternativa é não saber.
CASOS_MINIMOS=31

echo "1. Com tudo ligado"
if correr /tmp/bossaos-staff-nav-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-staff-nav-ligado.txt | grep -oE '[0-9]+' || echo 0)
  # Verde sobre pouco medido é o falso verde desta etapa: uma suite que só corre
  # três casos passa quase sempre. O número mínimo está escrito, e sobe quando a
  # etapa entregar mais.
  if (( passou < CASOS_MINIMOS )); then
    vermelho "VERDE COM POUCO MEDIDO: só $passou casos (mínimo $CASOS_MINIMOS)"; exit 1
  fi
  verde "$passou casos de navegador verdes (23 telas × 5 larguras + toque, contraste, 3 idiomas, fila)"
else
  vermelho "a prova de navegador falhou com tudo ligado"
  grep -E '✘' /tmp/bossaos-staff-nav-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a recusa de pagamento volta a ignorar a rede"
# O defeito REAL desta etapa, reposto. `podeOffline` responde sobre a ACÇÃO, e
# mostrar a recusa sem cruzar com o estado da ligação faz o ecrã dizer «não se
# pode fazer sem conexão» COM conexão. O caso que tem de acender é o de rede
# ligada — o outro passava na mesma, e é isso que torna o defeito invisível.
python3 - <<'PYPAGA'
import io
p = 'apps/web/src/staff/PainelDaFila.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "    setRecusa(exige && semRede ? m.semRede : null);"
assert antigo in s, 'o cruzamento com a rede nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    setRecusa(exige ? m.semRede : null);"))
PYPAGA
exigir_vermelho "caiu o caso de rede LIGADA: o ecrã voltou a culpar a conexão" \
  'COM rede' /tmp/bossaos-staff-nav-paga.txt
cp "$ORIG_PAINEL" "$PAINEL"

echo
echo "3. CONTROLO NEGATIVO — as suspensas voltam a nao contar os outros baldes"
# O defeito que a troca de utilizador encontrou: a interface lia o balde da
# pessoa actual, e por isso as suspensas eram sempre zero — o ecrã dizia «nada
# pendente» sobre trabalho que estava ali ao lado.
#
# ── O defeito plantado tem de COMPILAR ─────────────────────────────────────
#
# A primeira versão deste controlo escrevia `if (chave !== '') continue;`. Isso
# deixava `minha` por usar, o `tsc` reprovava, e o servidor da inspecção nem
# arrancava: a suite ficou vermelha — **por não ter chegado a correr**. Passou
# no sentido de acender, e não mediu nada.
#
# É a mesma armadilha do verde vazio pelo avesso: um vermelho que não vem da
# asserção não prova que o detector funciona. Por isso o defeito é agora a
# INVERSÃO da condição, que compila e reproduz fielmente o que o produto fazia —
# olhar só para o próprio balde.
python3 - <<'PYSUSP'
import io
p = 'packages/fila/src/navegador.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    if (chave === minha) continue;"
assert antigo in s, 'a exclusao do proprio balde nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    if (chave !== minha) continue;"))
PYSUSP
exigir_vermelho "caiu a troca de utilizador: as suspensas deixaram de ser declaradas" \
  'troca de utilizador' /tmp/bossaos-staff-nav-susp.txt
cp "$ORIG_NAVEG" "$NAVEG"

echo
echo "4. CONTROLO NEGATIVO — os alvos de toque do indice voltam a 22 px"
# Foi a prova de navegador que o apanhou, e nada mais o podia apanhar: uma
# ligação pequena não é um erro em lado nenhum. É uma ligação que funciona e que
# ninguém acerta de pé — e é o ÚNICO caminho para dez das telas.
python3 - <<'PYTOQUE'
import io
p = 'packages/ui/src/estilos.css'
s = io.open(p, encoding='utf-8').read()
antigo = """.bo-staff .bo-lista a {
  display: flex; align-items: center;
  min-height: var(--bo-toque-operacao);
  overflow-wrap: anywhere;
}"""
assert antigo in s, 'a regra dos alvos do indice nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYTOQUE
exigir_vermelho "caiu a medição de toque: o índice voltou a ter alvos pequenos" \
  'alvos de toque' /tmp/bossaos-staff-nav-toque.txt
cp "$ORIG_CSS" "$CSS"

echo
echo "5. CONTROLO NEGATIVO — uma tela perde o caminho de navegacao"
# Uma tela sem ligação está tão morta como uma que não existe, com a diferença de
# que RESPONDE ao endereço — e por isso as cinco larguras dela ficam verdes.
# Sem este controlo, o índice podia perder metade das entradas em silêncio.
python3 - <<'PYNAV'
import io
p = 'apps/web/app/[idioma]/staff/[locationId]/procurar/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "          {SECCOES_DO_STAFF.map((x) => ("
assert antigo in s, 'o indice de todas as telas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "          {SECCOES_DO_STAFF.filter((x) => x.principal).map((x) => ("))
PYNAV
exigir_vermelho "caiu a alcançabilidade: dez telas ficaram sem caminho" \
  'caminho de navegação' /tmp/bossaos-staff-nav-alcance.txt
cp "$ORIG_PROCURAR" "$PROCURAR"

echo
echo "6. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
# A régua exige que a prova conte a própria população: «sem isso, ‹as telas estão
# verdes› e' uma frase sobre as telas que alguem se lembrou de listar».
#
# Este controlo tira uma tela da lista. Sem a contagem, as 22 restantes ficavam
# verdes e o relatorio dizia o mesmo que diz hoje — o desaparecimento nao faz
# barulho nenhum a passar.
TELAS_SPEC=inspeccao/staff-telas.spec.ts
ORIG_TELAS=$(mktemp); cp "$TELAS_SPEC" "$ORIG_TELAS"
python3 - <<'PYPOP'
import io
p = 'inspeccao/staff-telas.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    { id: 'STAFF-011', caminho: '/cursos', marcador: '[data-tela=\"STAFF-011\"]' },\n"
assert antigo in s, 'a linha do STAFF-011 nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYPOP
exigir_vermelho "caiu a contagem da populacao: 22 telas deixaram de ser 23" \
  'população é 23 telas' /tmp/bossaos-staff-nav-populacao.txt
cp "$ORIG_TELAS" "$TELAS_SPEC"; rm -f "$ORIG_TELAS"

echo
echo "7. CONTROLO NEGATIVO — o portao de sessao volta a estar desligado"
# O portao existia em `sincronizar(…, sessaoValida)` desde o primeiro dia e NADA o
# ligava: quem chamava de dentro do produto passava sempre `true`, porque nao
# tinha como saber. Estava provado nos testes da logica e morto no produto — a
# pior combinacao, porque tem uma prova verde por cima.
#
# O defeito plantado e' o 401 voltar a ser tratado como indeterminado, que e' o
# que o `catch` largo fazia: a entrada ficava PENDENTE e a fila voltava a tentar
# em ciclo com uma sessao que ja' nao existe.
FILA_NAV=apps/web/src/staff/fila-do-navegador.ts
ORIG_FILA_NAV=$(mktemp); cp "$FILA_NAV" "$ORIG_FILA_NAV"
python3 - <<'PYSESSAO'
import io
p = 'apps/web/src/staff/fila-do-navegador.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """        if (r.status === 401) {
          sinal.morreu = true;
          return { ok: false, naoSaiu: true };
        }"""
assert antigo in s, 'a deteccao de 401 no envio nao esta onde se esperava'
# Compila e reproduz o defeito: o 401 deixa de levantar o sinal.
novo = """        if (r.status === 401) {
          return { ok: false, indeterminado: true };
        }"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYSESSAO
exigir_vermelho "caiu o caso da sessao morta: o ecra deixou de mandar entrar outra vez" \
  'sem sessão' /tmp/bossaos-staff-nav-sessao.txt
cp "$ORIG_FILA_NAV" "$FILA_NAV"; rm -f "$ORIG_FILA_NAV"

echo
echo "8. CONTROLO NEGATIVO — o aparelho volta a nao declarar o numero"
# A pendencia que o E13 deixou escrita: o DEV-004 sabia mostrar o numero e dizer
# que nao sabe, e faltava alguem a falar. Sem a escrita, o ecra de revogar volta
# a dizer 'nao sei' para sempre — e a decisao de descartar deixa de ser honesta,
# porque quem decide ja' nao sabe o que descarta.
DISPOS=packages/db/src/dispositivos.ts
ORIG_DISPOS=$(mktemp); cp "$DISPOS" "$ORIG_DISPOS"
python3 - <<'PYDECL'
import io
p = 'packages/db/src/dispositivos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    data: { rascunhosPorEnviar: quantos, ultimoVistoEm: new Date() },"
assert antigo in s, 'a escrita do numero nao esta onde se esperava'
# So' o carimbo de vida: o numero deixa de ser escrito, e o campo fica NULL.
novo = "    data: { ultimoVistoEm: new Date() },"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYDECL
exigir_vermelho "caiu a declaracao: o numero deixou de chegar a quem revoga" \
  'DEPOIS de falar' /tmp/bossaos-staff-nav-declarar.txt
cp "$ORIG_DISPOS" "$DISPOS"; rm -f "$ORIG_DISPOS"

echo
echo "9. CONTROLO NEGATIVO — o marcador da tela deixa de existir"
# ── O defeito que o senior encontrou, e que eu nao podia ter visto ─────────
#
# A prova exige um marcador `[data-tela=...]` por tela. A NAVEGACAO escrevia
# `data-tela` com o id de cada seccao — e a navegacao aparece em todas as
# paginas do Staff. Logo o marcador de qualquer tela existia em TODAS elas: a
# assercao que afirma «cheguei a esta tela» era satisfeita pela barra, sempre.
#
# Ele encontrou-o degradando o marcador em duas telas a mao e vendo a prova
# aguentar. Este controlo e' esse trabalho automatizado, para o buraco nao voltar
# sem barulho: tira o `data-tela` do cabecalho e exige que a prova acenda.
PECAS=apps/web/src/staff/PecasDoStaff.tsx
ORIG_PECAS=$(mktemp); cp "$PECAS" "$ORIG_PECAS"
python3 - <<'PYMARCA'
import io
p = 'apps/web/src/staff/PecasDoStaff.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "          <h1 data-tela={tela}>{titulo}</h1>"
assert antigo in s, 'o marcador do cabecalho nao esta onde se esperava'
# `tela` continua usada (fica no atributo de dados generico), logo compila.
novo = "          <h1 data-titulo-de={tela}>{titulo}</h1>"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYMARCA
exigir_vermelho "caiu o marcador: uma tela sem cabecalho proprio deixou de passar" \
  '23 telas' /tmp/bossaos-staff-nav-marcador.txt
cp "$ORIG_PECAS" "$PECAS"; rm -f "$ORIG_PECAS"

echo
echo "10. CONTROLO NEGATIVO — a origem do pedido some do ecra"
# O buraco que o senior encontrou na assinatura: a origem estava no PRODUTO e nao
# havia uma unica prova que a observasse. Nao era defeito — era uma propriedade
# implementada e por provar, que e' a definicao do que pode regredir em silencio.
#
# A regra que ele completou, e que este controlo executa: para cada aceite,
# aponta a linha do produto onde ele e' exercido E a assercao que fica vermelha
# se essa linha desaparecer. Uma sem a outra deixa passar as duas formas —
# codigo sem prova, e prova sem codigo.
ANDAMENTO="apps/web/app/[idioma]/staff/[locationId]/andamento/page.tsx"
ORIG_ANDAMENTO=$(mktemp); cp "$ANDAMENTO" "$ORIG_ANDAMENTO"
python3 - <<'PYORIGEM'
import io, re
p = 'apps/web/app/[idioma]/staff/[locationId]/andamento/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = """            <p data-teste="origem" data-canal={pedido.canal}>
              {s.origem}: {pedido.canal === 'SALA' ? s.origemEmpregado : s.origemCliente}
            </p>"""
assert antigo in s, 'a linha da origem nao esta onde se esperava'
# A origem some do ecra. O pedido continua a aparecer — e e' esse o defeito:
# nada estoira, so' deixa de se poder distinguir de onde veio.
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ''))
PYORIGEM
exigir_vermelho "caiu a origem: os dois pedidos deixaram de se distinguir" \
  'origem do pedido' /tmp/bossaos-staff-nav-origem.txt
cp "$ORIG_ANDAMENTO" "$ANDAMENTO"; rm -f "$ORIG_ANDAMENTO"

echo
echo "11. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-staff-nav-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-staff-nav-reposto.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "reposto mas com pouco medido: $passou casos"
  else
    verde "reposto: $passou casos verdes"
  fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '✘' /tmp/bossaos-staff-nav-reposto.txt | head -10
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas falhas"; fi
exit $(( falhas > 0 ? 1 : 0 ))
