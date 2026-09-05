#!/usr/bin/env bash
#
# O REGISTO NAO PODE CONTRADIZER-SE A SI PROPRIO.
#
# Nasceu a 05/09 de uma divida do E34 que estava mal descrita. A divida dizia
# "E09, E10, E12 e E13 tem a evidencia na pasta errada" - um problema de
# arrumacao. A verdade era pior: TRES DOS QUATRO DOCUMENTOS DIZEM, NO CABECALHO,
# "implementado, aguardando validacao", e o do E12 diz que a assinatura foi
# RETIRADA. As quatro etapas estao validadas ha um dia, com commit proprio
# (83d0a2b, 1aac55d, d96ae76, 8da8df4) - o que ficou por actualizar foi o
# cabecalho, depois da segunda passagem.
#
# Porque importa mais do que arrumacao: a tabela e o documento respondem a mesma
# pergunta de maneiras opostas, e QUEM LE ABRE O DOCUMENTO. Um leitor novo
# conclui que quatro etapas passaram sem assinatura - ou pior, que a tabela
# inflaciona a percentagem. Fui verificar exactamente isso a historia antes de
# soar o alarme, e a tabela estava certa; mas ter de ir a historia para saber
# qual das duas versoes vale ja e o defeito.
#
# A guarda pergunta uma coisa so: uma etapa marcada `validado` na ETAPAS.md pode
# ter, no seu proprio documento, a frase que diz o contrario?
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas+1)); }
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }

# Le do documento so o CABECALHO - as primeiras 12 linhas. Mais abaixo, a frase
# "aguardando validacao" e legitima: as etapas contam a sua propria historia,
# incluindo a volta em que foram retidas, e cacar a frase no corpo inteiro
# acusaria justamente os documentos mais honestos.
CABECALHO=12

diz_que_aguarda() { head -$CABECALHO "$1" | grep -qiE 'aguardando valida|assinatura RETIRADA'; }

echo "1. Uma etapa validada nao se declara a espera no proprio documento"
for etapa in $(grep -oE '^\| E[0-9]{2} \| validado' docs/progress/ETAPAS.md | grep -oE 'E[0-9]{2}'); do
  doc=""
  [ -f "docs/reviews/$etapa.md" ]  && doc="docs/reviews/$etapa.md"
  [ -z "$doc" ] && [ -f "docs/progress/$etapa.md" ] && doc="docs/progress/$etapa.md"
  if [ -z "$doc" ]; then
    erro "$etapa esta validada e nao tem documento nenhum"
  elif diz_que_aguarda "$doc"; then
    erro "$etapa esta validada na tabela e o $doc diz que aguarda"
  fi
done
[ "$falhas" -eq 0 ] && ok "nenhuma etapa validada se contradiz no proprio documento"

# ── controlo negativo ────────────────────────────────────────────────────────
# Sem isto seria mais um documento a dizer que esta tudo bem. Planta-se a
# contradicao num par tabela+documento de mentira e exige-se que a MESMA logica
# a apanhe.
echo
echo "2. Controlo negativo"
SONDA="$(mktemp -d)"; trap 'rm -rf "$SONDA"' EXIT
mkdir -p "$SONDA/docs/progress" "$SONDA/docs/reviews"
printf '| E99 | validado | sonda |\n' > "$SONDA/docs/progress/ETAPAS.md"
printf '# E99\n\n**Estado:** implementado, aguardando validacao\n' > "$SONDA/docs/progress/E99.md"
if head -$CABECALHO "$SONDA/docs/progress/E99.md" | grep -qiE 'aguardando valida|assinatura RETIRADA'; then
  ok "com a contradicao plantada, a mesma leitura acusa"
else
  erro "CONTROLO NEGATIVO FALHOU: a contradicao plantada passou"
fi

echo
[ "$falhas" -eq 0 ] && echo "  Registo coerente." || echo "  $falhas contradicao(oes)."
exit $([ "$falhas" -eq 0 ] && echo 0 || echo 1)
