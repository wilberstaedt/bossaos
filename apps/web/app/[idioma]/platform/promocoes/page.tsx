import { redirect } from 'next/navigation';
import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { actorDoPedido } from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-012 · «Promociones de suscripción» (atlas p. 242)
 *
 * ── Esta tela declara-se vazia, e é a decisão certa ───────────────────────
 *
 * Um cupão é um desconto sobre um preço, e **o preço do SaaS não existe em
 * coluna nenhuma deste produto**: é «segundo proposta», como o catálogo de
 * planos do E05 já diz nos três cartões.
 *
 * Construir cupões sobre um preço que não existe seria inventar a metade que
 * falta — e o desconto inventado apareceria numa factura a sério. O que se faz é
 * dizer que falta o provedor, e o que ele traz: o preço confirmado.
 *
 * É a mesma escolha do E24 com o gateway e do E27 com os envios. Um ecrã que
 * parece funcionar custa mais do que um que diz que não está pronto.
 */
export default async function PromocoesDoSaas({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.dinheiroDoSaas}</p>
          <h1 data-tela="PLAT-012">{s.promocoes}</h1>
        </div>
      </div>

      <div data-teste="sem-provedor">
        <Aviso tom="info" titulo={s.semProvedor}>{s.semProvedorAjuda}</Aviso>
      </div>

      <p className="bo-campo__ajuda" data-teste="preco-por-proposta">
        {s.doisDinheiros}
      </p>
    </div>
  );
}
