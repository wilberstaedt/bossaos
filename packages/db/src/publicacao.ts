import type { ClienteComEscopo } from './escopo.ts';
import {
  bloqueiosDePublicacao, compararRevisoes, fichaDeAlergenios, proximaRevisao, resolverPreco,
  type Bloqueio, type Declaracao, type ItemParaPublicar, type Mudanca,
  type PoliticaDePublicacao, type RegraDePreco,
} from '@bossaos/domain';
import type { Canal } from './catalogo.ts';

/**
 * Publicar, do lado da base.
 *
 * O motor decide o que bloqueia e o que muda; isto monta o retrato e faz a troca.
 *
 * ── A atomicidade não é um cuidado, é a forma ──────────────────────────────
 *
 * `publicar` corre inteira dentro do `comEscopo`, que já abriu uma transacção. A
 * revisão nasce e o ponteiro troca no mesmo `COMMIT`: **ou ficam as duas coisas
 * ou não fica nenhuma**. Não há um caminho pelo qual metade da carta fique nova
 * e metade velha, porque não há um instante em que só uma delas esteja escrita.
 *
 * E a base recusa reescrever uma revisão (`REVOKE UPDATE, DELETE ON
 * menu_revisions`), o que torna "imutável" uma propriedade e não uma promessa.
 */

/** O retrato de um produto, tal como vai para dentro da revisão. */
export interface ItemDaRevisao extends ItemParaPublicar {
  descricao: string | null;
  categoriaNome: string | null;
  /** Os catorze, com o estado de cada um. Retrato, não referência. */
  alergenos: ReadonlyArray<{ codigo: string; estado: string }>;
  variantes: ReadonlyArray<{ id: string; nome: string; predefinida: boolean }>;
  media: ReadonlyArray<{ chave: string; textoAlternativo: string | null; principal: boolean }>;
}

/**
 * Monta o retrato do menu para uma unidade e um canal.
 *
 * **Retrato e não referência**, que é a regra do E00 para os pedidos e vale
 * igual aqui: o preço vai resolvido, os alérgenos vão com os catorze estados, e
 * a média vai pela chave. Guardar identificadores faria a revisão publicada
 * mudar quando alguém editasse o rascunho — que é precisamente o que a revisão
 * existe para impedir.
 */
