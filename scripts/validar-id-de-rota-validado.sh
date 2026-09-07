#!/usr/bin/env bash
# ── RV100-024: um id de rota mal formado é 404, e não 500 ──────────────────
#
# O DEFEITO, e é uma CLASSE. Um segmento de URL que não seja UUID entra directo
# num `where` sobre uma coluna `@db.Uuid`; o Postgres levanta `22P02`, o Prisma
# traduz para `P2023`, e a página devolve 500 **antes** de chegar ao
# `notFound()` que ela já tem escrito. Foram medidas 128 páginas debaixo de um
# segmento `[…Id]` e nenhuma validava a forma antes de consultar.
#
# A CURA não foi validar em 128 sítios. A camada de dados dá um NOME à falha
# (`IdentificadorMalFormado`, no `comEscopo` e no `comIdentidade`) e o
# `comEscopoDoPedido` traduz o nome em `notFound()`. Uma página nova fica
# protegida por usar o invólucro — que já tem de usar para ter escopo.
#
# ESTA GUARDA mede o RESULTADO: o código HTTP que sai de rotas reais com um id
# mal formado. A primeira versão media ADOPÇÃO — contava páginas que chamam o
# invólucro — e deu **128 de 128 verde enquanto duas rotas devolviam 500**. Um
# número de cobertura não é um resultado, e foi assim que o achado se fechou com
# o defeito lá dentro.
#
# A adopção continua medida, e continua a valer: é ela que diz que uma página
# NOVA fica coberta. Mas é âmbito, não veredicto.
#
# Três respostas:
#   OK (0)        todas as páginas com segmento de id passam por um invólucro
#                 que traduz, e a tradução está no sítio
#   FALHOU (1)    alguma alcança a base por fora, ou a tradução desapareceu
#   NÃO MEDI (2)  a sonda não acendeu, ou a população não é a esperada
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "Um id de rota mal formado dá 404 e não 500?"

# O ambiente, porque a medição passou a ir a uma rota real. Enquanto isto era
# só análise estática não fazia falta — e a falta apareceu como «não consegui
# preparar o arnês», que é o sintoma e não a causa.
if [ -f .env ]; then set -a; . ./.env; set +a; fi

# ── 1. Nada de verificar a GRAFIA do mecanismo ────────────────────────────
#
# Aqui esteve um portão que procurava `IdentificadorMalFormado) notFound()` no
# `sessao.ts`. Quando a cura passou a perguntar pela estrutura em vez da classe,
# a linha mudou e o portão deu NÃO MEDI sobre um mecanismo que estava lá e a
# funcionar. Um guarda que verifica como uma coisa está escrita reprova a
# reescrita e não reprova o defeito.
#
# O que vem a seguir mede o que o mecanismo FAZ: primeiro a tradução, com um
# erro da forma medida; depois o código HTTP numa rota real. Se alguém apagar a
# cura, isso sai VERMELHO no resultado — que é onde deve sair.

# ── 1.1 E a tradução tem de FUNCIONAR, e não só estar escrita ─────────────
#
# O passo acima confirma que o mecanismo está no sítio; este confirma que ele
# faz o que diz. Corre com um cliente falso que levanta o `P2023` — não precisa
# de base, e é de propósito: o que aqui se prova é a tradução, e essa mede-se
# sem uma linha de dados. O controlo negativo lá dentro exige que um erro de
# base NÃO vire «não existe»: converter tudo esconderia a falha real atrás de um
# 404, que é pior do que o 500 porque ninguém a vai procurar.
if ! node --experimental-strip-types --test provas/identificador-mal-formado.test.ts >/tmp/bossaos-id-traducao.txt 2>&1; then
  vermelho "a tradução não faz o que diz:"
  grep -E 'not ok|AssertionError' /tmp/bossaos-id-traducao.txt | head -4 | sed 's/^/           /'
  exit "$FALHOU"
