import { redirect } from 'next/navigation';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { catalogoDePlanos, comIdentidade, obterPrisma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';
import { CartoesDePlano } from '../../../../src/componentes/CartoesDePlano.tsx';

export const dynamic = 'force-dynamic';

/**
 * ONB-004 · "Elige cómo empezar" (atlas p. 31, passo 4 de 10)
 *
 * Está em `/onboarding/plano` e não em `/onboarding` porque o ONB-009 do E04 já
 * ocupa a raiz. O CSV dá a mesma rota sugerida às duas — *"família; compor na
 * E00"* — e a família parte-se por passo.
 *
 * **Sem preços.** O atlas escreve "Precio según propuesta" nos três cartões, o
 * catálogo na base não tem coluna de preço e o prompt do E05 diz "não invente
 * mensalidades". Um número aqui seria uma promessa comercial que ninguém tomou.
 */
export default async function EscolherPlano({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  // O catálogo é global e não tem inquilino: quem ainda está a escolher plano
  // pode nem ter organização. Lê-se pelo caminho de identidade.
  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const catalogo = await comIdentidade(prisma, actor.id, (db) => catalogoDePlanos(db));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.planos.sobrancelhaArranque}</p>
          <h1>{m.planos.tituloArranque}</h1>
        </div>
        {/* "Seleccionar plan" saiu: não existe POST de plano. */}
      </div>
      <CartoesDePlano idioma={idioma} catalogo={catalogo} />
    </div>
  );
}
