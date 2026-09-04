import { notFound } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { historicoDoPedido, obterPedido } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../../src/pedido-da-pagina.ts';
import { LinhasDoPedido } from '../../../../../../../../src/componentes/LinhasDoPedido.tsx';

export const dynamic = 'force-dynamic';

/**
 * ORD-004 · «Edita el borrador» (atlas p. 140) — e o CONFLITO RECUPERÁVEL.
 *
 * ── «Recuperável» é a palavra do aceite 2 ────────────────────────────────
 *
 * *«Um 409 que obriga a refazer o pedido do zero cumpre a letra e falha a
 * pessoa.»* Quando a gravação falha por versão desactualizada, esta página
 * mostra: a versão que está agora na base, **o que mudou entretanto e por quem**,
 * e as linhas como estão. A pessoa continua daqui.
 *
 * O formulário volta com a versão ACTUAL já preenchida — não para esconder o
 * conflito, mas porque depois de o ler a pessoa quer poder gravar sem ir procurar
 * um número a outro lado.
 */
export default async function EditarPedido({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; orderId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, orderId } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);

  const { pedido, historico } = await comEscopoDoPedido(sessao, async (db) => ({
    pedido: await obterPedido(db, orderId),
    historico: await historicoDoPedido(db, orderId),
  }));
  if (!pedido || pedido.locationId !== unidade.id) notFound();

  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/orders`;
  const houveConflito = typeof busca.conflito === 'string';

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{pedido.numero}</p>
          <h1>{p.editar}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/${orderId}`}>{m.comum.voltar}</a>
      </div>

      {houveConflito ? (
        <Aviso tom="aviso" urgente titulo={p.conflito}>
          <p>{p.conflitoAjuda}</p>
          <dl className="bo-estado__factos">
            <dt>{p.versao}</dt>
            <dd>{pedido.versao}</dd>
            <dt>{p.mudou}</dt>
            <dd>
              <ul className="bo-lista">
                {historico.slice(-5).reverse().map((e) => (
                  <li key={e.id}>
                    {e.accao} · {e.actorEmail} · {formatarHora(e.createdAt, idioma)}
                  </li>
                ))}
              </ul>
            </dd>
          </dl>
        </Aviso>
      ) : null}

      <Cartao titulo={p.linhas}>
        {/* As linhas como estão AGORA. Sem elas, «recuperar» era escrever de novo. */}
        <LinhasDoPedido idioma={idioma} linhas={pedido.linhas.map((l) => ({
          id: l.id, nome: l.nome, quantidade: l.quantidade,
          precoMenor: l.precoMenor, precoPropostoMenor: l.precoPropostoMenor,
          moeda: l.moeda, estado: String(l.estado),
          motivoRejeicao: l.motivoRejeicao ? String(l.motivoRejeicao) : null,
        }))} />

        <form method="post" action={`/api/org/${orgSlug}/pedidos`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="guardar" />
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="versao" value={pedido.versao} />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="estado">{p.estado}</label>
            <select className="bo-campo__controlo" id="estado" name="estado" defaultValue={pedido.estado}>
              {/* ── `EM_PREPARO` e `PRONTO` SAÍRAM desta lista (E16) ──────────
                  Não é arrumação: são estados de PRODUÇÃO e passaram a derivar
                  das tarefas das estações. Deixá-los aqui era oferecer a alguém
                  a criação da segunda verdade que o contrato proíbe — e a base
                  recusa-os agora com um gatilho, portanto isto era um selector
                  que dava erro a quem o usasse.
                  Quem quer saber se está pronto olha ao KDS, que conta as
                  tarefas; quem quer forçar não pode, e é essa a decisão. */}
              {['RASCUNHO', 'ACEITE', 'ENTREGUE'].map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{p.accaoGuardar}</button>
          </div>
        </form>
      </Cartao>
    </div>
  );
}
