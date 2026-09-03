import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALERGENIOS_UE, avisoDeSeguranca, estadoDoAlergenio, fichaDeAlergenios,
  porDeclarar, PREFERENCIAS, revisaoDaFicha, type Declaracao,
} from './alergenios.ts';

/**
 * A regra do produto inteiro onde o erro tem consequência física.
 *
 * > **Ausência de dados sobre alérgenos não significa ausência de alérgenos.**
 *
 * O par que decide, e é o primeiro grupo: **não declarado dá `DESCONHECIDO`,
 * declarado-ausente dá `NAO_CONTEM`.** Se os dois derem a mesma coisa, a
 * distinção não existe no modelo — e é a distinção que importa.
 */

const CONTEM = (a: string, extra: Partial<Declaracao> = {}): Declaracao =>
  ({ alergenio: a, estado: 'CONTEM', ...extra });

describe('1. O par: não declarado ≠ declarado ausente', () => {
  it('sem declaração nenhuma, o estado é DESCONHECIDO', () => {
    assert.equal(estadoDoAlergenio([], 'amendoins'), 'DESCONHECIDO');
  });

  it('declarado AUSENTE, o estado é NAO_CONTEM — e é outra coisa', () => {
    // O par. Sem este caso, um motor que devolvesse sempre `DESCONHECIDO`
    // passava no de cima; sem o de cima, um que devolvesse sempre `NAO_CONTEM`
    // passava neste. É a diferença entre "ninguém disse" e "alguém disse que
    // não leva", e é a diferença que manda alguém para o hospital.
    const d = [{ alergenio: 'amendoins', estado: 'NAO_CONTEM' as const }];
    assert.equal(estadoDoAlergenio(d, 'amendoins'), 'NAO_CONTEM');
    assert.notEqual(estadoDoAlergenio(d, 'amendoins'), estadoDoAlergenio([], 'amendoins'));
  });

  it('e `PODE_CONTER` é um terceiro, não um `CONTEM` mais fraco', () => {
    // Contaminação cruzada. Quem tem alergia grave lê isto como "não comer";
    // quem tem intolerância leve pode decidir de outra maneira. Colapsá-lo em
    // `CONTEM` tira a decisão a quem a tem de tomar.
    const d = [{ alergenio: 'frutos-de-casca', estado: 'PODE_CONTER' as const }];
    assert.equal(estadoDoAlergenio(d, 'frutos-de-casca'), 'PODE_CONTER');
  });

  it('declarar um alérgeno não diz nada sobre os outros', () => {
    const d = [CONTEM('gluten')];
    assert.equal(estadoDoAlergenio(d, 'gluten'), 'CONTEM');
    assert.equal(estadoDoAlergenio(d, 'leite'), 'DESCONHECIDO', 'o leite ficou "não contém" por o glúten estar declarado');
  });
});

describe('2. A inferência não acontece — e não pode acontecer', () => {
  it('um produto chamado "Tarta de almendra" sem declaração dá DESCONHECIDO', () => {
    // O caso que o contrato nomeia. Uma tarte de amêndoa pode não levar
    // amêndoa: leva o nome de uma receita, não a receita.
    //
    // E repara no que este teste NÃO faz: não passa o nome a lado nenhum. A
    // assinatura de `estadoDoAlergenio` não o aceita. A inferência aqui não é
    // proibida por disciplina — é impossível de escrever.
    assert.equal(estadoDoAlergenio([], 'frutos-de-casca'), 'DESCONHECIDO');
  });

  it('a ficha devolve os CATORZE, não só os declarados', () => {
    // Um ecrã que só mostrasse as linhas existentes deixava os desconhecidos
    // invisíveis — e invisível, para quem lê uma carta, é igual a "não leva".
    const ficha = fichaDeAlergenios([CONTEM('gluten')]);
    assert.equal(ficha.length, ALERGENIOS_UE.length);
    assert.equal(ficha.length, 14, 'a lista do anexo II tem catorze');
    assert.equal(ficha.filter((l) => l.estado === 'DESCONHECIDO').length, 13);
  });

  it('o aviso separa os quatro grupos, e os desconhecidos aparecem', () => {
    const aviso = avisoDeSeguranca(fichaDeAlergenios([
      CONTEM('gluten'),
      { alergenio: 'leite', estado: 'PODE_CONTER' },
      { alergenio: 'amendoins', estado: 'NAO_CONTEM' },
    ]));
    assert.deepEqual(aviso.contem, ['gluten']);
    assert.deepEqual(aviso.podeConter, ['leite']);
    assert.deepEqual(aviso.naoContem, ['amendoins']);
    assert.equal(aviso.desconhecidos.length, 11);
    // O que este teste guarda: os desconhecidos não estão vazios nem foram
    // somados aos "não contém".
    assert.ok(!aviso.naoContem.includes('sesamo'));
    assert.ok(aviso.desconhecidos.includes('sesamo'));
  });
});

