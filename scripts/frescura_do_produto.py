"""A fonte mais recente do produto — uma implementação, dois leitores.

── Porque é que isto saiu do `pagina-de-aprovacao.py` ─────────────────────

A mecânica estava lá dentro e servia só a página de aprovação: ela **recusa-se
a gerar** se alguma captura for anterior à fonte mais nova do produto. Boa
mecânica, apontada a um sítio só — e nunca às **cinco imagens que um comprador
vê** na página de marketing, que a 07/09 estavam sete horas atrasadas e
mostravam o campo de busca cortado, o defeito que nesse mesmo dia se corrigiu.

Copiá-la para a guarda nova seria a duplicação que este repositório passou o dia
a fechar — três cabeçalhos iguais, dois números do mesmo facto. Fica uma peça,
com dois chamadores.

── O que conta como «fonte do produto» ────────────────────────────────────

`.ts`, `.tsx` e `.css` debaixo de `apps/` e `packages/`, fora de `node_modules`
e de qualquer `.next`. E o `next-env.d.ts` fica **de fora de propósito**: é
gerado pelo build, portanto seria a fonte mais recente em cada corrida e fazia
toda a prova parecer velha sempre — uma guarda que acende sempre é uma guarda
que se ignora.
"""
import os
import subprocess
import sys

GERADOS = {'next-env.d.ts'}
EXTENSOES = ('.ts', '.tsx', '.css')


def mais_recente_do_produto(raiz='.'):
    t = 0
    for base in ('apps', 'packages'):
        for r, _ds, fs in os.walk(os.path.join(raiz, base)):
            if 'node_modules' in r or '/.next' in r:
                continue
            for f in fs:
                if f in GERADOS or not f.endswith(EXTENSOES):
                    continue
                t = max(t, os.stat(os.path.join(r, f)).st_mtime)
    return t


# ── O CANÁRIO: os `mtime` desta cópia querem dizer alguma coisa? ──────────
#
# Toda a comparação por `mtime` tem o mesmo buraco, e vale para as duas guardas
# que lêem este ficheiro: num `clone` ou `worktree` fresco o git escreve TODOS
# os ficheiros agora. Os dois lados da comparação ficam iguais e a guarda diz
# **verde num sítio onde não consegue medir**.
#
# Medido a 07/09 na `validar-provas-frescas`, mesmo commit e os mesmos 65
# artefactos: cópia de trabalho **FALHOU**, worktree fresco **ok**.
#
# E a auto-sonda passava nos dois, porque força um `mtime` velho num ficheiro
# sintético: provava o mecanismo enquanto a população inteira era ilegível.
#
# O discriminador não pode ser «os artefactos são todos recentes» — uma
# recaptura legítima escreve-os todos em segundos e fica igual a um checkout.
# Usa-se um ficheiro **versionado que ninguém regenera**: se ele não tem
# alterações locais e mesmo assim o `mtime` dele é muito posterior ao seu
# próprio commit, as datas foram reescritas. A resposta honesta é NÃO MEDI.
#
# Vive AQUI e não copiado nas duas guardas — a lição do `next-env`: uma
# implementação, dois leitores.
CANARIO = 'docs/bossaos/CONTRATO_TECNICO.md'
TOLERANCIA = 120  # segundos entre commit e checkout, folga para a corrida normal


def _git(args, raiz):
    try:
        r = subprocess.run(['git', *args], cwd=raiz, capture_output=True, text=True, timeout=20)
        return r.returncode, r.stdout.strip()
    except Exception:
        return 1, ''


def mtimes_reescritos(raiz='.'):
    """None se os `mtime` são desta máquina; uma razão se foram reescritos.

    Devolve também None quando o canário não se pode consultar — sem git, sem
    o ficheiro, ou com alterações locais nele. Nesse caso não se sabe, e dizer
    «reescritos» sem saber seria trocar um cego por um alarmista.
    """
    caminho = os.path.join(raiz, CANARIO)
    if not os.path.exists(caminho):
        return None
    codigo, _ = _git(['diff', '--quiet', '--', CANARIO], raiz)
    if codigo != 0:
        return None  # tem alterações locais: não serve de canário
    codigo, saida = _git(['log', '-1', '--format=%ct', '--', CANARIO], raiz)
    if codigo != 0 or not saida:
        return None
    commit = int(saida)
    mtime = os.stat(caminho).st_mtime
    if mtime > commit + TOLERANCIA:
        horas = (mtime - commit) / 3600
        return (f'o canário `{CANARIO}` não tem alterações locais e está {horas:.0f}h '
                'mais recente que o seu próprio commit — um checkout reescreveu as datas')
    return None


