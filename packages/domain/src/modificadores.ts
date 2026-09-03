/**
 * Escolhas obrigatórias e limites de modificadores.
 *
 * ── Porque é que isto é domínio e não validação de formulário ───────────────
 *
 * O aceite 2 do E07: *"Escolhas obrigatórias e limites de modificadores são
 * validados **também por chamada direta da API**."*
 *
 * É a regra que já apareceu três vezes neste produto, e é sempre a mesma: **o
 * ecrã esconde para não frustrar, o servidor recusa para proteger.** Um
 * formulário que não deixa escolher três acompanhamentos quando o máximo são
 * dois é cortesia. Quem enviar o pedido directamente escolhe cinco, e é a
 * cozinha que descobre.
 *
 * ── E porque é que "obrigatório" não é o mesmo que "mínimo 1" ───────────────
 *
 * Quase. A diferença aparece num grupo obrigatório com mínimo 2 — "escolhe dois
 * molhos" — onde não escolher nada e escolher um são erros diferentes, e a
 * mensagem que ajuda é diferente. Guardar as duas coisas separadas custa um
 * campo e evita uma mensagem que diz "escolha obrigatória" a quem já escolheu.
 */

export interface GrupoDeModificadores {
  id: string;
  nome: string;
  /** Tem de ser respondido? Um grupo opcional com mínimo 0 é o caso normal. */
  obrigatorio: boolean;
  minimo: number;
  /** Ausente = sem tecto. Um tecto de zero seria um grupo que não se usa. */
  maximo?: number;
  opcoes: readonly { id: string; nome: string }[];
}

export type ErroDeEscolha =
  | { erro: 'obrigatorio'; grupoId: string }
  | { erro: 'abaixo_do_minimo'; grupoId: string; minimo: number; escolhidas: number }
  | { erro: 'acima_do_maximo'; grupoId: string; maximo: number; escolhidas: number }
  | { erro: 'opcao_desconhecida'; grupoId: string; opcaoId: string }
  | { erro: 'grupo_desconhecido'; grupoId: string };

/**
 * A forma do grupo é válida?
 *
 * Um grupo com mínimo maior que o máximo não se pode satisfazer, e um produto
 * com um grupo assim não se pode encomendar — o cliente fica preso no ecrã sem
 * perceber porquê. Recusa-se ao **gravar** o grupo, não ao encomendar.
 */
export function validarGrupo(g: GrupoDeModificadores): ErroDeEscolha | { erro: 'forma'; grupoId: string; detalhe: string } | null {
  if (!Number.isInteger(g.minimo) || g.minimo < 0) {
    return { erro: 'forma', grupoId: g.id, detalhe: 'minimo' };
  }
  if (g.maximo !== undefined && (!Number.isInteger(g.maximo) || g.maximo < 1)) {
    return { erro: 'forma', grupoId: g.id, detalhe: 'maximo' };
  }
  if (g.maximo !== undefined && g.maximo < g.minimo) {
    return { erro: 'forma', grupoId: g.id, detalhe: 'maximo_menor_que_minimo' };
  }
  if (g.obrigatorio && g.minimo === 0) {
    // Obrigatório com mínimo zero satisfaz-se sem escolher nada — é opcional
    // com outro nome, e o ecrã diria "obrigatório" a um grupo que não obriga.
    return { erro: 'forma', grupoId: g.id, detalhe: 'obrigatorio_com_minimo_zero' };
  }
  if (g.maximo !== undefined && g.maximo > g.opcoes.length) {
    // Não se podem escolher mais opções do que as que existem, e um máximo
    // maior do que a lista é uma promessa impossível.
    return { erro: 'forma', grupoId: g.id, detalhe: 'maximo_maior_que_opcoes' };
  }
  return null;
}

/**
 * As escolhas satisfazem os grupos?
 *
 * Devolve **todos** os problemas, não o primeiro. Quem envia um pedido com três
 * grupos errados quer saber os três — corrigir um de cada vez, com uma viagem ao
 * servidor por cada, é o que faz alguém desistir a meio.
 */
export function validarEscolhas(
  grupos: readonly GrupoDeModificadores[],
  escolhas: ReadonlyMap<string, readonly string[]>,
): readonly ErroDeEscolha[] {
  const problemas: ErroDeEscolha[] = [];
  const porId = new Map(grupos.map((g) => [g.id, g]));

  // Um grupo que não é do produto não se valida em silêncio: recusa-se. Aceitar
  // escolhas de um grupo desconhecido deixaria juntar extras de outro prato.
  for (const grupoId of escolhas.keys()) {
    if (!porId.has(grupoId)) problemas.push({ erro: 'grupo_desconhecido', grupoId });
  }

  for (const g of grupos) {
    const escolhidas = escolhas.get(g.id) ?? [];
    const conhecidas = new Set(g.opcoes.map((o) => o.id));
    for (const o of escolhidas) {
      if (!conhecidas.has(o)) problemas.push({ erro: 'opcao_desconhecida', grupoId: g.id, opcaoId: o });
    }

    if (escolhidas.length === 0) {
      // Obrigatório e vazio diz "obrigatório"; opcional e vazio não diz nada.
      if (g.obrigatorio) problemas.push({ erro: 'obrigatorio', grupoId: g.id });
      continue;
    }
    if (escolhidas.length < g.minimo) {
      problemas.push({ erro: 'abaixo_do_minimo', grupoId: g.id, minimo: g.minimo, escolhidas: escolhidas.length });
    }
    if (g.maximo !== undefined && escolhidas.length > g.maximo) {
      problemas.push({ erro: 'acima_do_maximo', grupoId: g.id, maximo: g.maximo, escolhidas: escolhidas.length });
    }
  }

  return problemas;
}
