import { identidadeDeImpressao, renderizarComanda } from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * Impressão — o motor do E31.
 *
 * Contrato: `docs/architecture/kiosk-e-impressao.md`, fronteiras 2 e 3.
 *
 * ── O que este ficheiro NÃO tem ────────────────────────────────────────────
 *
 * Não tem `marcarComoImpresso`. Não existe caminho, em lado nenhum do produto,
 * que ponha um envio em `CONFIRMADO_PELO_APARELHO` sem o texto que o aparelho
 * respondeu — e a base recusaria na mesma, com o `resposta_do_aparelho_ou_nada`.
 *
 * É a diferença entre o produto **não afirmar** que imprimiu e o produto ter o
 * cuidado de não afirmar. A segunda versão dura até alguém ter pressa.
 */

export type RecusaDeImpressao =
  | 'IMPRESSORA_DESCONHECIDA'
  | 'IMPRESSORA_INACTIVA'
  | 'ENVIO_DESCONHECIDO'
  | 'JA_ENVIADO'
  | 'REIMPRESSAO_SEM_MARCA';

export class RecusaDaImpressao extends Error {
  readonly motivo: RecusaDeImpressao;

  constructor(motivo: RecusaDeImpressao, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDaImpressao';
    this.motivo = motivo;
  }
}

/**
 * Põe um documento na fila.
 *
 * ── Idempotente, e não por esta função ser cuidadosa ───────────────────────
 *
 * A identidade deriva de `(tipo, documento, via)` e a base tem restrição única
 * sobre ela. O mesmo documento enviado duas vezes não produz duas comandas
 * **porque a base não deixa**, e não porque isto verifique primeiro. Verificar
 * primeiro é uma corrida; a restrição não é.
 *
 * O segundo envio devolve o PRIMEIRO — repetir o pedido dá a mesma resposta,
 * como a idempotência do E14. Devolver erro fazia quem chama achar que falhou.
 */
export async function enfileirarImpressao(
  db: ClienteComEscopo,
  organizationId: string,
  locationId: string,
  entrada: {
    readonly printerId: string;
    readonly tipo: 'COMANDA' | 'CONTA' | 'RECIBO' | 'DOCUMENTO_FISCAL';
    readonly documentoId: string;
    readonly via?: number;
    readonly conteudo: string;
  },
) {
  const impressora = await db.printer.findFirst({ where: { id: entrada.printerId, locationId } });
  if (!impressora) throw new RecusaDaImpressao('IMPRESSORA_DESCONHECIDA', entrada.printerId);
  if (!impressora.activa) {
    throw new RecusaDaImpressao('IMPRESSORA_INACTIVA',
      `${impressora.nome} está desligada — enfileirar aqui era papel que ninguém ia buscar`);
  }

  const via = entrada.via ?? 1;
  const identidade = identidadeDeImpressao(entrada.tipo, entrada.documentoId, via);

  // ── `upsert` e não `create` com apanha do erro ──────────────────────────
  //
  // A primeira versão fazia `create` e, ao apanhar a violação da restrição,
  // ia ler o envio que já existia. **Não podia funcionar**, e a prova disse-o:
  // isto corre dentro de uma transacção, e uma instrução que falha ABORTA a
  // transacção inteira — a leitura seguinte devolve
  // `current transaction is aborted, commands ignored`.
  //
  // Recuperar de um erro de base dentro da transacção onde ele aconteceu é uma
  // coisa que não existe. O `upsert` traduz-se em `ON CONFLICT`, resolve-se
  // dentro da própria instrução e nunca chega a abortar nada — a idempotência
  // passa a ser uma propriedade de UMA instrução, e não uma recuperação.
  try {
    return await db.printJob.upsert({
      where: { um_envio_por_identidade: { organizationId, identidade } },
      create: {
        organizationId, locationId,
        printerId: entrada.printerId,
        tipo: entrada.tipo, documentoId: entrada.documentoId,
        via, identidade, conteudo: entrada.conteudo,
      },
      // Vazio de propósito: o segundo envio do mesmo documento devolve o
      // PRIMEIRO, tal como ele está. Escrever aqui era deixar o reenvio mudar
      // um talão que a cozinha já pode ter na mão.
      update: {},
    });
  } catch (erro) {
    if (String(erro).includes('reimpressao_sem_marca_no_papel')) {
      throw new RecusaDaImpressao('REIMPRESSAO_SEM_MARCA',
        `a via ${via} não diz no papel que é segunda via`);
    }
    throw erro;
  }
}

