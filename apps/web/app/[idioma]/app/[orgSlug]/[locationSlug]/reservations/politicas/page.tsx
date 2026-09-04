import { Aviso, Botao, Campo, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { lerDefinicoes } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { NavegacaoDeReservas } from '../../../../../../../src/reservas/NavegacaoDeReservas.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-016 · «Política de reservas» (atlas p. 152)
 *
 * ── Duas coisas que a tela diz por palavras ────────────────────────────────
 *
 * A **tolerância de atraso** é um número que quem serve LÊ, e não um varredor:
 * «libertar uma reserva atrasada é política e acção do host, nunca uma limpeza
 * automática silenciosa». Se fosse automática, a mesa de quem está a estacionar
 * o carro era dada a outra pessoa sem ninguém decidir nada.
 *
 * O **depósito** aparece desligado e diz porquê. Um campo em falta lê-se como
 * uma funcionalidade por fazer; um campo desligado com o motivo escrito é uma
 * decisão — «até existir política comercial, pagamento e tratamento de
 * cancelamento». A base tem um `CHECK` a segurá-lo, e ligá-lo exige uma
 * migração, que é revista.
 */
export default async function PoliticasDeReserva({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const p = m.reservasE18;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const d = await comEscopoDoPedido(sessao, (db) => lerDefinicoes(db, unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="RES-B-016">{p.politicas}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      <NavegacaoDeReservas idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
                           activa="/politicas" rotulos={p} />

      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={p.politicas}>{p.guardado}</Aviso> : null}

      <Cartao titulo={p.politicas}>
        <p className="bo-campo__ajuda">{p.politicasAjuda}</p>
        <form method="post" action={`/api/org/${orgSlug}/reservas`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={unidade.id} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="guardar_politicas" />
          <Campo rotulo={p.cancelamento} name="cancelamentoAteMin"
                 type="text" inputMode="numeric" defaultValue={String(d.cancelamentoAteMin)} />
          <Campo rotulo={p.retencao} name="retencaoMin" ajuda={p.retencaoAjuda}
                 type="text" inputMode="numeric" defaultValue={String(d.retencaoMin)} />
          <Campo rotulo={p.tolerancia} name="toleranciaAtrasoMin"
                 type="text" inputMode="numeric" defaultValue={String(d.toleranciaAtrasoMin)} />
          <Botao type="submit">{m.comum.guardar}</Botao>
        </form>
      </Cartao>

      <Cartao titulo={p.deposito}>
        <dl className="bo-estado__factos">
          <dt>{p.deposito}</dt>
          <dd data-teste="deposito">{p.depositoEstado}</dd>
        </dl>
        <p className="bo-campo__ajuda">{p.depositoAjuda}</p>
      </Cartao>
    </div>
  );
}