fi
# O relator do Node escreve «ℹ pass 4» quando corre num terminal e «# pass 4»
# quando escreve para ficheiro. Apanhar só uma das formas dava uma linha com o
# número em branco — foi o que aconteceu, e um número em branco num relatório é
# pior do que nenhum, porque parece medido.
CASOS=$(sed -nE 's/^[#ℹ] pass ([0-9]+)$/\1/p' /tmp/bossaos-id-traducao.txt | head -1)
verde "${CASOS:-?} casos: o P2007 do uuid vira nome, e um erro de base não vira"

# ── 1.2 O RESULTADO: que código sai de uma rota real ──────────────────────
#
# Um id mal formado numa rota que EXISTE. Cada uma leva o seu par de controlo
# com um UUID válido que não existe: se esse não der 404 também, o que se mede
# não é a forma do id — é a ausência da rota. As duas vias são medidas, porque
# foi a diferença entre elas que escondeu o defeito.
PORTA_DA_PROVA="${PORTA_INSPECCAO:-3018}"
if lsof -nP -iTCP:"$PORTA_DA_PROVA" -sTCP:LISTEN >/dev/null 2>&1; then
  naomedi "a porta $PORTA_DA_PROVA já está ocupada — outra inspecção a correr?"
  exit "$NAO_MEDI"
fi
if ! bash scripts/arnes-pronto.sh >/tmp/bossaos-id-arnes.txt 2>&1; then
  naomedi "não consegui preparar o arnês — sem ele não há rota real a que bater."
  exit "$NAO_MEDI"
fi
SAIDA_HTTP=/tmp/bossaos-id-http.txt
PORTA_INSPECCAO="$PORTA_DA_PROVA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA_DA_PROVA" \
  pnpm exec playwright test --project=preparar --project=painel id-de-rota.spec.ts \
  --reporter=line >"$SAIDA_HTTP" 2>&1
ESTADO_HTTP=$?
if grep -qE 'config.webServer was not able to start|Could not find a production build' "$SAIDA_HTTP"; then
  naomedi "o servidor da inspecção não arrancou — o \`.next\` em reconstrução noutro processo?"
  exit "$NAO_MEDI"
fi
if grep -q 'Error: POPULACAO-ZERO' "$SAIDA_HTTP"; then
  naomedi "as rotas de controlo não responderam 404 — não se mediu a forma do id:"
  grep -o 'Error: POPULACAO-ZERO:[^"]*' "$SAIDA_HTTP" | head -2 | sed 's/^/           /'
  exit "$NAO_MEDI"
fi
AMB_HTTP=$(grep -o 'AMBITO .*' "$SAIDA_HTTP" | tail -1)
if [ "$ESTADO_HTTP" -ne 0 ]; then
  vermelho "um id mal formado NÃO sai como 404 nas rotas medidas:"
  sed 's/\x1b\[[0-9;]*m//g' "$SAIDA_HTTP" | grep -E 'deu [0-9]+ e não' | head -6 | sed 's/^ */           /'
  echo "           $AMB_HTTP"
  exit "$FALHOU"
fi
verde "o código que sai é 404 nas rotas medidas — $(sed -n 's/.*medidas=\([0-9]*\).*/\1/p' <<<"$AMB_HTTP") rotas, as duas vias"

