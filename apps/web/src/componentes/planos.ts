import type { Capacidade } from '@bossaos/domain';

/**
 * Os destaques de cada plano, e **o que cada destaque promete**.
 *
 * As frases vêm do atlas (pp. 31, 47, 51, 369) e são editoriais: "Reservas, sala
 * y KDS" é uma linha de venda, não um código de capacidade. Guardá-las só como
 * texto seria o suficiente para as desenhar — e insuficiente para as manter
 * verdadeiras: no dia em que o catálogo mudar, o cartão continua a prometer.
 *
 * Por isso cada destaque traz as capacidades que afirma. A prova compara esta
 * tabela com o catálogo REAL na base e exige que nenhum cartão prometa o que o
 * plano não concede. Um cartão que vende o que o portão recusa é uma devolução
 * de dinheiro com a nossa cara nela.
 */
export interface Destaque {
  /** Chave em `planos.destaques` do i18n. */
  chave: string;
  /** Substitui `{plano}` na frase, quando ela o tem. */
  plano?: string;
  /** O que esta linha promete. Vazio = linha que não promete capacidade nenhuma. */
  promete: readonly Capacidade[];
}

export const DESTAQUES: Readonly<Record<string, readonly Destaque[]>> = {
  STARTER: [
    { chave: 'cartaDigital', promete: ['carta.digital'] },
    { chave: 'siteRestaurante', promete: ['site.restaurante'] },
    // "Colores BossaOS" é a AUSÊNCIA de cores próprias — o tema fixo. Não promete
    // capacidade nenhuma, e é de propósito que a lista está vazia.
    { chave: 'coresBossaOS', promete: [] },
  ],
  RESTAURANT: [
    { chave: 'tudoDe', plano: 'Starter', promete: ['carta.digital', 'site.restaurante'] },
    { chave: 'reservasSalaKds', promete: ['reservas', 'sala', 'kds'] },
    { chave: 'coresProprias', promete: ['tema.coresProprias'] },
  ],
  PRO: [
    { chave: 'tudoDe', plano: 'Restaurant', promete: ['carta.digital', 'site.restaurante', 'reservas', 'sala', 'kds'] },
    { chave: 'tpvStockGestao', promete: ['tpv', 'stock'] },
    { chave: 'coresProprias', promete: ['tema.coresProprias'] },
  ],
};

/** O plano mais barato do catálogo que inclui esta capacidade, ou nada. */
export function planoQueInclui(
  catalogo: ReadonlyArray<{ codigo: string; nome: string; capacidades: ReadonlyArray<{ capacidade: string }> }>,
  capacidade: string,
): { codigo: string; nome: string } | null {
  // O catálogo já vem por `ordem`, que é a ordem comercial. Não se reordena aqui:
  // inventar um critério de "mais barato" sem preços seria inventar preços.
  const encontrado = catalogo.find((p) => p.capacidades.some((c) => c.capacidade === capacidade));
  return encontrado ? { codigo: encontrado.codigo, nome: encontrado.nome } : null;
}


/**
 * Capacidade → chave de texto.
 *
 * Existe porque **uma chave de mensagem não pode ter um ponto**: o `traduzir`
 * procura por caminho e parte `planos.destaques.carta.digital` em quatro níveis,
 * não encontra nada e devolve a própria chave. O teste do i18n apanhou-o — a
 * asserção "nenhum valor está vazio nem é igual à chave" existia exactamente
 * para isto e eu tinha-a partido em três idiomas de uma vez.
 */
export const TEXTO_DA_CAPACIDADE: Readonly<Record<string, string>> = {
  'carta.digital': 'cartaDigital',
  'site.restaurante': 'siteRestaurante',
  'tema.coresProprias': 'coresProprias',
  reservas: 'reservasSalaKds',
  sala: 'reservasSalaKds',
  kds: 'reservasSalaKds',
  tpv: 'tpvStockGestao',
  stock: 'tpvStockGestao',
};

/**
 * As capacidades que um plano promete, derivadas da tabela acima.
 *
 * ── Porque é que isto se deriva em vez de se escrever ─────────────────────
 *
 * A página de planos precisa de uma comparação por linha — «reservas: Starter
 * não, Restaurant sim, Pro sim» — e a tentação é escrever essa tabela à mão na
 * página comercial. Uma segunda tabela é uma segunda verdade: no dia em que o
 * catálogo mudar, a `DESTAQUES` é corrigida (a prova obriga) e a da landing
 * fica a prometer o que o portão recusa.
 *
 * A `provas/planos.test.ts` já compara a `DESTAQUES` com o catálogo REAL na base
 * e reprova qualquer promessa que o plano não conceda — com controlo negativo
 * para a guarda não passar por uma tabela vazia. Derivando daqui, a comparação
 * comercial fica coberta por essa prova sem precisar de guarda própria.
 *
 * O `tudoDe` faz o trabalho de herança sozinho: ele **lista** as capacidades do
 * plano de baixo em vez de as referenciar por nome, e é por isso que a união
 * simples chega.
 */
export function capacidadesDoPlano(codigo: string): ReadonlySet<Capacidade> {
  const conjunto = new Set<Capacidade>();
  for (const destaque of DESTAQUES[codigo] ?? []) {
    for (const prometida of destaque.promete) conjunto.add(prometida);
  }
  return conjunto;
}
