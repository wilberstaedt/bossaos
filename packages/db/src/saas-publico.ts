import type { PrismaClient } from '@prisma/client';
import { assinaturaConfere } from './integracoes.ts';

/**
 * A cobrança do SaaS vista de fora — **antes de haver inquilino**.
 *
 * ── Porque é um ficheiro à parte, e porque não recebe escopo ──────────────
 *
 * Todo o resto do motor recebe um `ClienteComEscopo`, que só existe depois de
 * se saber a que organização pertence o que se vai fazer. **Aqui não se sabe.**
 * Quando o webhook chega, a única coisa conhecida é o cliente do provedor — e
 * descobrir a organização a partir dele é justamente o que a etapa protege.
 *
 * A primeira versão destas funções recebia `ClienteComEscopo`, e a rota teve de
 * inventar uma organização para lho dar: usava a **alegada** quando parecia
 * válida. Não mudava o resultado — a resolução continuava a ser da função
 * privilegiada —, mas punha o valor não confiável no caminho, e o próximo a ler
 * a rota veria a alegação a ser usada e concluiria que era de confiança.
 *
 * **Um valor que não autoriza não deve viajar por onde os valores que autorizam
 * viajam.** A assinatura destas funções não tem por onde receber uma
 * organização, e por isso a rota não tem como lha dar.
 */

export async function receberEventoDeCobrancaPublico(
  prisma: PrismaClient,
  dados: {
    readonly provedor: string;
    readonly provedorEventoId: string;
    readonly tipo: string;
    readonly provedorClienteId: string;
    readonly planoCodigo: string | null;
    /** O que o corpo disse. Guarda-se para se poder denunciar; nunca decide. */
    readonly organizationIdAlegado: string | null;
    readonly corpoCru: string;
    readonly assinatura: string | null;
    readonly segredo: string;
  },
) {
  const confere = assinaturaConfere(dados.corpoCru, dados.assinatura, dados.segredo);

  // Reenviar é normal — a rede falha. A identidade é a do provedor.
  const jaExiste = await prisma.saasBillingEvent.findFirst({
    where: { provedor: dados.provedor, provedorEventoId: dados.provedorEventoId },
  });
  if (jaExiste) return jaExiste;

  return prisma.saasBillingEvent.create({
    data: {
      provedor: dados.provedor,
      provedorEventoId: dados.provedorEventoId,
      tipo: dados.tipo,
      provedorClienteId: dados.provedorClienteId,
      planoCodigo: dados.planoCodigo,
      organizationIdAlegado: dados.organizationIdAlegado,
      corpoCru: dados.corpoCru,
      assinaturaConfere: confere,
    },
  });
}

/**
 * Manda aplicar. **O único argumento é o evento.**
 *
 * Não há por onde passar uma organização, e é essa a garantia: a função
 * privilegiada resolve-a pela `saas_customers`, e esta camada não tem palavra
 * nenhuma a dizer sobre isso.
 */
export async function aplicarEventoDeCobrancaPublico(
  prisma: PrismaClient, eventoId: string,
): Promise<'RECEBIDO' | 'SEM_VINCULO' | 'APLICADO' | 'RECUSADO'> {
  const linhas = await prisma.$queryRaw<{ aplicar_evento_de_cobranca: string }[]>`
    SELECT aplicar_evento_de_cobranca(${eventoId}::uuid)`;
  return linhas[0]?.aplicar_evento_de_cobranca as
    'RECEBIDO' | 'SEM_VINCULO' | 'APLICADO' | 'RECUSADO';
}
