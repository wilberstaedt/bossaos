#!/usr/bin/env bash
# Demonstra, ao vivo, que a hora escolhida pelo cliente NAO passa pelo fuso da
# unidade. Deliberadamente FORA da suite: um vermelho permanente dentro dela
# envenenava todas as medicoes seguintes. Corre-se a mao.
#
# Hoje: FALHA (o defeito existe). Depois do conserto: PASSA.
set -uo pipefail
cd "$(dirname "$0")/.."

verde() { printf '\033[32m  ok\033[0m    %s\n' "$1"; }
vermelho() { printf '\033[31m  FALHA\033[0m %s\n' "$1"; }

cat > ./.fuso-demo.mjs <<'JS'
import { Client } from 'pg';
const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const local = '2026-09-05 20:00:00';
const r = async (fuso) => (await c.query(
  'SELECT instante, estado FROM instante_local($1, $2::timestamp)', [fuso, local])).rows[0];

const madrid = await r('Europe/Madrid');
const utc    = await r('UTC');
await c.end();

// Como a porta publica constroi hoje (api/publico/reservar/route.ts):
const comoAPortaFaz = new Date('2026-09-05T20:00:00Z');

const iso = (d) => new Date(d).toISOString();
console.log(`    hora local escolhida ........... ${local}`);
console.log(`    resolverHoraLocal Europe/Madrid  ${iso(madrid.instante)}  (${madrid.estado})`);
console.log(`    resolverHoraLocal UTC .......... ${iso(utc.instante)}  (${utc.estado})`);
console.log(`    o que a porta publica grava .... ${iso(comoAPortaFaz)}`);

// CONTROLO NEGATIVO do proprio detector: se o resolvedor devolvesse o mesmo
// para dois fusos diferentes, este teste nao estaria a medir fuso nenhum.
const resolvedorVaria = iso(madrid.instante) !== iso(utc.instante);
console.log(`\n    [controlo] o resolvedor varia com o fuso? ${resolvedorVaria ? 'sim' : 'NAO — detector cego'}`);
if (!resolvedorVaria) { console.log('CEGO'); process.exit(2); }

const passa = iso(comoAPortaFaz) === iso(madrid.instante);
console.log(passa ? 'PASSA' : 'FALHA');
process.exit(passa ? 0 : 1);
JS

saida=$(node ./.fuso-demo.mjs 2>&1); estado=$?
rm -f ./.fuso-demo.mjs
echo "$saida" | grep -vE '^(PASSA|FALHA|CEGO)$'
echo

# Ha TRES respostas, nao duas: certo, errado e NAO MEDI. Sem um veredicto
# explicito na saida, o codigo 1 tanto pode ser o defeito como o node a
# rebentar — e ler a segunda como a primeira e o erro que este ficheiro
# existe para nao cometer. Aconteceu a primeira vez que o corri.
veredicto=$(echo "$saida" | grep -oE '^(PASSA|FALHA|CEGO)$' | tail -1)
if [ -z "$veredicto" ]; then
  printf '\033[33m  NAO MEDI\033[0m o detector nao chegou a um veredicto\n'
  printf '        Nao e prova de defeito NEM de ausencia dele. Causa provavel em cima.\n'
  printf '        Se disser que instante_local nao existe, falta migrar esta base.\n'
  exit 3
fi

case $veredicto in
  PASSA) verde "a porta publica grava o instante do fuso da unidade"; estado=0 ;;
  CEGO)  vermelho "o detector esta cego — o resolvedor nao varia com o fuso"; estado=2 ;;
  FALHA) vermelho "a porta publica ignora o fuso: grava hora de parede como UTC"
     printf '        o conserto e chamar resolverHoraLocal(db, unidade.fuso, local),\n'
     printf '        que ja existe em packages/db/src/reservas.ts:810 e nao tem chamadas.\n'
     estado=1 ;;
esac
exit $estado