/**
 * Enfileira a comanda de um pedido, com o talão já renderizado.
 *
 * A via sai daqui e não de quem chama: é o número de envios que já existem para
 * este documento, mais um. **Um número que se pode derivar nunca se escreve** —
 * e se a via viesse de fora, quem reimprimisse duas vezes podia mandar `2` das
 * duas e a base devolvia-lhe o primeiro talão em silêncio.
 */
export async function enfileirarComanda(
  db: ClienteComEscopo,
  organizationId: string,
  locationId: string,
  printerId: string,
  pedido: {
    readonly id: string;
    readonly numero: string;
    readonly canal: string;
    readonly linhas: readonly { readonly texto: string; readonly quantidade?: number }[];
  },
  rotulos: { readonly reimpressao: string; readonly pedido: string },
) {
  const jaEnviados = await db.printJob.count({
    where: { organizationId, tipo: 'COMANDA', documentoId: pedido.id },
  });
  const via = jaEnviados + 1;

  return enfileirarImpressao(db, organizationId, locationId, {
    printerId, tipo: 'COMANDA', documentoId: pedido.id, via,
    conteudo: renderizarComanda(pedido, via, rotulos),
  });
}

/**
 * A ponte aceitou. **Isto não é «imprimiu».**
 *
 * O nome da função diz o que aconteceu — o software entregou. Chamar-lhe
 * `marcarImpresso` seria escrever a mentira no sítio onde ela nunca mais se vê.
 */
export async function entregueAPonte(db: ClienteComEscopo, jobId: string) {
  return db.printJob.update({
    where: { id: jobId },
    data: { estado: 'ENTREGUE_A_PONTE', entregueEm: new Date() },
  });
}

/**
 * O **aparelho** respondeu.
 *
 * A resposta é obrigatória nas duas direcções, e não é validação defensiva: é o
 * que distingue uma confirmação de uma suposição. A base recusa o contrário.
 */
export async function respostaDoAparelho(
  db: ClienteComEscopo,
  jobId: string,
  resultado: 'IMPRIMIU' | 'RECUSOU',
  resposta: string,
) {
  return db.printJob.update({
    where: { id: jobId },
    data: {
      estado: resultado === 'IMPRIMIU' ? 'CONFIRMADO_PELO_APARELHO' : 'RECUSADO_PELO_APARELHO',
      respondidoEm: new Date(),
      resposta,
    },
  });
}

/** A fila de uma unidade, para a tela de diagnóstico (DEV-006) e o KDS-016. */
export function filaDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.printJob.findMany({
    where: { locationId },
    orderBy: { criadoEm: 'desc' },
    include: { impressora: true },
    take: 100,
  });
}

/** As impressoras de uma unidade (DEV-005). */
export function impressorasDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.printer.findMany({ where: { locationId }, orderBy: { nome: 'asc' } });
}

export function registarImpressora(
  db: ClienteComEscopo,
  organizationId: string,
  locationId: string,
  dados: {
    readonly nome: string;
    readonly destino: 'SALA' | 'COZINHA' | 'BALCAO' | 'GERENCIA';
    readonly modelo: string;
    readonly ligacao: 'REDE' | 'USB' | 'PONTE';
    readonly endereco?: string;
  },
) {
  return db.printer.create({ data: { organizationId, locationId, ...dados } });
}

/**
 * Retira uma impressora do serviço.
 *
 * Não apaga: um envio já feito aponta para ela, e a pergunta «para onde é que
 * isto foi?» tem de continuar a ter resposta. O `ON DELETE RESTRICT` da base
 * diria o mesmo, mais alto e mais tarde.
 */
export function desactivarImpressora(db: ClienteComEscopo, printerId: string) {
  return db.printer.update({ where: { id: printerId }, data: { activa: false } });
}
