#!/usr/bin/env bash
#
# A frescura medida por CONTEÚDO, e os quatro casos que decidem.
#
# As duas regras anteriores mediam TEMPO e falharam por lados opostos: o `mtime`
# recusa quando um formatador grava por cima igual, e a data do último commit
# deixa passar uma REVERSÃO — capturas que mostram código que já não existe.
#
# Corre sobre uma árvore de mentira, montada aqui, e não sobre o repositório: as
# funções recebem a raiz, portanto o caminho real é o mesmo. Medir isto no
# repositório de verdade obrigava a editar e reverter ficheiros do produto para
# provar uma guarda, e uma prova que mexe no produto para se provar é a coisa que
# esta casa não faz.
#
# ── O controlo negativo obrigatório é a REVERSÃO ──────────────────────────
#
# Uma implementação que não recuse a reversão não implementou isto. Por isso ela
# não é afirmada: é exercida, e a saída mostra a recusa.
set -uo pipefail
cd "$(dirname "$0")/.."

verde()    { echo "  ok    $1"; }
vermelho() { echo "  FALHA $1"; FALHAS=$((FALHAS + 1)); }
FALHAS=0

echo "A frescura mede conteudo, nao carimbo"

python3 - <<'PY'
import os, shutil, sys, tempfile, time
sys.path.insert(0, 'scripts')
from frescura_do_produto import impressao_do_produto, diferencas_do_produto

FALHAS = 0
def verde(m):    print(f'  ok    {m}')
def vermelho(m):
    global FALHAS; FALHAS += 1; print(f'  FALHA {m}')

raiz = tempfile.mkdtemp(prefix='frescura-')
alvo = os.path.join(raiz, 'apps', 'web', 'src')
os.makedirs(alvo)
F = os.path.join(alvo, 'Ecra.tsx')
ORIGINAL = "export const x = 1;\n"
open(F, 'w').write(ORIGINAL)

# A impressao guardada NO MOMENTO da captura.
resumo_captura, por_ficheiro_captura = impressao_do_produto(raiz)

def veredicto():
    """O que a guarda diria agora: (aceita, alterados)."""
    resumo_agora, _ = impressao_do_produto(raiz)
    alterados, novos, sumidos = diferencas_do_produto(raiz, por_ficheiro_captura)
    return resumo_agora == resumo_captura, alterados + novos + sumidos

# ── 0 · Sem tocar em nada, aceita. Senao o resto nao quer dizer nada. ──────
ok, _ = veredicto()
verde('produto intacto: aceita') if ok else vermelho('recusou um produto intacto')

# ── 1 · O FORMATADOR: grava o mesmo texto por cima ────────────────────────
time.sleep(1.1)                      # para o `mtime` mudar de verdade
open(F, 'w').write(ORIGINAL)
mt_novo = os.stat(F).st_mtime
ok, _ = veredicto()
if ok:
    verde(f'formatador grava por cima igual: ACEITA (o `mtime` mudou para {int(mt_novo)})')
else:
    vermelho('recusou um ficheiro gravado por cima com o mesmo texto — e a recusa falsa')

# ── 2 · A REVERSAO, que e o controlo negativo obrigatorio ─────────────────
#
# Alguem edita, captura COM a edicao, e depois reverte para o texto de antes. O
# ficheiro fica igual ao commit e o `mtime` do commit e antigo: a regra por data
# de commit deixava isto passar, e as capturas mostram codigo que ja nao existe.
open(F, 'w').write("export const x = 2;\n")
resumo_com_edicao, por_ficheiro_com_edicao = impressao_do_produto(raiz)   # a "captura"
open(F, 'w').write(ORIGINAL)                                             # a reversao
resumo_depois, _ = impressao_do_produto(raiz)
alterados, _n, _s = diferencas_do_produto(raiz, por_ficheiro_com_edicao)
if resumo_depois != resumo_com_edicao and alterados == ['apps/web/src/Ecra.tsx']:
    verde('REVERSAO: RECUSA, e nomeia apps/web/src/Ecra.tsx')
else:
    vermelho(f'a reversao NAO foi recusada (resumos iguais={resumo_depois == resumo_com_edicao},'
             f' alterados={alterados}) — isto nao esta implementado')

# ── 3 · Alteracao a serio ─────────────────────────────────────────────────
open(F, 'w').write("export const x = 3;\n")
ok, alterados = veredicto()
if not ok and 'apps/web/src/Ecra.tsx' in alterados:
    verde('alteracao a serio: RECUSA, e nomeia o ficheiro')
else:
    vermelho(f'nao recusou uma alteracao a serio (aceita={ok}, alterados={alterados})')
open(F, 'w').write(ORIGINAL)

# ── 4 · Arvore com alteracoes por commitar ────────────────────────────────
#
# O resumo e da ARVORE e nao do git, portanto capturar de uma arvore suja
# funciona: guarda-se o que la estava, e o que la estava e o que as capturas
# mostram. Aqui nao ha git nenhum nesta raiz — e e essa a prova.
assert not os.path.exists(os.path.join(raiz, '.git')), 'a raiz de mentira nao pode ter git'
open(F, 'w').write("export const x = 1; // por commitar\n")
resumo_sujo, por_ficheiro_sujo = impressao_do_produto(raiz)
alterados_sujo, _n, _s = diferencas_do_produto(raiz, por_ficheiro_sujo)
if not alterados_sujo:
    verde('arvore com alteracoes por commitar: aceita (o resumo e da arvore, sem git)')
