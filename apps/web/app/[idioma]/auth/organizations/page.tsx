import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Botao, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { actorDoPedido, organizacoesDoActor } from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * AUTH-007 · Elige tu organización
 *
 * A lista vem das **filiações**, não de um catálogo de organizações. Quem é
 * membro de uma vê uma; quem não é membro de nenhuma não vê nada. A URL da
 * página seguinte selecciona; esta lista é o que autoriza.
 */
export default async function Organizacoes({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const orgs = (await organizacoesDoActor(actor.id)).filter((o) => o.estado === 'ACTIVO');

  return (
    <>
      <p className="bo-estado__sobrancelha">{m.organizacoes.titulo}</p>
      <h1>{m.organizacoes.titulo}</h1>
      <div className="bo-escolhas">
        {orgs.map((o, i) => (
          <Link
            key={o.id}
            href={`/${idioma}/app/${o.slug}/organization`}
            className="bo-escolha"
            aria-current={i === 0 ? 'true' : undefined}
          >
            <span>
              <span className="bo-escolha__titulo">{o.nome}</span>
              <span className="bo-escolha__detalhe">{o.slug}</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
        <Cartao variante="contornado" titulo={m.organizacoes.sessao}>
          <p className="bo-campo__ajuda">{m.organizacoes.cadaUma}</p>
        </Cartao>
      </div>
      <div>
        <Botao>{m.organizacoes.accao}</Botao>
      </div>
    </>
  );
}
