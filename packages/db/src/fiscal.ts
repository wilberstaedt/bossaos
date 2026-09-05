import type { ClienteComEscopo } from './escopo.ts';

/**
 * Documentos fiscais — o motor do E24.
 *
 * ── O que este ficheiro faz, e o que deliberadamente NÃO faz ──────────────
 *
 * Faz a **forma**: identidade por acontecimento, fila de emissão, estados,
 * encadeamento, correcção por documento novo.
 *
 * **Não faz o formato.** Não constrói o registo de alta, não calcula a huella,
 * não gera o QR. A `Orden HAC/1177/2024`, que define essas coisas, não foi lida
 * — está dito no `ADR 0002` com a data em que se foi à fonte. Escrever aqui um
 * formato que ninguém verificou seria a versão em código do requisito inventado
 * que a régua recusa.
 */

export type RecusaFiscal =
  | 'SEM_CONECTOR'
  | 'EMISSAO_BLOQUEADA'
  | 'JA_ACEITE'
  | 'NAO_ACEITE'
  | 'SEM_MOTIVO';

export class RecusaDoFiscal extends Error {
  readonly motivo: RecusaFiscal;

  constructor(motivo: RecusaFiscal, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDoFiscal';
    this.motivo = motivo;
  }
}

/**
 * Pedir um documento.
 *
 * ── Emitir duas vezes não emite dois documentos ───────────────────────────
 *
 * A garantia é o índice único sobre o acontecimento, e não um `if já existe`:
 * entre a procura e a inserção cabe o segundo processo. Um reenvio, um clique
 * duplo ou um reprocessamento devolvem **o mesmo** documento.
 *
 * E o encadeamento: o RD 1007/2023, art. 10.1.ñ, exige que o registo leve parte
 * da huella do anterior. Guardamos a **ligação** — o algoritmo fica para quando
 * a ordem técnica for lida.
 */
