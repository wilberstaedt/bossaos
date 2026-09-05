import { notFound } from 'next/navigation';
import { contasAbertas, historicoDeCaixas, resumoDaCaixa, somasDaConta, estadoDaConta } from '@bossaos/db';
import { comEscopoDoPedido } from '../sessao.ts';
import { carregarStaff } from '../staff/carregar-staff.ts';

/**
 * O que as telas do TPV precisam, e precisam igual.
 *
 * ── A superfície é nova; a casca não ──────────────────────────────────────
 *
 * `/pos/[locationId]` tem a mesma forma do Staff: a unidade vem por
 * identificador porque o endereço fica num atalho no aparelho do balcão, e a
 * organização resolve-se a partir de quem entrou — quem está ao balcão não
 * escolhe organização, está numa. Reaproveitar o `carregarStaff` não é preguiça:
 * duas cascas com a mesma regra são duas regras no dia em que uma mudar.
 */
export async function carregarTpv(idioma: string, locationId: string) {
  return carregarStaff(idioma, locationId);
}

/** As contas abertas da unidade, que é o que o TPV mostra ao abrir. */
export async function contasDoTpv(idioma: string, locationId: string) {
  const base = await carregarTpv(idioma, locationId);
  const contas = await comEscopoDoPedido(base.sessao, (db) => contasAbertas(db, base.unidade.id));
  return { ...base, contas };
}

/** Uma conta, com o que já recebeu e o que falta. */
export async function contaDoTpv(idioma: string, locationId: string, billId: string) {
  const base = await carregarTpv(idioma, locationId);
  const dados = await comEscopoDoPedido(base.sessao, async (db) => {
    const conta = await db.bill.findFirst({
      where: { id: billId, locationId: base.unidade.id },
      select: {
        id: true, numero: true, moeda: true, devidoMenor: true, fechadaEm: true,
        linhas: { select: { id: true, nome: true, quantidade: true, unitarioMenor: true } },
        ajustes: {
          select: { id: true, tipo: true, montanteMenor: true, motivo: true, reverteId: true },
        },
        tentativas: {
          where: { estado: { in: ['CRIADA', 'PROCESSANDO', 'INDETERMINADA'] } },
          select: { id: true, estado: true, montanteMenor: true },
        },
        pagamentos: {
          select: { id: true, meio: true, montanteMenor: true, recebidoMenor: true },
        },
      },
    });
    // Uma conta de outra unidade dá AUSÊNCIA, e não «proibido»: a diferença
    // entre 404 e 403 é um oráculo de existência. Mesma regra do E04.
    if (!conta) return null;
    const somas = await somasDaConta(db, conta.id);
    return { conta, somas, estado: await estadoDaConta(db, conta.id) };
  });
  if (!dados) notFound();
  return { ...base, ...dados };
}

/** As caixas da unidade, e a última aberta — o TPV precisa de saber onde põe o dinheiro. */
export async function caixasDoTpv(idioma: string, locationId: string) {
  const base = await carregarTpv(idioma, locationId);
  const caixas = await comEscopoDoPedido(base.sessao,
    (db) => historicoDeCaixas(db, base.unidade.id));
  return { ...base, caixas, aberta: caixas.find((c) => c.estado !== 'FECHADA') ?? null };
}

/** Uma caixa, com o resumo reproduzido da ledger. */
export async function caixaDoTpv(idioma: string, locationId: string, registerId: string) {
  const base = await carregarTpv(idioma, locationId);
  const dados = await comEscopoDoPedido(base.sessao, async (db) => {
    const caixa = await db.cashRegister.findFirst({
      where: { id: registerId, locationId: base.unidade.id },
      select: { id: true, nome: true },
    });
    if (!caixa) return null;
    const movimentos = await db.cashMovement.findMany({
      where: { registerId },
      orderBy: { criadoEm: 'asc' },
      select: { id: true, tipo: true, montanteMenor: true, motivo: true, corrigeId: true },
    });
    return { caixa, resumo: await resumoDaCaixa(db, registerId), movimentos };
  });
  if (!dados) notFound();
  return { ...base, ...dados };
}
