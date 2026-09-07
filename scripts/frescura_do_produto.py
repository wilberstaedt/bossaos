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
    # CLI: recebe caminhos, imprime os velhos, sai 1 se houver algum.
    alvos = sys.argv[1:]
    if not alvos:
        print('POPULACAO-ZERO: nenhum ficheiro para medir', file=sys.stderr)
        raise SystemExit(2)
    maus = velhas(alvos)
    print(f'REFERENCIA {mais_recente_do_produto():.0f}')
    print(f'MEDIDOS {len(alvos)} VELHOS {len(maus)}')
    for f, porque in maus:
        print(f'VELHA {f} :: {porque}')
    raise SystemExit(1 if maus else 0)