else:
    vermelho(f'nao aceitou capturas tiradas de uma arvore suja: {alterados_sujo}')

# ── 5 · Ficheiro novo e ficheiro desaparecido ─────────────────────────────
NOVO = os.path.join(alvo, 'Outro.tsx')
open(NOVO, 'w').write("export const y = 1;\n")
_a, novos, _s = diferencas_do_produto(raiz, por_ficheiro_sujo)
verde('ficheiro NOVO e visto') if novos == ['apps/web/src/Outro.tsx'] \
    else vermelho(f'nao viu o ficheiro novo: {novos}')
os.remove(NOVO); os.remove(F)
_a, _n, sumidos = diferencas_do_produto(raiz, por_ficheiro_sujo)
verde('ficheiro APAGADO e visto') if sumidos == ['apps/web/src/Ecra.tsx'] \
    else vermelho(f'nao viu o ficheiro apagado: {sumidos}')

shutil.rmtree(raiz)
print()
sys.exit(1 if FALHAS else 0)
PY
ESTADO=$?

# ── Os três controlos do «retrata o commit que diz retratar» ───────────────
#
# Exercidos e não afirmados: monta-se um repositório de mentira com um commit
# real, um dossiê com o nome `data_sha`, e corre-se A GUARDA lá dentro.
echo
echo "A guarda dos dossies: bate, nao bate, e sem carimbo"

GUARDA="$PWD/scripts/validar-provas-frescas.sh"
FRESCURA="$PWD/scripts"
CAIXA=$(mktemp -d)
echo 0 > "$CAIXA/falhas"
trap 'rm -rf "$CAIXA"' EXIT INT TERM

(
  cd "$CAIXA" || exit 1
  git init -q .; git config user.email t@t; git config user.name t
  mkdir -p apps/web/src
  echo 'export const x = 1;' > apps/web/src/Ecra.tsx
  git add -A >/dev/null; git commit -qm 'produto'
  SHA=$(git rev-parse --short HEAD)

  mkdir -p "docs/visual/prova/2026-01-01_$SHA"
  MAN="docs/visual/prova/2026-01-01_$SHA/manifesto.json"
  printf 'imagem' > "docs/visual/prova/2026-01-01_$SHA/uma.png"
  echo '{}' > "$MAN"
  PYTHONPATH="$FRESCURA" python3 - "$MAN" "$SHA" <<'PYX'
import json, sys
from frescura_do_produto import impressao_do_commit
resumo, por = impressao_do_commit(sys.argv[2])
json.dump({'impressaoDoProduto': {'resumo': resumo, 'ficheiros': len(por),
                                  'porFicheiro': por, 'quando': 'fixture'}},
          open(sys.argv[1], 'w'))
PYX

  correr() { RAIZ_DOSSIES=docs/visual PYTHONPATH="$FRESCURA" bash "$GUARDA" >"$1" 2>&1; echo $?; }

  E=$(correr /tmp/fc-bate.txt)
  if [ "$E" = 0 ] && grep -q 'retrata' /tmp/fc-bate.txt; then
    echo "  ok    carimbo que BATE: aceita (saida 0)"
  else
    echo $(( $(cat "$CAIXA/falhas") + 1 )) > "$CAIXA/falhas"; echo "  FALHA carimbo que bate nao foi aceite (saida $E)"; sed 's/^/          /' /tmp/fc-bate.txt | head -4
  fi

  python3 - "$MAN" <<'PYX'
import json, sys
d = json.load(open(sys.argv[1]))
k = sorted(d['impressaoDoProduto']['porFicheiro'])[0]
d['impressaoDoProduto']['porFicheiro'][k] = '0' * 64
json.dump(d, open(sys.argv[1], 'w'))
PYX
  E=$(correr /tmp/fc-estragado.txt)
  if [ "$E" = 1 ] && grep -q 'NÃO retrata' /tmp/fc-estragado.txt; then
    echo "  ok    carimbo ESTRAGADO: recusa (saida 1) e nomeia"
  else
    echo $(( $(cat "$CAIXA/falhas") + 1 )) > "$CAIXA/falhas"; echo "  FALHA carimbo estragado nao foi recusado (saida $E)"; sed 's/^/          /' /tmp/fc-estragado.txt | head -4
  fi

  echo '{}' > "$MAN"
  E=$(correr /tmp/fc-sem.txt)
  if [ "$E" = 2 ] && grep -q 'NÃO MEDI' /tmp/fc-sem.txt; then
    echo "  ok    SEM carimbo: NAO MEDI (saida 2), e nao verde"
  else
    echo $(( $(cat "$CAIXA/falhas") + 1 )) > "$CAIXA/falhas"; echo "  FALHA sem carimbo nao deu NAO MEDI (saida $E)"; sed 's/^/          /' /tmp/fc-sem.txt | head -4
  fi
)

echo
if [ "$ESTADO" -eq 0 ] && [ "$(cat "$CAIXA/falhas" 2>/dev/null || echo 0)" = 0 ]; then
  echo "  A frescura mede conteudo: 0 falhas."; exit 0
fi
echo "  A frescura por conteudo tem falhas."; exit 1
