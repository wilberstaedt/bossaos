import { momentoLocal } from '@bossaos/domain';

/**
 * O dia de serviço de uma unidade, no FUSO dela.
 *
 * ── Não é «hoje» do servidor ─────────────────────────────────────────────
 *
 * É a lição do E06 e a do agendamento de descidas do E12: um relatório que use a
 * meia-noite do servidor mostra, a uma unidade a oeste de Greenwich, metade de
 * ontem e metade de hoje. E ninguém repara, porque o número parece um número.
 *
 * **Sem fuso não há dia.** Devolve `null` em vez de assumir UTC — ausência não é
 * política, e um relatório sobre o dia errado é pior do que um relatório que diz
 * que não pode ser feito.
 */
export function janelaDoServico(fuso: string | null, agora = new Date()): { de: Date; ate: Date } | null {
  if (!fuso) return null;
  const local = momentoLocal(agora, fuso);
  // A meia-noite local do dia de hoje, e a do dia seguinte. Calcula-se por
  // subtracção do que já passou hoje, para não haver aritmética de calendário
  // com meses e anos — que é onde estas contas costumam partir.
  const decorrido = local.minutos * 60_000;
  const de = new Date(agora.getTime() - decorrido);
  const ate = new Date(de.getTime() + 24 * 60 * 60_000);
  return { de, ate };
}

/** A hora local de um instante, para agrupar por franja. */
export function horaLocalDe(fuso: string): (d: Date) => number {
  return (d) => Math.floor(momentoLocal(d, fuso).minutos / 60);
}
