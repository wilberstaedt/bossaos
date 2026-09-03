/**
 * Planos, quotas e limites (CT-02 · `docs/architecture/planos-e-limites.md`).
 *
 * As três verificações do contrato são independentes e correm no servidor:
 *
 *   PLANO         esta organização comprou esta capacidade?   → vende-se
 *   AUTORIZAÇÃO   esta pessoa pode fazer isto?                → concede-se  (E04)
 *   FLAG          isto está construído e libertado?           → liga-se
 *
 * Este ficheiro é a primeira. Um botão escondido não é nenhuma das três: é
 * decoração por cima de uma rota que continua a responder a quem lhe chamar
 * directamente. O ecrã esconde para não frustrar; o servidor recusa para
 * proteger.
 */

/**
 * Catálogo de capacidades — **separado das flags de lançamento**.
 *
 * São coisas diferentes e o contrato exige que não se misturem: uma capacidade
 * vende-se, uma flag liga-se. Achatá-las faz um "ainda não existe" ler-se como
 * "compra o plano acima", e o dono do restaurante paga por algo que não está
 * construído.
 */
export const CAPACIDADES = {
  // Booleanas: tem-se ou não se tem.
  'carta.digital': 'booleana',
  'site.restaurante': 'booleana',
  'tema.coresProprias': 'booleana',
  'reservas': 'booleana',
  'sala': 'booleana',
  'kds': 'booleana',
  'tpv': 'booleana',
  'stock': 'booleana',
  'pagamentos': 'booleana',
  'kiosk': 'booleana',
  // Quantitativas: precisam de um número, e o número vem de configuração.
  // E06: a estrutura multimarca existe em todos os planos; o que a limita é a
  // quota concedida, tal como nas unidades. Sem concessão, fica a marca do
  // piloto — que é o que o CT-02 manda: **por configurar significa negado**.
  'marcas': 'quantitativa',
  'unidades': 'quantitativa',
  'utilizadores': 'quantitativa',
  'produtos': 'quantitativa',
  'armazenamentoMB': 'quantitativa',
} as const;

export type Capacidade = keyof typeof CAPACIDADES;
export type TipoDeCapacidade = (typeof CAPACIDADES)[Capacidade];

export function tipoDaCapacidade(c: Capacidade): TipoDeCapacidade {
  return CAPACIDADES[c];
}

/**
 * Uma concessão.
 *
 * **A ausência de uma linha destas significa NEGADO.** Não "ilimitado", não
 * "por decidir": negado. O CT-02 é explícito — *"se ela não estiver configurada,
 * não liberar expansão comercial por ausência de limite"* — e o reflexo de quem
 * escreve o código é o contrário (`if (limite == null) return SEM_LIMITE`).
 *
 * E há a distinção que faz esta regra ser representável: **"não configurado"
 * não é o mesmo que "configurado a zero"**. São dois estados diferentes:
 *
 *   sem linha nenhuma        → a capacidade não foi contratada
 *   linha com `quota = null` → contratada; para uma capacidade QUANTITATIVA
 *                              isto é "quota por configurar", e nega
 *   linha com `quota = 0`    → contratada e com zero de folga; nega, mas por
 *                              outra razão, e a mensagem tem de ser outra
 *   linha com `quota = 3`    → três
 *
 * Um `null` lido como `0` ou como `∞` são dois erros opostos e ambos aparecem em
 * produção: um bloqueia um cliente que pagou, o outro oferece o produto inteiro.
 */
export interface Concessao {
  capacidade: Capacidade;
  /** `null` numa quantitativa = por configurar = negado. Nunca ilimitado. */
  quota: number | null;
  /** Concessão limitada a uma unidade. Ausente = toda a organização. */
  locationId?: string;
  /** Ausente = sem validade. Presente e no passado = expirada. */
  validoAte?: Date;
}

/** Flag de lançamento. Catálogo separado, de propósito. */
export interface Flag {
  nome: string;
  ligada: boolean;
}

/**
 * O que se quer fazer com a capacidade. **Não é decorativo.**
 *
 * `reconciliar` existe por causa da regra que protege o dinheiro e que se
 * esquece sempre: *"perder o direito de criar vendas não pode apagar obrigações
 * nem impedir resolver um pagamento pendente"*.
 *
 * O erro que isto previne é concreto e grave: o restaurante desce de plano, o
 * módulo de pagamentos desliga, e um pagamento em estado **indeterminado** fica
 * sem forma de ser reconciliado. O dinheiro existe no adquirente e deixa de
 * existir no sistema. Indeterminado não é falhado, e nada que desligue um módulo
 * pode transformar um no outro.
 */
export type Intencao =
  /** Ler ou operar algo que já existe dentro da capacidade. */
  | 'usar'
  /** Criar algo novo. É isto que a quota limita. */
  | 'criar'
  /** Fechar uma obrigação que já existe: recibo, webhook, reembolso. */
  | 'reconciliar';

