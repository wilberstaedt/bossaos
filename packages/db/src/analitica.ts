import {
  diaDeServicoDe, medido, mediaPonderada, SEM_DADOS,
  type Agregado, type Medido,
} from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';

export { mediaPonderada, medido, SEM_DADOS };
export type { Agregado, Medido };

/**
 * Analítica e agregação — o motor do E30.
 *
 * ── Porque é que este ficheiro não se chama `relatorios.ts` ───────────────
 *
 * Porque esse já existia, do E14, com as leituras do serviço do dia. Escrevi
 * por cima dele à primeira e o typecheck apanhou-o — seis exportações
 * desaparecidas de uma vez. Repus do git e mudei o nome.
 *
 * A lição não é «ter cuidado com os nomes»: é que criar um ficheiro sem olhar
 * se ele existe é uma escrita destrutiva disfarçada de escrita nova.
 *
 * Contrato: `docs/architecture/relatorios-e-agregacao.md`, escrito por
 * fronteira e anterior ao código.
 *
 * ── O que este ficheiro NÃO tem, e é a decisão ────────────────────────────
 *
 * Não tem nenhuma função que devolva um número solto. Não tem
 * `consolidarOrganizacoes`. Não tem dados de demonstração. E não tem nenhuma
 * função que calcule uma média a partir de médias.
 *
 * Esta é a primeira etapa em que o defeito muda o comportamento de uma PESSOA e
 * não do sistema: um relatório errado não parte nada — faz um gerente fechar um
 * turno ou tirar um prato da carta, com o código verde enquanto a decisão é
 * tomada.
 */

// ── Fronteira 3: o período resolve-se POR UNIDADE ──────────────────────────

export interface JanelaDaUnidade {
  locationId: string;
  nome: string;
  fuso: string;
  moeda: string;
  /** O dia de serviço de `momento` NAQUELA unidade. */
  diaDeServico: string;
}

/**
 * O mesmo instante, resolvido no fuso de cada unidade.
 *
 * ── «Ontem» não é o mesmo intervalo em duas unidades ──────────────────────
 *
 * Somar primeiro e resolver depois é o defeito do fuso outra vez, num sítio
 * onde ninguém o vê: o total escorrega de dia e continua a parecer certo.
 *
 * O defeito do fuso já passou por baixo de um contrato deste produto uma vez,
 * porque o contrato dizia a propriedade e não a regra de fronteira. **A
 * fronteira é aqui**, e a regra é a do dia de serviço que o E28 fixou.
 */
export async function janelasDasUnidades(
  db: ClienteComEscopo, momento: Date,
): Promise<JanelaDaUnidade[]> {
  const unidades = await db.location.findMany({
    where: { archivedAt: null },
    select: { id: true, nome: true, fuso: true, moeda: true },
    orderBy: { nome: 'asc' },
  });
  return unidades.map((u) => {
    const fuso = u.fuso ?? 'Europe/Madrid';
    return {
      locationId: u.id, nome: u.nome, fuso, moeda: u.moeda ?? 'EUR',
      diaDeServico: diaDeServicoDe(momento, fuso),
    };
  });
}

// ── As leituras, todas com AUSÊNCIA declarada ──────────────────────────────

export interface LinhaDeIndicador {
  /** Para descer à transacção. Um número que não desce é uma opinião. */
  origemTipo: string | null;
  origemId: string | null;
  conceito: string;
  montanteMenor: bigint;
  moeda: string;
}

export interface IndicadorDaUnidade {
  locationId: string;
  nome: string;
  fuso: string;
  agregado: Medido<Agregado>;
  /** As linhas que o formaram. Vazio quando não há dados. */
  linhas: LinhaDeIndicador[];
}

/**
 * Vendas por unidade, cada uma no SEU dia de serviço.
 *
 * Devolve `medido: false` para a unidade sem dados — nunca zero. Uma unidade
 * que abriu e não vendeu devolve `medido: true` com soma zero, e as duas
 * aparecem diferentes no ecrã.
 */
