import type { ClienteComEscopo } from './escopo.ts';

/**
 * Financeiro e conciliação — o motor do E29.
 *
 * Contrato: `docs/architecture/conciliacao-e-fecho.md`, escrito por FRONTEIRA.
 *
 * ── O que este ficheiro NÃO tem, e é a decisão ────────────────────────────
 *
 * Não tem `marcarConciliado`. Não tem `fecharPeriodoComTotais`. Não tem
 * `confirmarAutomaticamente`. E não tem nenhuma função que some montantes de
 * moedas diferentes.
 *
 * Um sistema financeiro errado dá números CERTOS: não parte, não estoira, soma
 * bem uma realidade que não existe. É por isso que aqui não há nenhuma função
 * cujo defeito seja silencioso — as que podiam sê-lo estão na base.
 */

export type RecusaFinanceira =
  | 'MOEDAS_DIFERENTES'
  | 'SEM_AUTOR'
  | 'PERIODO_FECHADO'
  | 'SEM_TAXA'
  | 'MONTANTE_INVALIDO';

export class RecusaDoFinanceiro extends Error {
  readonly motivo: RecusaFinanceira;

  constructor(motivo: RecusaFinanceira, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDoFinanceiro';
    this.motivo = motivo;
  }
}

// ── Fronteira 1: uma linha de extracto entra ───────────────────────────────

export interface LinhaDoFicheiro {
  dataValor: string;
  /**
   * ── `string` também, e é por isso que aceita as três formas ───────────
   *
   * A importação é a **única porta por onde entra dado externo**, e a rota
   * validava o montante com `/^-?\d+$/` — que aceita trinta dígitos. Tipada só
   * em `number`, esta interface obrigava a rota a fazer `Number(texto)` antes
   * de chegar aqui, e o `BigInt()` cá dentro já lia um número aproximado: a
   * linha do banco entrava errada, em silêncio.
   *
   * A cura é a mesma do E27, e é melhor do que converter com cuidado: a cadeia
   * validada viaja inteira até ao `BigInt()`, que a lê exacta. **Tira-se a
   * necessidade em vez de gerir o risco.**
   */
  montanteMenor: number | bigint | string;
  moeda?: string;
  referencia?: string;
  descricao?: string;
}

export interface ResultadoDaImportacao {
  importId: string;
  novas: number;
  jaVistas: number;
  /** As que ficaram de fora, com o porquê. O silêncio é que é o defeito. */
  ignoradas: { dataValor: string; montanteMenor: string; porque: string }[];
}

/**
 * Importar um extracto.
 *
 * ── A ordem dentro do dia é o que separa uma defesa de um estrago ─────────
 *
 * A identidade é derivada: conta, data-valor, montante, referência e a **ordem
 * dentro do dia**. Duas linhas legítimas iguais no mesmo dia recebem ordem 1 e
 * 2, e entram as duas. A reimportação do mesmo ficheiro volta a pedir a ordem 1
 * para a primeira, e a base recusa-a.
 *
 * Sem a ordem, o detector de duplicados apagaria factos reais — e uma prova que
 * só reimporta o ficheiro nunca descobriria isso.
 *
 * O `skipDuplicates` é a lição do E24: apanhar a colisão do índice dentro da
 * transacção abortá-la-ia com `25P02`.
 */
