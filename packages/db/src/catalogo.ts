import type { ClienteComEscopo } from './escopo.ts';
import {
  fichaDeAlergenios, resolverPreco, validarEscolhas, validarGrupo,
  type Declaracao, type ErroDeEscolha, type GrupoDeModificadores,
  type LinhaDeAlergenio, type RegraDePreco, type ResultadoDePreco,
} from '@bossaos/domain';

/**
 * O catálogo, do lado da base.
 *
 * Os motores estão no domínio e são puros: a precedência de preços, a ficha de
 * alérgenos, os limites dos modificadores. Isto lê e escreve — e o que
 * acrescenta são três regras que só existem quando há uma base:
 *
 * 1. **um produto é da MARCA e é referenciado**, nunca copiado por canal;
 * 2. **editar é sempre com versão**, e uma versão velha não sobrescreve;
 * 3. **a ausência de declaração de alérgeno chega ao domínio como ausência** —
 *    nada aqui a converte em `NAO_CONTEM` pelo caminho.
 */

export const CANAIS = ['CARTA', 'SITE', 'SALA', 'TPV', 'TAKEAWAY', 'KIOSK'] as const;
export type Canal = (typeof CANAIS)[number];

// ── Conflito de versão ──────────────────────────────────────────────────────

export type ResultadoDeEdicao<T> =
  | { ok: true; valor: T; versao: number }
  | { ok: false; erro: 'conflito_de_versao'; versaoActual: number }
  | { ok: false; erro: 'nao_encontrado' };

/**
 * Concorrência optimista: `WHERE id = ? AND version = ?`.
 *
 * O aceite 3 pede que duas edições do mesmo produto façam a segunda **ver
 * conflito**, não sobrescrever. A alternativa — ler, alterar, gravar — perde a
 * primeira edição em silêncio, e quem a fez só descobre quando volta ao ecrã e
 * o texto dela desapareceu.
 *
 * O `updateMany` devolve a contagem. Zero linhas quer dizer uma de duas coisas:
 * a linha não existe, ou a versão avançou. **São respostas diferentes** e
 * distinguem-se com uma leitura a seguir — colapsá-las diria "não encontrado" a
 * quem tem o produto aberto à frente.
 */
