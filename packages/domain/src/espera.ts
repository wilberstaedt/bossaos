/**
 * A lista de espera, na parte que não fala com a base.
 *
 * ── Uma lista de espera NÃO é uma fila ─────────────────────────────────────
 *
 * «A ordem de chegada não é a ordem de sentar.» Um grupo de 6 não bloqueia um de
 * 2 quando o que vaga é uma mesa de 2 — o host senta o de 2, e faz bem: a
 * alternativa é ter a mesa vazia com gente à porta.
 *
 * Por isso a posição **deriva-se**, e deriva-se dentro do grupo que cabe nas
 * MESMAS MESAS. É aqui que essa conta vive, longe da base, para que o par que a
 * decide — o de 2 passa à frente e o de 6 não muda de posição — se possa medir
 * sem montar uma sala inteira.
 */

export interface MesaParaEspera {
  id: string;
  areaId: string;
  capacidade: number;
}

export interface NaEspera {
  id: string;
  pessoas: number;
  /** Zonas aceitáveis. Vazio = a unidade inteira. Ausência é ausência. */
  zonas: string[];
  chegouEm: Date;
}

/**
 * As mesas que servem este grupo, por ordem estável.
 *
 * É a chave de agrupamento: dois grupos que cabem exactamente nas mesmas mesas
 * disputam o mesmo recurso e por isso estão na mesma lista. Um grupo de 5 e um
 * de 6, numa sala de mesas de 2, 4, 6 e 8, servem-se das mesmas duas mesas — e é
 * por isso que a frase honesta é «é o 2.º dos grupos de 5 ou 6».
 */
export function mesasQueServem(quem: NaEspera, mesas: MesaParaEspera[]): string[] {
  return mesas
    .filter((m) => m.capacidade >= quem.pessoas)
    .filter((m) => quem.zonas.length === 0 || quem.zonas.includes(m.areaId))
    .map((m) => m.id)
    .sort();
}

/**
 * A posição de alguém, derivada.
 *
 * ── Nunca sai de um contador ───────────────────────────────────────────────
 *
 * Devolve `{ posicao, de }` — «o 2.º de 3» — e as duas metades são do MESMO
 * grupo de mesas. Dar só a posição fazia «é o 2.º» parecer a fila outra vez; o
 * denominador é o que torna a frase verificável por quem a lê.
 *
 * Quem não cabe em mesa nenhuma não tem posição: `null`. Não é o último da fila
 * — é alguém para quem esta sala não tem mesa, e dizer-lhe «é o 7.º» seria a
 * promessa mais falsa de todas.
 */
export function posicaoDerivada(
  quem: NaEspera, todos: NaEspera[], mesas: MesaParaEspera[],
): { posicao: number; de: number } | null {
  const minhas = mesasQueServem(quem, mesas);
  if (minhas.length === 0) return null;
  const chave = minhas.join(',');

  const doMesmoGrupo = todos
    .filter((outro) => mesasQueServem(outro, mesas).join(',') === chave)
    .sort((a, b) => a.chegouEm.getTime() - b.chegouEm.getTime()
      || a.id.localeCompare(b.id));

  const indice = doMesmoGrupo.findIndex((o) => o.id === quem.id);
  if (indice < 0) return null;
  return { posicao: indice + 1, de: doMesmoGrupo.length };
}

/**
 * Quem cabe numa mesa que vaga agora, e **porquê**.
 *
 * «Se o sistema sugerir um próximo, sugere dizendo porquê — cabe na mesa 4, que
 * vaga agora — e a sugestão é recusável. Um host que não percebe a sugestão
 * deixa de a usar em duas noites.»
 *
 * Devolve por ordem de chegada, e devolve TODOS os que cabem: escolher um é do
 * host. O produto ordena e explica; não decide.
 */
export function quemCabeNaMesa(
  mesa: MesaParaEspera, todos: NaEspera[],
): NaEspera[] {
  return todos
    .filter((quem) => quem.pessoas <= mesa.capacidade)
    .filter((quem) => quem.zonas.length === 0 || quem.zonas.includes(mesa.areaId))
    .sort((a, b) => a.chegouEm.getTime() - b.chegouEm.getTime()
      || a.id.localeCompare(b.id));
}

/**
 * A estimativa de espera, em minutos.
 *
 * ── É uma ESTIMATIVA, e o tipo di-lo ───────────────────────────────────────
 *
 * A régua é explícita: «uma estimativa apresentada como promessa é um defeito», e
 * «a incerteza tem de estar no que se vê». O que este módulo pode garantir é que
 * o número nunca viaja sozinho: sai sempre com `estimativa: true` ao lado, para
 * que nenhum ecrã o possa mostrar sem saber o que ele é.
 *
 * A conta é grosseira de propósito — posição no grupo × duração média de uma
 * mesa — e é declarada como tal. Uma conta sofisticada não a tornaria uma
 * promessa; tornaria a mentira mais convincente.
 */
export function estimativaEmMinutos(
  posicao: { posicao: number; de: number } | null, duracaoMediaMin: number,
): { minutos: number; estimativa: true } | null {
  if (!posicao) return null;
  return { minutos: posicao.posicao * duracaoMediaMin, estimativa: true };
}
