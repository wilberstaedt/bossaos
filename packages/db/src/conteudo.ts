import type { ClienteComEscopo } from './escopo.ts';
import {
  coberturaPorIdioma, decidirDescarregamento, estadoDaTraducao, expiraEm, impressaoDoTexto,
  linhasParaGravar, neutralizarCampo, paraCsv, preverImportacao, resolverTexto,
  type Accao, type Concessao, type CoberturaDeIdioma, type ColunasMapeadas,
  type DecisaoDeDescarregamento, type Estrategia, type EstadoDaTraducao,
  type IdiomaDeConteudo, type Previa, type TextoResolvido, type Traducao,
} from '@bossaos/domain';

/**
 * Traduções, importação e exportação — do lado da base.
 *
 * Os três partilham um ficheiro porque partilham a mesma pergunta: **o que é que
 * este conteúdo afirma, e quem responde por isso**. Uma tradução afirma o texto,
 * uma importação afirma que estas linhas são estes produtos, e uma exportação
 * afirma que quem descarrega tinha direito no momento em que descarregou.
 */

// ── Traduções ───────────────────────────────────────────────────────────────

/**
 * A impressão do texto de origem DESTE produto, agora.
 *
 * Só nome e descrição. **Não entra o preço**, e é essa a correcção que a
 * substituição de `origemVersao` trouxe: mudar o preço não torna a tradução
 * inglesa errada, e marcá-la como obsoleta por isso é o falso positivo que
 * ensina toda a gente a ignorar o aviso.
 */
export async function impressaoDoProduto(
  db: ClienteComEscopo,
  productId: string,
): Promise<string | null> {
  const p = await db.product.findFirst({
    where: { id: productId }, select: { nome: true, descricao: true },
  });
  return p ? impressaoDoTexto([p.nome, p.descricao]) : null;
}

export interface LinhaDeTraducao {
  idioma: IdiomaDeConteudo;
  nome: string;
  descricao: string | null;
  estado: EstadoDaTraducao;
  revistoPor: string | null;
  revistoEm: Date | null;
}

/** As traduções deste produto, cada uma com o seu estado calculado. */
export async function traducoesDoProduto(
  db: ClienteComEscopo,
  productId: string,
): Promise<{ impressao: string; linhas: readonly LinhaDeTraducao[] } | null> {
  const p = await db.product.findFirst({
    where: { id: productId },
    select: {
      nome: true, descricao: true,
      traducoes: {
        select: {
          locale: true, nome: true, descricao: true,
          impressaoDaOrigem: true, revistoPor: true, revistoEm: true,
        },
      },
    },
  });
  if (!p) return null;
  const impressao = impressaoDoTexto([p.nome, p.descricao]);
  return {
    impressao,
    linhas: p.traducoes.map((t) => ({
      idioma: t.locale as IdiomaDeConteudo,
      nome: t.nome,
      descricao: t.descricao,
      estado: estadoDaTraducao(
        {
          idioma: t.locale as IdiomaDeConteudo, nome: t.nome,
          impressaoDaOrigem: t.impressaoDaOrigem, revistaPor: t.revistoPor,
        },
        impressao,
      ),
      revistoPor: t.revistoPor,
      revistoEm: t.revistoEm,
    })),
  };
}

/**
 * Grava uma tradução.
 *
 * **A impressão é lida agora, da origem** — nunca vem do formulário. Se viesse,
 * quem quisesse silenciar o aviso de obsolescência mandava a impressão actual
 * com um texto velho, e a tradução ficava "revista" sobre um original que já não
 * existe.
 *
 * `revistoPor` é quem está autenticado, pela mesma razão da ficha de alérgenos.
 */