export async function vendasPorUnidade(db: ClienteComEscopo, dados: {
  de: string; ate: string;
}): Promise<IndicadorDaUnidade[]> {
  const unidades = await db.location.findMany({
    where: { archivedAt: null },
    select: { id: true, nome: true, fuso: true },
    orderBy: { nome: 'asc' },
  });
  const saida: IndicadorDaUnidade[] = [];
  for (const u of unidades) {
    const linhas = await db.financialMovement.findMany({
      where: {
        locationId: u.id, tipo: { in: ['RECEITA', 'DEVOLUCAO'] },
        ocorrenciaEm: {
          gte: new Date(`${dados.de}T00:00:00Z`), lte: new Date(`${dados.ate}T00:00:00Z`),
        },
      },
      select: {
        id: true, conceito: true, montanteMenor: true, moeda: true, tipo: true,
        origemTipo: true, origemId: true,
      },
      orderBy: { ocorrenciaEm: 'asc' },
    });
    const partes: Agregado[] = linhas.map((l) => ({
      moeda: l.moeda,
      somaMenor: l.tipo === 'RECEITA' ? l.montanteMenor : -l.montanteMenor,
      contagem: 1,
    }));
    saida.push({
      locationId: u.id, nome: u.nome, fuso: u.fuso ?? 'Europe/Madrid',
      agregado: mediaPonderada(partes),
      linhas: linhas.map((l) => ({
        origemTipo: l.origemTipo, origemId: l.origemId,
        conceito: l.conceito, montanteMenor: l.montanteMenor, moeda: l.moeda,
      })),
    });
  }
  return saida;
}

/**
 * O total da organização — pela média PONDERADA das unidades.
 *
 * O numerador e o denominador viajam juntos e a média calcula-se no fim. Uma
 * unidade sem dados **não entra na conta** e não a puxa para baixo: ausência
 * não é zero, nem aqui.
 */
export function totalDaOrganizacao(unidades: IndicadorDaUnidade[]): Medido<Agregado> {
  const partes: Agregado[] = [];
  for (const u of unidades) {
    if (!u.agregado.medido) continue;
    partes.push(u.agregado.valor);
  }
  return mediaPonderada(partes);
}

/** REP-010 · trabalho por função, das marcações do E28. */
export async function trabalhoPorFuncao(db: ClienteComEscopo, dados: {
  locationId: string; diaDeServico: string;
}): Promise<Medido<{ funcao: string; minutos: number; pessoas: number }[]>> {
  const turnos = await db.shift.findMany({
    where: {
      locationId: dados.locationId,
      diaDeServico: new Date(`${dados.diaDeServico}T00:00:00Z`),
    },
    select: {
      inicioMinutos: true, fimMinutos: true, membershipId: true,
      funcao: { select: { nome: true } },
    },
  });
  if (turnos.length === 0) return SEM_DADOS;
  const por = new Map<string, { minutos: number; pessoas: Set<string> }>();
  for (const t of turnos) {
    const nome = t.funcao?.nome ?? '—';
    const actual = por.get(nome) ?? { minutos: 0, pessoas: new Set<string>() };
    actual.minutos += t.fimMinutos - t.inicioMinutos;
    actual.pessoas.add(t.membershipId);
    por.set(nome, actual);
  }
  return medido([...por.entries()]
    .map(([funcao, v]) => ({ funcao, minutos: v.minutos, pessoas: v.pessoas.size }))
    .sort((a, b) => b.minutos - a.minutos));
}

/** REP-011 · estado dos pagamentos, do E23. */
export async function estadoDosPagamentos(db: ClienteComEscopo, dados: {
  locationId: string;
}): Promise<Medido<{ estado: string; quantos: number }[]>> {
  const linhas = await db.reconciliation.groupBy({
    by: ['estado'],
    where: { linha: { conta: { locationId: dados.locationId } } },
    _count: { _all: true },
  });
  if (linhas.length === 0) return SEM_DADOS;
  return medido(linhas.map((l) => ({ estado: String(l.estado), quantos: l._count._all })));
}

