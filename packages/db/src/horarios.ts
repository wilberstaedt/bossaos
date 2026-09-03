import type { ClienteComEscopo } from './escopo.ts';
import {
  estaAberto, intervaloValido, intervalosSeSobrepoem,
  type Abertura, type DiaDaSemana, type EstadoDoDia, type Excepcao,
  type Horario, type Intervalo,
} from '@bossaos/domain';

/**
 * Horários de abertura, do lado da base.
 *
 * O motor está no domínio e é puro. Isto lê e escreve — e a única regra que
 * acrescenta é a que a leitura tem de respeitar:
 *
 * > **Um dia sem linha em `schedule_days` está POR CONFIGURAR, não fechado.**
 *
 * É por isso que a leitura devolve `Partial<Record<DiaDaSemana, EstadoDoDia>>` e
 * não um registo completo com sete entradas: preencher os sete dias aqui, com os
 * não configurados a `fechado`, apagava a distinção no sítio onde ela nasce.
 */

const DIAS = [1, 2, 3, 4, 5, 6, 7] as const;

/** `AAAA-MM-DD` a partir de um `date` do Postgres, sem passar por fusos. */
function dataISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function lerHorario(
  db: ClienteComEscopo,
  locationId: string,
): Promise<Horario | { semFuso: true }> {
  const unidade = await db.location.findFirst({
    where: { id: locationId, archivedAt: null },
    select: { fuso: true },
  });
  // Sem fuso não há pergunta a fazer. Devolver um horário com o fuso do
  // servidor abriria um restaurante de Oropesa à hora de onde a máquina estiver.
  if (!unidade?.fuso) return { semFuso: true };

  const [dias, excepcoes] = await Promise.all([
    db.scheduleDay.findMany({
      where: { locationId },
      select: { dia: true, fechado: true, intervalos: { select: { inicioMin: true, fimMin: true } } },
    }),
    db.scheduleException.findMany({
      where: { locationId },
      select: { data: true, motivo: true, fechado: true, intervalos: { select: { inicioMin: true, fimMin: true } } },
      orderBy: { data: 'asc' },
    }),
  ]);

  const semana: Horario['semana'] = {};
  for (const d of dias) {
    // Só os dias que TÊM linha entram. Os outros ficam de fora, e ficar de fora
    // é o que quer dizer "por configurar".
    semana[d.dia as DiaDaSemana] = d.fechado
      ? { tipo: 'fechado' }
      : { tipo: 'aberto', intervalos: d.intervalos };
  }

  return {
    fuso: unidade.fuso,
    semana,
    excepcoes: excepcoes.map((e): Excepcao => ({
      data: dataISO(e.data),
      motivo: e.motivo,
      estado: e.fechado ? { tipo: 'fechado' } : { tipo: 'aberto', intervalos: e.intervalos },
    })),
  };
}

/** Está aberto agora? Responde `desconhecido` quando não há como saber. */
export async function aberturaAgora(
  db: ClienteComEscopo,
  locationId: string,
  agora = new Date(),
): Promise<Abertura> {
  const h = await lerHorario(db, locationId);
  if ('semFuso' in h) return { estado: 'desconhecido', motivo: 'sem_fuso' };
  return estaAberto(h, agora);
}

export type ErroDeHorario =
  | { erro: 'intervalo_invalido'; dia: DiaDaSemana; intervalo: Intervalo }
  | { erro: 'intervalos_sobrepostos'; dia: DiaDaSemana }
  | { erro: 'aberto_sem_intervalos'; dia: DiaDaSemana };

/**
 * Valida um dia antes de o gravar.
 *
 * A base tem as mesmas regras em `CHECK`, e isso não é redundância: a base
 * recusa uma linha, esta função diz **qual dia e qual intervalo** para o ecrã
 * poder apontar. Um erro de constraint chega ao utilizador como "violação da
 * restrição intervalo_bem_formado", que não ajuda ninguém.
 *
 * `aberto_sem_intervalos` é o caso que a base não apanha: uma linha com
 * `fechado = false` e zero intervalos existe, passa todos os `CHECK`, e lê-se
 * como "aberto nunca" — que é fechado escrito de uma maneira que ninguém
 * consegue distinguir de um erro de gravação.
 */
export function validarDia(dia: DiaDaSemana, estado: EstadoDoDia): ErroDeHorario | null {
  if (estado.tipo !== 'aberto') return null;
  if (estado.intervalos.length === 0) return { erro: 'aberto_sem_intervalos', dia };
  for (const i of estado.intervalos) {
    if (!intervaloValido(i)) return { erro: 'intervalo_invalido', dia, intervalo: i };
  }
  for (let a = 0; a < estado.intervalos.length; a++) {
    for (let b = a + 1; b < estado.intervalos.length; b++) {
      if (intervalosSeSobrepoem(estado.intervalos[a]!, estado.intervalos[b]!)) {
        return { erro: 'intervalos_sobrepostos', dia };
      }
    }
  }
  return null;
}

