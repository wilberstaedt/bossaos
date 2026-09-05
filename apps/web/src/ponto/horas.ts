/**
 * Mostrar tempo — e mostrá-lo em hora da CASA.
 *
 * ── O defeito do fuso, na forma de exibição ───────────────────────────────
 *
 * As telas mostravam `momento.toISOString().slice(11, 16)`, que é UTC. A
 * picagem das 18h07 de Madrid aparecia como «16:07» a quem tinha trabalhado
 * nela — e quem lê o ecrã do ponto é justamente quem sabe a que horas entrou.
 *
 * Apanhado pela varredura de alcance: o `minutosNoDiaDeServico` estava escrito,
 * provado, e sem chamador nenhum. Não era código a mais; era a conversão que
 * faltava nas telas.
 */
import { minutosNoDiaDeServico } from '@bossaos/domain';

/** `1470` vira `24:30` — um turno até à 1h continua a ser um turno. */
export function horaDoMinuto(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * A hora de uma marcação, na escala do dia de serviço.
 *
 * A saída às 00h42 de um turno de sexta aparece como `24:42`, e não como
 * `00:42` — porque `00:42` num ecrã que diz «sexta-feira» é uma contradição que
 * quem lê tem de resolver de cabeça, e às vezes resolve mal.
 */
export function horaDaMarcacao(momento: Date, fuso: string, diaDeServico: string): string {
  return horaDoMinuto(minutosNoDiaDeServico(momento, fuso, diaDeServico));
}
