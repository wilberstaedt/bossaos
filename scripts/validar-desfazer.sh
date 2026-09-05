#!/usr/bin/env bash
#
# QUEM ENTREGA O CRIAR TEM DE ENTREGAR O DESFAZER.
#
# Nasceu a 05/09 de dois defeitos encontrados a mao, com a mesma forma:
#
#   criarConvite    ligado na rota  |  revogarConvite  sem chamador
#   guardarExcepcao ligada na rota  |  apagarExcepcao  sem chamador
#
# Nos dois casos a funcao de desfazer esta escrita, correcta e exportada - e a
# rota que faz a accao NAO a importa. O produto sabe fazer e nao sabe desfazer,
# e o codigo diz que sabe as duas coisas.
#
# Consequencias medidas, nao imaginadas: um convite para o email errado da acesso
# ate caducar; uma casa que marca "fechado a 25 de Dezembro" nao consegue
# desmarcar, e o site publico mostra-a fechada num dia em que abre.
#
# Duas instancias da mesma forma nao sao dois acidentes. Esta guarda torna a
# classe visivel: agrupa as exportacoes pelo SUBSTANTIVO e acusa quando o verbo
# de criar tem chamador e o de desfazer nao tem.
set -uo pipefail
cd "$(dirname "$0")/.."

python3 - "$@" <<'PY'
import pathlib, re, sys

CRIAR   = ('criar','guardar','adicionar','registar','abrir','activar','enviar','marcar')
DESFAZER= ('apagar','revogar','remover','cancelar','fechar','desactivar','anular','esquecer','desmarcar')

# Excepcoes DECLARADAS, com motivo. Uma por linha. Sai daqui quem ganhar o par.
EXCEPCOES = {
    # 'nome': 'motivo',
}

raiz = pathlib.Path('.')
def ficheiros(*dirs):
    for d in dirs:
        for p in (raiz/d).rglob('*'):
            s=str(p)
            if p.is_file() and p.suffix in ('.ts','.tsx') and 'node_modules' not in s \
               and '/.next/' not in s and not s.endswith(('.test.ts','.test.tsx','.spec.ts')):
                yield p

fontes = list(ficheiros('packages','apps'))
textos = {}
for p in fontes:
    try: textos[p] = p.read_text(encoding='utf-8')
    except Exception: pass

# Uma linha de `import` ou de `export ... from` e CANALIZACAO, nao chamada. Quem
# chama a funcao tem tambem uma linha que a usa.
#
# A primeira versao desta guarda tentava excluir as barricas por heuristica - se
# o ficheiro se chamasse index.ts e tivesse "export" nos primeiros 400
# caracteres. Falhou no packages/db/src/index.ts, deu o apagarExcepcao como
# chamado, e a guarda anunciou ZERO pares num repositorio onde eu tinha acabado
# de encontrar DOIS a mao. Um detector de verdes vazios, verde sobre nada.
#
# A regra por linha nao e heuristica: ou a ocorrencia esta numa linha de
# canalizacao, ou e uso.
# E preciso seguir o BLOCO, nao a linha. A segunda versao olhava linha a linha e
# so reconhecia a PRIMEIRA de um `export { ... } from` de varias linhas; a
# ocorrencia que enganava a guarda estava numa linha de continuacao:
#
#   packages/db/src/index.ts:132    guardarExcepcao, apagarExcepcao,
#
# Terceira versao desta guarda, e as tres falhas foram do instrumento. E o
# proprio assunto dela: uma coisa parece ligada porque aparece escrita algures.
ABRE  = re.compile(r'^\s*(import|export)\b')
FECHA = re.compile(r'\}')
def linhas_de_uso(texto):
    dentro = False
    for linha in texto.splitlines():
        if not dentro and ABRE.match(linha):
            # bloco de uma linha so, ou abertura de um de varias
            if '{' in linha and not FECHA.search(linha.split('{',1)[1]):
                dentro = True
            continue
        if dentro:
            if FECHA.search(linha): dentro = False
            continue
        yield linha

def tem_chamador(nome, definido_em):
    pad = re.compile(r'\b%s\b' % re.escape(nome))
    for p,t in textos.items():
        if p == definido_em: continue
        for linha in linhas_de_uso(t):
            if pad.search(linha): return True
    return False

def parte(nome):
    m = re.match(r'^([a-z]+)([A-Z]\w*)$', nome)
    return (m.group(1), m.group(2)) if m else (None, None)

grupos = {}
for p,t in textos.items():
    for nome in re.findall(r'export (?:async )?function (\w+)', t):
        verbo, subst = parte(nome)
        if not verbo: continue
        grupos.setdefault(subst, []).append((verbo, nome, p))

falhas = 0
for subst, itens in sorted(grupos.items()):
    criar    = [(v,n,p) for v,n,p in itens if v in CRIAR]
    desfazer = [(v,n,p) for v,n,p in itens if v in DESFAZER]
    if not criar or not desfazer: continue
    if not any(tem_chamador(n,p) for _,n,p in criar): continue      # nem o criar corre
    orfaos = [(v,n,p) for v,n,p in desfazer if not tem_chamador(n,p) and n not in EXCEPCOES]
    for v,n,p in orfaos:
        c = ', '.join(n2 for _,n2,_ in criar)
        print(f"FALHA {n} nao tem chamador, e {c} tem — {p}")
        falhas += 1

print(f"CONTAGEM {len(grupos)} substantivos, {falhas} par(es) sem desfazer")

# ── controlo negativo ────────────────────────────────────────────────────────
# A MESMA logica sobre um par de mentira. Sem isto, isto e um script que concorda
# comigo: encontra os dois que eu ja tinha encontrado a mao e nao prova que
# encontraria um terceiro.
falso = pathlib.Path('/sonda/m.ts')
textos_reais = dict(textos)
textos.clear()
textos[falso] = "export function criarSonda(){}\nexport function revogarSonda(){}\n"
textos[pathlib.Path('/sonda/rota.ts')] = "import { criarSonda } from './m.ts'\nawait criarSonda()\n"
apanha_orfao = not tem_chamador('revogarSonda', falso) and tem_chamador('criarSonda', falso)

# E o PAR: com os dois ligados, nao acusa. Sem esta metade, uma guarda que
# acusasse tudo passaria no controlo de cima.
textos[pathlib.Path('/sonda/rota2.ts')] = "import { revogarSonda } from './m.ts'\nawait revogarSonda()\n"
nao_acusa_ligado = tem_chamador('revogarSonda', falso)
textos.clear(); textos.update(textos_reais)

if apanha_orfao and nao_acusa_ligado:
    print("CONTROLO ok apanha o par sem desfazer e NAO acusa o par ligado")
else:
    print(f"CONTROLO FALHOU apanha_orfao={apanha_orfao} nao_acusa_ligado={nao_acusa_ligado}")
    falhas += 1

sys.exit(1 if falhas else 0)
PY
