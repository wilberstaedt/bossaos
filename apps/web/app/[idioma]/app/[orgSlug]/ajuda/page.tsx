import { notFound } from 'next/navigation';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { resolverPedido } from '../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * HELP-001 · «Centro de ayuda» (atlas p. 274)
 *
 * ── Uma central de ajuda que não inventa respostas ────────────────────────
 *
 * Não há base de conhecimento escrita, e fingir uma — com artigos gerados que
 * ninguém revi — seria pior do que não ter: alguém confiaria num passo errado a
 * meio de um serviço.
 *
 * O que esta tela faz é o que é verdadeiro e útil hoje: leva aos três sítios que
 * existem — abrir um pedido, ver os que já abriu, e ver se o problema é nosso.
 * O último é o que evita metade dos pedidos.
 */
export default async function CentralDeAjuda({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();
  const base = `/${idioma}/app/${orgSlug}/ajuda`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{orgSlug}</p>
          <h1 data-tela="HELP-001">{s.ajuda}</h1>
        </div>
      </div>

      <nav className="bo-lista bo-lista--blocos" aria-label={s.ajuda}>
        {/* O estado do sistema PRIMEIRO: é o que evita metade dos pedidos. */}
        <a className="bo-lista__ligacao" data-seccao="HELP-004" href={`${base}/estado`}>
          {s.estadoDoSistema}
        </a>
        <a className="bo-lista__ligacao" data-seccao="HELP-002" href={`${base}/novo`}>
          {s.abrirTicket}
        </a>
        <a className="bo-lista__ligacao" data-seccao="HELP-003" href={`${base}/meus`}>
          {s.meusTickets}
        </a>
      </nav>
    </div>
  );
}
