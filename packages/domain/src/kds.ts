/**
 * A projecção do KDS: eventos a chegarem repetidos, atrasados e com buracos.
 *
 * ── Porque é que isto é lógica pura ───────────────────────────────────────
 *
 * A régua do E16 abre com o que torna a etapa perigosa: *«o E15 mentia dizendo
 * "enviado". Este mente REGREDINDO: um ecrã que volta atrás mostra ao cozinheiro
 * um estado que já não é verdade, e ele age sobre ele. Ninguém vai procurar o
 * erro — a comida sai errada e alguém culpa a pessoa.»*
 *
 * Os três casos que o contrato numera — repetido, atrasado, intervalo
 * desconhecido — são sobre **ordem**, não sobre SSE. Com a regra dentro do
 * transporte, prová-los exigia um servidor a portar-se mal de propósito; aqui
 * são três chamadas a uma função.
 *
 * A parte que fica do lado do transporte é ligá-la. Tem prova própria, no
 * navegador.
 */

export type EstadoDaTarefaNoEcra =
  'POR_INICIAR' | 'EM_PREPARO' | 'PRONTA' | 'ENTREGUE' | 'CANCELADA';

export interface BilheteNoEcra {
  taskId: string;
  estado: EstadoDaTarefaNoEcra;
  /** A versão da tarefa que este bilhete mostra. */
  versao: number;
}

export interface EventoRecebido {
  /** Monótono e sem buracos: é uma sequência da base, não um relógio. */
  cursor: number;
  taskId: string;
  estado: EstadoDaTarefaNoEcra;
  versao: number;
}

export interface ProjeccaoDoKds {
  /** Por `taskId`. */
  bilhetes: Record<string, BilheteNoEcra>;
  /** O último cursor **aplicado sem buracos**. */
  cursor: number;
}

export type ResultadoDaAplicacao =
  | { tipo: 'aplicado'; projeccao: ProjeccaoDoKds }
  /** Chegou outra vez, ou chegou atrasado. O ecrã fica igual. */
  | { tipo: 'ignorado'; projeccao: ProjeccaoDoKds; porque: 'repetido' | 'atrasado' }
  /**
   * Falta um evento no meio. **Não se adivinha**: vai-se ao estado
   * autoritativo. A projecção devolvida é a de ANTES — aplicar por cima de um
   * buraco é a definição de adivinhar.
   */
  | { tipo: 'intervalo_desconhecido'; projeccao: ProjeccaoDoKds; esperado: number; recebido: number };

export function projeccaoVazia(cursor = 0): ProjeccaoDoKds {
  return { bilhetes: {}, cursor };
}

/**
 * Aplica um evento à projecção. **A única porta por onde o ecrã muda.**
 *
 * ── As três recusas, e a razão de cada uma ────────────────────────────────
 *
 * 1. **Repetido** — o mesmo cursor, ou um anterior. Já está aplicado.
 * 2. **Atrasado** — cursor novo, mas a versão da tarefa é igual ou menor do que
 *    a que o ecrã já mostra. *«Uma versão antiga nunca se aplica sobre uma mais
 *    recente»*, e o que não pode acontecer é um evento atrasado **reabrir um
 *    bilhete que já saiu**. A ordem de chegada não é a ordem dos factos.
 * 3. **Intervalo desconhecido** — o cursor saltou. Não se aplica por cima: quem
 *    chama vai ao estado autoritativo, com o *fallback* de snapshot.
 *
 * ── E o par, sem o qual isto seria «ignora tudo» ──────────────────────────
 *
 * Um evento **novo e legítimo** aplica-se. Uma implementação que rejeitasse tudo
 * o que não fosse perfeitamente sequencial passava os três casos acima e não
 * mostrava nada a ninguém — e essa é a versão que sai de graça de qualquer
 * tentativa de «ser seguro».
 */
