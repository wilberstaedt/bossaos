import type { ClienteComEscopo } from './escopo.ts';
import { RecusaDaConta } from './contas.ts';

/**
 * A caixa — o motor da fatia 2 do E22.
 *
 * ── O estado não é uma coluna ─────────────────────────────────────────────
 *
 * Deriva-se dos acontecimentos, como o estado da conta se deriva dos pagamentos.
 * «Tudo o que abre, fecha ou corrige uma caixa tem de deixar rasto que não se
 * apaga» — e a maneira de garantir isso não é lembrar-se de escrever o registo:
 * é não haver outro sítio onde o estado possa estar.
 */

export type EstadoDaCaixa = 'ABERTA' | 'CONTADA' | 'FECHADA';

export type RecusaDeCaixa =
  | 'CAIXA_FECHADA'
  | 'CAIXA_ABERTA'
  | 'SEM_CONTAGEM'
  | 'CONTAGEM_DESACTUALIZADA'
  | 'DIVERGENCIA_SEM_AUTORIZACAO'
  | 'PAGAMENTO_NAO_E_DINHEIRO'
  | 'OPERACOES_PENDENTES';

export class RecusaDaCaixa extends Error {
  readonly motivo: RecusaDeCaixa;

  constructor(motivo: RecusaDeCaixa, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDaCaixa';
    this.motivo = motivo;
  }
}

/** O último acontecimento, que é o que diz o estado. */
async function ultimoAcontecimento(db: ClienteComEscopo, registerId: string) {
  return db.cashRegisterEvent.findFirst({
    where: { registerId },
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
    select: { id: true, tipo: true, contadoMenor: true, criadoEm: true },
  });
}

export async function estadoDaCaixa(
  db: ClienteComEscopo, registerId: string,
): Promise<EstadoDaCaixa> {
  const ultimo = await ultimoAcontecimento(db, registerId);
  if (!ultimo) return 'ABERTA';
  if (ultimo.tipo === 'FECHO') return 'FECHADA';
  if (ultimo.tipo === 'CONTAGEM') return 'CONTADA';
  return 'ABERTA';
}

/**
 * `esperado = fundo + entradas − saídas`, e só o que é dinheiro físico.
 *
 * A correcção não se soma duas vezes: um movimento corrigido sai da conta, e a
 * correcção entra no lugar dele. As duas linhas continuam a ver-se — o que muda
 * é o que conta, exactamente como no ajuste de uma conta.
 */
export async function esperadoNaGaveta(
  db: ClienteComEscopo, registerId: string,
): Promise<{ fundoMenor: number; entradasMenor: number; saidasMenor: number; esperadoMenor: number }> {
  const caixa = await db.cashRegister.findUniqueOrThrow({
    where: { id: registerId }, select: { fundoMenor: true },
  });
  const corrigidos = await db.cashMovement.findMany({
    where: { registerId, corrigeId: { not: null } },
    select: { corrigeId: true },
  });
  const anulados = corrigidos.map((c) => c.corrigeId!).filter(Boolean);
  // `exactOptionalPropertyTypes` não deixa passar um `undefined` explícito, e
  // isso está certo: uma propriedade presente-mas-indefinida é um caso a mais
  // para quem lê. Espalha-se só quando há o que espalhar.
  const contam = anulados.length ? { registerId, id: { notIn: anulados } } : { registerId };
  const [entradas, saidas] = await Promise.all([
    db.cashMovement.aggregate({ where: { ...contam, tipo: 'ENTRADA' as const }, _sum: { montanteMenor: true } }),
    db.cashMovement.aggregate({ where: { ...contam, tipo: 'SAIDA' as const }, _sum: { montanteMenor: true } }),
  ]);
  const entradasMenor = entradas._sum?.montanteMenor ?? 0;
  const saidasMenor = saidas._sum?.montanteMenor ?? 0;
  return {
    fundoMenor: caixa.fundoMenor, entradasMenor, saidasMenor,
    esperadoMenor: caixa.fundoMenor + entradasMenor - saidasMenor,
  };
}