export async function guardarTraducao(
  db: ClienteComEscopo,
  organizationId: string,
  productId: string,
  idioma: IdiomaDeConteudo,
  dados: { nome: string; descricao?: string | null; revista: boolean; autor: string },
): Promise<{ ok: true; estado: EstadoDaTraducao } | { ok: false; erro: 'produto_ausente' }> {
  const impressao = await impressaoDoProduto(db, productId);
  if (impressao === null) return { ok: false, erro: 'produto_ausente' };

  const revisao = dados.revista
    ? { revistoPor: dados.autor, revistoEm: new Date() }
    : { revistoPor: null, revistoEm: null };

  await db.productTranslation.upsert({
    where: {
      organizationId_productId_locale: { organizationId, productId, locale: idioma },
    },
    create: {
      organizationId, productId, locale: idioma,
      nome: dados.nome, descricao: dados.descricao ?? null,
      impressaoDaOrigem: impressao, ...revisao,
    },
    update: {
      nome: dados.nome, descricao: dados.descricao ?? null,
      impressaoDaOrigem: impressao, ...revisao,
    },
  });
  return { ok: true, estado: dados.revista ? 'revisada' : 'pendente' };
}

/** O texto a mostrar, com a proveniência. Usado pela carta publicada e pelo painel. */
export async function textoDoProduto(
  db: ClienteComEscopo,
  productId: string,
  idiomaPedido: IdiomaDeConteudo,
  idiomaPrincipal: IdiomaDeConteudo,
  aceitarPorRever = false,
): Promise<TextoResolvido | null> {
  const p = await db.product.findFirst({
    where: { id: productId },
    select: {
      nome: true, descricao: true,
      traducoes: {
        select: { locale: true, nome: true, descricao: true, impressaoDaOrigem: true, revistoPor: true },
      },
    },
  });
  if (!p) return null;
  const traducoes: Traducao[] = p.traducoes.map((t) => ({
    idioma: t.locale as IdiomaDeConteudo, nome: t.nome, descricao: t.descricao,
    impressaoDaOrigem: t.impressaoDaOrigem, revistaPor: t.revistoPor,
  }));
  return resolverTexto({
    idiomaPedido, idiomaPrincipal,
    origem: { nome: p.nome, descricao: p.descricao },
    traducoes, impressaoActual: impressaoDoTexto([p.nome, p.descricao]),
    ...(aceitarPorRever ? { aceitarPorRever: true } : {}),
  });
}

/** A cobertura por idioma que o CAT-024 mostra. */
export async function coberturaDeTraducoes(
  db: ClienteComEscopo,
  brandId?: string,
): Promise<readonly CoberturaDeIdioma[]> {
  const produtos = await db.product.findMany({
    where: { archivedAt: null, ...(brandId ? { brandId } : {}) },
    select: {
      nome: true, descricao: true,
      traducoes: { select: { locale: true, nome: true, impressaoDaOrigem: true, revistoPor: true } },
    },
  });
  return coberturaPorIdioma(produtos.map((p) => ({
    impressao: impressaoDoTexto([p.nome, p.descricao]),
    traducoes: p.traducoes.map((t) => ({
      idioma: t.locale as IdiomaDeConteudo, nome: t.nome,
      impressaoDaOrigem: t.impressaoDaOrigem, revistaPor: t.revistoPor,
    })),
  })));
}

// ── Importação ──────────────────────────────────────────────────────────────

const ACCAO_DA_LINHA = {
  criar: 'CRIAR', actualizar: 'ACTUALIZAR', ignorar: 'IGNORAR', erro: 'ERRO',
} as const;

/**
 * Guarda a prévia. **Não escreve produtos.**
 *
 * As linhas ficam na base antes de confirmar, e a confirmação lê-as daqui — não
 * volta a ler o ficheiro. É a diferença entre "o que a pessoa aprovou" e "o que
 * o ficheiro diz agora": entre a prévia e o clique, o catálogo pode ter mudado,
 * e o que ela aprovou tem de ser o que acontece.
 */
