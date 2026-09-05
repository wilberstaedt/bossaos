#!/usr/bin/env bash
# A reaprovação do marco do Restaurant, executável.
#
# ── Porque e' que isto existe, e tarde ──────────────────────────────────────
#
# O marco E11 tem `provar-marco-e11.sh` desde 04/09, com a razao certa no
# cabecalho: uma reaprovacao decidida depois de ver o trabalho molda-se ao que
# chegou. Eu aprovei o marco do Restaurant a 05/09 com a `provar-portas.sh` mais
# a minha LEITURA — e a leitura nao se reexecuta. Se alguem perguntar amanha «o
# marco ainda esta aprovado?», a resposta era abrir um documento e acreditar.
#
# Isto responde aos TRES bloqueios do parecer, um a um e PELO NOME, para a
# resposta ser «qual» e nao «se». Nao substitui o `provar-tudo.sh`.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
verde()    { printf '\033[32m  ok\033[0m       %s\n' "$1"; }
vermelho() { printf '\033[31m  FALHA\033[0m    %s\n' "$1"; falhas=$((falhas+1)); }
amarelo()  { printf '\033[33m  NAO MEDI\033[0m %s\n' "$1"; }

echo "== Marco do Restaurant: os tres bloqueios do parecer =="
echo

# ── BLOQUEIO 1: nao havia porta para modulo nenhum ──────────────────────────
echo "1. Ha porta para cada modulo entregue?"
if [ -x scripts/provar-portas.sh ]; then
  if bash scripts/provar-portas.sh >/tmp/marco-e21-portas.txt 2>&1; then
    verde "provar-portas passa (inclui o controlo que volta a por '#')"
  else
    vermelho "provar-portas FALHOU — ver /tmp/marco-e21-portas.txt"
  fi
else
  amarelo "provar-portas.sh nao existe ou nao e executavel"
fi

# ── BLOQUEIO 2: o dominio proprio construido e desligado ────────────────────
echo
echo "2. O dominio proprio: ligado, apagado, ou na mesma?"
host=$(grep -rlE "headers\(\)" apps/web/app --include="*.tsx" --include="*.ts" 2>/dev/null \
       | xargs grep -lie "host" 2>/dev/null | wc -l | tr -d ' ')
resolv=$(grep -rnE "[^a-zA-Z]sitePublicoPorDominio\(" apps packages --include="*.ts" --include="*.tsx" 2>/dev/null \
         | grep -v node_modules | grep -vcE "export (async )?function" || true)
# O `resolv` e' que decide, e nao o `host`. Ler cabecalhos nao quer dizer
# resolver dominio: a porta de webhook do E23 le-os para verificar ASSINATURA, e
# a minha primeira versao contava-a como sinal de dominio ligado. Um instrumento
# que conta uma coisa por outra da um verde que ninguem pediu.
if [ "$resolv" != "0" ]; then
  verde "ligado: o resolvedor de dominio tem chamador ($host ficheiros leem cabecalhos)"
elif [ "$resolv" = "0" ] && [ ! -f packages/db/src/sites.ts ]; then
  verde "apagado: o resolvedor saiu"
else
  # NAO e' falha do marco: e' a decisao do Matheus, registada e por tomar.
  amarelo "na mesma — tabela e resolvedor existem, $host rotas leem o Host."
  printf '           Decisao do Matheus, nao bloqueio: DECISOES-DO-MATHEUS.md\n'
fi

# ── BLOQUEIO 3: nenhuma jornada era percorrivel ─────────────────────────────
echo
echo "3. Ha prova que percorre por CLIQUES, e nao por endereco?"
liga=$(grep -rcE "getByRole\('link'" inspeccao/*.spec.ts 2>/dev/null | grep -v ':0' | wc -l | tr -d ' ')
if [ "$liga" -gt 0 ]; then
  verde "$liga ficheiros de inspeccao navegam por ligacao"
else
  vermelho "zero cliques em ligacao: as provas voltaram a medir so o endereco"
fi

echo
# Controlo negativo do proprio leitor, como o provar-tudo.sh faz: se este script
# deixar de encontrar as pecas que verifica, diz que nao mediu em vez de passar.
if [ ! -f scripts/provar-portas.sh ] || [ ! -d inspeccao ]; then
  amarelo "o leitor perdeu as pecas que verifica — isto NAO e um verde"
  exit 3
fi
[ "$falhas" = "0" ] && { echo "Marco do Restaurant: os tres respondidos."; exit 0; }
echo "Marco do Restaurant: $falhas bloqueio(s) de volta."; exit 1
