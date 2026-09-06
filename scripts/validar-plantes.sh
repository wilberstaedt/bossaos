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
import re, glob, io, os, sys
raiz = sys.argv[1]
bloco = re.compile(r"python3 - <<'([A-Z]+)'\n(.*?)\n\1\n", re.S)
alvo  = re.compile(r"^\s*p\s*=\s*'([^']+)'", re.M)
ant   = re.compile(r"^\s*antigo\s*=\s*(\"[^\"]*\"|'[^']*')", re.M)
for g in sorted(glob.glob(os.path.join(raiz, 'scripts/provar-*.sh'))):
    t = io.open(g, encoding='utf-8').read()
    for _, corpo in bloco.findall(t):
        a, x = alvo.search(corpo), ant.search(corpo)
        if not a or not x:
            print('ILEGIVEL', os.path.basename(g)); continue
        f = os.path.join(raiz, a.group(1)); txt = x.group(1)[1:-1]
        if not os.path.exists(f):
            print('MORTO', os.path.basename(g), a.group(1), '(ficheiro nao existe)'); continue
        print(('VIVO' if txt in io.open(f, encoding='utf-8').read() else 'MORTO'),
              os.path.basename(g), a.group(1), txt[:56].replace('\n', '\\n'))
PYV
}

# ── O detector prova-se antes de julgar, nos dois sentidos ─────────────────
S=$(mktemp -d); trap 'rm -rf "$S"' EXIT
mkdir -p "$S/scripts" "$S/alvo"
printf 'a frase que existe\n' > "$S/alvo/f.ts"
cat > "$S/scripts/provar-sonda.sh" <<'SONDA'
python3 - <<'PYA'
p = 'alvo/f.ts'
antigo = "a frase que existe"
PYA
python3 - <<'PYB'
p = 'alvo/f.ts'
antigo = "a frase que NAO existe"
PYB
SONDA
auto=$(varrer "$S")
if printf '%s' "$auto" | grep -q '^VIVO' && printf '%s' "$auto" | grep -q '^MORTO'; then
  ok "o detector vê o plante que pega E o que não pega"
else
  erro "o detector não distingue: não sabe ler o par de sondas"
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