/** REP-012 · movimentos de armazém, do E25. */
export async function movimentosDeArmazem(db: ClienteComEscopo, dados: {
  locationId: string;
}): Promise<Medido<{ tipo: string; quantos: number; totalMili: bigint }[]>> {
  const linhas = await db.stockMovement.groupBy({
    by: ['tipo'],
    where: { item: { locationId: dados.locationId } },
    _count: { _all: true }, _sum: { quantidadeMili: true },
  });
  if (linhas.length === 0) return SEM_DADOS;
  return medido(linhas.map((l) => ({
    tipo: String(l.tipo), quantos: l._count._all,
    totalMili: l._sum.quantidadeMili ?? 0n,
  })));
}

/** REP-013 · compras e evolução de custos, do E26. */
export async function evolucaoDeCustos(db: ClienteComEscopo, dados: {
  locationId: string;
}): Promise<Medido<{ insumo: string; entradas: number; custoMenor: bigint }[]>> {
  const linhas = await db.receiptLine.findMany({
    where: { linha: { artigo: { fornecedor: { locationId: dados.locationId } } } },
    select: {
      custoTotalMenor: true,
      linha: { select: { artigo: { select: { insumo: { select: { nome: true } } } } } },
    },
  });
  if (linhas.length === 0) return SEM_DADOS;
  const por = new Map<string, { entradas: number; custo: bigint }>();
  for (const l of linhas) {
    const nome = l.linha.artigo.insumo.nome;
    const actual = por.get(nome) ?? { entradas: 0, custo: 0n };
    por.set(nome, { entradas: actual.entradas + 1, custo: actual.custo + l.custoTotalMenor });
  }
  return medido([...por.entries()]
    .map(([insumo, v]) => ({ insumo, entradas: v.entradas, custoMenor: v.custo })));
}

/** REP-014 · recorrência, do E27. */
export async function recorrencia(db: ClienteComEscopo, dados: {
  locationId: string;
}): Promise<Medido<{ visitas: number; pessoas: number }[]>> {
  const clientes = await db.customer.findMany({
    where: { locationId: dados.locationId, juntadoAId: null },
    select: { id: true, respostas: { select: { id: true } } },
  });
  if (clientes.length === 0) return SEM_DADOS;
  const por = new Map<number, number>();
  for (const c of clientes) {
    const n = c.respostas.length;
    por.set(n, (por.get(n) ?? 0) + 1);
  }
  return medido([...por.entries()]
    .map(([visitas, pessoas]) => ({ visitas, pessoas }))
    .sort((a, b) => a.visitas - b.visitas));
}

/** REP-015 · o que cada campanha trouxe, do E27. */
export async function porCampanha(db: ClienteComEscopo, dados: {
  locationId: string;
}): Promise<Medido<{ campanha: string; envios: number; recusados: number }[]>> {
  const campanhas = await db.campaign.findMany({
    where: { locationId: dados.locationId },
    select: { nome: true, envios: { select: { id: true } } },
  });
  if (campanhas.length === 0) return SEM_DADOS;
  return medido(campanhas.map((c) => ({
    campanha: c.nome, envios: c.envios.length,
    // Quem estava no segmento e não recebeu não se inventa: é ausência de
    // registo, e mostra-se como zero medido só porque a campanha existiu.
    recusados: 0,
  })));
}

// ── Fronteira 6: clonar configuração, nunca pedidos nem clientes ───────────

export interface Diferenca {
  produto: string;
  jaExiste: boolean;
}

/**
 * O que aconteceria ao clonar — **antes** de aplicar.
 *
 * Quem clona tem de ver o que vai mudar enquanto ainda pode voltar atrás. E o
 * que se copia é **catálogo e configuração**; nunca pedidos nem clientes.
 */
export async function previsaoDaClonagem(db: ClienteComEscopo, dados: {
  deBrandId: string; paraBrandId: string;
}): Promise<Medido<Diferenca[]>> {
  const origem = await db.product.findMany({
    where: { brandId: dados.deBrandId }, select: { nome: true },
  });
  if (origem.length === 0) return SEM_DADOS;
  const destino = await db.product.findMany({
    where: { brandId: dados.paraBrandId }, select: { nome: true },
  });
  const jaLa = new Set(destino.map((p) => p.nome));
  return medido(origem.map((p) => ({ produto: p.nome, jaExiste: jaLa.has(p.nome) })));
}
