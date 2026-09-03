import {
  aplicarDescidaAgendada, comEscopo, descidasDevidas, registar,
  type ResultadoDaDescida,
} from '@bossaos/db';
import type { PrismaClient } from '@prisma/client';

/**
 * O trabalho de fundo do E05: efectivar as descidas de plano que chegaram à data.
 *
 * É o primeiro trabalho real do worker, que até aqui era andaime declarado. E é
 * o **job** do aceite 2 — *"entitlement expirado e flag desligada produzem
 * respostas corretas, inclusive em job e rota direta"*.
 *
 * A razão de o contrato exigir as duas superfícies é concreta: um trabalho de
 * fundo é o sítio onde alguém assume que o pedido já foi validado antes e salta
 * a verificação, porque "isto não vem da internet". Aqui não há antes — o job
 * lê o mesmo `estadoComercial` e chama a mesma `previaDeDescidaParaPlano` que o
 * ecrã de mudar de plano. Se o direito ao tema expirou, o job reverte as cores
 * exactamente como a rota devolve 402 a quem as tentar gravar.
 *
 * ── Uma organização de cada vez, cada uma na sua transacção ─────────────────
 *
 * Não é ineficiência: é o `comEscopo`. Uma transacção só carrega um inquilino,
 * e processar dez numa só exigiria trocar o contexto a meio — que é a forma
 * exacta de uma ligação em pool levar o inquilino anterior para o seguinte.
 * Uma falhar não impede as outras, e a que falha fica no registo com o motivo.
 */
export interface ResumoDoVarrimento {
  encontradas: number;
  aplicadas: number;
  adiadas: number;
  falhadas: number;
}

/**
 * As duas ligações ao mundo, injectáveis.
 *
 * Não é abstracção por gosto: sem isto, o comportamento que só existe AQUI — uma
 * organização falhar não levar as outras — não tem como ser medido sem uma base
 * de dados a portar-se mal de propósito. O `provas/descidas.test.ts` mede a
 * descida contra a base a sério; isto mede o laço.
 */
export interface PortasDoVarrimento {
  listar: (prisma: PrismaClient) => Promise<string[]>;
  aplicarNuma: (prisma: PrismaClient, organizationId: string) => Promise<ResultadoDaDescida>;
}

const PORTAS: PortasDoVarrimento = {
  listar: descidasDevidas,
  aplicarNuma: (prisma, organizationId) =>
    comEscopo(prisma, { organizationId }, async (db): Promise<ResultadoDaDescida> => {
      const resultado = await aplicarDescidaAgendada(db, organizationId);
      // O registo vai DENTRO da transacção. Auditar fora dela deixaria uma linha
      // a dizer que se desceu de plano num dia em que a descida foi desfeita
      // pelo `ROLLBACK`.
      await registar(db, organizationId, {
        accao: resultado.aplicada ? 'plano.descida.aplicada' : 'plano.descida.adiada',
        // Sem `actorId`: não foi uma pessoa. O `actorEmail` fica com o nome do
        // processo, que é a resposta honesta a "quem fez isto".
        actorEmail: 'worker',
        alvoTipo: 'subscription',
        alvoId: organizationId,
        detalhe: resultado as unknown as Record<string, unknown>,
      });
      return resultado;
    }),
};

export async function varrerDescidas(
  prisma: PrismaClient,
  log: {
    info: (m: string, d?: Record<string, unknown>) => void;
    error: (m: string, d?: Record<string, unknown>) => void;
  },
  portas: PortasDoVarrimento = PORTAS,
): Promise<ResumoDoVarrimento> {
  // Fora de qualquer escopo: a função na base recusa-se a responder de dentro de
  // um inquilino, e é isso que impede um restaurante de perguntar quem mais está
  // a descer de plano.
  const organizacoes = await portas.listar(prisma);
  const resumo: ResumoDoVarrimento = {
    encontradas: organizacoes.length, aplicadas: 0, adiadas: 0, falhadas: 0,
  };

  for (const organizationId of organizacoes) {
    try {
      const r = await portas.aplicarNuma(prisma, organizationId);

      if (r.aplicada) {
        resumo.aplicadas += 1;
        log.info('descida aplicada', { organizationId, de: r.de, para: r.para, tema_revertido: r.temaRevertido });
      } else {
        resumo.adiadas += 1;
        log.info('descida adiada', { organizationId, motivo: r.motivo });
      }
    } catch (erro) {
      // Uma organização que falha não leva as outras. E o erro é registado com
      // a organização, porque "o varrimento falhou" sem dizer em qual é um
      // registo que obriga a adivinhar.
      resumo.falhadas += 1;
      log.error('descida falhou', { organizationId, erro: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  return resumo;
}
