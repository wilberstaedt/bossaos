/**
 * O tempo de trabalho — as contas PURAS.
 *
 * ── Porque é que isto vive no domínio e não no pacote da base ─────────────
 *
 * Nenhuma destas funções faz uma consulta. Estavam em `@bossaos/db` só porque
 * foi lá que nasceram, e a consequência apareceu quando uma tela precisou de
 * formatar uma hora: importar `@bossaos/db` num formatador fez a guarda das
 * rotas acusá-lo de tocar na base sem passar pela porta.
 *
 * A guarda estava certa. A cura não é abrir-lhe excepção — é a função pura
 * deixar de viver no sítio onde tocar na base é o normal.
 */
/** O corte do dia de serviço, em minutos. `05:00` por omissão. */
export const CORTE_DO_SERVICO_MINUTOS = 300;

/**
 * O DIA DE SERVIÇO de um instante. **A regra de fronteira desta etapa.**
 *
 * ── Porque é que isto existe, e não é «o instante é UTC» ──────────────────
 *
 * Quem saiu às 00h42 de sábado trabalhou na sexta. Contar por data civil corta o
 * turno em dois e paga mal os dois lados.
 *
 * A conta é: a data civil, **no fuso da unidade**, do instante **menos o corte**.
 * E faz-se **aqui, na escrita**, uma vez — nunca na leitura a partir de um
 * instante em UTC lido como hora de parede, que foi exactamente o defeito do
 * fuso que passou por baixo de um contrato certo mas inerte.
 */
export function diaDeServicoDe(
  momento: Date, fuso: string, corteMinutos = CORTE_DO_SERVICO_MINUTOS,
): string {
  const recuado = new Date(momento.getTime() - corteMinutos * 60_000);
  // `en-CA` dá `AAAA-MM-DD`, e o `timeZone` faz a conversão que interessa. Não
  // se subtrai um deslocamento à mão: o deslocamento muda com a hora de Verão.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(recuado);
}

/** Minutos desde a meia-noite do dia de serviço, na hora da casa. */
export function minutosNoDiaDeServico(
  momento: Date, fuso: string, diaDeServico: string,
): number {
  // O corte não entra aqui de propósito: o dia de serviço já vem resolvido, e
  // o que falta é só saber se este instante caiu no mesmo dia civil ou no
  // seguinte. Passar o corte outra vez era dar duas fontes à mesma decisão.
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: fuso, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(momento);
  const hora = Number(partes.find((p) => p.type === 'hour')?.value ?? '0');
  const minuto = Number(partes.find((p) => p.type === 'minute')?.value ?? '0');
  const doDia = hora * 60 + minuto;
  // Antes do corte, a hora pertence ao dia anterior — e mede-se a partir da
  // meia-noite DELE. As 00h42 de sábado num turno de sexta são `1482`.
  const civil = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(momento);
  return civil === diaDeServico ? doDia : doDia + 1440;
}
