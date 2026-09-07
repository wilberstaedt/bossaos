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
# ESTA GUARDA é a outra metade: impede a classe de voltar. Uma página que
# alcance a base por FORA dos invólucros que traduzem volta a poder devolver
# 500 num id mal formado, e é isso que aqui fica vermelho.
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

# ── 1. A TRADUÇÃO tem de existir, nos dois lados ───────────────────────────
#
# Sem isto a guarda mediria a cobertura de um mecanismo que já não lá está — e
# «todas as páginas passam pelo invólucro» seria verdade e não valeria nada.
falta=''
grep -q 'class IdentificadorMalFormado' packages/db/src/escopo.ts || falta="$falta o-nome"
grep -q "code === 'P2023'" packages/db/src/escopo.ts || falta="$falta o-reconhecedor"
grep -qE 'ehIdentificadorMalFormado\(erro\)' packages/db/src/escopo.ts || falta="$falta a-captura"
grep -q 'IdentificadorMalFormado) notFound()' apps/web/src/sessao.ts || falta="$falta a-traducao-web"
if [ -n "$falta" ]; then
  naomedi "o mecanismo não está no sítio ($falta) — sem ele não há cobertura que meça."
  exit "$NAO_MEDI"
fi
verde "o mecanismo está nos dois lados: o nome na base, o 404 na web"

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
verde "${CASOS:-?} casos: o P2023 vira nome, e um erro de base não vira"

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
  echo "           FORA: as rotas de \`api/\`, que devolvem JSON e já validam à mão;"
  echo "           e a ponta do navegador — que o 404 CHEGA ao cliente atravessa o"
  echo "           Next e uma consulta verdadeira, e essa está por medir no arnês."
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
