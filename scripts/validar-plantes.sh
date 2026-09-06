#!/usr/bin/env bash
#
# Um plante que já não pega acusa o PRODUTO de um defeito que ninguém plantou.
#
# 06/09, 14h. O `provar-catalogo.sh` reprovou com «caiu a asserção dos catorze
# desconhecidos: ficou VERDE com o defeito plantado» — o defeito mais perigoso
# deste produto, um alergénio não declarado a ler-se como «não contém».
#
# Não tinha sido plantado nada. O ficheiro foi refactorizado, a linha que o
# plante procura deixou de existir, o `assert` do python disparou, **o guião não
# verificou o código de saída**, e o `exigir_vermelho` correu contra um produto
# intacto. O produto passou, e o guião chamou-lhe defeito.
#
# Varri os outros: 172 blocos de plante, 161 legíveis, **19 em letra morta**. E
# cinco das dez falhas do corredor completo são exactamente destes.
#
# Uma guarda que grita vermelho sem razão gasta o crédito de que precisa quando
# gritar com razão. É o mesmo custo do verde vazio, virado ao contrário.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas+1)); }
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }

varrer() {  # <directorio-raiz> -> imprime "MORTO <guiao> <ficheiro> <texto>" e "VIVO"
  python3 - "$1" <<'PYV'
import re, glob, io, os, sys, ast
raiz = sys.argv[1]
# ── E lê as DUAS formas de invocar um plante ──────────────────────────────
# A primeira versão só conhecia `python3 - <<'TAG'`. Media 172 blocos e dizia-o
# como se fossem todos — e havia **162 noutra forma**, `plantar <<'TAG'`, que ela
# não contava nem declarava. Metade da população fora da medição, e o relatório
# com ar de completo.
# É o defeito que esta guarda existe para apanhar, virado para dentro: um
# detector que mede a GRAFIA da chamada em vez da propriedade. Nos 162
# invisíveis estavam mais 25 plantes em letra morta e 6 ilegíveis.
bloco = re.compile(r"(?:python3 - |plantar )<<'([A-Z]+)'[^\n]*\n(.*?)\n\1\n", re.S)
alvo  = re.compile(r"^\s*p\s*=\s*'([^']+)'", re.M)
# ── A âncora é a que o `assert ... in s` usa, chame-se ela como se chamar ──
#
# A primeira versão exigia uma variável chamada `antigo`. Metade dos guiões
# chama-lhe outra coisa — `alvo`, `agulha` — e ficava por ler: 22 blocos com
# âncora estática a serem declarados «noutra forma». Outra vez a grafia em vez
# da propriedade, na guarda que existe para isso.
#
# Lê-se o que o `assert X in s` afirma, e resolve-se `X`: uma cadeia literal, ou
# uma variável a que se atribuiu uma cadeia literal no mesmo bloco. O que for
# dinâmico — `os.environ[...]`, JSON carregado, ficheiros de /tmp — continua sem
# se poder ler, e continua a declarar-se em vez de se concluir.
asserto = re.compile(r"^\s*assert\s+(.+?)\s+in\s+s\b", re.M)

def literal(txt):
    try: return ast.literal_eval(txt)
    except Exception: return None

def literal_de(nome, corpo):
    """A cadeia atribuida a `nome`, quando e um literal numa linha."""
    # Sem ancora de fim de linha, de proposito: exigi-la fez cair 65 blocos de
    # legiveis para «noutra forma» — os que levam comentario ou virgula a seguir
    # ao literal. Medido, e reposto.
    m = re.search(r"^\s*" + re.escape(nome) + r"\s*=\s*(\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')",
                  corpo, re.M)
    return literal(m.group(1)) if m else None

def ancora(corpo):
    """
    A ancora deste plante: o texto que ele espera encontrar no ficheiro alvo.

    Tenta o `assert ... in s` primeiro e a convencao `antigo = "..."` depois, e a
    ORDEM importa: a primeira versao devolvia None quando o `assert` existia e a
    expressao dele nao se resolvia, em vez de cair para a convencao antiga.
    Medido: os legiveis cairam de 310 para 245 e os «noutra forma» subiram de 22
    para 87 — a leitura nova a TAPAR a velha em vez de a somar.
    """
    m = asserto.search(corpo)
    if m:
        expr = m.group(1).strip()
        if expr[:1] in ('"', "'"):
            v = literal(expr)
            if v is not None: return v
        elif re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', expr):
            v = literal_de(expr, corpo)
            if v is not None: return v
    return literal_de('antigo', corpo)

for g in sorted(glob.glob(os.path.join(raiz, 'scripts/provar-*.sh'))):
    t = io.open(g, encoding='utf-8').read()
    for _, corpo in bloco.findall(t):
        a, txt = alvo.search(corpo), ancora(corpo)
        if not a or txt is None:
            print('ILEGIVEL', os.path.basename(g)); continue
        # ── A âncora compara-se pelo VALOR, não pelo texto-fonte ──────────
        #
        # `x.group(1)[1:-1]` tirava as aspas e deixava os escapes por
        # interpretar: um `antigo = "linha um\nlinha dois"` ficava com uma barra
        # e um `n` literais, que **nunca** casam com uma quebra de linha do
        # ficheiro. Todo o plante multilinha era dado por morto.
        #
        # Medido a 06/09: dos 44 «mortos», **36 estavam vivos**. Era esta guarda
        # a cometer o defeito que existe para apanhar — medir a GRAFIA em vez da
        # propriedade —, e a acusar quinze guiões que estavam certos.
        f = os.path.join(raiz, a.group(1))
        if not os.path.exists(f):
            print('MORTO', os.path.basename(g), a.group(1), '(ficheiro nao existe)'); continue
        print(('VIVO' if txt in io.open(f, encoding='utf-8').read() else 'MORTO'),
              os.path.basename(g), a.group(1), txt[:56].replace('\n', '\\n'))
PYV
}

