import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deRelogio, diaAnterior, diasConfigurados, estaAberto, intervaloValido,
  intervalosSeSobrepoem, momentoLocal, instanteNaZona, paraRelogio,
  type Horario, type Intervalo,
} from './horarios.ts';

/**
 * O motor de horários.
 *
 * O aceite 2 do E06 pede: *"Horário 20:00-01:00 e exceção de feriado produzem
 * aberto/fechado corretamente no fuso configurado."* Mas o que decide esta
 * etapa está antes disso, e é a régua do E00:
 *
 * > **Desconhecido é uma resposta.** Não é zero, não é vazio, não é a média.
 *
 * Um horário por configurar não é "fechado" e não é 09h-18h. O par que mede isso
 * é o grupo 1: o MESMO instante, na MESMA unidade, com o dia por configurar dá
 * `desconhecido` e com o dia declarado fechado dá `fechado`. Um motor booleano
 * passa em qualquer um dos dois sozinho.
 */

// Europa/Madrid em Setembro está a UTC+2.
const MADRID = 'Europe/Madrid';
const utc = (a: number, m: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(a, m - 1, d, h, min));

const SEXTA_20H = utc(2026, 9, 4, 18);      // 2026-09-04 20:00 em Madrid
const SEXTA_23H = utc(2026, 9, 4, 21);      // 23:00 sexta
const SABADO_00H30 = utc(2026, 9, 4, 22, 30); // 00:30 de sábado, em Madrid
const SABADO_02H = utc(2026, 9, 5, 0);      // 02:00 de sábado
const SEXTA_14H = utc(2026, 9, 4, 12);      // 14:00 sexta

const NOITE: Intervalo = { inicioMin: 20 * 60, fimMin: 25 * 60 }; // 20:00 → 01:00
const ALMOCO: Intervalo = { inicioMin: 13 * 60, fimMin: 16 * 60 };

const horario = (semana: Horario['semana'], excepcoes: Horario['excepcoes'] = []): Horario =>
  ({ fuso: MADRID, semana, excepcoes });

describe('1. Por configurar não é fechado — o par que decide', () => {
  it('sem configuração nenhuma, a resposta é DESCONHECIDO', () => {
    const r = estaAberto(horario({}), SEXTA_14H);
    assert.equal(r.estado, 'desconhecido');
    assert.equal(r.estado === 'desconhecido' && r.motivo, 'por_configurar');
  });

  it('o MESMO instante, com a sexta declarada FECHADA, dá fechado', () => {
    // É o par. Sem ele, um motor que devolvesse sempre "desconhecido" passava no
    // caso de cima, e um que devolvesse sempre "fechado" passava neste.
    const r = estaAberto(horario({ 5: { tipo: 'fechado' } }), SEXTA_14H);
    assert.equal(r.estado, 'fechado');
    assert.equal(r.estado === 'fechado' && r.motivo, 'dia_fechado');
  });

  it('e com a sexta ABERTA ao almoço, dá aberto', () => {
    const r = estaAberto(horario({ 5: { tipo: 'aberto', intervalos: [ALMOCO] } }), SEXTA_14H);
    assert.equal(r.estado, 'aberto');
    assert.equal(r.estado === 'aberto' && r.ateMin, 16 * 60);
  });

  it('configurar SEIS dias não torna o sétimo conhecido', () => {
    // A armadilha do onboarding: preencher a semana e deixar o domingo em
    // branco. O domingo não passa a fechado por os outros estarem cheios.
    const semana = Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((d) => [d, { tipo: 'aberto' as const, intervalos: [ALMOCO] }]),
    );
    const h = horario(semana);
    assert.equal(diasConfigurados(h), 6);
    // Domingo 2026-09-06, 14:00 em Madrid.
    assert.equal(estaAberto(h, utc(2026, 9, 6, 12)).estado, 'desconhecido');
  });
});

