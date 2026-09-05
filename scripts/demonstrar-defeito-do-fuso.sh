#!/usr/bin/env bash
# A hora escolhida por uma pessoa nasce do FUSO DA UNIDADE?
#
# ── PORQUE E' QUE ESTE FICHEIRO FOI REESCRITO ──────────────────────────────
# A primeira versao comparava `resolverHoraLocal` com uma CONSTANTE que eu
# escrevi a mao (`new Date('...T20:00:00Z')`) para representar o que a porta
# fazia. Nao olhava para a porta. Demonstrou o defeito enquanto ele existiu, e
# teria dito FALHA para sempre depois do conserto — um instrumento que observa
# uma FORMA DE ESCRITA em vez da propriedade, que e' exactamente o defeito que
# passei a noite a apontar aos outros. Agora exercita a funcao de produto.
#
# Fora da suite de proposito: um vermelho permanente la dentro envenenava as
# medicoes seguintes.
set -uo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi

verde()    { printf '\033[32m  ok\033[0m       %s\n' "$1"; }
vermelho() { printf '\033[31m  FALHA\033[0m    %s\n' "$1"; }
amarelo()  { printf '\033[33m  NAO MEDI\033[0m %s\n' "$1"; }

cat > ./.fuso-produto.mjs <<'JS'
import { Client } from 'pg';
import { obterPrisma, comEscopo, resolverHoraLocal } from './packages/db/src/index.ts';

// O cliente do RUNTIME nao ve nada sem escopo — a RLS filtra, e ainda bem.
// Para MONTAR o cenario uso o papel de migracao; para MEDIR uso o do runtime,
// sob escopo, que e' o caminho do produto. Arranjar a precondicao nao e'
// falsear a medicao: o que se mede continua a ser a funcao de produto.
const adm = new Client({ connectionString: process.env.MIGRATION_DATABASE_URL });
await adm.connect();
const { rows } = await adm.query(
  `SELECT id, organization_id AS "organizationId", fuso FROM locations ORDER BY fuso NULLS LAST LIMIT 1`);
if (!rows.length) { console.log('SEM_UNIDADE'); await adm.end(); process.exit(3); }
let u = rows[0];
// ── O QUE SE MEXE, REPOE-SE ──────────────────────────────────────────────
// A primeira versao punha o fuso e deixava-o la. A `provar-publico` falhou
// logo a seguir numa assercao que passou na corrida seguinte, e a causa mais
// provavel era esta escrita minha a sobreviver a medicao. Um instrumento de
// revisao que deixa rasto contamina a proxima medicao e faz-se passar por
// defeito do produto. O `provar-mais-tarde.sh` do JR faz isto bem, com
// `trap restaurar EXIT INT TERM`; copio o padrao.
let repor = null;
if (!u.fuso) {
  await adm.query(`UPDATE locations SET fuso = 'Europe/Madrid' WHERE id = $1`, [u.id]);
  repor = u.id;
  u.fuso = 'Europe/Madrid';
  console.log('    [cenario] pus Europe/Madrid nesta unidade: a semente nao traz fuso');
}
const limpar = async () => {
  if (repor) {
    await adm.query(`UPDATE locations SET fuso = NULL WHERE id = $1`, [repor]);
    console.log('    [cenario] fuso reposto a NULL — nao deixo rasto na base');
  }
  await adm.end();
};
process.on('SIGINT', async () => { await limpar(); process.exit(130); });
process.on('SIGTERM', async () => { await limpar(); process.exit(143); });

const prisma = obterPrisma(process.env.DATABASE_URL);
const dia = '2026-07-15', hora = '20:00';           // Julho: Madrid em +02:00
const local = `${dia} ${hora}:00`;
const esc = { organizationId: u.organizationId };

const doProduto = await comEscopo(prisma, esc, (db) => resolverHoraLocal(db, u.fuso, local));
const emUtc     = await comEscopo(prisma, esc, (db) => resolverHoraLocal(db, 'UTC', local));
const ingenuo   = new Date(`${dia}T${hora}:00Z`);

const iso = (d) => new Date(d).toISOString();
console.log(`    unidade em ................. ${u.fuso}`);
console.log(`    hora escolhida ............. ${local}`);
console.log(`    o produto grava ............ ${iso(doProduto.instante)}  (${doProduto.estado})`);
console.log(`    a leitura ingenua daria .... ${iso(ingenuo)}`);
console.log(`    [controlo] o mesmo em UTC .. ${iso(emUtc.instante)}`);

const cego = iso(doProduto.instante) === iso(emUtc.instante) && u.fuso !== 'UTC';
const veredicto = cego ? 'CEGO' : (iso(doProduto.instante) !== iso(ingenuo) ? 'PASSA' : 'FALHA');
await limpar();
console.log(veredicto);
process.exit(cego ? 2 : 0);
JS

saida=$(node --experimental-strip-types ./.fuso-produto.mjs 2>&1); rm -f ./.fuso-produto.mjs
echo "$saida" | grep -vE '^(PASSA|FALHA|CEGO|SEM_UNIDADE)$'
echo
# Ha TRES respostas, nao duas. Sem veredicto explicito na saida, isto diz NAO
# MEDI — porque na primeira vez que corri a versao antiga, o node rebentou por
# falta de uma funcao na base e eu li o codigo 1 como se fosse o defeito.
case "$(echo "$saida" | grep -oE '^(PASSA|FALHA|CEGO|SEM_UNIDADE)$' | tail -1)" in
  PASSA) verde "a hora nasce do fuso da unidade, e nao de um Z colado"; exit 0 ;;
  FALHA) vermelho "o instante e' igual a leitura ingenua: o fuso nao entrou"; exit 1 ;;
  CEGO)  vermelho "detector cego: o resolvedor nao varia com o fuso"; exit 2 ;;
  SEM_UNIDADE) amarelo "nenhuma unidade com fuso na base — semear primeiro"; exit 3 ;;
  *) amarelo "sem veredicto: nao e' prova de defeito NEM de ausencia dele"; exit 3 ;;
esac