export async function importarExtracto(db: ClienteComEscopo, dados: {
  organizationId: string; accountId: string; ficheiro: string;
  importadoPor?: string; linhas: LinhaDoFicheiro[];
}): Promise<ResultadoDaImportacao> {
  const importacao = await db.statementImport.create({
    data: {
      organizationId: dados.organizationId, accountId: dados.accountId,
      ficheiro: dados.ficheiro, importadoPor: dados.importadoPor ?? null,
    },
  });

  // A ordem dentro do dia conta-se por (dia, montante, referência): é o que
  // distingue a segunda linha legítima da reimportação da primeira.
  const contador = new Map<string, number>();
  let novas = 0;
  let jaVistas = 0;
  const ignoradas: ResultadoDaImportacao['ignoradas'] = [];

  for (const l of dados.linhas) {
    const montante = BigInt(l.montanteMenor);
    const chave = `${l.dataValor}|${montante}|${l.referencia ?? ''}`;
    const ordem = (contador.get(chave) ?? 0) + 1;
    contador.set(chave, ordem);

    const r = await db.bankLine.createMany({
      data: [{
        organizationId: dados.organizationId, accountId: dados.accountId,
        importId: importacao.id,
        dataValor: new Date(`${l.dataValor}T00:00:00Z`),
        montanteMenor: montante,
        ...(l.moeda ? { moeda: l.moeda } : {}),
        referencia: l.referencia ?? null,
        ordemNoDia: ordem,
        descricao: l.descricao ?? null,
      }],
      skipDuplicates: true,
    });
    if (r.count === 1) {
      novas += 1;
    } else {
      jaVistas += 1;
      // Dizer QUAIS, e não só quantas: uma lista vazia com um número ao lado
      // continua a ser silêncio para quem tem de decidir o que fazer.
      ignoradas.push({
        dataValor: l.dataValor, montanteMenor: String(montante),
        porque: 'já vista — mesma impressão digital',
      });
    }
  }

  await db.statementImport.update({
    where: { id: importacao.id }, data: { novas, jaVistas },
  });
  return { importId: importacao.id, novas, jaVistas, ignoradas };
}

export function importacoesDaConta(db: ClienteComEscopo, accountId: string) {
  return db.statementImport.findMany({
    where: { accountId }, orderBy: { importadoEm: 'desc' }, take: 50,
    select: {
      id: true, ficheiro: true, novas: true, jaVistas: true,
      importadoPor: true, importadoEm: true,
    },
  });
}

export function contasDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.bankAccount.findMany({
    where: { locationId, arquivadaEm: null }, orderBy: { nome: 'asc' },
    select: { id: true, nome: true, moeda: true },
  });
}

export function criarConta(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; nome: string; moeda?: string;
}) {
  return db.bankAccount.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome.trim(), ...(dados.moeda ? { moeda: dados.moeda } : {}),
    },
  });
}

// ── Fronteira 2: a correspondência, e o conciliado DERIVADO ────────────────

export function sugerirCorrespondencia(db: ClienteComEscopo, dados: {
  organizationId: string; bankLineId: string; movementId: string; semelhanca: number;
}) {
  // Nasce SUGERIDA, sempre — mesmo a 100. Uma correspondência é uma sugestão
  // até alguém a confirmar, e a semelhança perfeita não é confirmação.
  return db.reconciliation.create({
    data: {
      organizationId: dados.organizationId, bankLineId: dados.bankLineId,
      movementId: dados.movementId,
      semelhanca: Math.max(0, Math.min(100, Math.round(dados.semelhanca))),
    },
  });
}

/**
 * Confirmar. **Exige autor**, e o momento é o carimbo do servidor.
 *
 * A base recusa uma confirmação sem autor com `confirmada_tem_autor_e_momento`;
 * esta recusa é a que diz o nome a quem está a usar o produto.
 */
export async function confirmarCorrespondencia(db: ClienteComEscopo, dados: {
  reconciliationId: string; autor: string;
}) {
  if (!dados.autor.trim()) {
    throw new RecusaDoFinanceiro('SEM_AUTOR',
      'quem concilia responde pelo que conciliou — daqui a um ano alguém vai perguntar quem foi');
  }
  return db.reconciliation.update({
    where: { id: dados.reconciliationId },
    data: {
      estado: 'CONFIRMADA', confirmadaPor: dados.autor.trim(), confirmadaEm: new Date(),
    },
  });
}

export interface LinhaConciliada {
  id: string;
  dataValor: Date;
  montanteMenor: bigint;
  moeda: string;
  referencia: string | null;
  descricao: string | null;
  /** DERIVADO: existe correspondência confirmada, logo está conciliado. */
  conciliada: boolean;
  sugestoes: number;
}

/**
 * O extracto, com o conciliado **derivado**.
 *
 * ── Terceira vez que esta lei aparece ─────────────────────────────────────
 *
 * Saldo de stock (E25), saldo de pontos (E27), e agora conciliação. Não há
 * coluna `conciliado`: uma coluna escrita diverge da realidade sem que ninguém
 * a veja divergir, e é exactamente assim que um sistema financeiro passa a
 * mentir com todos os totais certos.
 */
