#!/usr/bin/env bash
#
# Traz Rubik e Noto Sans para dentro do repositório, COM as licenças.
#
# O CT-13 e o manual (p. 17) mandam hospedar os ficheiros de fonte com as suas
# licenças. Não é burocracia: carregar tipografia do domínio do fornecedor põe um
# pedido a terceiros em cada carregamento de página do restaurante, e num produto
# que corre em cozinhas com wifi mau isso é uma dependência de rede que não
# precisamos de ter.
#
# Reproduzível de propósito: se as fontes desaparecerem da árvore, corre-se isto
# outra vez em vez de alguém ir buscar um ficheiro solto a um sítio qualquer.
#
# Uso: ./scripts/obter-fontes.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DESTINO="apps/web/src/fontes"
mkdir -p "$DESTINO"

# UA de browser moderno: com UA antigo o fornecedor devolve TTF em vez de WOFF2.
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
CSS_URL="https://fonts.googleapis.com/css2?family=Rubik:wght@500;700&family=Noto+Sans:wght@400;600&display=swap"

echo "==> A ler a folha de estilo do fornecedor"
curl -sSf -A "$UA" "$CSS_URL" -o /tmp/bossaos-fontes.css
[[ -s /tmp/bossaos-fontes.css ]] || { echo "resposta vazia - sem rede?"; exit 1; }

python3 scripts/obter-fontes.py "$DESTINO" /tmp/bossaos-fontes.css

echo "==> Licenças (SIL Open Font License 1.1)"
curl -sSLf -o "$DESTINO/LICENCA-Rubik.txt" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/rubik/OFL.txt"
curl -sSLf -o "$DESTINO/LICENCA-NotoSans.txt" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/OFL.txt"

# Um `curl` que traz uma página de erro em HTML pode sair com 0 e deixar um
# ficheiro chamado LICENCA que não é uma licença. Verifica-se o CONTEÚDO.
for f in "$DESTINO/LICENCA-Rubik.txt" "$DESTINO/LICENCA-NotoSans.txt"; do
  if ! grep -q "SIL OPEN FONT LICENSE" "$f"; then
    echo "ERRO: $f não contém a OFL - não publicar assim." >&2
    exit 1
  fi
  echo "    $(basename "$f")  ok ($(wc -l < "$f" | tr -d ' ') linhas)"
done

echo "==> Pronto."
