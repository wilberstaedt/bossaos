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
import hashlib
import os
import subprocess
import sys

GERADOS = {'next-env.d.ts'}
EXTENSOES = ('.ts', '.tsx', '.css')


def impressao_do_produto(raiz='.'):
    """`{caminho relativo: sha256}` de cada ficheiro de produto, mais o resumo.

    Devolve `(resumo, por_ficheiro)`. O `resumo` é o sha256 da lista ordenada de
    `caminho:sha`, e serve para a comparação barata; o `por_ficheiro` existe para
    a recusa poder dizer QUAIS mudaram — uma recusa que só diz «mudou» manda
    procurar às cegas.

    Mesmo âmbito da `mais_recente_do_produto`: `.ts`, `.tsx` e `.css` debaixo de
    `apps/` e `packages/`, fora de `node_modules` e de qualquer `.next`, e sem os
    gerados. Se os dois âmbitos divergirem, uma guarda passa a medir um produto
    diferente da outra sem ninguém dar por isso.
    """
    por_ficheiro = {}
    for base in ('apps', 'packages'):
        for r, _ds, fs in os.walk(os.path.join(raiz, base)):
            if 'node_modules' in r or '/.next' in r:
                continue
            for f in fs:
                if f in GERADOS or not f.endswith(EXTENSOES):
                    continue
                caminho = os.path.join(r, f)
                rel = os.path.relpath(caminho, raiz)
                h = hashlib.sha256()
                with open(caminho, 'rb') as fh:
                    for bloco in iter(lambda: fh.read(65536), b''):
                        h.update(bloco)
                por_ficheiro[rel] = h.hexdigest()
    linhas = ''.join(f'{k}:{v}\n' for k, v in sorted(por_ficheiro.items()))
    return hashlib.sha256(linhas.encode('utf-8')).hexdigest(), por_ficheiro


def diferencas_do_produto(raiz, por_ficheiro_antes):
    """O que mudou entre a impressão guardada e a árvore de agora.

    Devolve `(alterados, novos, desaparecidos)`. Cada um é uma lista de caminhos.
    """
    _, agora = impressao_do_produto(raiz)
    alterados = sorted(k for k in agora if k in por_ficheiro_antes and agora[k] != por_ficheiro_antes[k])
    novos = sorted(set(agora) - set(por_ficheiro_antes))
    desaparecidos = sorted(set(por_ficheiro_antes) - set(agora))
    return alterados, novos, desaparecidos


# ── CLI: carimbar a impressão ao lado das capturas ─────────────────────────
#
# O carimbo é escrito por AQUI e não pelo capturador, que é JavaScript. Duas
# implementações do mesmo resumo — uma em Python para ler, outra em JS para
# escrever — concordariam até ao dia em que uma delas mudasse de ordenação ou de
# codificação, e nesse dia a guarda recusaria tudo sem nada ter mudado. Uma
# implementação, dois chamadores.