/** Abrir: cria a caixa e o primeiro acontecimento, na mesma transacção. */
export async function abrirCaixa(
  db: ClienteComEscopo,
  dados: { organizationId: string; locationId: string; nome: string; moeda: string; fundoMenor: number; actor: string },
): Promise<{ id: string }> {
  const caixa = await db.cashRegister.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome, moeda: dados.moeda.toUpperCase(), fundoMenor: dados.fundoMenor,
    },
    select: { id: true },
  });
  await db.cashRegisterEvent.create({
    data: {
      organizationId: dados.organizationId, registerId: caixa.id,
      tipo: 'ABERTURA', actor: dados.actor,
    },
  });
  return caixa;
}

/** Entrada ou saída de dinheiro, sempre com motivo e com quem a fez. */
export async function movimentar(
  db: ClienteComEscopo,
  dados: {
    registerId: string; tipo: 'ENTRADA' | 'SAIDA'; montanteMenor: number;
    motivo: string; actor: string; paymentId?: string;
  },
): Promise<{ id: string; esperadoMenor: number }> {
  const caixa = await db.cashRegister.findUniqueOrThrow({
    where: { id: dados.registerId }, select: { organizationId: true },
  });
  const criado = await db.cashMovement.create({
    data: {
      organizationId: caixa.organizationId, registerId: dados.registerId,
      tipo: dados.tipo, montanteMenor: dados.montanteMenor,
      motivo: dados.motivo, actor: dados.actor, paymentId: dados.paymentId ?? null,
    },
    select: { id: true },
  });
  const { esperadoMenor } = await esperadoNaGaveta(db, dados.registerId);
  return { id: criado.id, esperadoMenor };
}

/**
 * O pagamento em dinheiro que entra na gaveta.
 *
 * «Cartão e liquidação do adquirente não entram no caixa como notas.» Recusa-se
 * com nome — e o que entra é o **cobrado**, não o recebido: o troco saiu outra
 * vez pela mesma gaveta e nunca foi receita.
 */
export async function entrarPagamentoEmDinheiro(
  db: ClienteComEscopo,
  dados: { registerId: string; paymentId: string; actor: string },
): Promise<{ id: string; esperadoMenor: number }> {
  const pagamento = await db.payment.findUniqueOrThrow({
    where: { id: dados.paymentId },
    select: { meio: true, montanteMenor: true },
  });
  if (pagamento.meio !== 'DINHEIRO') {
    throw new RecusaDaCaixa('PAGAMENTO_NAO_E_DINHEIRO',
      `${pagamento.meio} não entra na gaveta como notas`);
  }
  return movimentar(db, {
    registerId: dados.registerId, tipo: 'ENTRADA',
    montanteMenor: pagamento.montanteMenor,
    motivo: 'pagamento em dinheiro', actor: dados.actor,
    paymentId: dados.paymentId,
  });
}

/**
 * Corrigir um movimento: registo NOVO que aponta para o que anula.
 *
 * O original fica. Sem isto, o movimento imutável era uma armadilha — a mesma
 * lição que o ajuste de conta deu nesta etapa.
 */
export async function corrigirMovimento(
  db: ClienteComEscopo,
  dados: { movimentoId: string; montanteMenor: number; motivo: string; actor: string },
): Promise<{ id: string; esperadoMenor: number }> {
  const original = await db.cashMovement.findUniqueOrThrow({
    where: { id: dados.movimentoId },
    select: { organizationId: true, registerId: true, tipo: true },
  });
  const criado = await db.cashMovement.create({
    data: {
      organizationId: original.organizationId, registerId: original.registerId,
      tipo: original.tipo, montanteMenor: dados.montanteMenor,
      motivo: dados.motivo, actor: dados.actor, corrigeId: dados.movimentoId,
    },
    select: { id: true },
  });
  const { esperadoMenor } = await esperadoNaGaveta(db, original.registerId);
  return { id: criado.id, esperadoMenor };
}

