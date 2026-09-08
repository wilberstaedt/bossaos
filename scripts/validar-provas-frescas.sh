#!/usr/bin/env bash
# ── A prova retrata o commit que diz retratar? ─────────────────────────────
#
# Esta guarda perguntava «isto é foto do presente», comparando cada artefacto
# com o HEAD. A pergunta estava errada na fundação, e não em detalhe:
#
#   **os 77 artefactos vivem em pastas com nome `data_commit`, e zero estão
#   fora.** Um dossiê chamado `2026-09-06_e953a87` não pode ser posterior ao
#   produto de hoje **por construção** — não por estar desactualizado. Logo a
#   acusação só podia crescer, e um número que só sobe deixa de informar. Chegou
#   a 50. Uma guarda que acusa 50 ensina a ser ignorada, e no dia em que uma
#   acusação for verdadeira estará no meio das outras.
#
# A pergunta passa a ser a que a pasta já faz: **isto retrata o commit que diz
# retratar.** Cada dossiê é julgado contra o `sha` do seu próprio nome, nunca
# contra o HEAD.
#
# ── Quatro respostas, e nenhuma inventada ─────────────────────────────────
#
#   ok        traz `impressaoDoProduto` e bate com a árvore do commit nomeado
#   FALHOU    traz e não bate — e diz QUAIS ficheiros
#   NÃO MEDI  não traz. É o caso dos dossiês antigos, e não se inventa veredicto
#             sobre o que não se pode saber retroactivamente: o carimbo teria de
#             ter sido escrito no momento da captura, e não foi.
#   FALHOU    o `sha` nomeado não é um commit — a declaração caducou
#
# ── O que isto NÃO mede, declarado ────────────────────────────────────────
#
# O CONTEÚDO da prova. Um dossiê que bate com o seu commit e mostra a coisa
# errada passa aqui — mede-se que retrata o que promete, não que promete o que
# devia. E o `mtime` deixou de entrar: por isso o canário dos `mtimes_reescritos`
# **já não é consultado aqui**. Não o apaguei; ver a nota no fim.
set -uo pipefail
# A raiz dos dossiês é configurável para a guarda poder ser CORRIDA sobre um
# repositório de mentira. Sem isso, os três controlos que ela exige — bate,
# não bate, e sem carimbo — só se podiam afirmar, e afirmar não é exercer.
if [ -z "${RAIZ_DOSSIES:-}" ]; then cd "$(dirname "$0")/.."; fi

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "A prova retrata o commit que diz retratar?"

RELATORIO=$(python3 - <<'PY'
import json, os, re, sys
sys.path.insert(0, 'scripts')
from frescura_do_produto import impressao_do_commit

NOME = re.compile(r'^\d{4}-\d{2}-\d{2}_([0-9a-f]{7,40})$')
RAIZ = os.environ.get('RAIZ_DOSSIES', 'docs/visual')

dossies = []
for familia in sorted(os.listdir(RAIZ)) if os.path.isdir(RAIZ) else []:
    caminho = os.path.join(RAIZ, familia)
    if not os.path.isdir(caminho):
        continue
    for nome in sorted(os.listdir(caminho)):
        m = NOME.match(nome)
        if m:
            dossies.append((os.path.join(caminho, nome), m.group(1)))

if not dossies:
    print('SEM-DOSSIES')
    raise SystemExit(0)

for pasta, sha in dossies:
    artefactos = sum(1 for r, _d, fs in os.walk(pasta)
                     for f in fs if f.endswith(('.png', '.json')))
    carimbos = []
    for r, _d, fs in os.walk(pasta):
        for f in fs:
            if not f.endswith('.json'):
                continue
            caminho = os.path.join(r, f)
            try:
                with open(caminho, encoding='utf-8') as fh:
                    dados = json.load(fh)
            except Exception:
                continue
            if isinstance(dados, dict) and dados.get('impressaoDoProduto'):
                carimbos.append((caminho, dados['impressaoDoProduto']))

    if not carimbos:
        print(f'NAOMEDI\t{pasta}\t{sha}\t{artefactos}\tsem carimbo do conteudo')
        continue

    try:
        _resumo, arvore = impressao_do_commit(sha)
    except ValueError as e:
        print(f'FALHA\t{pasta}\t{sha}\t{artefactos}\t{e}')
        continue

    for caminho, carimbo in carimbos:
        guardado = carimbo['porFicheiro']
        difs = ([f'alterado {k}' for k in sorted(guardado)
                 if k in arvore and arvore[k] != guardado[k]]
                + [f'a mais {k}' for k in sorted(set(guardado) - set(arvore))]
                + [f'a menos {k}' for k in sorted(set(arvore) - set(guardado))])
        rotulo = os.path.relpath(caminho, pasta)
        if difs:
            print(f'FALHA\t{pasta}\t{sha}\t{artefactos}\t{rotulo}: '
                  f'{len(difs)} diferenca(s) — ' + '; '.join(difs[:3]))
        else:
            print(f'OK\t{pasta}\t{sha}\t{artefactos}\t{rotulo}')
PY
)

if [ "$RELATORIO" = 'SEM-DOSSIES' ] || [ -z "$RELATORIO" ]; then
  naomedi "não há pastas com o nome \`data_commit\` em docs/visual — nada a julgar."
  exit "$NAO_MEDI"
fi

N_OK=$(printf '%s\n' "$RELATORIO" | grep -c '^OK' || true)
N_FALHA=$(printf '%s\n' "$RELATORIO" | grep -c '^FALHA' || true)
N_NAOMEDI=$(printf '%s\n' "$RELATORIO" | grep -c '^NAOMEDI' || true)

printf '%s\n' "$RELATORIO" | while IFS=$'\t' read -r estado pasta sha n resto; do
  case "$estado" in
    OK)      verde "$pasta retrata $sha ($n artefactos, $resto)" ;;
    FALHA)   vermelho "$pasta NÃO retrata $sha ($n artefactos)"; echo "           $resto" ;;
    NAOMEDI) naomedi "$pasta — $resto ($n artefactos)" ;;
  esac
done

ambito() {
  echo "  âmbito:  ${N_OK} dossiê(s) a bater com o seu commit, ${N_FALHA} a não bater,"
  echo "           ${N_NAOMEDI} sem carimbo."
  echo "           Cada um é julgado contra o \`sha\` do PRÓPRIO nome, nunca contra o"
  echo "           HEAD: uma pasta datada não pode ser foto do presente, e exigir-lho"
  echo "           era garantir uma acusação que só cresce."
  echo "           FORA, e declarado: o CONTEÚDO da prova. Um dossiê que bate com o"
  echo "           seu commit e mostra a coisa errada passa aqui."
  echo "           Sem carimbo é NÃO MEDI e nunca verde: o carimbo teria de ter sido"
  echo "           escrito no momento da captura, e não se inventa retroactivamente."
}

echo
if [ "${N_FALHA:-0}" -gt 0 ]; then
  ambito; exit "$FALHOU"
fi
if [ "${N_OK:-0}" -eq 0 ]; then
  naomedi "nenhum dossiê pôde ser medido — ${N_NAOMEDI} sem carimbo e zero a bater."
  ambito; exit "$NAO_MEDI"
fi
verde "${N_OK} dossiê(s) retratam o commit que dizem retratar"
ambito
exit "$OK"