def impressao_do_commit(sha, raiz='.'):
    """A mesma impressão, mas sobre a ÁRVORE DE UM COMMIT em vez do disco.

    É o que permite perguntar «isto retrata o commit que diz retratar» em vez de
    «isto é foto do presente». A segunda pergunta é a que uma pasta datada nunca
    podia satisfazer: um dossiê chamado `2026-09-06_e953a87` não podia ser
    posterior ao produto de hoje **por construção**, e uma guarda que o exige
    acusa-o para sempre.

    Devolve `(resumo, por_ficheiro)` na mesma forma que a `impressao_do_produto`,
    e é essa igualdade de forma que faz a comparação ser possível. Levanta
    `ValueError` se o `sha` não for um commit — uma declaração a caducar não é o
    mesmo que uma prova errada, e quem chama distingue as duas.
    """
    import subprocess
    def git(args):
        return subprocess.run(['git', '-C', raiz] + args, capture_output=True)

    tipo = git(['cat-file', '-t', sha])
    if tipo.returncode != 0 or tipo.stdout.decode().strip() != 'commit':
        raise ValueError(f'{sha} nao e um commit neste repositorio')

    listagem = git(['ls-tree', '-r', '-z', '--format=%(objectname) %(path)', sha,
                    'apps', 'packages'])
    if listagem.returncode != 0:
        raise ValueError(f'nao consegui ler a arvore de {sha}')

    alvos = []
    for entrada in listagem.stdout.split(b'\0'):
        if not entrada:
            continue
        objecto, _, caminho = entrada.partition(b' ')
        rel = caminho.decode('utf-8')
        nome = rel.rsplit('/', 1)[-1]
        if nome in GERADOS or not rel.endswith(EXTENSOES):
            continue
        # As mesmas exclusões da leitura em disco. `node_modules` e `.next` não
        # costumam estar versionados, mas se um dia estiverem os dois lados têm
        # de continuar a medir o mesmo produto.
        if 'node_modules/' in rel or '/.next' in ('/' + rel):
            continue
        alvos.append((objecto.decode(), rel))

    por_ficheiro = {}
    if alvos:
        pedido = '\n'.join(o for o, _ in alvos).encode() + b'\n'
        lote = subprocess.run(['git', '-C', raiz, 'cat-file', '--batch'],
                              input=pedido, capture_output=True)
        fluxo = lote.stdout
        pos = 0
        for (_objecto, rel) in alvos:
            fim = fluxo.index(b'\n', pos)
            _sha, _tipo, tamanho = fluxo[pos:fim].split()
            inicio = fim + 1
            conteudo = fluxo[inicio:inicio + int(tamanho)]
            pos = inicio + int(tamanho) + 1
            por_ficheiro[rel] = hashlib.sha256(conteudo).hexdigest()

    linhas = ''.join(f'{k}:{v}\n' for k, v in sorted(por_ficheiro.items()))
    return hashlib.sha256(linhas.encode('utf-8')).hexdigest(), por_ficheiro


def carimbar(destino, raiz='.'):
    """Escreve a impressão do produto dentro de um manifesto de capturas.

    Chamado do `provar-mestres.sh` LOGO a seguir à captura. O carimbo é
    calculado aqui e não no capturador, que é JavaScript: duas implementações do
    mesmo resumo — uma para escrever, outra para ler — concordam até ao dia em
    que uma muda de ordenação ou de codificação, e nesse dia a guarda recusa
    tudo sem nada ter mudado. Uma implementação, dois chamadores.
    """
    import json
    import time
    resumo, por_ficheiro = impressao_do_produto(raiz)
    with open(destino, encoding='utf-8') as fh:
        manifesto = json.load(fh)
    # Os dois manifestos desta casa têm formas diferentes: o `mestres.json` é um
    # objecto e o `composicoes.json` é uma LISTA. Envolve-se a lista em vez de se
    # criar um segundo ficheiro ao lado — a impressão pertence ao manifesto das
    # capturas que descreve, e separá-los era garantir que um dia andam
    # desemparelhados. O capturador reescreve a lista a cada corrida e o corredor
    # volta a carimbar logo a seguir, portanto a forma converge sempre.
    if isinstance(manifesto, list):
        manifesto = {'capturas': manifesto}
    # ── O commit que estas capturas retratam ──────────────────────────────
    #
    # Isto estava declarado em DOIS sítios: o `sha` no nome da pasta e a
    # impressão aqui dentro. **Duas declarações do mesmo facto acabam sempre por
    # discordar** — estas discordaram em quatro horas: as capturas do dossiê
    # `2026-09-06_e953a87` foram regeneradas às 07h56 sobre outro commit, e o
    # nome da pasta passou a mentir sem ninguém dar por isso.
    #
    # Manda o manifesto, e por dois motivos: é escrito **pela corrida que
    # captura**, e é **verificável contra a árvore**. O nome da pasta fica só com
    # a data, que serve para um humano navegar.
    #
    # `arvoreLimpa` não é enfeite: se a árvore tinha alterações por commitar, as
    # capturas não retratam commit nenhum — retratam a árvore. Guardar o `sha` e
    # calar isso era prometer uma verificação que não pode passar.
    import subprocess
    def _git(args):
        return subprocess.run(['git', '-C', raiz] + args, capture_output=True, text=True)
    _sha = _git(['rev-parse', 'HEAD']).stdout.strip() or None
    # ── O âmbito do «limpa» tem de ser o âmbito da IMPRESSÃO ──────────────
    #
    # Isto perguntava por `apps` e `packages` INTEIROS, e a impressão só cobre
    # `.ts`, `.tsx` e `.css`. As capturas de marketing vivem em
    # `apps/web/src/demonstracao/`, portanto **capturar suja o `apps/`** — e o
    # carimbo tirado logo a seguir dizia `arvoreLimpa: false` para sempre. A
    # guarda apanhou-o: «capturado com a árvore suja — não retrata commit
    # nenhum». Estava certa sobre o que eu lhe disse, e eu é que lhe disse mal.
    #
    # É o mesmo defeito do `git log` sem filtro de extensão que se curou de
    # manhã: **o medido tem de coincidir com o declarado.**
    _sujo = _git(['status', '--porcelain', '--',
                  'apps/*.ts', 'apps/*.tsx', 'apps/*.css',
                  'packages/*.ts', 'packages/*.tsx', 'packages/*.css',
                  ':(exclude)*next-env.d.ts']).stdout.strip()

    manifesto['impressaoDoProduto'] = {
        'resumo': resumo,
        'ficheiros': len(por_ficheiro),
        'porFicheiro': por_ficheiro,
        'quando': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        'commit': _sha,
        'arvoreLimpa': not _sujo,
    }
    with open(destino, 'w', encoding='utf-8') as fh:
        json.dump(manifesto, fh, ensure_ascii=False, indent=2)
    return resumo, len(por_ficheiro)



