import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../../src/componentes/Marketing.tsx';

/**
 * MKT-011 · «Tu solicitud está enviada» (atlas p. 18)
 *
 * ── Só se chega aqui DEPOIS de a gravação ter corrido ─────────────────────
 *
 * Esta página não sabe gravar nada e não devia: é o destino de um
 * redireccionamento que a rota `/api/publico/demo` só emite quando a porta da
 * base devolveu. Se a gravação falhar, o redireccionamento é para `/demo?erro=`
 * e esta página nunca aparece.
 *
 * É o que faz "falha real não mostra sucesso" ser uma propriedade do caminho, e
 * não uma promessa: não há por onde chegar a este ecrã sem ter passado por lá.
 */
export const dynamic = 'force-dynamic';

export default async function Obrigado({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ repetido?: string }>;
}) {
  const { idioma } = await params;
  const { repetido } = await searchParams;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/demo" sufixo="/demo/thanks">
      <section className="bo-mkt__heroi">
        <h1>{k.obrigadoTitulo}</h1>
        <p className="bo-publico__texto">{k.obrigadoTexto}</p>
        {repetido === '1' ? (
          <Aviso tom="info" titulo={k.obrigadoTitulo}>{k.demoRepetido}</Aviso>
        ) : null}
        <p className="bo-mkt__chamada">
          <a className="bo-botao bo-botao--secundario" href={`/${idioma}/product`}>
            {k.verProduto}
          </a>
        </p>
      </section>
    </MolduraMkt>
  );
}
