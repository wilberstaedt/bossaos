import { redirect } from 'next/navigation';
import { Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, obterPrisma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-015 · «Entregas de eventos» (atlas p. 245)
 *
 * ── O que esta tela mostra, e o que deliberadamente NÃO mostra ────────────
 *
 * Mostra o **estado** das entregas de todos os inquilinos: quantas saíram,
 * quantas falharam, quantas desistiram. É a pergunta que se faz daqui: «a
 * canalização está a funcionar?».
 *
 * Não mostra o **corpo**. Um corpo de webhook leva dados do restaurante — o que
 * ele vendeu, a que horas, a quem —, e quem opera a plataforma não tem nenhuma
 * razão para os ler ao passar. Se um dia for preciso investigar um corpo
 * específico, isso é um acesso de suporte com motivo e prazo, e é o E33 que o
 * desenha.
 *
 * A garantia está na projecção: o `corpo` não entra na consulta. Não é que
 * alguém se lembre de o esconder — é que ele não é lido.
 */
export default async function WebhooksGlobais({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const entregas = await comIdentidade(prisma, actor.id, (db) =>
    db.webhookDelivery.findMany({
      // Lista de PERMISSÃO. O `corpo` e a `assinatura` ficam de fora.
      select: {
        id: true, evento: true, versao: true, estado: true,
        tentativas: true, criadoEm: true, respostaEstado: true,
      },
      orderBy: { criadoEm: 'desc' }, take: 50,
    }));

  const rotulo = (estado: string): string => {
    const v = (s as unknown as Record<string, unknown>)[`entregaEstado${estado}`];
    return typeof v === 'string' ? v : estado;
  };

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.webhooks}</p>
          <h1 data-tela="PLAT-015">{s.webhooksGlobais}</h1>
        </div>
      </div>

      <p data-teste="quantas">{entregas.length}</p>
      <ul className="bo-lista bo-lista--blocos" data-teste="entregas">
        {entregas.map((e: {
          id: string; evento: string; versao: number; estado: string;
          tentativas: number; criadoEm: Date; respostaEstado: number | null;
        }) => (
          <li key={e.id} data-teste="entrega">
            <span>{e.evento} v{e.versao}</span>{' '}
            <Etiqueta tom={
              e.estado === 'ENTREGUE' ? 'sucesso'
                : e.estado === 'DESISTIU' ? 'perigo'
                : e.estado === 'FALHOU' ? 'aviso' : 'neutro'
            }>{rotulo(e.estado)}</Etiqueta>
            <p className="bo-campo__ajuda">
              {formatarDataHora(e.criadoEm, idioma)}
              {e.respostaEstado === null ? '' : ` · HTTP ${e.respostaEstado}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
