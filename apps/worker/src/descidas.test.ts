import { test } from 'node:test';
import assert from 'node:assert/strict';
import { varrerDescidas, type PortasDoVarrimento } from './descidas.ts';
import type { PrismaClient } from '@prisma/client';

/**
 * O laço do varrimento.
 *
 * A descida em si é medida contra a base a sério em `provas/descidas.test.ts`.
 * O que só existe aqui é o **laço**: uma organização por transacção, e uma que
 * falha não levar as outras. Esse comportamento não se mede sem uma base de
 * dados a portar-se mal de propósito — daí as portas injectáveis.
 *
 * Não é abstracção por gosto. É a diferença entre "o varrimento correu" e "o
 * varrimento continuou depois de uma organização rebentar", que num trabalho de
 * fundo é a diferença entre nove restaurantes atendidos e nenhum.
 */
const nada = null as unknown as PrismaClient;
const silencio = { info: () => {}, error: () => {} };

function registador() {
  const erros: Array<Record<string, unknown> | undefined> = [];
  return { log: { info: () => {}, error: (_m: string, d?: Record<string, unknown>) => { erros.push(d); } }, erros };
}

test('sem nada agendado, não faz nada e diz que não fez', async () => {
  const portas: PortasDoVarrimento = {
    listar: async () => [],
    aplicarNuma: async () => assert.fail('não devia ter tocado em organização nenhuma'),
  };
  assert.deepEqual(await varrerDescidas(nada, silencio, portas), {
    encontradas: 0, aplicadas: 0, adiadas: 0, falhadas: 0,
  });
});

test('separa aplicadas de adiadas — não são a mesma coisa', async () => {
  const portas: PortasDoVarrimento = {
    listar: async () => ['a', 'b'],
    aplicarNuma: async (_p, org) =>
      org === 'a'
        ? { aplicada: true, de: 'PRO', para: 'STARTER', temaRevertido: true }
        : { aplicada: false, motivo: 'pendencias', pendencias: [{ tipo: 'caixa_aberta', detalhe: 'x' }] },
  };
  assert.deepEqual(await varrerDescidas(nada, silencio, portas), {
    encontradas: 2, aplicadas: 1, adiadas: 1, falhadas: 0,
  });
});

test('uma organização que rebenta NÃO leva as outras', async () => {
  // É esta a razão de o laço existir em vez de um `Promise.all`. Com dez
  // restaurantes na fila, o primeiro a falhar deixaria nove por atender — e o
  // registo diria "o varrimento falhou", sem dizer em qual.
  const { log, erros } = registador();
  const portas: PortasDoVarrimento = {
    listar: async () => ['a', 'rebenta', 'c'],
    aplicarNuma: async (_p, org) => {
      if (org === 'rebenta') throw new Error('ligação perdida');
      return { aplicada: true, de: 'PRO', para: 'STARTER', temaRevertido: false };
    },
  };
  assert.deepEqual(await varrerDescidas(nada, log, portas), {
    encontradas: 3, aplicadas: 2, adiadas: 0, falhadas: 1,
  });
  // E o erro nomeia a organização. "O varrimento falhou" sem dizer em qual é um
  // registo que obriga quem for chamado às três da manhã a adivinhar.
  assert.equal(erros.length, 1);
  assert.equal(erros[0]?.organizationId, 'rebenta');
  assert.match(String(erros[0]?.erro), /ligação perdida/);
});

test('CONTROLO NEGATIVO: se o laço parasse à primeira falha, o teste de cima cairia', async () => {
  // Sem esta, "falhadas: 1" passaria num varrimento que rebentasse e devolvesse
  // um resumo a meio. Aqui a falha é a ÚLTIMA: se o laço parasse, as duas
  // anteriores continuariam contadas e o defeito não aparecia. Por isso a falha
  // do teste anterior está no MEIO, e esta confirma que a ordem importa.
  const portas: PortasDoVarrimento = {
    listar: async () => ['rebenta', 'b', 'c'],
    aplicarNuma: async (_p, org) => {
      if (org === 'rebenta') throw new Error('logo à primeira');
      return { aplicada: false, motivo: 'nada_agendado' };
    },
  };
  assert.deepEqual(await varrerDescidas(nada, silencio, portas), {
    encontradas: 3, aplicadas: 0, adiadas: 2, falhadas: 1,
  });
});