# ── 1.3 O CONTROLO NEGATIVO, em TODAS as vias e não numa ──────────────────
#
# O meu controlo anterior desligava a tradução num sítio — o da sessão — e por
# isso provava metade. O revisor aplicou o mesmo plante ao outro lado e ficou
# VERDE com a tradução desligada: aqueles 404 vinham do «não encontrado» próprio
# das rotas, não da cura.
#
# Agora o plante é encontrado, e não escrito à mão: substitui `(erro)` por
# `(null)` em TODAS as chamadas ao reconhecedor do lado web. Se amanhã houver
# uma terceira via, ela é apanhada por existir, sem ninguém se lembrar dela.
#
# E a exigência é a que separa as duas origens: com a tradução inerte, cada alvo
# TEM de deixar de dar 404. Um alvo que continue em 404 não está a medir a
# tradução — está a medir a rota, e isso di-lo aqui em vez de passar por prova.
FICHEIROS_DA_TRADUCAO=$(grep -rl 'ehIdentificadorMalFormado(erro)' apps/web/src packages/db/src 2>/dev/null)
if [ -z "$FICHEIROS_DA_TRADUCAO" ]; then
  naomedi "não encontrei uma única chamada ao reconhecedor — não há o que desligar."
  exit "$NAO_MEDI"
fi
GUARDADOS=/tmp/bossaos-id-plante; rm -rf "$GUARDADOS"; mkdir -p "$GUARDADOS"
repor_traducao() {
  for f in $FICHEIROS_DA_TRADUCAO; do
    cp "$GUARDADOS/$(echo "$f" | tr / _)" "$f" 2>/dev/null || true
  done
}
trap repor_traducao EXIT INT TERM
N_PLANTES=0
for f in $FICHEIROS_DA_TRADUCAO; do
  cp "$f" "$GUARDADOS/$(echo "$f" | tr / _)"
  # `(null)` e não apagar a linha: apagar deixa um símbolo por usar, o build
  # cai, e a guarda diz NÃO MEDI em vez de vermelho — um plante que não compila
  # não é um controlo, é uma ausência de medição disfarçada.
  perl -pi -e 's/ehIdentificadorMalFormado\(erro\)/ehIdentificadorMalFormado(null)/g' "$f"
  N_PLANTES=$((N_PLANTES + 1))
done

SAIDA_PLANTE=/tmp/bossaos-id-http-plante.txt
PORTA_INSPECCAO="$PORTA_DA_PROVA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA_DA_PROVA" \
  pnpm exec playwright test --project=preparar --project=painel id-de-rota.spec.ts \
  --reporter=line >"$SAIDA_PLANTE" 2>&1
repor_traducao; trap - EXIT INT TERM

if grep -qE 'config.webServer was not able to start|Could not find a production build' "$SAIDA_PLANTE"; then
  naomedi "com o plante, o servidor não arrancou — o plante partiu o build e isto não é vermelho, é falta de medição."
  exit "$NAO_MEDI"
fi
TEIMOSOS=$(grep -o 'CODIGO [^ ]* [^ ]* 404' "$SAIDA_PLANTE" | awk '{print $2" ("$3")"}' | sort -u)
MEDIDOS_PLANTE=$(grep -c '^CODIGO ' "$SAIDA_PLANTE" || true)
if [ "${MEDIDOS_PLANTE:-0}" -eq 0 ]; then
  naomedi "com o plante não saiu um único código — a corrida do controlo não mediu nada."
  exit "$NAO_MEDI"
fi
if [ -n "$TEIMOSOS" ]; then
  vermelho "com a tradução desligada em $N_PLANTES ficheiro(s), estas rotas continuam a dar 404:"
  printf '%s\n' "$TEIMOSOS" | sed 's/^/           /'
  echo "           O 404 delas não vem da tradução — vem da própria rota. Enquanto"
  echo "           estiverem na lista, o verde que dão é emprestado."
  exit "$FALHOU"
fi
verde "controlo negativo em $N_PLANTES ficheiro(s): com a tradução inerte, os $MEDIDOS_PLANTE alvos deixam de dar 404"

# E os ficheiros voltaram ao que eram.
for f in $FICHEIROS_DA_TRADUCAO; do
  if ! cmp -s "$f" "$GUARDADOS/$(echo "$f" | tr / _)"; then
    vermelho "o plante não foi reposto em $f — a árvore ficou adulterada."
    exit "$FALHOU"
  fi
done
verde "os $N_PLANTES ficheiros do plante voltaram ao byte"

