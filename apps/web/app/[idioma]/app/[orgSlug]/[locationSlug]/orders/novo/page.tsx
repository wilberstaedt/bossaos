import { randomUUID } from 'node:crypto';
import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarProdutos } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../src/pedido-da-pagina.ts';
import { NavegacaoDePedidos } from '../../../../../../../src/componentes/NavegacaoDePedidos.tsx';

export const dynamic = 'force-dynamic';

/**
 * ORD-003 · «Nuevo pedido manual» (atlas p. 139)
 *
 * ── A chave do comando está no formulário, e é isso o aceite 1 ────────────
 *
 * *«O `command_id` nasce no cliente, antes do envio, e sobrevive ao
 * recarregamento»* (contrato do E00). Aqui ele é gerado ao **desenhar a página** e
 * viaja num campo escondido: recarregar não o muda, e por isso submeter duas
 * vezes — porque a resposta se perdeu — não cria dois pedidos.
 *
 * Se fosse gerado no momento de submeter, cada tentativa traria uma chave nova e
 * a idempotência deixava de existir exactamente no caso em que serve.
 *
 * ── E não há preço nenhum neste formulário ───────────────────────────────
 *
 * De propósito. «Preço e dados recebidos do navegador são propostas; valores
 * oficiais vêm do catálogo e da política do servidor.» Um campo de preço aqui
 * seria um convite a discutir com o servidor.
 */
export default async function NovoPedido({
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
  const produtos = await comEscopoDoPedido(sessao, (db) => listarProdutos(db, {}));

  // Uma chave por desenho da página. Recarregar dá outra — e é o correcto:
  // recarregar é a pessoa a começar de novo, não a retentativa de um envio.
  const commandId = randomUUID();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{p.novo}</h1>
        </div>
      </div>

      <NavegacaoDePedidos idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/novo" />

      {busca.erro === 'sem_linhas' ? <Aviso tom="perigo" titulo={p.novo}>{p.linhas}</Aviso> : null}

      {produtos.length === 0 ? (
        <Aviso titulo={p.produto}>{p.semDados}</Aviso>
      ) : (
        <Cartao titulo={p.novo}>
          <form method="post" action={`/api/org/${orgSlug}/pedidos`} className="bo-forma">
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="enviar" />
            <input type="hidden" name="canal" value="SALA" />
            <input type="hidden" name="commandId" value={commandId} />

            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="productId">{p.produto}</label>
              <select className="bo-campo__controlo" id="productId" name="productId" required>
                {produtos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
            </span>
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="quantidade">{p.quantidade}</label>
              <input className="bo-campo__controlo" id="quantidade" name="quantidade"
                     type="text" inputMode="numeric" defaultValue="1" />
            </span>
            <p className="bo-campo__ajuda">{p.comandoId}: <code className="bo-tema__valor">{commandId}</code></p>
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--primario" type="submit">{p.accaoEnviar}</button>
            </div>
          </form>
        </Cartao>
      )}
    </div>
  );
}
