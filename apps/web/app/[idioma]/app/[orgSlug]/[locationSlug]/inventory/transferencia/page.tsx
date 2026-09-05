import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { listarUnidades } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarStock } from '../../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INV-011 · «Transferencia entre unidades» (atlas)
 *
 * ── Dois movimentos, e não um ────────────────────────────────────────────
 *
 * Uma saída aqui e uma entrada lá. Um só movimento «transferência» faria o
 * saldo das duas unidades depender de quem o lê — e mercadoria em trânsito
 * estaria disponível nos dois sítios ao mesmo tempo, que é como se vende duas
 * vezes a mesma caixa.
 */
export default async function TransferenciaEntreUnidades({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).stockE25;
  const base = await carregarStock(idioma, orgSlug, locationSlug);
  const unidades = (await comEscopoDoPedido(
    base.sessao, (db) => listarUnidades(db),
  )) as { id: string; nome: string }[];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{base.unidade.nome}</p>
          <h1 data-tela="INV-011">{t.transferencia}</h1>
        </div>
      </div>
      <p data-teste="quantos-insumos">{base.insumos.length}</p>
      <form method="post" action={`/api/org/${orgSlug}/stock`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="transferir" />
        <input type="hidden" name="locationId" value={base.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.insumo} name="itemId" required>
          {base.insumos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
        </Seletor>
        <Seletor rotulo={t.porUnidade} name="paraLocationId" required>
          {unidades.filter((u) => u.id !== base.unidade.id)
            .map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </Seletor>
        <Campo rotulo={t.quantidade} name="quantidade" type="text" inputMode="numeric" required />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
