import { Aviso, Botao, Campo, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { lerDefinicoes } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-007 · «Preferencias de reservas» (atlas p. 347)
 *
 * ── O interruptor, e porque é que ele é diferente de «sem turnos» ──────────
 *
 * `activo` desligado quer dizer que a casa não aceita reservas. Não ter turnos
 * configurados quer dizer que a casa não sabe QUANDO aceita. São dois estados
 * diferentes e dão respostas diferentes a quem liga — e sem o interruptor, a
 * única forma de fechar as reservas era apagar os turnos, que perde a
 * configuração de quem só quer fechar uma semana.
 *
 * Nasce DESLIGADO. Uma unidade que nunca abriu este ecrã não aceita reservas: o
 * contrário seria o produto a decidir por ela.
 *
 * ── O intervalo entra antes da conta ───────────────────────────────────────
 *
 * A ajuda do campo di-lo com números, porque é a coisa desta etapa que parte em
 * silêncio: 90 minutos com 15 de intervalo ocupam 105, e aplicá-lo depois da
 * verificação é o mesmo que não o ter.
 */
export default async function PreferenciasDeReservas({
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
          <h1 data-tela="SET-007">{p.preferencias}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={p.preferencias}>{p.guardado}</Aviso> : null}

      <Cartao titulo={p.preferencias}>
        <p className="bo-campo__ajuda">{p.preferenciasAjuda}</p>
        <form method="post" action={`/api/org/${orgSlug}/reservas`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={unidade.id} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="guardar_preferencias" />
          <label className="bo-campo">
            <input type="checkbox" name="activo" value="1" defaultChecked={d.activo}
                   data-teste="activo" />
            <span>{p.activo}</span>
          </label>
          <p data-teste="estado-reservas">{d.activo ? p.ligado : p.desligado}</p>
          <Campo rotulo={p.duracao} name="duracaoPadraoMin"
                 type="text" inputMode="numeric" defaultValue={String(d.duracaoPadraoMin)} />
          <Campo rotulo={p.buffer} name="bufferMin" ajuda={p.bufferAjuda}
                 type="text" inputMode="numeric" defaultValue={String(d.bufferMin)} />
          <Botao type="submit">{m.comum.guardar}</Botao>
        </form>
      </Cartao>

      <Cartao titulo={p.seccao}>
        <p>
          <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/reservations/regras`}
             data-seccao="RES-B-012">{p.regras}</a>
        </p>
      </Cartao>
    </div>
  );
}