describe('2. O serviço que atravessa a meia-noite', () => {
  const h = horario({ 5: { tipo: 'aberto', intervalos: [ALMOCO, NOITE] } });

  it('às 20:00 de sexta abre', () => {
    assert.equal(estaAberto(h, SEXTA_20H).estado, 'aberto');
  });

  it('às 23:00 de sexta continua aberto, até à 01:00', () => {
    const r = estaAberto(h, SEXTA_23H);
    assert.equal(r.estado, 'aberto');
    assert.equal(r.estado === 'aberto' && r.ateMin, 25 * 60);
  });

  it('às 00:30 de SÁBADO ainda está aberto — é o serviço de sexta', () => {
    // O caso que um motor que só olha para o dia de hoje falha, e falha
    // fechando a porta a meio do serviço.
    const r = estaAberto(h, SABADO_00H30);
    assert.equal(r.estado, 'aberto');
    assert.equal(r.estado === 'aberto' && r.ateMin, 60, 'devia dizer que fecha à 01:00');
  });

  it('às 02:00 de sábado já não, e o sábado é DESCONHECIDO e não fechado', () => {
    // O contraste do caso anterior. E repara na resposta: o sábado nunca foi
    // configurado, portanto depois de o serviço de sexta acabar não se sabe.
    const r = estaAberto(h, SABADO_02H);
    assert.equal(r.estado, 'desconhecido');
  });

  it('com o sábado declarado fechado, às 00:30 CONTINUA aberto', () => {
    // O serviço de sexta vence o "fechado" de sábado: quem está lá dentro está
    // lá dentro. Sem esta ordem, declarar o sábado fechado apagava o fim do
    // serviço de sexta-feira à noite.
    const r = estaAberto(
      horario({ 5: { tipo: 'aberto', intervalos: [NOITE] }, 6: { tipo: 'fechado' } }),
      SABADO_00H30,
    );
    assert.equal(r.estado, 'aberto');
  });

  it('o intervalo é SEMIABERTO: abre ao minuto de início, fecha ao de fim', () => {
    const h2 = horario({ 5: { tipo: 'aberto', intervalos: [ALMOCO] } });
    assert.equal(estaAberto(h2, utc(2026, 9, 4, 11)).estado, 'aberto', '13:00 tinha de abrir');
    assert.equal(estaAberto(h2, utc(2026, 9, 4, 13, 59)).estado, 'aberto', '15:59 ainda aberto');
    assert.equal(estaAberto(h2, utc(2026, 9, 4, 14)).estado, 'fechado', '16:00 já fechado');
  });
});

describe('3. Excepções de data vencem a semana, nos dois sentidos', () => {
  const semanaAberta = { 5: { tipo: 'aberto' as const, intervalos: [ALMOCO, NOITE] } };

  it('um feriado FECHA um dia que a semana abre', () => {
    const r = estaAberto(
      horario(semanaAberta, [{ data: '2026-09-04', motivo: 'Fiesta local', estado: { tipo: 'fechado' } }]),
      SEXTA_14H,
    );
    assert.equal(r.estado, 'fechado');
    assert.equal(r.estado === 'fechado' && r.excepcao, 'Fiesta local');
  });

  it('e uma excepção ABRE um dia que a semana fecha — é o outro sentido', () => {
    // Sem este caso, uma implementação que só soubesse fechar passava no de
    // cima. Um feriado em que se abre é tão excepção como um em que se fecha.
    const r = estaAberto(
      horario({ 5: { tipo: 'fechado' } }, [
        { data: '2026-09-04', motivo: 'Evento privado', estado: { tipo: 'aberto', intervalos: [ALMOCO] } },
      ]),
      SEXTA_14H,
    );
    assert.equal(r.estado, 'aberto');
    assert.equal(r.estado === 'aberto' && r.excepcao, 'Evento privado');
  });

  it('a excepção de ONTEM também conta para o serviço que atravessa', () => {
    // A sexta está fechada na semana, mas a excepção abriu-a com serviço de
    // noite: às 00:30 de sábado tem de estar aberto. É o cruzamento das duas
    // regras, e é onde uma implementação que trate os casos em separado falha.
    const r = estaAberto(
      horario({ 5: { tipo: 'fechado' } }, [
        { data: '2026-09-04', motivo: 'Cena de gala', estado: { tipo: 'aberto', intervalos: [NOITE] } },
      ]),
      SABADO_00H30,
    );
    assert.equal(r.estado, 'aberto');
    assert.equal(r.estado === 'aberto' && r.excepcao, 'Cena de gala');
  });

  it('uma excepção noutra data não afecta hoje', () => {
    const r = estaAberto(
      horario(semanaAberta, [{ data: '2026-12-25', motivo: 'Navidad', estado: { tipo: 'fechado' } }]),
      SEXTA_14H,
    );
    assert.equal(r.estado, 'aberto');
  });
});

