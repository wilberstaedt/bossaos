"""Extrai de um ficheiro .sql as instruções cujo início casa com um padrão.

Existe porque `sed -n '/X/,$p'` não extrai uma instrução: extrai da primeira
ocorrência até ao fim do ficheiro. Numa migração com vários blocos isso reexecuta
tudo o que vem a seguir, e um `CREATE TRIGGER` repetido aborta o psql antes de a
restauração chegar ao que interessa.

Respeita corpos `$$ ... $$`, onde os `;` não terminam instrução.
"""
import re
import sys

caminho, padrao = sys.argv[1], sys.argv[2]
texto = open(caminho, encoding='utf-8').read()

instrucoes: list[str] = []
actual: list[str] = []
dentro = False
for linha in texto.splitlines():
    if not actual and not linha.strip():
        continue
    actual.append(linha)
    if linha.count('$$') % 2 == 1:
        dentro = not dentro
    if not dentro and linha.rstrip().endswith(';'):
        instrucoes.append('\n'.join(actual))
        actual = []

alvo = re.compile(r'^\s*(%s)' % padrao)
# A ÚLTIMA definição de cada objecto é a que vale — é o que o Postgres faria a
# correr o ficheiro todo por ordem.
for i in instrucoes:
    sem_comentarios = '\n'.join(l for l in i.splitlines() if not l.lstrip().startswith('--'))
    if alvo.match(sem_comentarios):
        print(sem_comentarios.strip())
        print()
