import type { ContextoDeInquilino } from '../tenant.ts';

/**
 * Porta de autorização — o contrato que o E04 vai preencher.
 *
 * As **três verificações são independentes** e falham de maneiras diferentes
 * (CT-02, `overview.md`):
 *
 *   entitlement  a organização comprou esta capacidade?   → vende-se
 *   permissão    este actor, neste escopo, pode fazê-lo?  → concede-se
 *   flag         a implementação está libertada?          → liga-se
 *
 * Achatá-las num booleano faz um 403 por falta de plano ler-se como falta de
 * permissão, e aí o dono do restaurante liga para o suporte em vez de fazer
 * upgrade — ou, pior, o suporte concede um papel para resolver um problema de
 * plano.
 */
export type Accao = string;

export interface PedidoDeAutorizacao {
  contexto: ContextoDeInquilino;
  accao: Accao;
  /** Escopo do recurso concreto, quando é mais estreito que o contexto. */
  recurso?: { brandId?: string; locationId?: string };
}

export type Decisao =
  | { permitido: true }
  | { permitido: false; motivo: 'sem_plano'; capacidade: string }
  | { permitido: false; motivo: 'sem_permissao'; accao: Accao }
  | { permitido: false; motivo: 'desligado'; flag: string };

export interface PortaDeAutorizacao {
  decidir(pedido: PedidoDeAutorizacao): Promise<Decisao>;
}

/**
 * Implementação do E03: **nega tudo**.
 *
 * Não há autenticação ainda, e uma porta que deixasse passar "enquanto não há
 * auth" é a porta que fica aberta. O E03 entrega o contrato e o comportamento
 * seguro; o E04 entrega a decisão real.
 */
export const negarTudo: PortaDeAutorizacao = {
  async decidir(pedido) {
    return { permitido: false, motivo: 'sem_permissao', accao: pedido.accao };
  },
};
