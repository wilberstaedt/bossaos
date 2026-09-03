/**
 * Exportar: a permissão verifica-se DUAS vezes.
 *
 * ── A regra do E00 ─────────────────────────────────────────────────────────
 *
 * > **Dois pontos de verificação, não um.** A permissão confirma-se no pedido
 * > **e** outra vez no descarregamento. Um ficheiro gerado quando alguém tinha
 * > direito continua a existir depois de esse direito acabar; se o
 * > descarregamento não verifica, a exportação é uma porta que fica aberta atrás
 * > da pessoa.
 * >
 * > Links privados **expiram**.
 *
 * É a mesma família da revogação do E04: a diferença entre "impede" e "impede ao
 * pedido seguinte". Uma exportação pedida às 10h por quem foi despedido às 11h
 * não pode continuar a descarregar às 12h.
 */

import { type Accao, type Concessao, podeFazer } from './permissoes.ts';

export interface Exportacao {
  id: string;
  organizationId: string;
  /** Quem pediu. O descarregamento é dele e de mais ninguém. */
  actorId: string;
  /**
   * A acção que era precisa para pedir — e que continua a ser para descarregar.
   *
   * **Não é `catalogo.ler`.** Ver a carta num ecrã de cozinha e levar o ficheiro
   * inteiro para fora são coisas diferentes: a primeira é operação, a segunda é
   * extracção. Quem chama escolhe a acção; o que este ficheiro garante é que a
   * escolhida é verificada as duas vezes.
   */
  accaoExigida: Accao;
  criadaEm: Date;
  expiraEm: Date;
  revogadaEm?: Date | null;
}

export type RecusaDeDescarregamento =
  | 'expirado'
  | 'revogado'
  | 'nao_e_seu'
  | 'sem_permissao'
  | 'outra_organizacao';

export type DecisaoDeDescarregamento =
  | { ok: true }
  | { ok: false; erro: RecusaDeDescarregamento };

export interface PedidoDeDescarregamento {
  exportacao: Exportacao;
  actorId: string;
  organizationId: string;
  /** As concessões de AGORA, lidas outra vez da base. Nunca as de quando pediu. */
  concessoes: readonly Concessao[];
  agora: Date;
}

/**
 * O segundo ponto de verificação.
 *
 * A ordem das recusas segue a do E04 e não é intercambiável: o que é de outro
 * inquilino ou de outra pessoa sai como **ausência** para quem chama, antes de
 * se olhar sequer para a permissão — dizer "não tens permissão" sobre uma
 * exportação alheia confirma que ela existe.
 */
export function decidirDescarregamento(p: PedidoDeDescarregamento): DecisaoDeDescarregamento {
  if (p.exportacao.organizationId !== p.organizationId) {
    return { ok: false, erro: 'outra_organizacao' };
  }
  if (p.exportacao.actorId !== p.actorId) {
    return { ok: false, erro: 'nao_e_seu' };
  }
  if (p.exportacao.revogadaEm) return { ok: false, erro: 'revogado' };
  // Semiaberto, como tudo no produto: no instante exacto da expiração já expirou.
  if (p.agora.getTime() >= p.exportacao.expiraEm.getTime()) {
    return { ok: false, erro: 'expirado' };
  }
  // **A verificação que faz a regra existir.** Se estivesse só no pedido, um
  // ficheiro gerado às 10h continuaria a descarregar às 12h por quem perdeu o
  // direito às 11h.
  if (!podeFazer(p.concessoes, p.exportacao.accaoExigida)) {
    return { ok: false, erro: 'sem_permissao' };
  }
  return { ok: true };
}

/**
 * Quanto tempo vive um link de exportação.
 *
 * Uma hora, e não um dia: o ficheiro tem a carta inteira de um restaurante, e o
 * uso real é "peço, descarrego, acabou". Um dia é comodidade para quem exporta e
 * vinte e três horas de janela para quem encontrar o endereço.
 */
export const VALIDADE_PADRAO_MS = 60 * 60 * 1000;

export function expiraEm(criadaEm: Date, validadeMs: number = VALIDADE_PADRAO_MS): Date {
  return new Date(criadaEm.getTime() + validadeMs);
}

/**
 * O identificador serve para endereçar; **não serve para autorizar**.
 *
 * Isto existe para dizer por escrito o que a função acima já faz: mesmo quem
 * tenha o endereço completo passa pelas cinco verificações. Um sistema em que
 * conhecer o URL basta é um sistema em que o URL no histórico do navegador, no
 * `Referer` ou num grupo de WhatsApp é uma fuga — e o E00 é explícito sobre
 * dados pessoais em URLs por esta mesma razão.
 *
 * Continua a ser preciso que o identificador **não seja adivinhável**, e isso
 * não se resolve aqui: quem o gera tem de usar aleatoriedade criptográfica. Este
 * detector recusa os formatos que se contam.
 */
export function identificadorAdivinhavel(id: string): boolean {
  if (id.length < 24) return true;
  // Sequencial, ou com pouca variedade: `exportacao-1`, `aaaa…`.
  if (/^\D*\d{1,8}$/.test(id)) return true;
  return new Set(id).size < 8;
}