# ── 2. A população, e a pergunta é «TODAS?» e não «alguma?» ────────────────
#
# A lição de hoje, na frase que a nomeou: um controlo que pergunta «maior que
# zero» passa com 20 de 128. Aqui pergunta-se pelo total, e o total tem de
# fechar com a soma das partes.
analisar() { python3 - <<'PY' 2>/dev/null
import os, re, sys

RAIZ = 'apps/web/app'
SRC = 'apps/web/src'
# Os invólucros que TRADUZEM. Chegar a um deles é estar protegido.
# Dois invólucros traduzem, e são dois porque as superfícies são duas: as que
# têm sessão passam pelo pedido, o kiosk e a carta pública não têm sessão por
# desenho e passam pela base de ecrã. Ambas convertem o nome em 404.
TRADUTORES = ('comEscopoDoPedido', 'organizacoesDoActor', 'obterBaseDeEcra')
# Chegar à base por fora deles: cliente cru na mão.
CRUS = ('obterPrisma(', 'obterBase(')

def ficheiros_de(pasta, sufixos):
    for base, _, nomes in os.walk(pasta):
        for n in nomes:
            if n.endswith(sufixos):
                yield os.path.join(base, n)

# Mapa de módulos locais: caminho -> texto
texto = {}
for f in list(ficheiros_de(RAIZ, ('.tsx', '.ts'))) + list(ficheiros_de(SRC, ('.ts', '.tsx'))):
    try:
        texto[f] = open(f, encoding='utf-8').read()
    except OSError:
        pass

def importados(caminho):
    """Os módulos locais que este ficheiro importa, resolvidos a caminho."""
    fora = []
    for m in re.finditer(r"from\s+'(\.[^']+)'", texto.get(caminho, '')):
        alvo = os.path.normpath(os.path.join(os.path.dirname(caminho), m.group(1)))
        if alvo in texto:
            fora.append(alvo)
    return fora

def chama(t, nome):
    """CHAMA o nome, e não apenas o nomeia.

    A primeira versão perguntava «o texto contém o nome». Como o analisador
    segue os `import`, qualquer página que importasse o `servidor.ts` — onde o
    invólucro está DEFINIDO — saía protegida sem chamar nada. A sonda apanhou-o:
    plantei uma página que escapa e ela foi contada como protegida.

    Agora exige-se a forma de uma chamada, e a DEFINIÇÃO não conta: o ficheiro
    que exporta o nome não fica protegido por o exportar.
    """
    if re.search(r'export\s+(async\s+)?function\s+' + re.escape(nome) + r'\b', t):
        return False
    return re.search(re.escape(nome) + r'\s*\(', t) is not None

def alcanca(caminho, agulhas, visto=None):
    """Este ficheiro, ou algum que ele importe, CHAMA alguma das agulhas?"""
    if visto is None:
        visto = set()
    if caminho in visto:
        return False
    visto.add(caminho)
    t = texto.get(caminho, '')
    if any(chama(t, a.rstrip('(')) for a in agulhas):
        return True
    return any(alcanca(x, agulhas, visto) for x in importados(caminho))

paginas = [f for f in texto if f.startswith(RAIZ) and f.endswith('page.tsx') and re.search(r'\[[^\]]*Id\]', f)]
protegidas, cruas, mudas = [], [], []
for p in paginas:
    if alcanca(p, TRADUTORES):
        protegidas.append(p)
    elif alcanca(p, CRUS):
        cruas.append(p)
    else:
        mudas.append(p)

print(f'TOTAL {len(paginas)}')
print(f'PROTEGIDAS {len(protegidas)}')
print(f'CRUAS {len(cruas)}')
print(f'MUDAS {len(mudas)}')
for f in cruas[:8]:
    print(f'CRUA {f}')
PY
}

