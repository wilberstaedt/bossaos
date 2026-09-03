/**
 * Permissões por acção e escopo (CT-04, matriz de papéis).
 *
 * Três verificações independentes decidem um pedido, e falham de maneiras
 * diferentes (CT-02): **entitlement** (a organização comprou?), **permissão**
 * (este actor pode?) e **flag** (está libertado?). Este ficheiro é a segunda.
 *
 * O que ele NÃO faz: isolamento entre inquilinos. Isso é o RLS do E03, e
 * continua a ser a última linha. Aqui já estamos dentro de uma organização.
 */

/** Vocabulário de acções. Recurso.verbo, para o rasto de auditoria ser legível. */
export const ACCOES = [
  'catalogo.ler', 'catalogo.editar', 'catalogo.publicar',
  'reservas.ler', 'reservas.gerir',
  'sala.ler', 'sala.operar', 'sala.cancelarEmPreparo',
  'producao.ler', 'producao.operar',
  'caixa.ler', 'caixa.operar', 'caixa.reembolsar',
  'financeiro.ler', 'financeiro.gerir',
  'stock.ler', 'stock.gerir',
  'clientes.ler', 'clientes.gerir',
  'equipa.ler', 'equipa.gerir',
  'organizacao.gerir', 'plano.gerir',
  'relatorios.ler',
] as const;
export type Accao = (typeof ACCOES)[number];

export type Papel =
  | 'OWNER' | 'ORG_ADMIN' | 'BRAND_MANAGER' | 'VENUE_MANAGER' | 'FLOOR_MANAGER'
  | 'HOST' | 'WAITER' | 'KITCHEN' | 'BARTENDER' | 'EXPO'
  | 'CASHIER' | 'FINANCE' | 'INVENTORY' | 'MARKETING' | 'EMPLOYEE';

/**
 * O que cada papel pode.
 *
 * Escrito por extenso e não por herança entre papéis. A herança é mais curta de
 * escrever e mais difícil de auditar: quando alguém pergunta "o host lê
 * financeiro?", a resposta tem de estar numa linha, não numa cadeia de
 * `extends`. E a pergunta faz-se sempre depois de um incidente.
 */
const MATRIZ: Record<Papel, readonly Accao[]> = {
  OWNER: [...ACCOES],
  ORG_ADMIN: ACCOES.filter((a) => a !== 'plano.gerir'),

  BRAND_MANAGER: [
    'catalogo.ler', 'catalogo.editar', 'catalogo.publicar',
    'clientes.ler', 'relatorios.ler',
  ],

  VENUE_MANAGER: [
    'catalogo.ler', 'reservas.ler', 'reservas.gerir',
    'sala.ler', 'sala.operar', 'sala.cancelarEmPreparo',
    'producao.ler', 'producao.operar',
    'caixa.ler', 'caixa.operar',
    'financeiro.ler', 'stock.ler', 'stock.gerir',
    'clientes.ler', 'clientes.gerir', 'equipa.ler', 'relatorios.ler',
  ],
  FLOOR_MANAGER: [
    'catalogo.ler', 'reservas.ler', 'reservas.gerir',
    'sala.ler', 'sala.operar', 'sala.cancelarEmPreparo',
    'producao.ler', 'caixa.ler', 'caixa.operar',
    'clientes.ler', 'equipa.ler',
  ],

  // "Host: reservas, espera, chegada e alocação de mesas; SEM financeiro/CRM
  // amplo." O aceite 2 do E04 exige exactamente isto.
  HOST: ['reservas.ler', 'reservas.gerir', 'sala.ler', 'catalogo.ler'],

  // "Waiter: sessões e pedidos na unidade; cancelar em preparo requer
  // autorização conforme política." Por isso `sala.operar` sim,
  // `sala.cancelarEmPreparo` não.
  WAITER: ['catalogo.ler', 'sala.ler', 'sala.operar', 'reservas.ler'],

  // "Sem dados pessoais ou financeiros desnecessários."
  KITCHEN: ['producao.ler', 'producao.operar', 'catalogo.ler'],
  BARTENDER: ['producao.ler', 'producao.operar', 'catalogo.ler'],
  EXPO: ['producao.ler', 'producao.operar', 'sala.ler'],

  CASHIER: ['caixa.ler', 'caixa.operar', 'sala.ler', 'catalogo.ler'],
  FINANCE: ['financeiro.ler', 'financeiro.gerir', 'caixa.ler', 'caixa.reembolsar', 'relatorios.ler'],

  INVENTORY: ['stock.ler', 'stock.gerir', 'catalogo.ler'],
  MARKETING: ['clientes.ler', 'clientes.gerir', 'catalogo.ler', 'relatorios.ler'],
  // "Dados do próprio funcionário" — nada transversal.
  EMPLOYEE: [],
};

/**
 * Uma concessão: o papel e o alcance dele.
 *
 * `brandId` e `locationId` ausentes = alcance da organização. Um grant de marca
 * abrange as unidades dela; um de unidade **não amplia** para o resto (CT-04).
 */
export interface Concessao {
  papel: Papel;
  brandId?: string;
  locationId?: string;
}

/** O escopo do recurso que se quer tocar. */
export interface EscopoDoRecurso {
  brandId?: string;
  locationId?: string;
  /** A marca a que a unidade pertence, quando se sabe. */
  brandIdDaLocation?: string;
}

/** Uma concessão alcança este recurso? */
export function alcanca(concessao: Concessao, recurso: EscopoDoRecurso): boolean {
  if (concessao.locationId) {
    // Concessão de unidade: só aquela unidade. Um recurso sem unidade (algo da
    // organização inteira) fica de fora — não amplia.
    return recurso.locationId === concessao.locationId;
  }
  if (concessao.brandId) {
    if (recurso.brandId) return recurso.brandId === concessao.brandId;
    if (recurso.brandIdDaLocation) return recurso.brandIdDaLocation === concessao.brandId;
    // Recurso da organização, concessão de marca: não alcança.
    return false;
  }
  // Concessão da organização inteira.
  return true;
}

export function podeFazer(
  concessoes: readonly Concessao[],
  accao: Accao,
  recurso: EscopoDoRecurso = {},
): boolean {
  return concessoes.some((c) => MATRIZ[c.papel].includes(accao) && alcanca(c, recurso));
}

/** As acções que este conjunto de concessões permite, para desenhar um menu. */
export function accoesPermitidas(
  concessoes: readonly Concessao[],
  recurso: EscopoDoRecurso = {},
): Accao[] {
  return ACCOES.filter((a) => podeFazer(concessoes, a, recurso));
}

/**
 * Um convite não pode conceder mais do que quem convida tem (CT-04).
 *
 * Compara-se por ACÇÕES e não por nome de papel. Comparar nomes obrigaria a uma
 * ordem entre papéis que não existe: um `FINANCE` não é "maior" nem "menor" que
 * um `HOST`, é outra coisa. O que se pergunta é se quem convida já podia tudo o
 * que está a conceder.
 */
export function podeConceder(
  concessoesDeQuemConvida: readonly Concessao[],
  concessaoAConceder: Concessao,
): boolean {
  const recurso: EscopoDoRecurso = {
    ...(concessaoAConceder.brandId ? { brandId: concessaoAConceder.brandId } : {}),
    ...(concessaoAConceder.locationId ? { locationId: concessaoAConceder.locationId } : {}),
  };
  return MATRIZ[concessaoAConceder.papel].every((a) =>
    podeFazer(concessoesDeQuemConvida, a, recurso),
  );
}

export function accoesDoPapel(papel: Papel): readonly Accao[] {
  return MATRIZ[papel];
}
