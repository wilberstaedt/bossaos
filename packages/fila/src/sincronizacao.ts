import type { EntradaDaFila, Particao } from './fila.ts';
import { paraEnviar } from './fila.ts';

/**
 * A reconexão: **consultar antes de repetir**.
 *
 * ── A distinção que evita cobrar duas vezes ───────────────────────────────
 *
 * O contrato separa **não enviado** (sei que não saiu) de **pendente de
 * confirmação** (saiu, e não sei o que aconteceu). Colapsar os dois num «a
 * sincronizar» é o que leva alguém a carregar outra vez.
 *
 * Um estado indeterminado **consulta o comando antes de repetir**. Sempre, e
 * nunca ao contrário: repetir e depois consultar já criou o segundo efeito.
 */

export type RespostaDaConsulta =
  | { conhecido: true; resposta: unknown }
  | { conhecido: false };

export type RespostaDoEnvio =
  | { ok: true; resposta: unknown }
  | { ok: false; conflito: { versaoActual: number; mudou: string[] } }
  /** A rede falhou. Não se sabe se chegou — e é por isso que fica pendente. */
  | { ok: false; indeterminado: true };

export interface PortasDeRede {
  consultar(commandId: string): Promise<RespostaDaConsulta>;
  enviar(entrada: EntradaDaFila): Promise<RespostaDoEnvio>;
}

export interface ResumoDaSincronizacao {
  enviadas: number;
  confirmadas: number;
  conflitos: number;
  /** Ficaram por resolver: a rede voltou a falhar. */
  indeterminadas: number;
  /** Não seguiram porque a partição não é a actual. Contadas, nunca apagadas. */
  suspensas: number;
}

/**
 * Sincroniza o que é desta partição, e só isso.
 *
 * ── A ordem, e porque é que ela é a regra ────────────────────────────────
 *
 * Uma entrada `PENDENTE_DE_CONFIRMACAO` **consulta primeiro**. Se o servidor já a
 * conhece, marca-se confirmada sem reenviar — o efeito já lá está, e reenviar
 * criaria um segundo se a idempotência falhasse por qualquer razão. A
 * idempotência do E14 é a rede de segurança; isto é não precisar dela.
 *
 * Uma entrada `NAO_ENVIADO` vai directa: sei que não saiu, não há nada que
 * consultar.
 */
export async function sincronizar(
  entradas: readonly EntradaDaFila[],
  actual: Particao | null,
  rede: PortasDeRede,
  /**
   * A sessão está viva? **Reautenticar vem ANTES de sincronizar.**
   *
   * Regra do contrato (*respeitar 2*): «sessão expirada exige reautenticação
   * antes de sincronizar». Sincronizar primeiro e autenticar depois é uma porta
   * aberta por quem já não devia lá estar — a mesma família do ORG-007 noutra
   * roupa.
   *
   * O valor por omissão é `true` porque quem chama de dentro do produto já
   * resolveu a sessão; quem quiser provar o caso morto passa `false`, e é isso
   * que o teste faz.
   */
  sessaoValida = true,
): Promise<{ entradas: EntradaDaFila[]; resumo: ResumoDaSincronizacao }> {
  const resultado = [...entradas];
  // Com a sessão morta, NADA sai — e nada se apaga. A fila fica onde está, e a
  // interface manda entrar outra vez. Um `paraEnviar` vazio aqui não é o mesmo
  // que uma fila vazia: as entradas contam-se como suspensas.
  const aEnviar = sessaoValida ? paraEnviar(entradas, actual) : [];
  const resumo: ResumoDaSincronizacao = {
    enviadas: 0, confirmadas: 0, conflitos: 0, indeterminadas: 0,
    suspensas: entradas.filter(
      (e) => (e.estado === 'NAO_ENVIADO' || e.estado === 'PENDENTE_DE_CONFIRMACAO')
        && !aEnviar.includes(e)).length,
  };

  for (const entrada of aEnviar) {
    const i = resultado.findIndex((e) => e.commandId === entrada.commandId);
    if (i < 0) continue;

    if (entrada.estado === 'PENDENTE_DE_CONFIRMACAO') {
      const conhecido = await rede.consultar(entrada.commandId);
      if (conhecido.conhecido) {
        resultado[i] = { ...entrada, estado: 'CONFIRMADO', resposta: conhecido.resposta };
        resumo.confirmadas += 1;
        continue;
      }
    }

    // Marca-se pendente ANTES de enviar. Se o processo morrer a meio, o que fica
    // gravado é «saiu, e não sei» — que é a verdade. Marcar depois deixaria
    // «não enviado» sobre um comando que chegou, e a retentativa cobrava duas vezes.
    resultado[i] = { ...entrada, estado: 'PENDENTE_DE_CONFIRMACAO' };
    resumo.enviadas += 1;

    const r = await rede.enviar(entrada);
    if (r.ok) {
      resultado[i] = { ...entrada, estado: 'CONFIRMADO', resposta: r.resposta };
      resumo.confirmadas += 1;
    } else if ('conflito' in r) {
      resultado[i] = { ...entrada, estado: 'CONFLITO', conflito: r.conflito };
      resumo.conflitos += 1;
    } else {
      // Fica pendente. Não volta a «não enviado»: isso apagava a dúvida, e a
      // dúvida é a informação.
      resumo.indeterminadas += 1;
    }
  }

  return { entradas: resultado, resumo };
}

/**
 * Aplica um evento vindo do servidor ao estado local.
 *
 * ── «Uma versão antiga nunca se aplica sobre uma mais recente» ───────────
 *
 * É a regra da reconexão, e o caso acontece: os eventos chegam repetidos e fora
 * de ordem, e isso é normal. Devolve o estado que fica — e o antigo não sobrepõe
 * o novo mesmo quando chega depois.
 */
export function aplicarEvento<T extends { versao: number }>(
  actual: T | null, chegado: T,
): T {
  if (!actual) return chegado;
  return chegado.versao > actual.versao ? chegado : actual;
}

/**
 * O que NÃO se faz offline.
 *
 * Regra 5 do contrato: *«offline não faz pagamento nem reserva confirmada. Não é
 * uma limitação da primeira versão a corrigir depois: é o desenho.»* Ambos exigem
 * que o servidor diga sim.
 *
 * A lista é fechada e vive aqui, num sítio só. Espalhada por ecrãs, o próximo
 * ecrã nasce sem ela.
 */
export const ACCOES_QUE_EXIGEM_REDE = [
  'pagamento',
  'reserva.confirmar',
  'conta.fechar',
  'desconto.autorizar',
] as const;

export type AccaoQueExigeRede = (typeof ACCOES_QUE_EXIGEM_REDE)[number];

export function exigeRede(tipo: string): boolean {
  return (ACCOES_QUE_EXIGEM_REDE as readonly string[]).includes(tipo);
}

/**
 * Pode esta acção ser composta offline?
 *
 * Devolve o MOTIVO quando não pode. «Bloqueado» sem motivo faz a pessoa tentar
 * outra vez, e a terceira vez com raiva.
 */
export function podeOffline(tipo: string): { pode: true } | { pode: false; motivo: string } {
  if (!exigeRede(tipo)) return { pode: true };
  return {
    pode: false,
    motivo: 'esta acção precisa de confirmação do servidor e não se compõe sem rede',
  };
}