export async function extractoDaConta(
  db: ClienteComEscopo, accountId: string,
): Promise<LinhaConciliada[]> {
  const linhas = await db.bankLine.findMany({
    where: { accountId }, orderBy: [{ dataValor: 'asc' }, { ordemNoDia: 'asc' }],
    select: {
      id: true, dataValor: true, montanteMenor: true, moeda: true,
      referencia: true, descricao: true,
      correspondencias: { select: { estado: true } },
    },
  });
  return linhas.map((l) => ({
    id: l.id, dataValor: l.dataValor, montanteMenor: l.montanteMenor,
    moeda: l.moeda, referencia: l.referencia, descricao: l.descricao,
    conciliada: l.correspondencias.some((c) => c.estado === 'CONFIRMADA'),
    sugestoes: l.correspondencias.filter((c) => c.estado === 'SUGERIDA').length,
  }));
}

export function correspondenciasDaConta(db: ClienteComEscopo, accountId: string) {
  return db.reconciliation.findMany({
    where: { linha: { accountId } }, orderBy: { criadaEm: 'desc' },
    select: {
      id: true, estado: true, semelhanca: true, confirmadaPor: true, confirmadaEm: true,
      linha: { select: { id: true, dataValor: true, montanteMenor: true, referencia: true } },
      movimento: {
        select: {
          id: true, conceito: true, montanteMenor: true,
          ocorrenciaEm: true, valorEm: true, origemTipo: true, origemId: true,
        },
      },
    },
  });
}

// ── Fronteira 3: as TRÊS datas ─────────────────────────────────────────────

export function registarMovimento(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string;
  tipo: 'RECEITA' | 'DESPESA' | 'DEVOLUCAO' | 'TAXA' | 'AJUSTE';
  /** `string` pela mesma razão do `LinhaDoFicheiro`: a cadeia validada na
   *  fronteira viaja inteira até ao `BigInt()`, sem passar por `Number`. */
  conceito: string; montanteMenor: number | bigint | string; moeda?: string;
  ocorrenciaEm: string; valorEm: string;
  origemTipo?: string; origemId?: string; centroDeCusto?: string;
  ajustaPeriodoId?: string; motivo?: string;
}) {
  if (typeof dados.montanteMenor === 'number' && !Number.isInteger(dados.montanteMenor)) {
    throw new RecusaDoFinanceiro('MONTANTE_INVALIDO',
      'o montante é inteiro em unidade menor — cêntimos, não euros com vírgula');
  }
  return db.financialMovement.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      tipo: dados.tipo, conceito: dados.conceito.trim(),
      montanteMenor: BigInt(dados.montanteMenor),
      ...(dados.moeda ? { moeda: dados.moeda } : {}),
      ocorrenciaEm: new Date(`${dados.ocorrenciaEm}T00:00:00Z`),
      valorEm: new Date(`${dados.valorEm}T00:00:00Z`),
      origemTipo: dados.origemTipo ?? null,
      origemId: dados.origemId ?? null,
      centroDeCusto: dados.centroDeCusto ?? null,
      ajustaPeriodoId: dados.ajustaPeriodoId ?? null,
      motivo: dados.motivo ?? null,
    },
  });
}

export interface LinhaDeRelatorio {
  movimentoId: string;
  conceito: string;
  tipo: string;
  montanteMenor: bigint;
  moeda: string;
  /** A data que ESTE relatório usa. */
  data: Date;
  /** Para descer à origem. Um total que não desce à origem é uma opinião. */
  origemTipo: string | null;
  origemId: string | null;
}

/**
 * CAIXA — pela data-valor. «Quanto entrou em Setembro.»
 *
 * Uma devolução a 3 de Outubro de uma venda de 28 de Setembro aparece **aqui em
 * Outubro** e no resultado em Setembro. As duas leituras estão certas, e é por
 * isso que as datas não colapsam.
 */