export type ResultadoDeCapacidade =
  | { permitido: true }
  /** Não há concessão. A capacidade não foi contratada. */
  | { permitido: false; motivo: 'sem_plano'; capacidade: Capacidade }
  /** Contratada, mas sem número. Quantitativa sem quota **nega**. */
  | { permitido: false; motivo: 'quota_por_configurar'; capacidade: Capacidade }
  /** Contratada, com número, e o número acabou. */
  | { permitido: false; motivo: 'quota_esgotada'; capacidade: Capacidade; quota: number; uso: number }
  | { permitido: false; motivo: 'expirado'; capacidade: Capacidade; expirouEm: Date }
  /** Comprada mas não construída. A mensagem tem de dizer isso. */
  | { permitido: false; motivo: 'desligado'; flag: string };

export interface PedidoDeCapacidade {
  capacidade: Capacidade;
  intencao: Intencao;
  concessoes: readonly Concessao[];
  /** Quantas já existem. Obrigatório em `criar` sobre uma quantitativa. */
  usoActual?: number;
  /** Quando o recurso é de uma unidade, para uma concessão limitada a ela. */
  locationId?: string;
  /** Flag que liberta esta capacidade, quando existe uma. */
  flag?: Flag;
  agora?: Date;
}

/**
 * Decide se a organização pode.
 *
 * A ordem das verificações não é intercambiável:
 *
 *  1. **`reconciliar` passa sempre.** Antes de tudo, porque nada aqui pode
 *     impedir alguém de fechar uma obrigação que já existe.
 *  2. **flag desligada** nega antes do plano. Não faz sentido dizer "compra o
 *     plano acima" para algo que ainda não está construído.
 *  3. **sem concessão** nega. É a regra que se escreve ao contrário.
 *  4. **expirada** nega.
 *  5. **quota**: só em `criar`, e só em quantitativas.
 */
export function decidirCapacidade(pedido: PedidoDeCapacidade): ResultadoDeCapacidade {
  const agora = pedido.agora ?? new Date();

  // (1) Fechar o que já existe nunca é bloqueado por plano.
  if (pedido.intencao === 'reconciliar') return { permitido: true };

  // (2) Comprada mas não construída é uma resposta diferente de não comprada.
  if (pedido.flag && !pedido.flag.ligada) {
    return { permitido: false, motivo: 'desligado', flag: pedido.flag.nome };
  }

  const aplicaveis = pedido.concessoes.filter(
    (c) =>
      c.capacidade === pedido.capacidade &&
      // Concessão de unidade só vale naquela unidade. Uma concessão de
      // organização vale em qualquer sítio.
      (c.locationId === undefined || c.locationId === pedido.locationId),
  );

  // (3) A regra do contrato, na direcção certa.
  if (aplicaveis.length === 0) {
    return { permitido: false, motivo: 'sem_plano', capacidade: pedido.capacidade };
  }

  const vivas = aplicaveis.filter((c) => !c.validoAte || c.validoAte.getTime() > agora.getTime());
  if (vivas.length === 0) {
    // Havia concessão e caducou. Dizer "expirado" e não "sem plano": quem pagou
    // e deixou caducar precisa de saber que basta renovar.
    const maisRecente = aplicaveis.reduce((a, b) =>
      (a.validoAte?.getTime() ?? 0) > (b.validoAte?.getTime() ?? 0) ? a : b,
    );
    return {
      permitido: false,
      motivo: 'expirado',
      capacidade: pedido.capacidade,
      expirouEm: maisRecente.validoAte as Date,
    };
  }

  // (4) Booleana viva: chega.
  if (tipoDaCapacidade(pedido.capacidade) === 'booleana') return { permitido: true };

  // (5) Quantitativa. Ler ou operar o que existe não consome quota; criar sim.
  if (pedido.intencao === 'usar') return { permitido: true };

  // A quota efectiva é a MAIOR entre as concessões vivas — somar seria inventar
  // um número que ninguém contratou.
  const comNumero = vivas.filter((c) => c.quota !== null);
  if (comNumero.length === 0) {
    // Contratada, sem número. **Nega.** Nunca ilimitado por ausência.
    return { permitido: false, motivo: 'quota_por_configurar', capacidade: pedido.capacidade };
  }
  const quota = Math.max(...comNumero.map((c) => c.quota as number));
  const uso = pedido.usoActual ?? 0;

  if (uso >= quota) {
    return { permitido: false, motivo: 'quota_esgotada', capacidade: pedido.capacidade, quota, uso };
  }
  return { permitido: true };
}

/** Código HTTP. Num sítio só, para não divergirem por rota. */
export function estadoHttpDeCapacidade(r: ResultadoDeCapacidade): number {
  if (r.permitido) return 200;
  switch (r.motivo) {
    case 'sem_plano':
    case 'quota_por_configurar':
    case 'quota_esgotada':
    case 'expirado':
      // 402: falta contratar ou renovar. NÃO é 403 — 403 diria a quem paga que
      // o problema é a pessoa, e mandava-o pedir permissões a si próprio.
      return 402;
    case 'desligado':
      // Não existe ainda. 404, e a mensagem diz que está a caminho.
      return 404;
  }
}
