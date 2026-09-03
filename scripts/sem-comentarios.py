#!/usr/bin/env python3
"""Imprime o ficheiro sem comentarios, com as linhas na mesma posicao.

Existe porque duas guardas minhas - validar-dinheiro.sh e validar-alergenios.sh -
procuram padroes proibidos em codigo, e o codigo deste projecto EXPLICA por escrito
porque nao os usa. Uma guarda que nao distingue codigo de comentario castiga quem
documenta, e foi o que aconteceu a 2026-09-03 as 21h25: o meu falso positivo poe a
CI vermelha por causa de um comentario JSX que diz, textualmente, "nunca parseFloat".

A primeira versao usava sed com heuristica de linha - tirava `//` e linhas comecadas
por `*`. Nao chega: um bloco `{/* ... */}` de varias linhas tem interior sem prefixo
nenhum, e era exactamente esse o caso.

Nao e um analisador de sintaxe, e nao finge ser: e uma maquina de estados que
percorre o ficheiro a saber se esta dentro de string, de template, de `//` ou de
`/* */`. Chega para o que estas guardas precisam, e as linhas mantem o numero para
a mensagem de erro continuar a apontar ao sitio certo.
"""
import sys

def limpar(txt: str) -> str:
    fora, linha, bloco, aspas = [], False, False, ''
    i, n = 0, len(txt)
    while i < n:
        c, prox = txt[i], txt[i + 1] if i + 1 < n else ''
        if linha:
            if c == '\n': linha = False; fora.append(c)
            i += 1; continue
        if bloco:
            if c == '*' and prox == '/': bloco = False; i += 2; continue
            fora.append(c if c == '\n' else ' '); i += 1; continue
        if aspas:
            if c == '\\': fora.append('  '); i += 2; continue
            if c == aspas: aspas = ''
            fora.append(c); i += 1; continue
        if c in ('"', "'", '`'): aspas = c; fora.append(c); i += 1; continue
        if c == '/' and prox == '/': linha = True; i += 2; continue
        if c == '/' and prox == '*': bloco = True; i += 2; continue
        fora.append(c); i += 1
    return ''.join(fora)

if __name__ == '__main__':
    for caminho in sys.argv[1:]:
        try:
            with open(caminho, encoding='utf-8') as f:
                for numero, l in enumerate(limpar(f.read()).splitlines(), 1):
                    if l.strip():
                        print(f'{caminho}:{numero}:{l}')
        except (OSError, UnicodeDecodeError):
            pass