/** Contar: o único número que um humano escreve. A diferença deriva-se. */
export async function contar(
  db: ClienteComEscopo,
  dados: { registerId: string; contadoMenor: number; actor: string },
): Promise<{ contadoMenor: number; esperadoMenor: number; diferencaMenor: number }> {
  const caixa = await db.cashRegister.findUniqueOrThrow({
    where: { id: dados.registerId }, select: { organizationId: true },
  });
  if ((await estadoDaCaixa(db, dados.registerId)) === 'FECHADA') {
    throw new RecusaDaCaixa('CAIXA_FECHADA');
  }
  await db.cashRegisterEvent.create({
    data: {
      organizationId: caixa.organizationId, registerId: dados.registerId,
      tipo: 'CONTAGEM', actor: dados.actor, contadoMenor: dados.contadoMenor,
    },
  });
  const { esperadoMenor } = await esperadoNaGaveta(db, dados.registerId);
  return {
    contadoMenor: dados.contadoMenor, esperadoMenor,
    diferencaMenor: dados.contadoMenor - esperadoMenor,
  };
}

/**
 * Fechar o turno.
 *
 * ── Quatro condições, e nenhuma é decorativa ──────────────────────────────
 *
 * 1. **Tem de haver contagem.** Fechar sem contar é assinar um número que
 *    ninguém viu.
 * 2. **A contagem tem de ser posterior ao último movimento.** Contar e depois
 *    meter dinheiro na gaveta deixa a contagem errada *depois* de assinada — e é
 *    a forma silenciosa do erro, porque o movimento é legítimo em tudo o resto.
 * 3. **Diferença exige autorização, com nome.** «Divergência exige autorização»
 *    não é uma frase de relatório: é a condição de fecho.
 * 4. **Nada por reconciliar na unidade.** «A caixa não fecha silenciosamente com
 *    operações pendentes» — uma tentativa em aberto é dinheiro que pode ter
 *    saído do cartão de alguém sem esta caixa saber.
 */
export async function fecharCaixa(
  db: ClienteComEscopo,
  dados: { registerId: string; actor: string; autorizadoPor?: string; motivo?: string },
): Promise<{ contadoMenor: number; esperadoMenor: number; diferencaMenor: number }> {
  const caixa = await db.cashRegister.findUniqueOrThrow({
    where: { id: dados.registerId }, select: { organizationId: true, locationId: true },
  });
  if ((await estadoDaCaixa(db, dados.registerId)) === 'FECHADA') {
    throw new RecusaDaCaixa('CAIXA_FECHADA');
  }

  const contagem = await db.cashRegisterEvent.findFirst({
    where: { registerId: dados.registerId, tipo: 'CONTAGEM' },
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
    select: { contadoMenor: true, criadoEm: true },
  });
  if (!contagem) throw new RecusaDaCaixa('SEM_CONTAGEM');

  const depois = await db.cashMovement.count({
    where: { registerId: dados.registerId, criadoEm: { gt: contagem.criadoEm } },
  });
  if (depois > 0) {
    throw new RecusaDaCaixa('CONTAGEM_DESACTUALIZADA',
      `${depois} movimento(s) depois da contagem`);
  }

  const pendentes = await db.paymentAttempt.count({
    where: {
      estado: { in: ['CRIADA', 'PROCESSANDO', 'INDETERMINADA'] },
      conta: { locationId: caixa.locationId },
    },
  });
  if (pendentes > 0) {
    throw new RecusaDaCaixa('OPERACOES_PENDENTES', `${pendentes} por reconciliar`);
  }

  const { esperadoMenor } = await esperadoNaGaveta(db, dados.registerId);
  const contadoMenor = contagem.contadoMenor!;
  const diferencaMenor = contadoMenor - esperadoMenor;
  if (diferencaMenor !== 0 && !dados.autorizadoPor) {
    throw new RecusaDaCaixa('DIVERGENCIA_SEM_AUTORIZACAO',
      `contado ${contadoMenor}, esperado ${esperadoMenor}`);
  }

  await db.cashRegisterEvent.create({
    data: {
      organizationId: caixa.organizationId, registerId: dados.registerId,
      tipo: 'FECHO', actor: dados.actor,
      autorizadoPor: dados.autorizadoPor ?? null, motivo: dados.motivo ?? null,
    },
  });
  return { contadoMenor, esperadoMenor, diferencaMenor };
}

