import { notFound } from 'next/navigation';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * HELP-002 · «Abrir una consulta» (atlas p. 275)
 *
 * ── O que este formulário NÃO pede ────────────────────────────────────────
 *
 * Não pede autorização de acesso à casa. Uma caixa «autorizo o suporte a entrar»
 * dentro de um pedido de ajuda é consentimento arrancado a quem está com um
 * problema — e consentimento dado sob pressão não é consentimento.
 *
 * A autorização vive na SET-010, escrita a frio, pela casa, antes de haver
 * incidente nenhum. É a mesma decisão do E27 sobre o consentimento de campanha:
 * deixar o email para haver resposta não é aceitar publicidade.
 */
export default async function AbrirTicket({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.ajuda}</p>
          <h1 data-tela="HELP-002">{s.abrirTicket}</h1>
        </div>
      </div>

      <form method="post" action={`/api/org/${orgSlug}/ajuda`}>
        <label className="bo-campo__linha">
          <span>{s.assunto}</span>
          <input type="text" name="assunto" required data-teste="assunto" />
        </label>
        <label className="bo-campo__linha">
          <span>{s.corpo}</span>
          <textarea name="corpo" required rows={6} data-teste="corpo" />
        </label>
        <button className="bo-botao" type="submit" data-teste="enviar">{s.enviar}</button>
      </form>

      {/* A política de acesso vive noutro sítio, e a ligação di-lo. */}
      <p className="bo-campo__ajuda">
        <a data-seccao="SET-010"
           href={`/${idioma}/app/${orgSlug}/ajuda/meus`}>{s.meusTickets}</a>
      </p>
    </div>
  );
}