export function aplicarNoKds(
  projeccao: ProjeccaoDoKds, evento: EventoRecebido,
): ResultadoDaAplicacao {
  if (evento.cursor <= projeccao.cursor) {
    return { tipo: 'ignorado', projeccao, porque: 'repetido' };
  }

  const esperado = projeccao.cursor + 1;
  if (evento.cursor !== esperado) {
    // Um buraco. A projecção fica **como estava** — devolver a versão com o
    // evento aplicado seria continuar como se nada faltasse, que é o mesmo que
    // adivinhar o que ia no meio.
    return { tipo: 'intervalo_desconhecido', projeccao, esperado, recebido: evento.cursor };
  }

  const actual = projeccao.bilhetes[evento.taskId];
  if (actual && evento.versao <= actual.versao) {
    // O cursor avança — o evento foi visto e não se pede outra vez — e o ECRÃ
    // não muda. São coisas diferentes: um é o que já se leu, o outro é o que se
    // sabe.
    return {
      tipo: 'ignorado',
      projeccao: { ...projeccao, cursor: evento.cursor },
      porque: 'atrasado',
    };
  }

  return {
    tipo: 'aplicado',
    projeccao: {
      cursor: evento.cursor,
      bilhetes: {
        ...projeccao.bilhetes,
        [evento.taskId]: { taskId: evento.taskId, estado: evento.estado, versao: evento.versao },
      },
    },
  };
}

/**
 * Aplica uma sequência inteira, e diz onde parou.
 *
 * Pára no primeiro buraco em vez de saltar por cima dele. Continuar deixava o
 * ecrã com um estado composto de dois instantes — o que estava antes do buraco e
 * o que veio depois — e é isso que faz um bilhete já entregue reaparecer.
 */
export function aplicarSequencia(
  projeccao: ProjeccaoDoKds, eventos: readonly EventoRecebido[],
): { projeccao: ProjeccaoDoKds; aplicados: number; ignorados: number; buraco: number | null } {
  let corrente = projeccao;
  let aplicados = 0;
  let ignorados = 0;
  for (const e of eventos) {
    const r = aplicarNoKds(corrente, e);
    if (r.tipo === 'intervalo_desconhecido') {
      return { projeccao: corrente, aplicados, ignorados, buraco: r.esperado };
    }
    corrente = r.projeccao;
    if (r.tipo === 'aplicado') aplicados += 1;
    else ignorados += 1;
  }
  return { projeccao: corrente, aplicados, ignorados, buraco: null };
}

/**
 * O tempo decorrido de um bilhete, a partir do carimbo do SERVIDOR.
 *
 * ── O relógio do tablet não entra nesta conta ─────────────────────────────
 *
 * *«Os temporizadores contam a partir do carimbo do servidor, nunca do relógio
 * do tablet»*, e o contrato lista o caso: **tablet com o relógio adiantado, o
 * tempo do bilhete não muda.** O tablet da cozinha é exactamente o aparelho que
 * ninguém acerta.
 *
 * Recebe os dois carimbos do servidor — o de criação do bilhete e o de «agora» —
 * e por isso não há um `Date.now()` por onde o relógio local se possa meter. Um
 * `Date.now()` escondido aqui passava despercebido para sempre, e o sintoma
 * aparecia num restaurante e não numa prova.
 *
 * Devolve `null` se «agora» for anterior à criação: um tempo negativo não é zero,
 * é um sinal de que os dois carimbos não vieram da mesma fonte.
 */
export function minutosDecorridos(
  criadaEmMs: number, agoraNoServidorMs: number,
): number | null {
  if (!Number.isFinite(criadaEmMs) || !Number.isFinite(agoraNoServidorMs)) return null;
  const ms = agoraNoServidorMs - criadaEmMs;
  if (ms < 0) return null;
  return Math.floor(ms / 60_000);
}

/**
 * O que o ecrã mostra e o que existe. **São dois números, e dizem-se os dois.**
 *
 * *«Nunca descartar um pedido por falta de espaço. O ecrã mostra um conjunto
 * principal; o backlog continua inteiro e alcançável.»* O erro concreto: o KDS
 * mostra doze bilhetes, chegam vinte, e os oito de baixo desaparecem em vez de
 * ficarem numa segunda página. Parece limpo, e é comida que nunca é feita.
 *
 * Esta função **não filtra nada**: reparte. O que não cabe no primeiro ecrã
 * continua na lista devolvida, e o total é o total.
 */
export function repartirBacklog<T>(
  bilhetes: readonly T[], limiteVisivel: number,
): { visiveis: T[]; emEspera: T[]; total: number } {
  // Um limite inválido mostra tudo, em vez de esconder tudo. Entre um ecrã
  // atulhado e comida por fazer, a escolha não é difícil.
  const limite = Number.isInteger(limiteVisivel) && limiteVisivel > 0
    ? limiteVisivel : bilhetes.length;
  return {
    visiveis: bilhetes.slice(0, limite),
    emEspera: bilhetes.slice(limite),
    total: bilhetes.length,
  };
}