# ── O modo que só conta, para a sonda se poder medir a si mesma ───────────
#
# A sonda planta uma página que escapa e volta a chamar ESTE guião. Sem um modo
# que só conte, a chamada plantava outra sonda e chamava-se outra vez: um ciclo
# que nunca acabava. É a segunda vez esta noite que um instrumento que se invoca
# a si mesmo precisa de uma porta de saída.
if [ "${1:-}" = '--so-contar' ]; then analisar; exit 0; fi

relatorio=$(analisar)
if [ -z "$relatorio" ]; then
  naomedi "o analisador não devolveu nada — sem leitura não há medição."
  exit "$NAO_MEDI"
fi
campo() { sed -n "s/^$1 \([0-9]*\)$/\1/p" <<<"$relatorio"; }
TOTAL=$(campo TOTAL); PROT=$(campo PROTEGIDAS); CRU=$(campo CRUAS); MUDAS=$(campo MUDAS)

if [ "${TOTAL:-0}" -eq 0 ]; then
  naomedi "zero páginas com segmento de id — ou o produto mudou de forma, ou o detector está cego."
  exit "$NAO_MEDI"
fi
# A partição tem de FECHAR. Se não fechar, os números não descrevem o território.
if [ $(( PROT + CRU + MUDAS )) -ne "$TOTAL" ]; then
  naomedi "a partição não fecha: $PROT + $CRU + $MUDAS ≠ $TOTAL."
  exit "$NAO_MEDI"
fi
verde "$TOTAL páginas com segmento de id, e a partição fecha"

# ── 3. A SONDA: o detector sabe ver uma página que escapa? ─────────────────
#
# Se der zero cruas, isso confirma o que se espera — e um zero que confirma o
# que se espera não mediu nada. Planta-se uma página que vai à base por fora do
# invólucro e exige-se que ela apareça na conta.
SONDA='apps/web/app/[idioma]/app/[orgSlug]/__sonda__[sondaId]'
mkdir -p "$SONDA"
cat > "$SONDA/page.tsx" <<'TSX'
import { obterBase } from '../../../../../src/servidor.ts';

export default async function Sonda({ params }: { params: Promise<{ sondaId: string }> }) {
  const { sondaId } = await params;
  const prisma = obterBase();
  const x = await prisma.organization.findFirst({ where: { id: sondaId } });
  return <p>{x?.nome ?? 'nada'}</p>;
}
TSX
com_sonda=$(bash "$0" --so-contar 2>/dev/null | sed -n 's/^CRUAS \([0-9]*\)$/\1/p')
rm -rf "$SONDA"
if [ "${com_sonda:-0}" -le "${CRU:-0}" ]; then
  naomedi "a sonda não acendeu: uma página que vai à base por fora não foi contada (antes $CRU, com sonda ${com_sonda:-0})."
  exit "$NAO_MEDI"
fi
verde "a sonda acendeu: uma página que escapa ao invólucro é vista"

ambito() {
  echo "  âmbito:  $TOTAL páginas debaixo de um segmento \`[…Id]\`."
  echo "           $PROT alcançam um invólucro que traduz o id mal formado em 404."
  echo "           $CRU vão à base por fora dele; $MUDAS não tocam na base."
  echo "           RESULTADO medido: $AMB_HTTP"
  echo "           FORA: as rotas de \`api/\`, que devolvem JSON e já validam à mão;"
  echo "           e as rotas com id que não estão na lista das quatro medidas — a"
  echo "           adopção diz que passam pelo invólucro, o resultado só está"
  echo "           medido nestas."
}

if [ "${CRU:-0}" -gt 0 ]; then
  vermelho "$CRU página(s) com segmento de id vão à base por fora do invólucro que traduz:"
  sed -n 's/^CRUA /           /p' <<<"$relatorio"
  echo "           Uma delas com um id mal formado volta a dar 500 em vez de 404."
  ambito
  exit "$FALHOU"
fi

verde "as $PROT que tocam na base passam todas por um invólucro que traduz"
echo
ambito
exit "$OK"