describe('3. Segurança e preferência não se tocam', () => {
  it('os dois vocabulários não se sobrepõem', () => {
    // Se um código estivesse nas duas listas, haveria um sítio onde "vegano" e
    // "contém leite" se pudessem confundir. Esta asserção é a que impede alguém
    // de acrescentar `sem-lactose` aos alérgenos por parecer do mesmo tipo.
    const seguranca = new Set<string>(ALERGENIOS_UE);
    const cruzamento = PREFERENCIAS.filter((p) => seguranca.has(p));
    assert.deepEqual(cruzamento, []);
  });

  it('"sem glúten por receita" é preferência, e não declara o glúten', () => {
    // A armadilha concreta: um produto marcado como sem glúten na receita
    // continua a ter o glúten por declarar, porque a cozinha pode contaminar.
    // A etiqueta diz o que a receita pretende ser; a declaração diz o que a
    // cozinha garante.
    assert.ok(PREFERENCIAS.includes('sem-gluten-por-receita'));
    assert.equal(estadoDoAlergenio([], 'gluten'), 'DESCONHECIDO');
  });
});

describe('4. Revisão: responsável e data, e a mais ANTIGA', () => {
  const ONTEM = new Date('2026-09-02T10:00:00Z');
  const HOJE = new Date('2026-09-03T10:00:00Z');

  it('uma ficha incompleta NÃO está revista, mesmo com tudo assinado', () => {
    const ficha = revisaoDaFicha([CONTEM('gluten', { revistoPor: 'Ana', revistoEm: HOJE })]);
    assert.equal(ficha.completa, false);
    assert.equal(porDeclarar([CONTEM('gluten')]), 13);
  });

  it('uma declaração sem responsável conta, e diz-se quantas', () => {
    const r = revisaoDaFicha([CONTEM('gluten'), CONTEM('leite', { revistoPor: 'Ana', revistoEm: HOJE })]);
    assert.equal(r.semResponsavel, 1);
    assert.equal(r.completa, false);
  });

  it('a data mostrada é a MAIS ANTIGA das declarações', () => {
    // Uma ficha com treze declarações de ontem e uma de hoje não está revista
    // hoje. Mostrar a mais recente dava-lhe o ar de estar.
    const r = revisaoDaFicha([
      CONTEM('gluten', { revistoPor: 'Ana', revistoEm: ONTEM }),
      CONTEM('leite', { revistoPor: 'Ana', revistoEm: HOJE }),
    ]);
    assert.equal(r.ultimaRevisao?.toISOString(), ONTEM.toISOString());
  });

  it('os catorze declarados e assinados dão a ficha completa', () => {
    // O lado positivo do par: sem ele, um `completa` que fosse sempre `false`
    // passava em todos os casos acima.
    const todas = ALERGENIOS_UE.map((a) => CONTEM(a, { revistoPor: 'Ana', revistoEm: HOJE }));
    const r = revisaoDaFicha(todas);
    assert.equal(r.completa, true);
    assert.equal(porDeclarar(todas), 0);
  });
});
