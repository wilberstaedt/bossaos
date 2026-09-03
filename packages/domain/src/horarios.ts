/**
 * Horários de abertura: quando é que um restaurante está aberto.
 *
 * ── A regra que este ficheiro existe para tornar impossível de esquecer ─────
 *
 * > **Um horário por configurar não é "fechado", e não é 09h-18h.**
 *
 * É a primeira das cinco regras que atravessam o produto: *"Desconhecido é uma
 * resposta. Não é zero, não é vazio, não é a média."* Num ecrã de onboarding é
 * onde ela é mais fácil de violar, porque preencher os dias com um horário
 * plausível faz a coisa avançar e ninguém repara — até ao dia em que um cliente
 * chega a uma porta fechada porque o site dizia que abria às nove.
 *
 * Por isso `estaAberto` tem **três** respostas e não duas. Um sistema booleano
 * aqui obriga quem chama a escolher entre mentir a dizer que está aberto e
 * mentir a dizer que está fechado.
 *
 * ── Como um intervalo atravessa a meia-noite ────────────────────────────────
 *
 * Um serviço das 20:00 à 01:00 é um intervalo só, não dois. Guarda-se em
 * **minutos desde a meia-noite local do dia em que COMEÇA**, com o fim a poder
 * passar de 1440:
 *
 *     20:00 → 01:00   =   { inicioMin: 1200, fimMin: 1500 }
 *
 * A alternativa — guardar `fim: 60` e tratar `fim < inicio` como caso especial —
 * espalha esse `if` por todo o código que lê horários, e basta um sítio se
 * esquecer para a sexta-feira à uma da manhã aparecer fechada. Aqui a única
 * consequência é que o **dia anterior também tem de ser consultado**, e isso
 * está num sítio só.
 */

/** ISO 8601: 1 = segunda … 7 = domingo. É o que o `Intl` devolve, sem conversão. */
export type DiaDaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Intervalo {
  /** Minutos desde a meia-noite local. 0 ≤ inicioMin < 1440. */
  inicioMin: number;
  /** Minutos desde a meia-noite local do dia de INÍCIO. fimMin > inicioMin. */
  fimMin: number;
}

/**
 * O estado de um dia. Três, não dois.
 *
 * `por_configurar` não é um estado transitório à espera de virar outro: é o
 * estado em que a maior parte dos restaurantes está no dia em que entra, e o
 * produto tem de saber dizê-lo.
 */
export type EstadoDoDia =
  | { tipo: 'por_configurar' }
  | { tipo: 'fechado' }
  | { tipo: 'aberto'; intervalos: readonly Intervalo[] };

/** Uma data concreta que sobrepõe a regra semanal. Feriado, evento, obras. */
export interface Excepcao {
  /** `AAAA-MM-DD` na data LOCAL da unidade, não em UTC. */
  data: string;
  motivo: string;
  /** Fechado nesse dia, ou aberto com outro horário. */
  estado: { tipo: 'fechado' } | { tipo: 'aberto'; intervalos: readonly Intervalo[] };
}

export interface Horario {
  /** Fuso IANA da unidade. Sem ele não há pergunta a fazer. */
  fuso: string;
  /** Só os dias configurados. Um dia ausente é `por_configurar`. */
  semana: Partial<Record<DiaDaSemana, EstadoDoDia>>;
  excepcoes: readonly Excepcao[];
}

export type Abertura =
  | { estado: 'aberto'; ateMin: number; excepcao?: string }
  | { estado: 'fechado'; motivo: 'dia_fechado' | 'fora_de_horario'; excepcao?: string }
  /**
   * Nem aberto nem fechado: **ninguém disse**.
   *
   * `sem_fuso` é o caso de a unidade não ter fuso configurado. Sem fuso não há
   * sequer pergunta a fazer — "são 14:00" não quer dizer nada sem saber onde —
   * e assumir o do servidor abriria um restaurante de Oropesa à hora de Lisboa.
   */
  | { estado: 'desconhecido'; motivo: 'por_configurar' | 'sem_fuso' };

export const MINUTOS_POR_DIA = 1440;

/** Valida a forma de um intervalo. Fora daqui, ninguém fabrica intervalos. */
export function intervaloValido(i: Intervalo): boolean {
  return (
    Number.isInteger(i.inicioMin) && Number.isInteger(i.fimMin) &&
    i.inicioMin >= 0 && i.inicioMin < MINUTOS_POR_DIA &&
    i.fimMin > i.inicioMin &&
    // Mais de 24h não é um serviço, é um erro de entrada. E 24h exactas são
    // "aberto o dia todo", que se escreve 0→1440.
    i.fimMin - i.inicioMin <= MINUTOS_POR_DIA
  );
}

/** Dois intervalos do mesmo dia não se podem sobrepor. */
export function intervalosSeSobrepoem(a: Intervalo, b: Intervalo): boolean {
  // Semiaberto: [inicio, fim). Um serviço que acaba às 16:00 e outro que começa
  // às 16:00 não se sobrepõem — é o mesmo critério do E00 para reservas.
  return a.inicioMin < b.fimMin && b.inicioMin < a.fimMin;
}

/** O dia anterior, em ISO. Sem `% 7` a dar zero, que não é um dia. */
export function diaAnterior(d: DiaDaSemana): DiaDaSemana {
  return (d === 1 ? 7 : d - 1) as DiaDaSemana;
}

