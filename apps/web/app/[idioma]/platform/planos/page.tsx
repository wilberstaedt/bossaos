import { redirect } from 'next/navigation';
import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { catalogoDePlanos, comIdentidade, obterPrisma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';
import { CartoesDePlano } from '../../../../src/componentes/CartoesDePlano.tsx';

export const dynamic = 'force-dynamic';

/**
 * PLAT-011 · "Catálogo de planes" (atlas p. 369)
 *
 * A mesma grelha das telas do cliente, e é de propósito: se o interno e o
 * externo mostrassem listas diferentes, a diferença seria descoberta por um
 * cliente ao telefone. É a mesma leitura da mesma tabela.
 *
 * **Sem preços, também aqui.** É o ecrã onde mais apeteceria pô-los — é o
 * catálogo comercial — e é exactamente por isso que a ausência tem de ser
 * visível: o preço não existe em coluna nenhuma do produto, e "Precio según
 * propuesta" é o que o atlas escreve nos três cartões.
 */
export default async function CatalogoDePlanos({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const catalogo = await comIdentidade(prisma, actor.id, (db) => catalogoDePlanos(db));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.planos.sobrancelhaCatalogo}</p>
          <h1>{m.planos.tituloCatalogo}</h1>
        </div>
        {/* Saiu pelo mesmo motivo: o aviso abaixo já diz que a edição é E33. */}
      </div>
      <CartoesDePlano idioma={idioma} catalogo={catalogo} />
      <Aviso titulo={m.planos.accaoCatalogo}>{m.plataforma.escritaPorScript}</Aviso>
    </div>
  );
}