def comparar(destino, raiz='.', sonda=False):
    """Compara a impressão guardada num manifesto com a árvore de agora.

    Devolve `(codigo, linhas)`: 0 igual, 1 diferente, 2 sem carimbo.

    Com `sonda=True` estraga **uma** entrada da impressão guardada antes de
    comparar, e exige que a comparação acuse. É a sonda desta guarda: um
    comparador cego devolveria «igual» também aqui, e o verde da corrida normal
    passaria a não querer dizer nada. A sonda mexe só na cópia em memória — não
    escreve no manifesto nem toca no produto.
    """
    import json
    with open(destino, encoding='utf-8') as fh:
        manifesto = json.load(fh)
    carimbo = manifesto.get('impressaoDoProduto') if isinstance(manifesto, dict) else None
    if not carimbo:
        return 2, ['sem carimbo do conteudo do produto neste manifesto']

    guardado = dict(carimbo['porFicheiro'])
    if sonda:
        if not guardado:
            return 2, ['a impressao guardada esta vazia — a sonda nao teria o que estragar']
        primeiro = sorted(guardado)[0]
        guardado[primeiro] = 'sonda' + guardado[primeiro][5:]

    alterados, novos, sumidos = diferencas_do_produto(raiz, guardado)
    linhas = ([f'alterado      {f}' for f in alterados]
              + [f'novo          {f}' for f in novos]
              + [f'desaparecido  {f}' for f in sumidos])
    return (1 if linhas else 0), linhas


if __name__ == '__main__':
    if sys.argv[1:2] == ['--comparar'] and len(sys.argv) > 2:
        _sonda = '--sonda' in sys.argv
        _codigo, _linhas = comparar(sys.argv[2], sonda=_sonda)
        if _sonda:
            # A sonda inverte a leitura: aqui o SUCESSO e' a comparacao acusar.
            if _codigo == 1:
                print('SONDA ACENDEU')
                raise SystemExit(0)
            print(f'SONDA NAO ACENDEU (codigo {_codigo})')
            raise SystemExit(2)
        for _l in _linhas[:8]:
            print(_l)
        if len(_linhas) > 8:
            print(f'… e mais {len(_linhas) - 8}')
        raise SystemExit(_codigo)

    if sys.argv[1:2] == ['--carimbar'] and len(sys.argv) > 2:
        _r, _n = carimbar(sys.argv[2])
        print(f'impressao do produto carimbada: {_n} ficheiros, resumo {_r[:16]}')
        raise SystemExit(0)

    print('uso: frescura_do_produto.py --carimbar <manifesto> | --comparar <manifesto> [--sonda]',
          file=sys.stderr)
    raise SystemExit(2)
