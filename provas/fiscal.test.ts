import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  abrirConta, comEscopo, conectorFiscal, corrigirDocumento, eDocumentoFiscal,
  enviarDocumento, filaFiscal, guardarConectorFiscal, obterPrisma, pedirDocumento,
  responderDocumento,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E24 — documentos fiscais.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * «Uma prova que só use o fornecedor a aceitar. Sem rejeição simulada e sem
 * reenvio, não está provado — está demonstrado.»
 *
 * Por isso nenhum caso aqui pede um documento e confirma que ele existe. Pedem
 * duas vezes, ou levam com uma rejeição, ou tentam reescrever o que está aceite.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e24-';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let n = 0;
const proximo = () => `${PREFIXO}${(n += 1)}`;

async function ligado(activo = true) {
  await comA((db) => guardarConectorFiscal(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA,
    provedor: activo ? 'homologado-de-prova' : undefined,
    ambiente: activo ? 'SANDBOX' : undefined,
    nif: activo ? 'B00000000' : undefined,
    activo,
  }));
}

async function documento(acontecimento = proximo()) {
  return comA((db) => pedirDocumento(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, acontecimento,
  }));
}

async function gatilhos(estado: 'DISABLE' | 'ENABLE') {
  for (const t of ['fiscal_documents', 'bill_lines', 'bill_adjustments']) {
    await sql.query(`ALTER TABLE "${t}" ${estado} TRIGGER USER`);
  }
}

async function limpar() {
  await gatilhos('DISABLE');
  await sql.query(`DELETE FROM fiscal_documents WHERE acontecimento LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM fiscal_connectors WHERE location_id = $1`, [IDS.unidadeA]);
  // A conta do caso «a venda fica intacta» também é lixo desta prova: sem isto,
  // o número colide com o da corrida anterior e o vermelho vem do arnês.
  const contas = `(SELECT id FROM bills WHERE numero LIKE '${PREFIXO}%')`;
  await sql.query(`DELETE FROM bill_lines WHERE bill_id IN ${contas}`);
  await sql.query(`DELETE FROM bills WHERE numero LIKE '${PREFIXO}%'`);
  await gatilhos('ENABLE');
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
  await limpar();
});
beforeEach(limpar);
after(async () => { await limpar(); await sql.end(); await prisma.$disconnect(); });