async function editarComVersao<T>(
  tabela: {
    updateMany: (a: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
    findFirst: (a: { where: Record<string, unknown>; select: Record<string, boolean> }) => Promise<{ version: number } | null>;
  },
  id: string,
  versao: number,
  data: Record<string, unknown>,
  valor: T,
): Promise<ResultadoDeEdicao<T>> {
  const r = await tabela.updateMany({
    where: { id, version: versao },
    data: { ...data, version: { increment: 1 } },
  });
  if (r.count === 1) return { ok: true, valor, versao: versao + 1 };

  const actual = await tabela.findFirst({ where: { id }, select: { version: true } });
  if (!actual) return { ok: false, erro: 'nao_encontrado' };
  return { ok: false, erro: 'conflito_de_versao', versaoActual: actual.version };
}

// ── Produtos ────────────────────────────────────────────────────────────────

export interface FiltroDeProdutos {
  texto?: string;
  categoryId?: string;
  estado?: 'RASCUNHO' | 'ACTIVO' | 'ARQUIVADO';
  incluirArquivados?: boolean;
}

export function listarProdutos(db: ClienteComEscopo, filtro: FiltroDeProdutos = {}) {
  return db.product.findMany({
    where: {
      ...(filtro.incluirArquivados ? {} : { archivedAt: null }),
      ...(filtro.categoryId ? { categoryId: filtro.categoryId } : {}),
      ...(filtro.estado ? { estado: filtro.estado } : {}),
      ...(filtro.texto
        ? {
            OR: [
              { nome: { contains: filtro.texto, mode: 'insensitive' as const } },
              { sku: { contains: filtro.texto, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    select: {
      id: true, nome: true, sku: true, estado: true, version: true, archivedAt: true,
      // E14: um menu fechado lê-se aqui como qualquer outro produto. Uma segunda
      // lista de "combos" era a cópia do catálogo que o E07 proibiu pelo nome.
      combo: true,
      category: { select: { id: true, nome: true } },
    },
    orderBy: { nome: 'asc' },
  });
}

export function obterProduto(db: ClienteComEscopo, id: string) {
  return db.product.findFirst({
    where: { id },
    select: {
      id: true, nome: true, descricao: true, sku: true, estado: true, version: true,
      archivedAt: true, brandId: true,
      category: { select: { id: true, nome: true } },
      variantes: {
        where: { archivedAt: null },
        select: { id: true, nome: true, ordem: true, predefinida: true },
        orderBy: { ordem: 'asc' },
      },
      canais: { select: { canal: true, visivel: true } },
      preferencias: { select: { codigo: true } },
    },
  });
}

export interface DadosDeProduto {
  nome?: string;
  descricao?: string | null;
  sku?: string | null;
  categoryId?: string | null;
  estado?: 'RASCUNHO' | 'ACTIVO' | 'ARQUIVADO';
}

export async function guardarProduto(
  db: ClienteComEscopo,
  id: string,
  versao: number,
  dados: DadosDeProduto,
): Promise<ResultadoDeEdicao<string>> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dados)) if (v !== undefined) data[k] = v;
  return editarComVersao(db.product as never, id, versao, data, id);
}

// ── Preços ──────────────────────────────────────────────────────────────────

/**
 * O preço efectivo, resolvido pelo motor do domínio.
 *
 * A moeda de comparação é a da **unidade**, lida da base — não a da marca nem a
 * do servidor. Uma cadeia com sede em Espanha pode ter uma unidade em Lisboa que
 * cobra em euros e outra no Brasil que cobra em reais, e comparar contra a
 * errada aceitaria um preço em BRL numa unidade em EUR.
 */
export async function precoEfectivo(
  db: ClienteComEscopo,
  productId: string,
  locationId: string,
  canal: Canal,
  quando?: Date,
): Promise<ResultadoDePreco | { ok: false; erro: 'unidade_sem_moeda' }> {
  const unidade = await db.location.findFirst({
    where: { id: locationId }, select: { moeda: true },
  });
  // Sem moeda na unidade não há contra o que comparar. É o mesmo "por
  // configurar" do E06: recusa-se em vez de assumir a da marca.
  if (!unidade?.moeda) return { ok: false, erro: 'unidade_sem_moeda' };

  const linhas = await db.priceRule.findMany({
    where: { productId },
    select: {
      id: true, montanteMenor: true, moeda: true, locationId: true, canal: true,
      deQuando: true, ateQuando: true,
    },
  });

  const regras: RegraDePreco[] = linhas.map((l) => ({
    id: l.id,
    montanteMenor: l.montanteMenor,
    moeda: l.moeda,
    ...(l.locationId ? { locationId: l.locationId } : {}),
    ...(l.canal ? { canal: l.canal } : {}),
    ...(l.deQuando ? { deQuando: l.deQuando } : {}),
    ...(l.ateQuando ? { ateQuando: l.ateQuando } : {}),
  }));

  return resolverPreco({
    regras, locationId, canal, moedaDaUnidade: unidade.moeda,
    ...(quando ? { quando } : {}),
  });
}

/** Todos os canais de uma vez, com a origem — é o que o CAT-010 mostra. */
export async function precosDoProduto(
  db: ClienteComEscopo,
  productId: string,
  locationId: string,
  quando?: Date,
): Promise<ReadonlyMap<Canal, ResultadoDePreco | { ok: false; erro: 'unidade_sem_moeda' }>> {
  const entradas = await Promise.all(
    CANAIS.map(async (c) => [c, await precoEfectivo(db, productId, locationId, c, quando)] as const),
  );
  return new Map(entradas);
}

// ── Alérgenos ───────────────────────────────────────────────────────────────

/**
 * A ficha de alérgenos deste produto.
 *
 * **A ausência de linha chega ao domínio como ausência.** Não há aqui nenhum
 * `?? 'NAO_CONTEM'` nem nenhum `LEFT JOIN` que produza um estado por omissão: o
 * que se lê são as declarações que existem, e é `fichaDeAlergenios` quem
 * completa a lista com `DESCONHECIDO`.
 */
export async function fichaDeAlergeniosDoProduto(
  db: ClienteComEscopo,
  productId: string,
  regiao = 'UE',
): Promise<readonly LinhaDeAlergenio[]> {
  const [lista, declaradas] = await Promise.all([
    db.allergen.findMany({ where: { regiao }, select: { codigo: true }, orderBy: { ordem: 'asc' } }),
    db.productAllergen.findMany({
      where: { productId },
      select: { estado: true, revistoPor: true, revistoEm: true, allergen: { select: { codigo: true } } },
    }),
  ]);

  const declaracoes: Declaracao[] = declaradas.map((d) => ({
    alergenio: d.allergen.codigo,
    estado: d.estado,
    ...(d.revistoPor ? { revistoPor: d.revistoPor } : {}),
    ...(d.revistoEm ? { revistoEm: d.revistoEm } : {}),
  }));

  return fichaDeAlergenios(declaracoes, lista.map((a) => a.codigo));
}

export interface DeclaracaoParaGravar {
  codigo: string;
  /** `null` **apaga** a declaração e devolve o alérgeno a desconhecido. */
  estado: 'CONTEM' | 'PODE_CONTER' | 'NAO_CONTEM' | null;
}

/**
 * Grava declarações de alérgenos.
 *
 * `null` apaga a linha, e isso é uma operação real e não um efeito colateral:
 * quem percebe que não sabia o que declarou tem de conseguir voltar a
 * "desconhecido". Sem isso, a única saída seria declarar `NAO_CONTEM`, que é
 * precisamente a mentira que esta etapa existe para impedir.
 */
export async function guardarAlergenios(
  db: ClienteComEscopo,
  organizationId: string,
  productId: string,
  declaracoes: readonly DeclaracaoParaGravar[],
  responsavel: string,
): Promise<{ gravadas: number; apagadas: number }> {
  const lista = await db.allergen.findMany({ select: { id: true, codigo: true } });
  const porCodigo = new Map(lista.map((a) => [a.codigo, a.id]));
  let gravadas = 0;
  let apagadas = 0;

  for (const d of declaracoes) {
    const allergenId = porCodigo.get(d.codigo);
    // Um código que não está na biblioteca não se cria aqui: a lista é legal e
    // o runtime nem sequer tem privilégio para lhe acrescentar linhas.
    if (!allergenId) continue;

    if (d.estado === null) {
      const r = await db.productAllergen.deleteMany({ where: { productId, allergenId } });
      apagadas += r.count;
      continue;
    }
    await db.productAllergen.upsert({
      where: { organizationId_productId_allergenId: { organizationId, productId, allergenId } },
      create: {
        organizationId, productId, allergenId, estado: d.estado,
        revistoPor: responsavel, revistoEm: new Date(),
      },
      update: { estado: d.estado, revistoPor: responsavel, revistoEm: new Date() },
    });
    gravadas += 1;
  }
  return { gravadas, apagadas };
}

// ── Modificadores ───────────────────────────────────────────────────────────

export async function gruposDoProduto(
  db: ClienteComEscopo,
  productId: string,
): Promise<readonly GrupoDeModificadores[]> {
  const ligacoes = await db.productModifierGroup.findMany({
    where: { productId },
    select: {
      ordem: true,
      group: {
        select: {
          id: true, nome: true, obrigatorio: true, minimo: true, maximo: true,
          opcoes: { where: { archivedAt: null }, select: { id: true, nome: true }, orderBy: { ordem: 'asc' } },
        },
      },
    },
    orderBy: { ordem: 'asc' },
  });
  return ligacoes.map((l) => ({
    id: l.group.id,
    nome: l.group.nome,
    obrigatorio: l.group.obrigatorio,
    minimo: l.group.minimo,
    ...(l.group.maximo !== null ? { maximo: l.group.maximo } : {}),
    opcoes: l.group.opcoes,
  }));
}

/**
 * As escolhas deste pedido satisfazem os grupos deste produto?
 *
 * **É esta a função que o aceite 2 exige** — *"validados também por chamada
 * direta da API"*. Lê os grupos do produto na base e chama o motor do domínio.
 * Uma rota que valide por si, com os limites que o formulário lhe enviou, não
 * valida nada: os limites vieram de fora.
 */
export async function validarEscolhasDoProduto(
  db: ClienteComEscopo,
  productId: string,
  escolhas: ReadonlyMap<string, readonly string[]>,
): Promise<readonly ErroDeEscolha[]> {
  return validarEscolhas(await gruposDoProduto(db, productId), escolhas);
}

export async function guardarGrupo(
  db: ClienteComEscopo,
  organizationId: string,
  grupo: GrupoDeModificadores & { brandId: string },
): Promise<{ ok: true; id: string } | { ok: false; detalhe: string }> {
  // A forma valida-se ANTES de escrever. A base tem o mesmo `CHECK`, mas a
  // constraint chega ao ecrã como "violação de grupo_bem_formado", que não
  // ajuda ninguém.
  const problema = validarGrupo(grupo);
  if (problema) {
    return { ok: false, detalhe: 'detalhe' in problema ? problema.detalhe : problema.erro };
  }
  // Duas escritas e não uma criação aninhada: a relação `ModifierOption →
  // ModifierGroup` é COMPOSTA por `(organizationId, groupId)`, e num `create`
  // aninhado o Prisma quer preencher a relação inteira sozinho — passar-lhe o
  // `organizationId` colide com isso. É o preço da referência composta do E03,
  // que é o que impede uma opção de apontar para um grupo de outro inquilino.
  //
  // As duas correm dentro da transacção que o `comEscopo` já abriu, portanto ou
  // ficam as duas ou não fica nenhuma — um grupo sem opções é um grupo que
  // ninguém pode satisfazer.
  const criado = await db.modifierGroup.create({
    data: {
      organizationId, brandId: grupo.brandId, nome: grupo.nome,
      obrigatorio: grupo.obrigatorio, minimo: grupo.minimo,
      ...(grupo.maximo !== undefined ? { maximo: grupo.maximo } : {}),
    },
    select: { id: true },
  });
  await db.modifierOption.createMany({
    data: grupo.opcoes.map((o, i) => ({
      organizationId, groupId: criado.id, nome: o.nome, ordem: i + 1,
    })),
  });
  return { ok: true, id: criado.id };
}

// ── Disponibilidade ─────────────────────────────────────────────────────────

/**
 * Bloqueio operacional: "acabou o polvo".
 *
 * A camada de baixo das duas que o contrato define. **Retira a venda na hora,
 * sem republicar a carta** — um restaurante que tenha de refazer a publicação
 * para o dizer vai deixar de o dizer.
 */
export async function bloquearProduto(
  db: ClienteComEscopo,
  organizationId: string,
  productId: string,
  locationId: string | null,
  motivo: string | null,
  ate: Date | null,
): Promise<void> {
  // Sem `upsert` com chave composta: a coluna `location_id` é anulável, e no
  // PostgreSQL **`NULL` é distinto de `NULL`** num índice único — a restrição
  // não impede dois bloqueios globais para o mesmo produto. Quem resolve isso é
  // o índice parcial que a migração cria; aqui lê-se primeiro para saber se há
  // linha, que é o que o `upsert` não consegue fazer com um `null` na chave.
  const existente = await db.productAvailability.findFirst({
    where: { productId, locationId }, select: { id: true },
  });
  if (existente) {
    await db.productAvailability.update({
      where: { id: existente.id },
      data: { bloqueado: true, motivo, ate },
    });
    return;
  }
  await db.productAvailability.create({
    data: {
      organizationId, productId, bloqueado: true,
      ...(locationId ? { locationId } : {}),
      ...(motivo ? { motivo } : {}), ...(ate ? { ate } : {}),
    },
  });
}

export async function desbloquearProduto(
  db: ClienteComEscopo,
  productId: string,
  locationId: string | null,
): Promise<void> {
  await db.productAvailability.updateMany({
    where: { productId, locationId }, data: { bloqueado: false, ate: null },
  });
}

/**
 * Está disponível agora, nesta unidade?
 *
 * Um bloqueio com data de fim **expira sozinho** — é o "hasta próximo servicio"
 * do atlas. Sem isso, alguém teria de se lembrar de desbloquear amanhã de
 * manhã, e ninguém se lembra.
 */
export async function estaDisponivel(
  db: ClienteComEscopo,
  productId: string,
  locationId: string,
  agora = new Date(),
): Promise<{ disponivel: boolean; motivo?: string; ate?: Date }> {
  const bloqueios = await db.productAvailability.findMany({
    where: { productId, OR: [{ locationId }, { locationId: null }], bloqueado: true },
    select: { motivo: true, ate: true, locationId: true },
  });
  for (const b of bloqueios) {
    if (b.ate && b.ate.getTime() <= agora.getTime()) continue;
    return {
      disponivel: false,
      ...(b.motivo ? { motivo: b.motivo } : {}),
      ...(b.ate ? { ate: b.ate } : {}),
    };
  }
  return { disponivel: true };
}