export async function caixaDoPeriodo(db: ClienteComEscopo, dados: {
  locationId: string; de: string; ate: string;
}): Promise<LinhaDeRelatorio[]> {
  const linhas = await db.financialMovement.findMany({
    where: {
      locationId: dados.locationId,
      valorEm: {
        gte: new Date(`${dados.de}T00:00:00Z`), lte: new Date(`${dados.ate}T00:00:00Z`),
      },
    },
    orderBy: { valorEm: 'asc' },
    select: {
      id: true, conceito: true, tipo: true, montanteMenor: true, moeda: true,
      valorEm: true, origemTipo: true, origemId: true,
    },
  });
  return linhas.map((l) => ({
    movimentoId: l.id, conceito: l.conceito, tipo: l.tipo,
    montanteMenor: l.montanteMenor, moeda: l.moeda, data: l.valorEm,
    origemTipo: l.origemTipo, origemId: l.origemId,
  }));
}

/** RESULTADO — pela ocorrência. «Quanto vendi em Setembro.» */
export async function resultadoDoPeriodo(db: ClienteComEscopo, dados: {
  locationId: string; de: string; ate: string;
}): Promise<LinhaDeRelatorio[]> {
  const linhas = await db.financialMovement.findMany({
    where: {
      locationId: dados.locationId,
      ocorrenciaEm: {
        gte: new Date(`${dados.de}T00:00:00Z`), lte: new Date(`${dados.ate}T00:00:00Z`),
      },
    },
    orderBy: { ocorrenciaEm: 'asc' },
    select: {
      id: true, conceito: true, tipo: true, montanteMenor: true, moeda: true,
      ocorrenciaEm: true, origemTipo: true, origemId: true,
    },
  });
  return linhas.map((l) => ({
    movimentoId: l.id, conceito: l.conceito, tipo: l.tipo,
    montanteMenor: l.montanteMenor, moeda: l.moeda, data: l.ocorrenciaEm,
    origemTipo: l.origemTipo, origemId: l.origemId,
  }));
}

// ── Fronteira 5: moedas não se somam ───────────────────────────────────────

export interface TotalPorMoeda {
  moeda: string;
  totalMenor: bigint;
  linhas: number;
}

/**
 * Totalizar — **agrupando por moeda**, nunca somando através delas.
 *
 * Um total em euros que veio de dólares sem dizer a que câmbio é uma opinião
 * com aspecto de facto. Aqui não há conversão nenhuma: há grupos.
 */
export function totalizar(linhas: LinhaDeRelatorio[]): TotalPorMoeda[] {
  const por = new Map<string, { total: bigint; linhas: number }>();
  for (const l of linhas) {
    const actual = por.get(l.moeda) ?? { total: 0n, linhas: 0 };
    // Devoluções e despesas saem; receitas entram. O sinal vem do TIPO.
    const sinal = l.tipo === 'RECEITA' ? 1n : -1n;
    por.set(l.moeda, { total: actual.total + sinal * l.montanteMenor, linhas: actual.linhas + 1 });
  }
  return [...por.entries()]
    .map(([moeda, v]) => ({ moeda, totalMenor: v.total, linhas: v.linhas }))
    .sort((a, b) => a.moeda.localeCompare(b.moeda));
}

export interface Convertido {
  totalMenor: bigint;
  moeda: string;
  fonte: string;
  emVigorDe: Date;
}

/**
 * Converter — **só com fonte e data**, e recusa sem taxa.
 *
 * Sem taxa carimbada, não se converte: adivinhar um câmbio é a mesma família do
 * fuso e da densidade. Recusar é a resposta certa.
 */
export async function converterTotal(db: ClienteComEscopo, dados: {
  organizationId: string; total: TotalPorMoeda; para: string; em: string;
}): Promise<Convertido> {
  if (dados.total.moeda === dados.para) {
    throw new RecusaDoFinanceiro('SEM_TAXA', 'converter para a mesma moeda não é conversão');
  }
  const taxa = await db.exchangeRate.findFirst({
    where: {
      organizationId: dados.organizationId, de: dados.total.moeda, para: dados.para,
      emVigorDe: { lte: new Date(`${dados.em}T00:00:00Z`) },
    },
    orderBy: { emVigorDe: 'desc' },
    select: { taxaMicro: true, fonte: true, emVigorDe: true },
  });
  if (!taxa) {
    throw new RecusaDoFinanceiro('SEM_TAXA',
      `não há taxa de ${dados.total.moeda} para ${dados.para} até ${dados.em} — e adivinhar é o defeito`);
  }
  return {
    // Inteiro de ponta a ponta: multiplica-se antes de dividir.
    totalMenor: (dados.total.totalMenor * taxa.taxaMicro) / 1_000_000n,
    moeda: dados.para, fonte: taxa.fonte, emVigorDe: taxa.emVigorDe,
  };
}