def velhas(ficheiros, raiz='.'):
    """Os que são ANTERIORES à fonte mais recente. Lista vazia = todos frescos."""
    produto = mais_recente_do_produto(raiz)
    fora = []
    for f in ficheiros:
        caminho = f if os.path.isabs(f) else os.path.join(raiz, f)
        if not os.path.exists(caminho):
            fora.append((f, 'NAO EXISTE'))
        elif os.stat(caminho).st_mtime < produto:
            fora.append((f, 'anterior a fonte do produto'))
    return fora


if __name__ == '__main__':
    # `--canario` sozinho: 0 se os mtime servem, 2 se foram reescritos. É o que
    # a `validar-provas-frescas.sh` consulta, para o mecanismo não existir duas
    # vezes em duas linguagens.
    if sys.argv[1:2] == ['--canario']:
        razao = mtimes_reescritos()
        if razao:
            print(f'REESCRITOS {razao}')
            raise SystemExit(2)
        print('MTIMES desta máquina')
        raise SystemExit(0)

    # CLI: recebe caminhos, imprime os velhos, sai 1 se houver algum.
    alvos = sys.argv[1:]
    if not alvos:
        print('POPULACAO-ZERO: nenhum ficheiro para medir', file=sys.stderr)
        raise SystemExit(2)
    razao = mtimes_reescritos()
    if razao:
        print(f'REESCRITOS {razao}', file=sys.stderr)
        raise SystemExit(2)
    maus = velhas(alvos)
    print(f'REFERENCIA {mais_recente_do_produto():.0f}')
    print(f'MEDIDOS {len(alvos)} VELHOS {len(maus)}')
    for f, porque in maus:
        print(f'VELHA {f} :: {porque}')
    raise SystemExit(1 if maus else 0)


# ── Porque e que o produto ficou mais recente: mudou, ou so foi gravado? ────
#
# A comparacao acima e por `mtime`, e tem um buraco que custou tempo a 08/09:
# um formatador que grava um ficheiro com o MESMO texto move o `mtime` e
# envelhece, de uma vez, TODAS as capturas do repositorio.
#
# Medido nesse dia: as 06h59 a pagina de aprovacao dava 25/25 posteriores ao
# produto; as 08h00 recusava as 25. Entre os dois momentos ninguem mudou o
# produto - dois ficheiros foram tocados as 07h00:30 e o `git status` deles
# estava VAZIO. Conteudo identico ao commit; so a data mexeu.
#
# Isto NAO muda o veredicto, e e de proposito: a guarda falha para o lado
# seguro e assim deve continuar. O que muda e o que a recusa DIZ. Sem isto, a
# resposta obvia a uma recusa e recapturar, e recapturar exige um build inteiro
# - meia hora e, numa maquina com historico de kernel panic, um risco real.
# **Mandar alguem curar o que nao esta partido e o custo que esta funcao evita.**
def porque_e_que_o_produto_e_mais_recente(raiz, limite, quantos=8):
    """Ficheiros de produto mais recentes que `limite`, e se mudaram de facto.

    Devolve uma lista de `(caminho, mtime, mudou)`, ordenada do mais recente
    para o mais antigo. O `mudou` e `True` se o ficheiro tem alteracoes por
    commitar, `False` se o conteudo e o do commit, e `None` se nao se pode
    saber - sem git, por exemplo. `None` nao se le como `False`: le-se como
    nao sei, que e a unica resposta honesta quando o instrumento falta.
    """
    sujos = None
    codigo, saida = _git(['status', '--porcelain'], raiz)
    if codigo == 0:
        sujos = set()
        for linha in saida.splitlines():
            if len(linha) > 3:
                sujos.add(linha[3:].strip().strip('"'))

    achados = []
    for base in ('apps', 'packages'):
        for r, _ds, fs in os.walk(os.path.join(raiz, base)):
            if 'node_modules' in r or '/.next' in r:
                continue
            for f in fs:
                if f in GERADOS or not f.endswith(EXTENSOES):
                    continue
                caminho = os.path.join(r, f)
                m = os.stat(caminho).st_mtime
                if m > limite:
                    rel = os.path.relpath(caminho, raiz)
                    achados.append((rel, m, None if sujos is None else (rel in sujos)))
    achados.sort(key=lambda t: -t[1])
    return achados[:quantos]
