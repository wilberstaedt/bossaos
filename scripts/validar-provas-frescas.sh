#!/usr/bin/env bash
# ── A prova retrata o commit que diz retratar? ─────────────────────────────
#
# Esta guarda perguntava «isto é foto do presente», comparando cada artefacto
# com o HEAD. A pergunta estava errada na fundação, e não em detalhe:
#
#   **os 77 artefactos vivem em pastas com nome `data_commit`, e zero estão
#   fora.** Um dossiê chamado `2026-09-06_e953a87` não podia ser posterior ao
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

# A pasta identifica-se pela DATA, e mais nada. O `sha` saiu do nome: era a
# segunda declaração do mesmo facto, e duas declarações acabam sempre por
# discordar — estas discordaram em quatro horas. Quem manda é o manifesto, que é
# escrito pela corrida que captura e é verificável contra a árvore.
NOME = re.compile(r'^\d{4}-\d{2}-\d{2}')
RAIZ = os.environ.get('RAIZ_DOSSIES', 'docs/visual')

dossies = []
for familia in sorted(os.listdir(RAIZ)) if os.path.isdir(RAIZ) else []:
    caminho = os.path.join(RAIZ, familia)
    if not os.path.isdir(caminho):
        continue
    for nome in sorted(os.listdir(caminho)):
        if NOME.match(nome) and os.path.isdir(os.path.join(caminho, nome)):
            dossies.append(os.path.join(caminho, nome))

if not dossies:
    print('SEM-DOSSIES')
    raise SystemExit(0)

# Uma memória por commit: um dossiê com dois manifestos do mesmo commit lia a
# árvore duas vezes, e ler o mesmo commit duas vezes não o torna mais verdadeiro.
arvores = {}

for pasta in dossies:
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
                carimbos.append((os.path.relpath(caminho, pasta), dados['impressaoDoProduto']))

    if not carimbos:
        print(f'NAOMEDI\t{pasta}\t{artefactos}\tsem carimbo do conteudo')
        continue

    # UMA linha por dossiê. A versão anterior imprimia uma por manifesto, e o
    # relatório saía com a mesma pasta repetida — suja o que existe para ser
    # lido depressa.
    problemas, abstencoes, bons = [], [], []
    for rotulo, carimbo in carimbos:
        sha = carimbo.get('commit')
        if not sha:
            abstencoes.append(f'{rotulo}: carimbo sem o commit que retrata')
            continue
        if carimbo.get('arvoreLimpa') is False:
            problemas.append(f'{rotulo}: capturado com a arvore suja — '
                             f'nao retrata commit nenhum, retrata uma arvore')
            continue
        try:
            if sha not in arvores:
                arvores[sha] = impressao_do_commit(sha)[1]
        except ValueError as e:
            problemas.append(f'{rotulo}: {e} — a declaracao caducou')
            continue
        arvore = arvores[sha]
        guardado = carimbo['porFicheiro']
        difs = ([f'alterado {k}' for k in sorted(guardado)
                 if k in arvore and arvore[k] != guardado[k]]
                + [f'a mais {k}' for k in sorted(set(guardado) - set(arvore))]
                + [f'a menos {k}' for k in sorted(set(arvore) - set(guardado))])
        if difs:
            problemas.append(f'{rotulo} vs {sha[:7]}: {len(difs)} diferenca(s) — '
                             + '; '.join(difs[:2]))
        else:
            bons.append(f'{rotulo} = {sha[:7]}')

    # As abstenções acompanham SEMPRE o veredicto. A primeira versão disto
    # imprimia só os bons quando havia bons, e um manifesto que não se podia
    # medir desaparecia atrás de outro que batia — verde sobre nada, na própria
    # guarda que existe para o apanhar.
    cauda = (' | NAO MEDIDO: ' + '; '.join(abstencoes)) if abstencoes else ''
    if problemas:
        print(f'FALHA\t{pasta}\t{artefactos}\t' + ' | '.join(problemas) + cauda)
    elif bons:
        print(f'OK\t{pasta}\t{artefactos}\t' + ' | '.join(bons) + cauda)
    else:
        print(f'NAOMEDI\t{pasta}\t{artefactos}\t' + '; '.join(abstencoes))
PY
)

if [ "$RELATORIO" = 'SEM-DOSSIES' ] || [ -z "$RELATORIO" ]; then
  naomedi "não há pastas com o nome \`data_commit\` em docs/visual — nada a julgar."
  exit "$NAO_MEDI"
fi

N_OK=$(printf '%s\n' "$RELATORIO" | grep -c '^OK' || true)
N_FALHA=$(printf '%s\n' "$RELATORIO" | grep -c '^FALHA' || true)
N_NAOMEDI=$(printf '%s\n' "$RELATORIO" | grep -c '^NAOMEDI' || true)

printf '%s\n' "$RELATORIO" | while IFS=$'\t' read -r estado pasta n resto; do
  case "$estado" in
    OK)      verde "$pasta retrata o que diz ($n artefactos): $resto" ;;
    FALHA)   vermelho "$pasta NÃO retrata o que diz ($n artefactos)"; echo "           $resto" ;;
    NAOMEDI) naomedi "$pasta — $resto ($n artefactos)" ;;
  esac
done

ambito() {
  echo "  âmbito:  ${N_OK} dossiê(s) a bater com o seu commit, ${N_FALHA} a não bater,"
  echo "           ${N_NAOMEDI} sem carimbo."
  echo "           Cada um é julgado contra o commit que o PRÓPRIO MANIFESTO nomeia,"
  echo "           nunca contra o HEAD nem contra o nome da pasta. O nome traz só a"
  echo "           data: um facto declarado em dois sítios acaba por discordar consigo"
  echo "           próprio, e este discordou em quatro horas."
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