export type ResultadoDaGravacao =
  | { ok: true; diasConfigurados: number }
  | { ok: false; problemas: readonly ErroDeHorario[] };

/**
 * Grava a semana.
 *
 * **Um dia ausente do pedido não é apagado.** Gravar a semana inteira a cada
 * submissão faria um formulário que só mostra três dias apagar os outros
 * quatro — e apagar um dia é diferente de o fechar: volta a "por configurar",
 * que é uma perda de informação silenciosa. Para tirar um dia da configuração,
 * há `esquecerDia`, que o diz pelo nome.
 */
export async function guardarSemana(
  db: ClienteComEscopo,
  organizationId: string,
  locationId: string,
  dias: Partial<Record<DiaDaSemana, EstadoDoDia>>,
): Promise<ResultadoDaGravacao> {
  const problemas: ErroDeHorario[] = [];
  for (const d of DIAS) {
    const estado = dias[d];
    if (!estado) continue;
    const problema = validarDia(d, estado);
    if (problema) problemas.push(problema);
  }
  // Recusa ANTES de escrever. Metade de uma semana gravada é pior do que
  // nenhuma: fica um horário que ninguém escolheu.
  if (problemas.length > 0) return { ok: false, problemas };

  for (const d of DIAS) {
    const estado = dias[d];
    if (!estado) continue;
    if (estado.tipo === 'por_configurar') {
      await esquecerDia(db, locationId, d);
      continue;
    }
    // `deleteMany` + `create` em vez de `upsert` com intervalos: os intervalos
    // não têm identidade própria do ponto de vista de quem edita — a pessoa
    // escreve "13:00-16:00", não "o intervalo 7".
    const existente = await db.scheduleDay.findFirst({ where: { locationId, dia: d }, select: { id: true } });
    if (existente) await db.scheduleInterval.deleteMany({ where: { diaId: existente.id } });

    const linha = existente
      ? await db.scheduleDay.update({
          where: { id: existente.id },
          data: { fechado: estado.tipo === 'fechado' },
          select: { id: true },
        })
      : await db.scheduleDay.create({
          data: { organizationId, locationId, dia: d, fechado: estado.tipo === 'fechado' },
          select: { id: true },
        });

    if (estado.tipo === 'aberto') {
      await db.scheduleInterval.createMany({
        data: estado.intervalos.map((i) => ({
          organizationId, diaId: linha.id, inicioMin: i.inicioMin, fimMin: i.fimMin,
        })),
      });
    }
  }

  return { ok: true, diasConfigurados: await db.scheduleDay.count({ where: { locationId } }) };
}

/** Tira um dia da configuração: volta a "por configurar", e diz que é isso. */
export async function esquecerDia(db: ClienteComEscopo, locationId: string, dia: DiaDaSemana): Promise<void> {
  await db.scheduleDay.deleteMany({ where: { locationId, dia } });
}

export async function guardarExcepcao(
  db: ClienteComEscopo,
  organizationId: string,
  locationId: string,
  excepcao: Excepcao,
): Promise<ResultadoDaGravacao> {
  if (excepcao.estado.tipo === 'aberto') {
    // Reaproveita a validação do dia: uma excepção aberta tem as mesmas regras.
    const problema = validarDia(1, excepcao.estado);
    if (problema) return { ok: false, problemas: [problema] };
  }
  const data = new Date(`${excepcao.data}T00:00:00Z`);
  if (Number.isNaN(data.getTime())) {
    return { ok: false, problemas: [{ erro: 'intervalo_invalido', dia: 1, intervalo: { inicioMin: 0, fimMin: 0 } }] };
  }

  const existente = await db.scheduleException.findFirst({
    where: { locationId, data }, select: { id: true },
  });
  if (existente) await db.scheduleInterval.deleteMany({ where: { excepcaoId: existente.id } });

  const linha = existente
    ? await db.scheduleException.update({
        where: { id: existente.id },
        data: { motivo: excepcao.motivo, fechado: excepcao.estado.tipo === 'fechado' },
        select: { id: true },
      })
    : await db.scheduleException.create({
        data: {
          organizationId, locationId, data,
          motivo: excepcao.motivo,
          fechado: excepcao.estado.tipo === 'fechado',
        },
        select: { id: true },
      });

  if (excepcao.estado.tipo === 'aberto') {
    await db.scheduleInterval.createMany({
      data: excepcao.estado.intervalos.map((i) => ({
        organizationId, excepcaoId: linha.id, inicioMin: i.inicioMin, fimMin: i.fimMin,
      })),
    });
  }
  return { ok: true, diasConfigurados: await db.scheduleDay.count({ where: { locationId } }) };
}

export async function apagarExcepcao(db: ClienteComEscopo, locationId: string, data: string): Promise<void> {
  await db.scheduleException.deleteMany({ where: { locationId, data: new Date(`${data}T00:00:00Z`) } });
}