export async function pedirDocumento(
  db: ClienteComEscopo,
  dados: {
    organizationId: string; locationId: string; acontecimento: string;
    billId?: string; tipo?: 'FACTURA' | 'RECTIFICATIVA' | 'ANULACAO';
  },
): Promise<{ id: string; repetido: boolean }> {
  const anterior = await db.fiscalDocument.findFirst({
    where: { locationId: dados.locationId },
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
    select: { id: true },
  });
  // ── `ON CONFLICT DO NOTHING`, e não um `try/catch` ──────────────────────
  //
  // Medido a 05/09: apanhar a colisão do índice **dentro de uma transacção** não
  // serve. O Postgres aborta a transacção no erro, e tudo o que venha a seguir
  // falha com `25P02` — «current transaction is aborted». O `catch` corre, mas a
  // consulta que ele faz para devolver o documento existente já não pode correr.
  //
  // O `ON CONFLICT DO NOTHING` mantém a garantia onde ela tem de estar — no
  // índice, e não num `if já existe` onde cabe o segundo processo — **e** deixa a
  // transacção viva. É a mesma pergunta com a resposta que não parte nada.
  const inseridos = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO "fiscal_documents"
      ("id", "organization_id", "location_id", "bill_id", "tipo", "acontecimento", "anterior_id")
    VALUES (gen_random_uuid(), ${dados.organizationId}::uuid, ${dados.locationId}::uuid,
            ${dados.billId ?? null}::uuid, ${dados.tipo ?? 'FACTURA'}::"TipoDeDocumento",
            ${dados.acontecimento}, ${anterior?.id ?? null}::uuid)
    ON CONFLICT ("organization_id", "acontecimento") DO NOTHING
    RETURNING "id"`;
  if (inseridos[0]) return { id: inseridos[0].id, repetido: false };

  const jaExiste = await db.fiscalDocument.findFirstOrThrow({
    where: { organizationId: dados.organizationId, acontecimento: dados.acontecimento },
    select: { id: true },
  });
  return { id: jaExiste.id, repetido: true };
}

/**
 * Enviar — e só quando há fornecedor.
 *
 * «Sem fornecedor/credenciais/requisitos confirmados, mantenha emissão real
 * bloqueada.» A recusa tem nome, e o ecrã mostra-o: é a diferença entre um
 * produto que anuncia o seu limite e um que o deixa descobrir ao vivo.
 */
export async function enviarDocumento(
  db: ClienteComEscopo, documentoId: string,
): Promise<void> {
  const doc = await db.fiscalDocument.findUniqueOrThrow({
    where: { id: documentoId }, select: { locationId: true, estado: true },
  });
  if (doc.estado === 'ACEITE') throw new RecusaDoFiscal('JA_ACEITE');
  const conector = await db.fiscalConnector.findUnique({
    where: { locationId: doc.locationId },
    select: { activo: true, provedor: true, ambiente: true },
  });
  if (!conector) throw new RecusaDoFiscal('SEM_CONECTOR');
  if (!conector.activo) {
    throw new RecusaDoFiscal('EMISSAO_BLOQUEADA',
      'sem fornecedor homologado ligado — ver ADR 0002');
  }
  await db.fiscalDocument.update({
    where: { id: documentoId },
    data: { estado: 'ENVIADO', enviadoEm: new Date(), provedor: conector.provedor },
  });
}

/**
 * A resposta do fornecedor.
 *
 * ── Uma rejeição é um estado, não um erro que se deita fora ───────────────
 *
 * Fica registada **com o motivo**, e o pedido original não se perde. É a mesma
 * exigência do «indeterminado» do E22: o estado que dói é o do meio, e é o que
 * costuma ser colapsado em «falhou».
 *
 * E «aceite» exige o número do fornecedor — por `CHECK` na base. Sem número,
 * «aceite» é só «achamos que sim», e ninguém o pode ir verificar.
 */
export async function responderDocumento(
  db: ClienteComEscopo,
  dados: { documentoId: string; aceite: boolean; numeroProvedor?: string; motivo?: string },
): Promise<void> {
  if (!dados.aceite && !dados.motivo?.trim()) {
    throw new RecusaDoFiscal('SEM_MOTIVO', 'uma rejeição sem motivo é um beco');
  }
  await db.fiscalDocument.update({
    where: { id: dados.documentoId },
    data: dados.aceite
      ? {
        estado: 'ACEITE', numeroProvedor: dados.numeroProvedor ?? null,
        respondidoEm: new Date(),
      }
      : {
        estado: 'REJEITADO', motivoRejeicao: dados.motivo ?? null,
        respondidoEm: new Date(),
      },
  });
}

/**
 * Corrigir: um documento NOVO que aponta para o que rectifica.
 *
 * «Um documento fiscal não se reescreve. Corrige-se com outro documento, e os
 * dois ficam.» O gatilho da base recusa o `UPDATE` no que identifica o
 * documento; esta é a porta que faz a correcção do jeito certo.
 */
export async function corrigirDocumento(
  db: ClienteComEscopo,
  dados: { documentoId: string; acontecimento: string },
): Promise<{ id: string }> {
  const original = await db.fiscalDocument.findUniqueOrThrow({
    where: { id: dados.documentoId },
    select: { organizationId: true, locationId: true, billId: true, estado: true },
  });
  if (original.estado !== 'ACEITE') {
    throw new RecusaDoFiscal('NAO_ACEITE', 'só se rectifica o que a autoridade aceitou');
  }
  const anterior = await db.fiscalDocument.findFirst({
    where: { locationId: original.locationId },
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
    select: { id: true },
  });
  return db.fiscalDocument.create({
    data: {
      organizationId: original.organizationId, locationId: original.locationId,
      billId: original.billId, tipo: 'RECTIFICATIVA',
      acontecimento: dados.acontecimento, corrigeId: dados.documentoId,
      anteriorId: anterior?.id ?? null,
    },
    select: { id: true },
  });
}

/**
 * O que é documento fiscal, e o que é um ficheiro.
 *
 * «Se o produto emite o PDF e a integração falha, o PDF não pode aparecer como
 * se fosse válido.» Esta função é a única resposta a essa pergunta, e a resposta
 * é `estado === 'ACEITE'` — não «existe um ficheiro».
 */
export function eDocumentoFiscal(doc: { estado: string; numeroProvedor: string | null }): boolean {
  return doc.estado === 'ACEITE' && !!doc.numeroProvedor;
}

/** A fila de emissão de uma unidade — o que está por resolver. */
export async function filaFiscal(db: ClienteComEscopo, locationId: string) {
  return db.fiscalDocument.findMany({
    where: { locationId },
    orderBy: [{ criadoEm: 'desc' }],
    select: {
      id: true, tipo: true, estado: true, acontecimento: true, numeroProvedor: true,
      motivoRejeicao: true, criadoEm: true, corrigeId: true, billId: true,
    },
  });
}

export async function conectorFiscal(db: ClienteComEscopo, locationId: string) {
  return db.fiscalConnector.findUnique({
    where: { locationId },
    select: { id: true, provedor: true, ambiente: true, nif: true, activo: true },
  });
}

export async function guardarConectorFiscal(
  db: ClienteComEscopo,
  dados: {
    organizationId: string; locationId: string;
    provedor?: string; ambiente?: string; nif?: string; activo: boolean;
  },
): Promise<void> {
  const valores = {
    provedor: dados.provedor?.trim() || null,
    ambiente: dados.ambiente?.trim() || null,
    nif: dados.nif?.trim() || null,
    activo: dados.activo,
    actualizadoEm: new Date(),
  };
  await db.fiscalConnector.upsert({
    where: { locationId: dados.locationId },
    update: valores,
    create: { organizationId: dados.organizationId, locationId: dados.locationId, ...valores },
  });
}