export async function guardarPrevia(
  db: ClienteComEscopo,
  organizationId: string,
  entrada: {
    brandId: string; ficheiroNome: string; separador: string;
    colunas: ColunasMapeadas; estrategia: Estrategia; autor: string;
    cabecalho: readonly string[]; linhas: ReadonlyArray<readonly string[]>;
  },
): Promise<{ jobId: string; previa: Previa }> {
  const existentes = await db.product.findMany({
    where: { brandId: entrada.brandId, archivedAt: null },
    select: { id: true, sku: true, nome: true },
  });
  const comPreco = await Promise.all(existentes.map(async (e) => {
    const base = await db.priceRule.findFirst({
      where: { productId: e.id, locationId: null, canal: null },
      select: { montanteMenor: true, moeda: true },
    });
    return {
      productId: e.id, sku: e.sku, nome: e.nome,
      precoMenor: base?.montanteMenor ?? null, moeda: base?.moeda ?? null,
    };
  }));

  const previa = preverImportacao(
    entrada.linhas, entrada.cabecalho, entrada.colunas, entrada.estrategia, comPreco,
  );

  const job = await db.importJob.create({
    data: {
      organizationId, brandId: entrada.brandId, ficheiroNome: entrada.ficheiroNome,
      separador: entrada.separador, mapeamento: entrada.colunas as unknown as object,
      estrategia: entrada.estrategia, criadoPor: entrada.autor,
      resumo: previa.resumo as unknown as object,
    },
    select: { id: true },
  });
  await db.importRow.createMany({
    data: previa.linhas.map((l) => ({
      organizationId, jobId: job.id, linha: l.linha,
      accao: ACCAO_DA_LINHA[l.accao],
      ...(l.erro ? { erro: l.erro } : {}),
      dados: l as unknown as object,
      ...(l.productId ? { productId: l.productId } : {}),
    })),
  });
  return { jobId: job.id, previa };
}

/**
 * Confirma uma importação: escreve o que a prévia dizia, e mais nada.
 *
 * Corre dentro da transacção que o `comEscopo` abriu — o lote aprovado entra
 * inteiro ou não entra.
 */
export async function confirmarImportacao(
  db: ClienteComEscopo,
  organizationId: string,
  jobId: string,
  autor: string,
): Promise<{ ok: true; criados: number; actualizados: number } | { ok: false; erro: string }> {
  const job = await db.importJob.findFirst({
    where: { id: jobId },
    select: { id: true, brandId: true, estado: true },
  });
  if (!job) return { ok: false, erro: 'nao_encontrado' };
  // Confirmar duas vezes criaria tudo outra vez. O estado é o portão.
  if (job.estado !== 'PREVISTA') return { ok: false, erro: 'ja_confirmada' };

  const linhas = await db.importRow.findMany({
    where: { jobId, accao: { in: ['CRIAR', 'ACTUALIZAR'] } },
    select: { id: true, accao: true, dados: true, productId: true },
    orderBy: { linha: 'asc' },
  });

  let criados = 0;
  let actualizados = 0;
  for (const l of linhas) {
    const d = l.dados as unknown as { nome: string; sku: string | null; precoMenor: number | null; moeda: string | null };
    if (l.accao === 'CRIAR') {
      const p = await db.product.create({
        data: {
          organizationId, brandId: job.brandId, nome: d.nome,
          ...(d.sku ? { sku: d.sku } : {}),
        },
        select: { id: true },
      });
      if (d.precoMenor !== null && d.moeda !== null) {
        await db.priceRule.create({
          data: { organizationId, productId: p.id, montanteMenor: d.precoMenor, moeda: d.moeda },
        });
      }
      await db.importRow.update({ where: { id: l.id }, data: { productId: p.id } });
      criados++;
      continue;
    }
    if (!l.productId) continue;
    await db.product.updateMany({ where: { id: l.productId }, data: { nome: d.nome } });
    if (d.precoMenor !== null && d.moeda !== null) {
      const base = await db.priceRule.findFirst({
        where: { productId: l.productId, locationId: null, canal: null }, select: { id: true },
      });
      if (base) {
        await db.priceRule.update({
          where: { id: base.id }, data: { montanteMenor: d.precoMenor, moeda: d.moeda },
        });
      } else {
        await db.priceRule.create({
          data: { organizationId, productId: l.productId, montanteMenor: d.precoMenor, moeda: d.moeda },
        });
      }
    }
    actualizados++;
  }

  await db.importJob.update({
    where: { id: jobId },
    data: { estado: 'CONFIRMADA', confirmadoPor: autor, confirmadoEm: new Date() },
  });
  return { ok: true, criados, actualizados };
}