/** Reabrir: acto auditado, com actor e motivo — e o motivo é obrigatório na base. */
export async function reabrirCaixa(
  db: ClienteComEscopo,
  dados: { registerId: string; actor: string; motivo: string },
): Promise<void> {
  const caixa = await db.cashRegister.findUniqueOrThrow({
    where: { id: dados.registerId }, select: { organizationId: true },
  });
  if ((await estadoDaCaixa(db, dados.registerId)) !== 'FECHADA') {
    throw new RecusaDaCaixa('CAIXA_ABERTA', 'só se reabre o que está fechado');
  }
  await db.cashRegisterEvent.create({
    data: {
      organizationId: caixa.organizationId, registerId: dados.registerId,
      tipo: 'REABERTURA', actor: dados.actor, motivo: dados.motivo,
    },
  });
}

/**
 * O fecho como se lê no ecrã — e reproduzido da ledger, nunca de um número
 * guardado. É por isso que a diferença nunca pode discordar dos movimentos: não
 * existe em lado nenhum senão nesta subtracção.
 */
export async function resumoDaCaixa(
  db: ClienteComEscopo, registerId: string,
): Promise<{
  estado: EstadoDaCaixa; moeda: string; fundoMenor: number;
  entradasMenor: number; saidasMenor: number; esperadoMenor: number;
  contadoMenor: number | null; diferencaMenor: number | null;
}> {
  const caixa = await db.cashRegister.findUniqueOrThrow({
    where: { id: registerId }, select: { moeda: true },
  });
  const somas = await esperadoNaGaveta(db, registerId);
  const contagem = await db.cashRegisterEvent.findFirst({
    where: { registerId, tipo: 'CONTAGEM' },
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
    select: { contadoMenor: true },
  });
  const contadoMenor = contagem?.contadoMenor ?? null;
  return {
    estado: await estadoDaCaixa(db, registerId), moeda: caixa.moeda, ...somas,
    contadoMenor,
    diferencaMenor: contadoMenor === null ? null : contadoMenor - somas.esperadoMenor,
  };
}

/** O histórico de caixas de uma unidade — o POS-019. */
export async function historicoDeCaixas(
  db: ClienteComEscopo, locationId: string,
): Promise<{ id: string; nome: string; moeda: string; estado: EstadoDaCaixa;
             esperadoMenor: number; contadoMenor: number | null; diferencaMenor: number | null }[]> {
  const caixas = await db.cashRegister.findMany({
    where: { locationId }, orderBy: { criadaEm: 'desc' },
    select: { id: true, nome: true },
  });
  const saida = [];
  for (const c of caixas) {
    const r = await resumoDaCaixa(db, c.id);
    saida.push({
      id: c.id, nome: c.nome, moeda: r.moeda, estado: r.estado,
      esperadoMenor: r.esperadoMenor, contadoMenor: r.contadoMenor,
      diferencaMenor: r.diferencaMenor,
    });
  }
  return saida;
}

/** O rasto, por ordem — é isto que a auditoria lê. */
export async function rastoDaCaixa(db: ClienteComEscopo, registerId: string) {
  return db.cashRegisterEvent.findMany({
    where: { registerId }, orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
    select: {
      tipo: true, actor: true, contadoMenor: true, motivo: true,
      autorizadoPor: true, criadoEm: true,
    },
  });
}

export { RecusaDaConta };
