import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../src/pedido-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-004 · «Reglas de pedidos» (atlas p. 323)
 *
 * ── «Sem valor» não é «ilimitado» ────────────────────────────────────────
 *
 * `maximoPorLinha` é anulável, e a página diz por palavras o que isso quer dizer:
 * **por configurar**. É a mesma regra dos alergénios, do DNS e dos preços — a que
 * a `PRECIFICACAO.md` escreve como «um campo sem valor não vira gratuito,
 * ilimitado nem integração activa».
 *
 * Um «∞» aqui seria uma política que ninguém decidiu, a proteger-se atrás de um
 * símbolo.
 */
export default async function RegrasDePedidos({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);

  const regras = await comEscopoDoPedido(sessao, (db) =>
    db.orderRules.findFirst({ where: { locationId: unidade.id } }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{p.regras}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={p.regras}>{m.comum.guardado}</Aviso> : null}

      <Cartao titulo={p.regras}>
        <dl className="bo-estado__factos">
          <dt>{p.aceitacaoAutomatica}</dt>
          <dd>{regras?.aceitacaoAutomatica === false ? m.tema.bloqueada : m.tema.aberta}</dd>
          <dt>{p.maximoPorLinha}</dt>
          <dd>{regras?.maximoPorLinha ?? p.porConfigurar}</dd>
        </dl>
        <p className="bo-campo__ajuda">{p.porConfigurarAjuda}</p>
      </Cartao>
    </div>
  );
}