// ═══════════════════════════════════════════════════════════════════════════
describe('1 · um PDF bonito não é um documento fiscal', () => {
  it('pendente NÃO é documento fiscal', async () => {
    const { id } = await documento();
    const [doc] = await comA((db) => filaFiscal(db, IDS.unidadeA));
    assert.equal(doc!.id, id);
    assert.equal(eDocumentoFiscal(doc!), false,
      'um documento por enviar apareceu como se fosse válido');
  });

  it('enviado sem resposta também NÃO é', async () => {
    await ligado();
    const { id } = await documento();
    await comA((db) => enviarDocumento(db, id));
    const [doc] = await comA((db) => filaFiscal(db, IDS.unidadeA));
    assert.equal(doc!.estado, 'ENVIADO');
    assert.equal(eDocumentoFiscal(doc!), false, 'saiu daqui e já contava como válido');
  });

  it('e o PAR: aceite COM número do fornecedor É documento fiscal', async () => {
    // Sem este par, «mostra tudo como pendente» passava os dois casos acima.
    await ligado();
    const { id } = await documento();
    await comA((db) => enviarDocumento(db, id));
    await comA((db) => responderDocumento(db, {
      documentoId: id, aceite: true, numeroProvedor: 'FAC-2027-000123',
    }));
    const [doc] = await comA((db) => filaFiscal(db, IDS.unidadeA));
    assert.equal(eDocumentoFiscal(doc!), true, 'aceite pela autoridade e não conta');
  });

  it('«aceite» sem número do fornecedor é recusado pela base', async () => {
    // Sem número, «aceite» é só «achamos que sim»: ninguém o pode ir verificar.
    const { id } = await documento();
    await assert.rejects(() => sql.query(
      `UPDATE fiscal_documents SET estado = 'ACEITE' WHERE id = $1`, [id]));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2 · emitir duas vezes não emite dois documentos', () => {
  it('o mesmo acontecimento devolve o MESMO documento', async () => {
    const chave = proximo();
    const um = await documento(chave);
    const dois = await documento(chave);
    assert.equal(dois.id, um.id, 'o reenvio criou um SEGUNDO documento');
    assert.equal(dois.repetido, true, 'o reenvio foi tratado como facto novo');
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM fiscal_documents WHERE acontecimento = $1`, [chave]);
    assert.equal(rows[0].n, 1, 'emitiu duas vezes');
  });

  it('e o PAR: uma CORRECÇÃO é um documento novo, e sai', async () => {
    await ligado();
    const { id } = await documento();
    await comA((db) => enviarDocumento(db, id));
    await comA((db) => responderDocumento(db, {
      documentoId: id, aceite: true, numeroProvedor: 'FAC-1',
    }));
    const nova = await comA((db) => corrigirDocumento(db, {
      documentoId: id, acontecimento: proximo(),
    }));
    assert.notEqual(nova.id, id, 'a correcção reescreveu o original');
    const fila = await comA((db) => filaFiscal(db, IDS.unidadeA));
    assert.equal(fila.length, 2, 'os dois têm de ficar');
    assert.equal(fila.find((d) => d.id === nova.id)?.corrigeId, id);
  });

  it('só se rectifica o que a autoridade aceitou', async () => {
    const { id } = await documento();
    await assert.rejects(
      () => comA((db) => corrigirDocumento(db, { documentoId: id, acontecimento: proximo() })),
      (e: Error) => e.message.includes('NAO_ACEITE'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3 · uma rejeição é um estado, não um erro que se deita fora', () => {
  it('a rejeição fica com o MOTIVO, e o pedido não se perde', async () => {
    await ligado();
    const { id } = await documento();
    await comA((db) => enviarDocumento(db, id));
    await comA((db) => responderDocumento(db, {
      documentoId: id, aceite: false, motivo: 'NIF do cliente inválido',
    }));
    const [doc] = await comA((db) => filaFiscal(db, IDS.unidadeA));
    assert.equal(doc!.estado, 'REJEITADO');
    assert.match(doc!.motivoRejeicao ?? '', /NIF/,
      'a rejeição não diz porquê: quem a tem de corrigir não sabe o quê');
    assert.equal(eDocumentoFiscal(doc!), false);
  });

  it('uma rejeição sem motivo é recusada — pelo motor e pela base', async () => {
    await ligado();
    const { id } = await documento();
    await assert.rejects(
      () => comA((db) => responderDocumento(db, { documentoId: id, aceite: false })),
      (e: Error) => e.message.includes('SEM_MOTIVO'));
    await assert.rejects(() => sql.query(
      `UPDATE fiscal_documents SET estado = 'REJEITADO' WHERE id = $1`, [id]));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4 · um documento fiscal não se reescreve', () => {
  it('apagar é recusado pela base', async () => {
    const { id } = await documento();
    await assert.rejects(
      () => sql.query(`DELETE FROM fiscal_documents WHERE id = $1`, [id]),
      (e: Error) => e.message.includes('DOCUMENTO_IMUTAVEL'));
  });

  it('mudar o que identifica o documento é recusado pela base', async () => {
    const { id } = await documento();
    await assert.rejects(
      () => sql.query(
        `UPDATE fiscal_documents SET acontecimento = 'outro' WHERE id = $1`, [id]),
      (e: Error) => e.message.includes('DOCUMENTO_IMUTAVEL'));
  });

  it('um documento ACEITE não volta atrás', async () => {
    await ligado();
    const { id } = await documento();
    await comA((db) => enviarDocumento(db, id));
    await comA((db) => responderDocumento(db, {
      documentoId: id, aceite: true, numeroProvedor: 'FAC-9',
    }));
    await assert.rejects(
      () => sql.query(
        `UPDATE fiscal_documents SET estado = 'PENDENTE' WHERE id = $1`, [id]),
      (e: Error) => e.message.includes('DOCUMENTO_IMUTAVEL'));
  });

  it('e o PAR: o caminho legítimo do estado passa', async () => {
    // Sem isto, «recusa tudo» passava os três casos acima.
    await ligado();
    const { id } = await documento();
    await comA((db) => enviarDocumento(db, id));
    const [doc] = await comA((db) => filaFiscal(db, IDS.unidadeA));
    assert.equal(doc!.estado, 'ENVIADO', 'a base recusou até o caminho legítimo');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5 · sem fornecedor homologado, a emissão fica bloqueada', () => {
  it('sem conector nenhum, recusa com nome', async () => {
    const { id } = await documento();
    await assert.rejects(() => comA((db) => enviarDocumento(db, id)),
      (e: Error) => e.message.includes('SEM_CONECTOR'));
  });

  it('com conector desligado, recusa e diz que está bloqueada', async () => {
    await ligado(false);
    const { id } = await documento();
    await assert.rejects(() => comA((db) => enviarDocumento(db, id)),
      (e: Error) => e.message.includes('EMISSAO_BLOQUEADA'));
  });

  it('um conector não liga sem provedor, ambiente E nif — a base recusa', async () => {
    await assert.rejects(() => sql.query(
      `INSERT INTO fiscal_connectors (id, organization_id, location_id, activo)
       VALUES (gen_random_uuid(), $1, $2, true)`, [IDS.orgA, IDS.unidadeA]));
  });

  it('e o ambiente só pode ser SANDBOX ou PRODUCAO', async () => {
    // Julgar que se emitiu a sério contra um servidor de ensaio é a pior
    // confusão desta área, e é a que não dá erro nenhum.
    await assert.rejects(() => sql.query(
      `INSERT INTO fiscal_connectors (id, organization_id, location_id, provedor, ambiente, nif, activo)
       VALUES (gen_random_uuid(), $1, $2, 'x', 'talvez', 'B1', false)`,
      [IDS.orgA, IDS.unidadeA]));
    await ligado();
    const c = await comA((db) => conectorFiscal(db, IDS.unidadeA));
    assert.equal(c?.ambiente, 'SANDBOX');
  });

  it('a venda e o pagamento ficam INTACTOS quando a emissão falha', async () => {
    const { id: conta } = await comA((db) => abrirConta(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, numero: proximo(), moeda: 'EUR',
    }));
    await sql.query(
      `INSERT INTO bill_lines (id, organization_id, bill_id, nome, quantidade, unitario_menor)
       VALUES (gen_random_uuid(), $1, $2, 'x', 1, 1500)`, [IDS.orgA, conta]);
    const { id } = await comA((db) => pedirDocumento(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA,
      acontecimento: proximo(), billId: conta,
    }));
    await assert.rejects(() => comA((db) => enviarDocumento(db, id)));
    const { rows } = await sql.query(
      `SELECT devido_menor FROM bills WHERE id = $1`, [conta]);
    assert.equal(rows[0].devido_menor, 1500, 'a venda perdeu-se porque o fiscal falhou');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('6 · o encadeamento existe, e aponta para o anterior', () => {
  it('o segundo documento aponta para o primeiro', async () => {
    const um = await documento();
    const dois = await documento();
    const { rows } = await sql.query(
      `SELECT anterior_id FROM fiscal_documents WHERE id = $1`, [dois.id]);
    assert.equal(rows[0].anterior_id, um.id,
      'a cadeia não se formou: o art. 10.1.ñ exige a ligação ao anterior');
  });

  it('e o primeiro não aponta para nada', async () => {
    await sql.query(`DELETE FROM fiscal_documents WHERE location_id = $1`, [IDS.unidadeA]);
    const um = await documento();
    const { rows } = await sql.query(
      `SELECT anterior_id FROM fiscal_documents WHERE id = $1`, [um.id]);
    assert.equal(rows[0].anterior_id, null);
  });
});
