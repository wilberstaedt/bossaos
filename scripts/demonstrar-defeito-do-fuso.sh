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

# ── O que mudou aqui, e porquê ────────────────────────────────────────────
#
# A primeira versão comparava o resolvedor com uma CÓPIA da linha do produto —
# `new Date('...Z')`, escrita à mão neste ficheiro. Media a cópia: consertado o
# produto, o detector continuava vermelho, e não porque o defeito existisse.
#
# Passa a chamar a PORTA. Faz uma reserva pela mesma função que a tela usa, lê o
# instante que ficou na base, e compara-o com o fuso da unidade. Se alguém apagar
# a resolução do fuso na porta, isto acende — que é a única coisa que interessa.
cat > ./.fuso-demo.mjs <<'JS'
import { Client } from 'pg';
import { reservarDaRua, unidadePublica, obterPrisma } from './packages/db/src/index.ts';

const c = new Client({ connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL });
await c.connect();

const SLUG = 'insp-marina-oropesa';
const prisma = obterPrisma(process.env.DATABASE_URL);
const unidade = await unidadePublica(prisma, SLUG);
if (!unidade || !unidade.reservasActivas) {
  console.log('    a unidade de inspeccao nao esta semeada ou nao aceita reservas');
  console.log('    corre: node --experimental-strip-types packages/db/prisma/semente-inspeccao.ts');
  await c.end(); await prisma.$disconnect();
  process.exit(3);
}

const dia = '2026-09-05';
const hora = '20:00';
const local = `${dia} ${hora}:00`;
const r = async (fuso) => (await c.query(
  'SELECT instante, estado FROM instante_local($1, $2::timestamp)', [fuso, local])).rows[0];

const doFuso = await r(unidade.fuso);
const emUtc  = await r('UTC');

// ── A PORTA, e não uma cópia dela ────────────────────────────────────────
const chave = `fuso-demo-${Date.now()}`;
const feita = await reservarDaRua(prisma, SLUG, {
  pessoas: 2, dia, hora, nome: 'demo-do-fuso',
  contacto: 'fuso@inspeccao.example', chaveIdempotente: chave,
});

let gravado = null;
if (feita.ok) {
  const { rows } = await c.query('SELECT inicio FROM reservations WHERE id = $1', [feita.reservaId]);
  gravado = rows[0]?.inicio ?? null;
  // Quem faz a sujidade apanha-a.
  await c.query('DELETE FROM reservation_allocations WHERE reservation_id = $1', [feita.reservaId]);
  await c.query('DELETE FROM reservation_messages WHERE reservation_id = $1', [feita.reservaId]);
  await c.query('DELETE FROM reservations WHERE id = $1', [feita.reservaId]);
}
await c.end(); await prisma.$disconnect();

const iso = (d) => (d === null ? 'nao gravou' : new Date(d).toISOString());
console.log(`    hora local escolhida ........... ${local}`);
console.log(`    fuso da unidade ................ ${unidade.fuso}`);
console.log(`    resolverHoraLocal no fuso ...... ${iso(doFuso.instante)}  (${doFuso.estado})`);
console.log(`    resolverHoraLocal UTC .......... ${iso(emUtc.instante)}  (${emUtc.estado})`);
console.log(`    o que a PORTA gravou ........... ${iso(gravado)}`);
if (!feita.ok) console.log(`    (a porta recusou: ${feita.motivo})`);

// CONTROLO NEGATIVO do proprio detector: se o resolvedor devolvesse o mesmo
// para dois fusos diferentes, este teste nao estaria a medir fuso nenhum.
const resolvedorVaria = iso(doFuso.instante) !== iso(emUtc.instante);
console.log(`\n    [controlo] o resolvedor varia com o fuso? ${resolvedorVaria ? 'sim' : 'NAO — detector cego'}`);
if (!resolvedorVaria) { console.log('CEGO'); process.exit(2); }

const passa = gravado !== null && iso(gravado) === iso(doFuso.instante);
console.log(passa ? 'PASSA' : 'FALHA');
process.exit(passa ? 0 : 1);
JS

saida=$(node --experimental-strip-types ./.fuso-demo.mjs 2>&1); estado=$?
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