// ── Fronteira 4: um período fecha ──────────────────────────────────────────

export function criarPeriodo(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; de: string; ate: string;
}) {
  return db.accountingPeriod.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      de: new Date(`${dados.de}T00:00:00Z`), ate: new Date(`${dados.ate}T00:00:00Z`),
    },
  });
}

/** Fechar — **proíbe**, e não copia totais para lado nenhum. */
export async function fecharPeriodo(db: ClienteComEscopo, dados: {
  organizationId: string; periodId: string; autor: string;
}) {
  if (!dados.autor.trim()) throw new RecusaDoFinanceiro('SEM_AUTOR', 'fechar tem autor');
  await db.periodEvent.create({
    data: {
      organizationId: dados.organizationId, periodId: dados.periodId,
      tipo: 'FECHO', autor: dados.autor.trim(),
    },
  });
  return db.accountingPeriod.update({
    where: { id: dados.periodId }, data: { estado: 'FECHADO' },
  });
}

/** Reabrir — acontecimento com autor **e motivo**. Nunca um interruptor. */
export async function reabrirPeriodo(db: ClienteComEscopo, dados: {
  organizationId: string; periodId: string; autor: string; motivo: string;
}) {
  if (!dados.motivo.trim()) {
    throw new RecusaDoFinanceiro('SEM_AUTOR',
      'reabrir sem motivo é um interruptor com outro nome');
  }
  await db.periodEvent.create({
    data: {
      organizationId: dados.organizationId, periodId: dados.periodId,
      tipo: 'REABERTURA', autor: dados.autor.trim(), motivo: dados.motivo.trim(),
    },
  });
  return db.accountingPeriod.update({
    where: { id: dados.periodId }, data: { estado: 'ABERTO' },
  });
}

export function periodosDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.accountingPeriod.findMany({
    where: { locationId }, orderBy: { de: 'desc' },
    select: {
      id: true, de: true, ate: true, estado: true,
      acontecimentos: {
        orderBy: { momento: 'desc' },
        select: { id: true, tipo: true, autor: true, motivo: true, momento: true },
      },
      ajustes: { select: { id: true } },
    },
  });
}

/** Os centros de custo com o que gastaram, para a FIN-007. */
export async function centrosDeCusto(db: ClienteComEscopo, dados: {
  locationId: string; de: string; ate: string;
}) {
  const linhas = await db.financialMovement.groupBy({
    by: ['centroDeCusto', 'moeda'],
    where: {
      locationId: dados.locationId, tipo: 'DESPESA',
      ocorrenciaEm: {
        gte: new Date(`${dados.de}T00:00:00Z`), lte: new Date(`${dados.ate}T00:00:00Z`),
      },
    },
    _sum: { montanteMenor: true },
    _count: { _all: true },
  });
  return linhas.map((l) => ({
    centro: l.centroDeCusto ?? '—',
    moeda: l.moeda,
    totalMenor: l._sum.montanteMenor ?? 0n,
    linhas: l._count._all,
  // ── O sinal calcula-se em BigInt, e não se converte nada ──────────────
  //
  // `Number(b - a)` era seguro — a subtracção é exacta e só o sinal conta — mas
  // seguro-com-explicação é pior do que desnecessário. Um `Number()` sobre um
  // BigInt neste ficheiro é uma linha que alguém vai copiar para onde não é
  // seguro, e a guarda do dinheiro deixa de poder acusar sem excepções.
  })).sort((a, b) => (b.totalMenor > a.totalMenor ? 1
    : b.totalMenor < a.totalMenor ? -1 : 0));
}
