import type { ContextoDeInquilino } from '../tenant.ts';
import { podeFazer, type Accao, type Concessao } from '../permissoes.ts';

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
 * A porta que **nega tudo**.
 *
 * Era a implementação do E03, quando ainda não havia autenticação — uma porta
 * que deixasse passar "enquanto não há auth" é a porta que fica aberta. Continua
 * aqui, e não como relíquia: é o valor por omissão de qualquer superfície que
 * ainda não tenha decidido as suas permissões, e é o que um teste usa para
 * provar que uma rota exige mesmo autorização.
 */
export const negarTudo: PortaDeAutorizacao = {
  async decidir(pedido) {
    return { permitido: false, motivo: 'sem_permissao', accao: pedido.accao };
  },
};

/**
 * A implementação real do E04: decide pelas concessões do actor.
 *
 * As outras duas verificações do CT-02 — entitlement e flag — não estão aqui
 * porque **ainda não existem tabelas para elas**: planos são E05 e flags são
 * E33. A porta já as devolve como motivos distintos, e é isso que impede que
 * quando chegarem sejam achatadas num booleano com a permissão. Enquanto não
 * existem, esta porta responde sobre permissão e mais nada — dito por extenso
 * em vez de dado por resolvido.
 */
export function autorizacaoPorConcessoes(
  concessoes: readonly Concessao[],
): PortaDeAutorizacao {
  return {
    async decidir(pedido) {
      const recurso = {
        ...(pedido.recurso?.brandId ? { brandId: pedido.recurso.brandId } : {}),
        ...(pedido.recurso?.locationId ? { locationId: pedido.recurso.locationId } : {}),
      };
      if (podeFazer(concessoes, pedido.accao, recurso)) return { permitido: true };
      return { permitido: false, motivo: 'sem_permissao', accao: pedido.accao };
    },
  };
}
