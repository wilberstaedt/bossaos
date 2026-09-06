import { notFound } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { pedidosDeAjuda } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * HELP-003 · «Mis consultas» (atlas p. 276)
 *
 * Quem respondeu aparece pelo **nome**. É a mesma regra do rasto: «suporte» não
 * responde à pergunta *quem me respondeu isto*, e um cliente que quer voltar à
 * conversa precisa de saber com quem falou.
 */
export default async function MeusTickets({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();
  const tickets = await comEscopoDoPedido(sessao,
    (db) => pedidosDeAjuda(db, sessao.contexto.organizationId));

  const rotulo = (estado: string): string => {
    const v = (s as unknown as Record<string, unknown>)[`ticket${estado}`];
    return typeof v === 'string' ? v : estado;
  };

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.ajuda}</p>
          <h1 data-tela="HELP-003">{s.meusTickets}</h1>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div data-teste="sem-tickets">
          <Aviso tom="info" titulo={s.meusTickets}>{s.semTickets}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="tickets">
          {tickets.map((t: {
            id: string; assunto: string; estado: string; criadoEm: Date;
            respondidoPor: string | null;
          }) => (
            <li key={t.id} data-teste="ticket">
              <span>{t.assunto}</span>{' '}
              <Etiqueta tom={t.estado === 'RESPONDIDO' ? 'sucesso' : 'neutro'}>
                {rotulo(t.estado)}
              </Etiqueta>
              <p className="bo-campo__ajuda">
                {formatarDataHora(t.criadoEm, idioma)}
                {/* Pelo nome. Um cliente que quer voltar à conversa precisa de
                    saber com quem falou. */}
                {t.respondidoPor ? ` · ${t.respondidoPor}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