export async function montarRevisao(
  db: ClienteComEscopo,
  menuId: string,
  locationId: string,
  canal: Canal,
  quando = new Date(),
): Promise<readonly ItemDaRevisao[]> {
  const unidade = await db.location.findFirst({
    where: { id: locationId }, select: { moeda: true },
  });
  const seccoes = await db.menuCategory.findMany({
    where: { menuId },
    select: { ordem: true, category: { select: { id: true, nome: true } } },
    orderBy: { ordem: 'asc' },
  });
  const lista = await db.allergen.findMany({ select: { codigo: true }, orderBy: { ordem: 'asc' } });
  const codigos = lista.map((a) => a.codigo);

  const itens: ItemDaRevisao[] = [];
  for (const s of seccoes) {
    const produtos = await db.product.findMany({
      where: {
        categoryId: s.category.id, archivedAt: null, estado: 'ACTIVO',
        // ── Catálogo oculto não entra na revisão ────────────────────────────
        //
        // Isto faltava, e era um buraco do E08: um produto escondido do canal
        // CARTA entrava na revisão da CARTA e ia parar à carta pública. O E09 põe
        // essa carta na internet aberta, e aí deixa de ser um bug e passa a ser
        // exposição.
        //
        // **A ausência de linha conta como oculto**, e não como visível. É o que
        // o CAT-016 já mostra (`visiveis.get(canal) ?? false`) e é a regra do
        // produto inteiro: por configurar significa negado. Numa superfície
        // pública, o lado seguro do "ninguém disse" é não mostrar.
        canais: { some: { canal, visivel: true } },
      },
      select: {
        id: true, nome: true, descricao: true,
        variantes: {
          where: { archivedAt: null },
          select: { id: true, nome: true, predefinida: true }, orderBy: { ordem: 'asc' },
        },
        alergenios: { select: { estado: true, allergen: { select: { codigo: true } } } },
        media: {
          select: { principal: true, media: { select: { chave: true, textoAlternativo: true } } },
          orderBy: { ordem: 'asc' },
        },
        precos: {
          select: {
            id: true, montanteMenor: true, moeda: true, locationId: true, canal: true,
            deQuando: true, ateQuando: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    for (const p of produtos) {
      const regras: RegraDePreco[] = p.precos.map((l) => ({
        id: l.id, montanteMenor: l.montanteMenor, moeda: l.moeda,
        ...(l.locationId ? { locationId: l.locationId } : {}),
        ...(l.canal ? { canal: l.canal } : {}),
        ...(l.deQuando ? { deQuando: l.deQuando } : {}),
        ...(l.ateQuando ? { ateQuando: l.ateQuando } : {}),
      }));
      // Sem moeda na unidade não há contra o que comparar, e o item entra
      // bloqueado em vez de entrar com um preço adivinhado.
      //
      // O erro é `unidade_sem_moeda` e NÃO `sem_preco`: o produto pode ter preço
      // — tem, no caso que a jornada do marco percorreu — e o que falta está na
      // unidade. Dizer «sem preço» manda a pessoa abrir a ficha do produto,
      // encontrar lá o preço, e concluir que o sistema está avariado.
      const preco = unidade?.moeda
        ? resolverPreco({ regras, locationId, canal, moedaDaUnidade: unidade.moeda, quando })
        : { ok: false as const, erro: 'unidade_sem_moeda' as const };

      const declaracoes: Declaracao[] = p.alergenios.map((d) => ({
        alergenio: d.allergen.codigo, estado: d.estado,
      }));
      const ficha = fichaDeAlergenios(declaracoes, codigos);

      itens.push({
        productId: p.id,
        nome: p.nome,
        descricao: p.descricao,
        precoMenor: preco.ok ? preco.preco.montanteMenor : null,
        moeda: preco.ok ? preco.preco.moeda : null,
        ...(preco.ok ? {} : { erroDePreco: preco.erro }),
        categoryId: s.category.id,
        categoriaNome: s.category.nome,
        // A ficha traz os CATORZE, não só os declarados — a ausência viaja para
        // dentro da revisão como ausência, e não some pelo caminho.
        alergenosPorDeclarar: ficha.filter((l) => l.estado === 'DESCONHECIDO').length,
        alergenos: ficha.map((l) => ({ codigo: l.alergenio, estado: l.estado })),
        variantes: p.variantes,
        media: p.media.map((m) => ({
          chave: m.media.chave,
          textoAlternativo: m.media.textoAlternativo,
          principal: m.principal,
        })),
      });
    }
  }
  return itens;
}

export type ResultadoDePublicacao =
  | { ok: true; revisionId: string; numero: number; mudancas: readonly Mudanca[] }
  | { ok: false; bloqueios: readonly Bloqueio[] };

/**
 * Publica um menu num canal.
 *
 * Devolve os bloqueios **sem escrever nada** quando os há: uma publicação
 * parcial "só do que dá" era exactamente o que o E00 proíbe.
 */
export async function publicar(
  db: ClienteComEscopo,
  organizationId: string,
  entrada: {
    menuId: string; locationId: string; canal: Canal; autor: string;
    politica?: PoliticaDePublicacao; agora?: Date; restauraDe?: string;
  },
): Promise<ResultadoDePublicacao> {
  const agora = entrada.agora ?? new Date();
  const itens = await montarRevisao(db, entrada.menuId, entrada.locationId, entrada.canal, agora);

  const bloqueios = bloqueiosDePublicacao(itens, entrada.politica ?? {});
  if (bloqueios.length > 0) return { ok: false, bloqueios };

  const anteriores = await db.menuRevision.findMany({
    where: { menuId: entrada.menuId },
    select: { id: true, numero: true, createdAt: true, criadaPor: true },
    orderBy: { numero: 'desc' },
  });
  const seguinte = proximaRevisao(
    anteriores.map((r) => ({
      id: r.id, numero: r.numero, criadaEm: r.createdAt, criadaPor: r.criadaPor,
    })),
    entrada.autor, agora, entrada.restauraDe,
  );

  const revisao = await db.menuRevision.create({
    data: {
      organizationId, menuId: entrada.menuId, numero: seguinte.numero,
      conteudo: itens as unknown as object, criadaPor: entrada.autor,
      ...(entrada.restauraDe ? { restauraDeId: entrada.restauraDe } : {}),
    },
    select: { id: true, numero: true },
  });

  // A troca do ponteiro, na MESMA transacção. Sem `upsert`: a chave é composta e
  // ler-primeiro dentro de uma transacção já serializada é claro e suficiente.
  const publicacao = await db.menuPublication.findFirst({
    where: { menuId: entrada.menuId, canal: entrada.canal }, select: { id: true, revisionId: true },
  });
  const anterior = publicacao
    ? await db.menuRevision.findFirst({
        where: { id: publicacao.revisionId }, select: { conteudo: true },
      })
    : null;

  if (publicacao) {
    await db.menuPublication.update({
      where: { id: publicacao.id },
      data: { revisionId: revisao.id, publicadaPor: entrada.autor, publicadaEm: agora },
    });
  } else {
    await db.menuPublication.create({
      data: {
        organizationId, menuId: entrada.menuId, canal: entrada.canal,
        revisionId: revisao.id, publicadaPor: entrada.autor, publicadaEm: agora,
      },
    });
  }

  const doAnterior = (anterior?.conteudo ?? []) as unknown as ItemParaPublicar[];
  return {
    ok: true, revisionId: revisao.id, numero: revisao.numero,
    mudancas: compararRevisoes(doAnterior, itens),
  };
}

/** O que está no ar neste canal, e desde quando. */
export async function publicacaoActual(db: ClienteComEscopo, menuId: string, canal: Canal) {
  return db.menuPublication.findFirst({
    where: { menuId, canal },
    select: {
      publicadaEm: true, publicadaPor: true,
      revisao: { select: { id: true, numero: true, conteudo: true, criadaPor: true, createdAt: true } },
    },
  });
}

/** A pré-visualização do CAT-025: o que mudaria, sem escrever nada. */
export async function preverPublicacao(
  db: ClienteComEscopo,
  entrada: { menuId: string; locationId: string; canal: Canal; politica?: PoliticaDePublicacao },
): Promise<{ mudancas: readonly Mudanca[]; bloqueios: readonly Bloqueio[] }> {
  const itens = await montarRevisao(db, entrada.menuId, entrada.locationId, entrada.canal);
  const actual = await publicacaoActual(db, entrada.menuId, entrada.canal);
  const anterior = (actual?.revisao.conteudo ?? []) as unknown as ItemParaPublicar[];
  return {
    mudancas: compararRevisoes(anterior, itens),
    bloqueios: bloqueiosDePublicacao(itens, entrada.politica ?? {}),
  };
}

/** O histórico do CAT-026. */
export function historicoDeRevisoes(db: ClienteComEscopo, menuId: string) {
  return db.menuRevision.findMany({
    where: { menuId },
    select: {
      id: true, numero: true, createdAt: true, criadaPor: true, restauraDeId: true,
    },
    orderBy: { numero: 'desc' },
  });
}