# ── O detector prova-se antes de julgar, nos dois sentidos ─────────────────
S=$(mktemp -d); trap 'rm -rf "$S"' EXIT
mkdir -p "$S/scripts" "$S/alvo"
printf 'a frase que existe\nsegunda linha\n' > "$S/alvo/f.ts"
cat > "$S/scripts/provar-sonda.sh" <<'SONDA'
python3 - <<'PYA'
p = 'alvo/f.ts'
antigo = "a frase que existe"
PYA
python3 - <<'PYB'
p = 'alvo/f.ts'
antigo = "a frase que NAO existe"
PYB
plantar <<'PYC' || true
p = 'alvo/f.ts'
antigo = "a frase que existe\nsegunda linha"
PYC
plantar <<'PYD' || true
p = 'alvo/f.ts'
antigo = "outra frase que NAO existe"
PYD
SONDA
# Quatro sondas: vivo e morto, em CADA uma das duas formas. Sem as duas últimas,
# a versão que só lia `python3 -` passava este autoteste na mesma — e era
# exactamente essa a cegueira.
auto=$(varrer "$S")
vivos_sonda=$(printf '%s\n' "$auto" | grep -c '^VIVO' || true)
mortos_sonda=$(printf '%s\n' "$auto" | grep -c '^MORTO' || true)
if [ "${vivos_sonda:-0}" -eq 2 ] && [ "${mortos_sonda:-0}" -eq 2 ]; then
  ok "o detector vê o que pega e o que não pega, nas DUAS formas de o invocar"
else
  erro "o detector não lê as duas formas: viu $vivos_sonda vivos e $mortos_sonda mortos, e devia ver 2 e 2"
  printf '%s\n' "$auto" | sed 's/^/           /'
  echo; echo "  $falhas FALHA(S)."; exit "$falhas"
fi

echo
echo "Plantes dos guiões de prova"
saida=$(varrer .)
vivos=$(printf '%s\n' "$saida" | grep -c '^VIVO' || true)
mortos=$(printf '%s\n' "$saida" | grep -c '^MORTO' || true)
ileg=$(printf '%s\n' "$saida" | grep -c '^ILEGIVEL' || true)

# Um total a zero e' o instrumento, nao o repositorio.
if [ "${vivos:-0}" -lt 50 ]; then
  erro "só li $vivos plantes vivos — o leitor está cego"
  echo; echo "  $falhas FALHA(S)."; exit "$falhas"
fi
ok "$vivos plantes ainda pegam"
[ "${ileg:-0}" -gt 0 ] && printf '  NAO MEDI %s bloco(s) noutra forma — nao concluo nada sobre eles\n' "$ileg"

if [ "${mortos:-0}" -gt 0 ]; then
  erro "$mortos plante(s) em LETRA MORTA — o texto alvo já não existe:"
  printf '%s\n' "$saida" | grep '^MORTO' | sed 's/^MORTO /           /'
  echo
  echo "        Um guião com plante morto NAO prova nada e ACUSA o produto:"
  echo "        o exigir_vermelho corre contra um produto intacto, ele passa,"
  echo "        e o guião conclui que a asserção é vazia."
else
  ok "nenhum plante em letra morta"
fi

echo
[ "$falhas" -eq 0 ] && echo "  Os plantes plantam: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