interface MomentoLocal {
  ano: number; mes: number; dia: number;
  diaDaSemana: DiaDaSemana;
  minutos: number;
  data: string;
}

/**
 * O instante, visto do sítio onde o restaurante está.
 *
 * Usa `Intl.DateTimeFormat` com o fuso, que é a única forma de fazer isto sem
 * dependência e sem tabela de zonas própria — e a única que acerta em Março e
 * Outubro. Somar horas a um `Date` funciona onze meses por ano.
 */
export function momentoLocal(instante: Date, fuso: string): MomentoLocal {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    weekday: 'short',
  }).formatToParts(instante);

  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? '';
  const DIAS: Record<string, DiaDaSemana> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const diaDaSemana = DIAS[p('weekday')];
  if (!diaDaSemana) throw new Error(`fuso desconhecido ou dia ilegível: ${fuso}`);

  // `hour12: false` dá "24" à meia-noite em alguns motores. 24:00 é 00:00.
  const hora = Number(p('hour')) % 24;
  return {
    ano: Number(p('year')), mes: Number(p('month')), dia: Number(p('day')),
    diaDaSemana,
    minutos: hora * 60 + Number(p('minute')),
    data: `${p('year')}-${p('month')}-${p('day')}`,
  };
}

/** O estado de um dia, com a excepção dessa data a vencer a regra semanal. */
function estadoDoDia(horario: Horario, data: string, dia: DiaDaSemana): {
  estado: EstadoDoDia; excepcao?: string;
} {
  const excepcao = horario.excepcoes.find((e) => e.data === data);
  // A excepção vence SEMPRE, incluindo quando abre um dia que a semana fecha.
  // Um feriado em que se abre é tão excepção como um em que se fecha.
  if (excepcao) return { estado: excepcao.estado, excepcao: excepcao.motivo };
  return { estado: horario.semana[dia] ?? { tipo: 'por_configurar' } };
}

/** A data local do dia anterior a `data` (`AAAA-MM-DD`), sem fusos pelo meio. */
function dataAnterior(data: string): string {
  const [a, m, d] = data.split('-').map(Number);
  const anterior = new Date(Date.UTC(a!, m! - 1, d!));
  anterior.setUTCDate(anterior.getUTCDate() - 1);
  return anterior.toISOString().slice(0, 10);
}

/**
 * Está aberto neste instante?
 *
 * Consulta **dois dias**: o de hoje, e o de ontem — porque um serviço de sexta
 * às 20:00 que acaba à 01:00 mantém o sábado aberto até essa hora, e quem só
 * olhar para o sábado fecha a porta a meio do serviço.
 *
 * E a ordem importa: se hoje está `por_configurar` mas ontem tem um serviço a
 * atravessar, a resposta é **aberto** — porque há informação, e ela diz que sim.
 * `desconhecido` é a resposta de quando não há nada em lado nenhum.
 */
export function estaAberto(horario: Horario, instante: Date): Abertura {
  const agora = momentoLocal(instante, horario.fuso);

  // 1. O serviço de ONTEM que atravessa a meia-noite.
  const ontem = estadoDoDia(horario, dataAnterior(agora.data), diaAnterior(agora.diaDaSemana));
  if (ontem.estado.tipo === 'aberto') {
    for (const i of ontem.estado.intervalos) {
      if (i.fimMin > MINUTOS_POR_DIA && agora.minutos < i.fimMin - MINUTOS_POR_DIA) {
        return {
          estado: 'aberto',
          ateMin: i.fimMin - MINUTOS_POR_DIA,
          ...(ontem.excepcao ? { excepcao: ontem.excepcao } : {}),
        };
      }
    }
  }

  // 2. O dia de hoje.
  const hoje = estadoDoDia(horario, agora.data, agora.diaDaSemana);
  if (hoje.estado.tipo === 'por_configurar') {
    // Só aqui, e depois de ontem não ter dito nada: ninguém configurou este dia.
    return { estado: 'desconhecido', motivo: 'por_configurar' };
  }
  if (hoje.estado.tipo === 'fechado') {
    return { estado: 'fechado', motivo: 'dia_fechado', ...(hoje.excepcao ? { excepcao: hoje.excepcao } : {}) };
  }
  for (const i of hoje.estado.intervalos) {
    if (agora.minutos >= i.inicioMin && agora.minutos < i.fimMin) {
      return {
        estado: 'aberto',
        ateMin: i.fimMin,
        ...(hoje.excepcao ? { excepcao: hoje.excepcao } : {}),
      };
    }
  }
  return { estado: 'fechado', motivo: 'fora_de_horario', ...(hoje.excepcao ? { excepcao: hoje.excepcao } : {}) };
}

/** Quantos dos sete dias estão configurados. Para a checklist do onboarding. */
export function diasConfigurados(horario: Horario): number {
  return ([1, 2, 3, 4, 5, 6, 7] as DiaDaSemana[]).filter((d) => horario.semana[d] !== undefined).length;
}

/** `1200` → `"20:00"`. Aceita passar de 1440: `1500` → `"01:00"`. */
export function paraRelogio(minutos: number): string {
  const m = ((minutos % MINUTOS_POR_DIA) + MINUTOS_POR_DIA) % MINUTOS_POR_DIA;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** `"20:00"` → `1200`. Devolve `null` ao que não é uma hora — não zero. */
export function deRelogio(texto: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(texto.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