export { linhasParaGravar };

// ── Exportação ──────────────────────────────────────────────────────────────

/**
 * O CSV do catálogo, **com os campos neutralizados**.
 *
 * `paraCsv` neutraliza por omissão; o parâmetro que a desliga existe só para o
 * controlo negativo, e não há aqui nenhum caminho que lhe chegue.
 */
export async function catalogoParaCsv(
  db: ClienteComEscopo,
  brandId?: string,
): Promise<string> {
  const produtos = await db.product.findMany({
    where: { archivedAt: null, ...(brandId ? { brandId } : {}) },
    select: {
      nome: true, sku: true, descricao: true, estado: true,
      category: { select: { nome: true } },
      precos: {
        where: { locationId: null, canal: null },
        select: { montanteMenor: true, moeda: true }, take: 1,
      },
    },
    orderBy: { nome: 'asc' },
  });
  return paraCsv([
    ['nome', 'sku', 'descricao', 'categoria', 'preco_menor', 'moeda', 'estado'],
    ...produtos.map((p) => [
      p.nome, p.sku ?? '', p.descricao ?? '', p.category?.nome ?? '',
      p.precos[0] ? String(p.precos[0].montanteMenor) : '',
      p.precos[0]?.moeda ?? '', p.estado,
    ]),
  ]);
}

export { neutralizarCampo };

/** Regista o pedido de exportação. O ficheiro guarda-se pela porta de média. */
export async function pedirExportacao(
  db: ClienteComEscopo,
  organizationId: string,
  entrada: { actorId: string; accaoExigida: Accao; formato: string; chave?: string; bytes?: number },
  agora = new Date(),
) {
  return db.exportJob.create({
    data: {
      organizationId, actorId: entrada.actorId, accaoExigida: entrada.accaoExigida,
      formato: entrada.formato, expiraEm: expiraEm(agora),
      ...(entrada.chave ? { chave: entrada.chave } : {}),
      ...(entrada.bytes !== undefined ? { bytes: entrada.bytes } : {}),
    },
    select: { id: true, expiraEm: true },
  });
}

/**
 * O segundo ponto de verificação, com as concessões de AGORA.
 *
 * Quem chama tem de as ler outra vez da base — passar as que trouxe do pedido
 * anterior seria repetir a primeira verificação com outro nome.
 */
export async function podeDescarregar(
  db: ClienteComEscopo,
  organizationId: string,
  exportId: string,
  actorId: string,
  concessoes: readonly Concessao[],
  agora = new Date(),
): Promise<DecisaoDeDescarregamento & { chave?: string }> {
  const linha = await db.exportJob.findFirst({
    where: { id: exportId },
    select: {
      id: true, organizationId: true, actorId: true, accaoExigida: true,
      createdAt: true, expiraEm: true, revogadaEm: true, chave: true,
    },
  });
  // A política de linha já esconde o que é de outro inquilino; ausência sai como
  // ausência e não como "sem permissão".
  if (!linha) return { ok: false, erro: 'outra_organizacao' };

  const decisao = decidirDescarregamento({
    exportacao: {
      id: linha.id, organizationId: linha.organizationId, actorId: linha.actorId,
      accaoExigida: linha.accaoExigida as Accao,
      criadaEm: linha.createdAt, expiraEm: linha.expiraEm, revogadaEm: linha.revogadaEm,
    },
    actorId, organizationId, concessoes, agora,
  });
  if (!decisao.ok) return decisao;
  return { ok: true, ...(linha.chave ? { chave: linha.chave } : {}) };
}

export function listarExportacoes(db: ClienteComEscopo, actorId?: string) {
  return db.exportJob.findMany({
    where: { ...(actorId ? { actorId } : {}) },
    select: {
      id: true, formato: true, bytes: true, createdAt: true, expiraEm: true,
      revogadaEm: true, descarregadaEm: true, actorId: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
