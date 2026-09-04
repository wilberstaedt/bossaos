/**
 * O que a reserva decide sem falar com a base.
 *
 * ── Porque é que isto é um ficheiro à parte ────────────────────────────────
 *
 * As duas contas que partem em silêncio nesta área — o limite semiaberto e o
 * buffer — não precisam de base nenhuma para estarem erradas. Postas aqui, um
 * teste chama-as directamente com os dois lados do limite, e o defeito clássico
 * («21h00 encosta a 21h00») deixa de precisar de uma sala montada para aparecer.
 */

/** Um intervalo fechado à esquerda e aberto à direita: `[inicio, fim)`. */
export interface IntervaloDeReserva {
  inicio: Date;
  fim: Date;
}

/**
 * `[a.inicio, a.fim)` cruza `[b.inicio, b.fim)`?
 *
 * ── Os dois lados do limite são teste ──────────────────────────────────────
 *
 * «Uma reserva que acaba às 21h00 e outra que começa às 21h00 não se sobrepõem.
 * Uma que acaba às 21h01 e outra que começa às 21h00 sobrepõem-se.»
 *
 * O `<` estrito nos dois lados é a regra inteira. Com `<=` de um lado, a mesa é
 * vendida duas vezes; com `<=` do outro, o turno das 21h é recusado a noite
 * inteira e ninguém percebe porquê. Um teste que só verifica o caso sobreposto
 * deixa passar metade do defeito.
 */
export function sobrepoe(a: IntervaloDeReserva, b: IntervaloDeReserva): boolean {
  return a.inicio.getTime() < b.fim.getTime() && b.inicio.getTime() < a.fim.getTime();
}

/**
 * O intervalo que a mesa fica realmente ocupada.
 *
 * «O buffer entra antes desta conta, não depois: com buffer de 15 minutos, o fim
 * efectivo é o fim mais 15. Aplicá-lo depois da verificação é o mesmo que não o
 * ter.» Por isso é ISTO que se escreve na alocação — não há sítio onde alguém se
 * possa esquecer de o somar, porque a base guarda o intervalo já com ele.
 */
export function intervaloEfectivo(inicio: Date, duracaoMin: number, bufferMin: number): IntervaloDeReserva {
  return {
    inicio,
    fim: new Date(inicio.getTime() + (duracaoMin + bufferMin) * 60_000),
  };
}

export type RecusaDeAntecedencia = 'CEDO_DEMAIS' | 'TARDE_DEMAIS' | null;

/**
 * A reserva cabe na janela de antecedência?
 *
 * Reservar para daqui a dez minutos não é uma reserva, é uma chegada — e
 * reservar para daqui a três anos é ruído que ninguém vai honrar.
 */
export function antecedencia(
  agora: Date, inicio: Date, minMin: number, maxDias: number,
): RecusaDeAntecedencia {
  const faltam = (inicio.getTime() - agora.getTime()) / 60_000;
  if (faltam < minMin) return 'CEDO_DEMAIS';
  if (faltam > maxDias * 24 * 60) return 'TARDE_DEMAIS';
  return null;
}

export interface MesaDisponivel {
  id: string;
  codigo: string;
  areaId: string;
  capacidade: number;
}

export interface CombinacaoDisponivel {
  id: string;
  nome: string;
  capacidade: number;
  membros: string[];
}

/**
 * Que mesas servem este grupo, e por que ordem tentar.
 *
 * ── Uma combinação devolve as COMPONENTES, nunca ela própria ───────────────
 *
 * «Juntar a 3 e a 4 para oito pessoas não cria uma mesa nova com capacidade
 * própria: ocupa a 3 e a 4.» Quem chama isto recebe sempre uma lista de mesas —
 * a combinação desaparece aqui e não chega à alocação. É por isso que reservar
 * 3+4 e a seguir só a 3 bate na exclusão normal, sem caso especial em lado
 * nenhum.
 *
 * ── E a ordem não é um detalhe ─────────────────────────────────────────────
 *
 * Mesa única primeiro, e da MAIS PEQUENA que sirva. Dar a mesa de oito a um
 * casal é a forma silenciosa de esgotar a sala: nada dá erro, e às 21h não há
 * onde sentar o grupo que reservou. Combinações só depois, e também da mais
 * pequena — juntar mesas é trabalho para quem serve.
 */
export function opcoesDeAlocacao(
  pessoas: number,
  mesas: MesaDisponivel[],
  combinacoes: CombinacaoDisponivel[],
  permiteCombinacoes: boolean,
  areaId?: string | null,
): string[][] {
  const naZona = (m: MesaDisponivel) => !areaId || m.areaId === areaId;
  const porMesa = new Map(mesas.map((m) => [m.id, m]));

  const unicas = mesas
    .filter((m) => naZona(m) && m.capacidade >= pessoas)
    .sort((a, b) => a.capacidade - b.capacidade || a.codigo.localeCompare(b.codigo))
    .map((m) => [m.id]);

  if (!permiteCombinacoes) return unicas;

  const juntas = combinacoes
    .filter((c) => c.capacidade >= pessoas && c.membros.length > 0)
    // Uma combinação só serve se TODAS as componentes forem mesas conhecidas e
    // da zona pedida. Uma componente arquivada torna a combinação impossível, e
    // é melhor não a oferecer do que oferecer e falhar na confirmação.
    .filter((c) => c.membros.every((id) => {
      const m = porMesa.get(id);
      return m !== undefined && naZona(m);
    }))
    .sort((a, b) => a.capacidade - b.capacidade || a.nome.localeCompare(b.nome))
    .map((c) => [...c.membros]);

  return [...unicas, ...juntas];
}
