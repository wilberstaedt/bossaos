import type { PrismaClient } from '@prisma/client';
import { comEscopo, varrerRetencoesExpiradas } from '@bossaos/db';

/**
 * Varrer as retenções que já passaram da hora, em todas as casas.
 *
 * ── Higiene, e a própria função diz que não é correcção ───────────────────
 *
 * A capacidade **já** fica livre sem isto: a `ocupacaoNoIntervalo` compara
 * `oferta_expira_em` com `now()` e não conta as expiradas. O que este varrimento
 * evita é a lista de espera encher-se de ofertas mortas no ecrã de quem trabalha
 * a sala.
 *
 * A distinção é da autora da função, que a escreveu no comentário dela — e é o
 * que torna esta ligação segura em vez de um palpite: uma noite em que o worker
 * não corra não bloqueia mesa nenhuma.
 *
 * ── Uma transacção por casa, como as descidas ─────────────────────────────
 *
 * Não é ineficiência: é o `comEscopo`. Uma transacção só carrega um inquilino, e
 * varrer duas casas na mesma seria pedir à base para esquecer de quem é a linha.
 */
export interface PortasDoVarrimentoDeRetencoes {
  listar: (prisma: PrismaClient) => Promise<ReadonlyArray<{ organizationId: string; locationId: string }>>;
  varrerNuma: (prisma: PrismaClient, organizationId: string, locationId: string) => Promise<number>;
}

export const PORTAS_DE_RETENCOES: PortasDoVarrimentoDeRetencoes = {
  // Fora de qualquer escopo: a função na base recusa-se a responder de dentro de
  // um inquilino, e é isso que impede um restaurante de perguntar quem mais tem
  // ofertas por expirar.
  listar: async (prisma) => {
    const linhas = await prisma.$queryRaw<Array<{ organization_id: string; location_id: string }>>`
      SELECT * FROM unidades_com_retencoes_expiradas()`;
    return linhas.map((l) => ({ organizationId: l.organization_id, locationId: l.location_id }));
  },
  varrerNuma: (prisma, organizationId, locationId) =>
    comEscopo(prisma, { organizationId }, (db) => varrerRetencoesExpiradas(db, locationId)),
};

export interface ResumoDasRetencoes {
  unidades: number;
  limpas: number;
  falhadas: number;
}

export async function varrerRetencoes(
  prisma: PrismaClient,
  log: {
    info: (m: string, d?: Record<string, unknown>) => void;
    error: (m: string, d?: Record<string, unknown>) => void;
  },
  portas: PortasDoVarrimentoDeRetencoes = PORTAS_DE_RETENCOES,
): Promise<ResumoDasRetencoes> {
  const unidades = await portas.listar(prisma);
  const resumo: ResumoDasRetencoes = { unidades: unidades.length, limpas: 0, falhadas: 0 };

  for (const { organizationId, locationId } of unidades) {
    try {
      resumo.limpas += await portas.varrerNuma(prisma, organizationId, locationId);
    } catch (erro) {
      // Uma casa que falha não pára as outras. O varrimento é higiene: perder
      // uma volta numa unidade custa ofertas mortas num ecrã, e parar o ciclo
      // custa-as em todas.
      resumo.falhadas += 1;
      log.error('retenções: varrimento falhou', {
        organizationId, locationId,
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }
  return resumo;
}
