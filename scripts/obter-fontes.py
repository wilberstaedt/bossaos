#!/usr/bin/env python3
"""Descarrega Rubik e Noto Sans do fornecedor para dentro do repositório.

Chamado por `scripts/obter-fontes.sh`, que trata das licenças.

Duas coisas que este ficheiro sabe e que não são óbvias:

1. **O Google serve fontes variáveis.** Os blocos `@font-face` de peso 500 e de
   peso 700 apontam ao MESMO ficheiro. Guardar um ficheiro por peso faria o
   browser descarregar o mesmo binário duas vezes. Guarda-se um por
   família+subconjunto e declara-se o INTERVALO de peso.
2. **Interessam `latin` e `latin-ext`.** O `latin-ext` é o que traz o que o
   espanhol e o português usam fora do ASCII. Os outros subconjuntos que o
   fornecedor devolve (cirílico, grego, vietnamita) seriam peso morto.
"""

from __future__ import annotations

import hashlib
import os
import re
import sys
import urllib.request

SUBCONJUNTOS = {"latin", "latin-ext"}


def principal(destino: str, ficheiro_css: str) -> int:
    css = open(ficheiro_css, encoding="utf-8").read()

    # O CSS vem comentado com o nome do subconjunto antes de cada @font-face.
    por_url: dict[str, dict] = {}
    for bloco in css.split("/*"):
        subconjunto = bloco.split("*/")[0].strip()
        if subconjunto not in SUBCONJUNTOS:
            continue
        familia = re.search(r"font-family:\s*'([^']+)'", bloco)
        peso = re.search(r"font-weight:\s*(\d+)", bloco)
        url = re.search(r"url\((https://[^)]+\.woff2)\)", bloco)
        if not (familia and peso and url):
            continue
        registo = por_url.setdefault(
            url.group(1),
            {"familia": familia.group(1), "subconjunto": subconjunto, "pesos": set()},
        )
        registo["pesos"].add(int(peso.group(1)))

    if not por_url:
        print("nenhum @font-face reconhecido — o formato do CSS mudou?", file=sys.stderr)
        return 1

    # Limpa descarregamentos anteriores para não deixar ficheiros órfãos com
    # nomes de um esquema antigo.
    for f in os.listdir(destino):
        if f.endswith(".woff2"):
            os.remove(os.path.join(destino, f))

    linhas = []
    for url, registo in por_url.items():
        slug = registo["familia"].lower().replace(" ", "-")
        nome = f"{slug}-{registo['subconjunto']}.woff2"
        caminho = os.path.join(destino, nome)
        urllib.request.urlretrieve(url, caminho)

        pesos = sorted(registo["pesos"])
        intervalo = f"{pesos[0]} {pesos[-1]}" if len(pesos) > 1 else str(pesos[0])
        digest = hashlib.sha256(open(caminho, "rb").read()).hexdigest()
        linhas.append((nome, os.path.getsize(caminho), intervalo, digest))

    for nome, tamanho, intervalo, digest in sorted(linhas):
        print(f"    {nome:32} {tamanho / 1024:7.1f} KB  peso {intervalo:9} sha {digest[:12]}")

    digests = [d for *_, d in linhas]
    if len(set(digests)) != len(digests):
        print("ficheiros repetidos depois da desduplicação — verificar", file=sys.stderr)
        return 1

    print(f"==> {len(linhas)} ficheiros distintos (variáveis: um por família+subconjunto)")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal(sys.argv[1], sys.argv[2]))
