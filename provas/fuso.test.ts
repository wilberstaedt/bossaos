import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { obterPrisma } from '../packages/db/src/index.ts';

/**
 * O relógio da aplicação é o mesmo da base?
 *
 * Esta prova existe por causa de um defeito concreto: um convite **expirado era
 * aceite**. A base dizia `expires_at <= now()` e o código lia uma data duas
 * horas no futuro — exactamente o desvio de `Europe/Madrid`.
 *
 * A causa: o adaptador do Prisma lia a renderização LOCAL de um `timestamptz` e
 * rotulava-a como UTC. Medido, lado a lado:
 *
 *     JS     now: 12:57:56Z
 *     pg     now: 12:57:56Z
 *     Prisma now: 14:57:56Z     ← duas horas
 *
 * E o defeito não era dos convites. Seria de **todos** os prazos, reservas,
 * turnos e carimbos de auditoria — num produto de restauração, uma mesa
 * reservada à hora errada.
 *
 * A correcção é uma opção de ligação (`-c timezone=UTC`). Uma opção de ligação
 * é fácil de perder num refactor, e é por isso que esta prova existe.
 */

const RUNTIME = process.env.DATABASE_URL;
if (!RUNTIME) throw new Error('DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;
let semCorreccao: PrismaClient;

before(async () => {
  sql = new Client({ connectionString: RUNTIME });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
  // Um cliente SEM a correcção, para o controlo negativo. Construído à mão para
  // não depender de alterar o ficheiro de produção.
  semCorreccao = new PrismaClient({ adapter: new PrismaPg({ connectionString: RUNTIME }) });
});

after(async () => {
  await sql.end();
  await semCorreccao.$disconnect();
});

async function agoraDoPrisma(cliente: PrismaClient): Promise<Date> {
  const linhas = await cliente.$queryRaw<Array<{ n: Date }>>`SELECT now() AS n`;
  return linhas[0]!.n;
}

describe('fuso: o relógio da base e o do processo dizem a mesma coisa', () => {
  it('o `now()` lido pelo Prisma bate certo com o relógio do processo', async () => {
    const antes = Date.now();
    const doPrisma = await agoraDoPrisma(prisma);
    const depois = Date.now();

    const desvio = doPrisma.getTime() - (antes + depois) / 2;
    assert.ok(
      Math.abs(desvio) < 5_000,
      `o Prisma lê ${doPrisma.toISOString()} e o processo diz ${new Date(antes).toISOString()} ` +
        `— ${(desvio / 3600_000).toFixed(2)} horas de desvio`,
    );
  });

  it('e bate certo com o que o driver `pg` lê da mesma base', async () => {
    const { rows } = await sql.query('SELECT now() AS n');
    const doPrisma = await agoraDoPrisma(prisma);
    const desvio = Math.abs(doPrisma.getTime() - (rows[0].n as Date).getTime());
    assert.ok(desvio < 5_000, `Prisma e pg divergem ${(desvio / 3600_000).toFixed(2)} horas`);
  });

  it('uma data escrita por SQL no passado é lida como passado', async () => {
    // É a forma concreta do defeito: um prazo já vencido tem de se ler vencido.
    const linhas = await prisma.$queryRaw<Array<{ passado: Date }>>`
      SELECT now() - interval '1 hour' AS passado
    `;
    assert.ok(
      linhas[0]!.passado.getTime() < Date.now(),
      `now() - 1h foi lido como ${linhas[0]!.passado.toISOString()}, que não é passado`,
    );
  });

  it('CONTROLO NEGATIVO: sem a opção de fuso, o desvio existe mesmo', async () => {
    // Se este caso deixar de encontrar desvio, a correcção deixou de ser
    // necessária — o que é possível (uma versão nova da biblioteca, um servidor
    // em UTC) e nesse dia queremos saber, e não continuar a arrastá-la sem
    // razão. O que não pode é a correcção sumir e ninguém dar por isso.
    const { rows } = await sql.query('SHOW timezone');
    const fusoDaBase = rows[0].TimeZone ?? rows[0].timezone;

    const cru = await agoraDoPrisma(semCorreccao);
    const desvio = Math.abs(cru.getTime() - Date.now());

    if (fusoDaBase === 'UTC') {
      // Numa base já em UTC não há desvio a demonstrar, e dizê-lo é mais honesto
      // do que fingir que o controlo correu.
      assert.ok(desvio < 5_000, 'base em UTC: sem correcção também bate certo');
      return;
    }
    assert.ok(
      desvio > 30 * 60_000,
      `a base está em ${fusoDaBase} e sem a opção o desvio devia aparecer — ` +
        `deu ${(desvio / 3600_000).toFixed(2)} h. Se passou a zero, a correcção deixou de ser precisa.`,
    );
  });
});