describe('4. O fuso é da unidade, não do servidor', () => {
  const h = horario({ 5: { tipo: 'aberto', intervalos: [ALMOCO] } });

  it('o mesmo instante é 14:00 em Madrid e 08:00 em Nova Iorque', () => {
    // O MESMO objecto `Date`. Muda só o fuso da unidade — e é isso que separa um
    // horário guardado com fuso de um guardado em UTC e interpretado à sorte.
    assert.equal(estaAberto(h, SEXTA_14H).estado, 'aberto');
    assert.equal(estaAberto({ ...h, fuso: 'America/New_York' }, SEXTA_14H).estado, 'fechado');
  });

  it('a mudança de hora de Outubro não desloca o horário', () => {
    // Madrid passa de UTC+2 a UTC+1 no último domingo de Outubro (2026-10-25).
    // Somar horas a um `Date` acerta onze meses por ano; isto é o décimo segundo.
    // 2026-10-30 é sexta. 14:00 local = 13:00 UTC, já em CET.
    const depois = momentoLocal(utc(2026, 10, 30, 13), MADRID);
    assert.equal(depois.minutos, 14 * 60, 'depois da mudança, 13:00 UTC são 14:00 em Madrid');
    assert.equal(depois.diaDaSemana, 5);
    assert.equal(estaAberto(h, utc(2026, 10, 30, 13)).estado, 'aberto');

    // E antes da mudança, o mesmo 14:00 local está uma hora mais cedo em UTC.
    const antes = momentoLocal(utc(2026, 9, 4, 12), MADRID);
    assert.equal(antes.minutos, 14 * 60, 'antes da mudança, 12:00 UTC são 14:00 em Madrid');
  });

  it('a meia-noite local lê-se 00:00 e não 24:00', () => {
    // `hour12: false` devolve "24" à meia-noite em alguns motores, e 24*60 não
    // é um minuto do dia — punha a meia-noite fora de qualquer intervalo.
    const m = momentoLocal(utc(2026, 9, 4, 22), MADRID); // 00:00 de sábado
    assert.equal(m.minutos, 0);
    assert.equal(m.data, '2026-09-05');
    assert.equal(m.diaDaSemana, 6);
  });

  it('um fuso inventado rebenta em vez de responder', () => {
    assert.throws(() => momentoLocal(SEXTA_14H, 'Marte/Olympus'));
  });
});

describe('5. A forma dos intervalos', () => {
  it('aceita 20:00→01:00 escrito como 1200→1500', () => {
    assert.equal(intervaloValido(NOITE), true);
  });

  it('recusa fim antes do início, e o dia inteiro é 0→1440', () => {
    assert.equal(intervaloValido({ inicioMin: 1200, fimMin: 60 }), false, 'fim<início tinha de ser recusado');
    assert.equal(intervaloValido({ inicioMin: 600, fimMin: 600 }), false, 'duração zero não é um serviço');
    assert.equal(intervaloValido({ inicioMin: 0, fimMin: 1440 }), true, 'o dia inteiro é válido');
    assert.equal(intervaloValido({ inicioMin: 0, fimMin: 1441 }), false, 'mais de 24h não é um serviço');
    assert.equal(intervaloValido({ inicioMin: 1440, fimMin: 1500 }), false, 'o início tem de ser deste dia');
  });

  it('a sobreposição é semiaberta: 13-16 e 16-19 não colidem', () => {
    assert.equal(intervalosSeSobrepoem(ALMOCO, { inicioMin: 960, fimMin: 1140 }), false);
    assert.equal(intervalosSeSobrepoem(ALMOCO, { inicioMin: 900, fimMin: 1140 }), true);
    // E o serviço que atravessa sobrepõe-se ao que começa depois dele.
    assert.equal(intervalosSeSobrepoem(NOITE, { inicioMin: 1300, fimMin: 1400 }), true);
  });

  it('o dia anterior a segunda é domingo, não zero', () => {
    assert.equal(diaAnterior(1), 7);
    assert.equal(diaAnterior(6), 5);
  });

  it('relógio: ida e volta, e o que não é hora devolve NULL e não zero', () => {
    assert.equal(paraRelogio(1200), '20:00');
    assert.equal(paraRelogio(1500), '01:00', '1500 é a uma da manhã do dia seguinte');
    assert.equal(deRelogio('20:00'), 1200);
    assert.equal(deRelogio('00:00'), 0);
    // Zero seria meia-noite. Um campo vazio não é meia-noite.
    assert.equal(deRelogio(''), null);
    assert.equal(deRelogio('25:00'), null);
    assert.equal(deRelogio('9:00'), null, 'sem zero à esquerda é entrada ambígua');
  });
});

