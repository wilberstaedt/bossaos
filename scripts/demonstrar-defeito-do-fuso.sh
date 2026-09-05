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
import { obterPrisma, comEscopo, resolverHoraLocal } from './packages/db/src/index.ts';

const prisma = obterPrisma();
const u = await prisma.location.findFirst({
  where: { fuso: { not: null } },
  select: { id: true, fuso: true, organizationId: true },
});
if (!u) { console.log('SEM_UNIDADE'); process.exit(3); }

const dia = '2026-07-15', hora = '20:00';           // Julho: Madrid em +02:00
const local = `${dia} ${hora}:00`;

// O que o PRODUTO usa para transformar hora de parede em instante.
const doProduto = await comEscopo(prisma, { organizationId: u.organizationId },
  (db) => resolverHoraLocal(db, u.fuso, local));

// O que dava a leitura ingenua, que era o defeito.
const ingenuo = new Date(`${dia}T${hora}:00Z`);

// CONTROLO do proprio detector: se o resolvedor devolvesse o mesmo para dois
// fusos, este teste nao media fuso nenhum e nao podia concluir nada.
const emUtc = await comEscopo(prisma, { organizationId: u.organizationId },
  (db) => resolverHoraLocal(db, 'UTC', local));

const iso = (d) => new Date(d).toISOString();
console.log(`    unidade em ................. ${u.fuso}`);
console.log(`    hora escolhida ............. ${local}`);
console.log(`    o produto grava ............ ${iso(doProduto.instante)}  (${doProduto.estado})`);
console.log(`    a leitura ingenua daria .... ${iso(ingenuo)}`);
console.log(`    [controlo] o mesmo em UTC .. ${iso(emUtc.instante)}`);

if (iso(doProduto.instante) === iso(emUtc.instante) && u.fuso !== 'UTC') {
  console.log('CEGO'); process.exit(2);
}
console.log(iso(doProduto.instante) !== iso(ingenuo) ? 'PASSA' : 'FALHA');
process.exit(0);
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