describe('instanteNaZona: a hora escrita é a hora do sítio', () => {
  it('a mesma hora de parede dá instantes diferentes em sítios diferentes', () => {
    const madrid = instanteNaZona('2026-09-04T23:30', 'Europe/Madrid');
    const brisbane = instanteNaZona('2026-09-04T23:30', 'Australia/Brisbane');
    assert.ok(madrid && brisbane);
    // Setembro: Madrid está em UTC+2, Brisbane em UTC+10. Oito horas de
    // diferença — que é exactamente o erro que um `new Date()` cometeria.
    assert.equal((brisbane.getTime() - madrid.getTime()) / 3_600_000, -8);
    assert.equal(madrid.toISOString(), '2026-09-04T21:30:00.000Z');
    assert.equal(brisbane.toISOString(), '2026-09-04T13:30:00.000Z');
  });

  it('acerta nas horas de parede onde uma só medição erra', () => {
    // ── Estes quatro casos foram MEDIDOS, não escolhidos ───────────────────
    //
    // Uma implementação de uma só medição (assumir UTC, medir o desvio aí,
    // subtrair) acerta em quase todo o ano. Varri 2026 de meia em meia hora em
    // quatro fusos a comparar as duas: **divergem em 6 horas de parede em
    // Madrid, 30 em Los Angeles e 42 em Sydney** — as horas à volta da mudança
    // de relógio. Em São Paulo, que já não muda a hora, divergem em zero.
    //
    // São estas. Um teste escrito na madrugada de Outubro passava nas duas
    // implementações — foi o que me aconteceu à primeira, e o controlo negativo
    // é que o disse.
    const casos: ReadonlyArray<[string, string]> = [
      ['Europe/Madrid', '2026-03-29T01:00'],
      ['Europe/Madrid', '2026-03-29T01:30'],
      ['Australia/Sydney', '2026-04-04T16:00'],
      ['America/Los_Angeles', '2026-03-08T04:00'],
    ];
    for (const [fuso, escrito] of casos) {
      const instante = instanteNaZona(escrito, fuso);
      assert.ok(instante, `${fuso} ${escrito}: não converteu`);
      // A asserção é a IDA E VOLTA, e é ela que separa as duas implementações:
      // com uma só medição, pedir 01:00 em Madrid devolve um instante que em
      // Madrid são 00:00 — uma hora antes da que a pessoa escreveu.
      const volta = momentoLocal(instante, fuso);
      const [data, hora] = escrito.split('T') as [string, string];
      const [hh, mm] = hora.split(':').map(Number) as [number, number];
      assert.equal(volta.data, data, `${fuso} ${escrito}: dia errado`);
      assert.equal(volta.minutos, hh * 60 + mm, `${fuso} ${escrito}: hora errada`);
    }
  });

  it('uma hora que não existe é ausência, não a mais próxima', () => {
    // A 8 de Março de 2026, em Los Angeles, das 02:00 salta-se para as 03:00.
    // Nenhum instante é lá 02:30. Devolver o mais próximo (01:30) fazia um
    // bloqueio "até às 02:30" acabar uma hora antes, sem ninguém saber.
    assert.equal(instanteNaZona('2026-03-08T02:30', 'America/Los_Angeles'), null);
    // Meia hora antes e uma hora depois existem, e continuam a funcionar.
    assert.ok(instanteNaZona('2026-03-08T01:30', 'America/Los_Angeles'));
    assert.ok(instanteNaZona('2026-03-08T03:30', 'America/Los_Angeles'));
  });

  it('é o inverso de momentoLocal', () => {
    const instante = instanteNaZona('2026-03-15T14:05', 'America/Sao_Paulo');
    assert.ok(instante);
    const volta = momentoLocal(instante, 'America/Sao_Paulo');
    assert.equal(volta.data, '2026-03-15');
    assert.equal(volta.minutos, 14 * 60 + 5);
  });

  it('devolve null para o que não é uma hora, em vez de uma data inválida', () => {
    assert.equal(instanteNaZona('', 'Europe/Madrid'), null);
    assert.equal(instanteNaZona('ontem à noite', 'Europe/Madrid'), null);
  });
});
