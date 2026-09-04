import { Aviso, Botao, Campo, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { lerDefinicoes } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { NavegacaoDeReservas } from '../../../../../../../src/reservas/NavegacaoDeReservas.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-012 · «Cuándo aceptar reservas» (atlas p. 148)
 *
 * ── Consultar não é reservar, e a tela di-lo ───────────────────────────────
 *
 * Estas regras decidem o que a consulta MOSTRA. A confirmação verifica tudo
 * outra vez, dentro da transacção — e quem configura tem de saber isso, senão lê
 * a disponibilidade como uma promessa.
 */
export default async function QuandoAceitar({
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
          <h1 data-tela="RES-B-012">{p.regras}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      <NavegacaoDeReservas idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
                           activa="/regras" rotulos={p} />

      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={p.regras}>{p.guardado}</Aviso> : null}

      <Cartao titulo={p.regras}>
        <p className="bo-campo__ajuda">{p.regrasAjuda}</p>
        <form method="post" action={`/api/org/${orgSlug}/reservas`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={unidade.id} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="guardar_regras" />
          <Campo rotulo={p.antecedenciaMin} name="antecedenciaMinMin"
                 type="text" inputMode="numeric" defaultValue={String(d.antecedenciaMinMin)} />
          <Campo rotulo={p.antecedenciaMax} name="antecedenciaMaxDias"
                 type="text" inputMode="numeric" defaultValue={String(d.antecedenciaMaxDias)} />
          <Campo rotulo={p.minPessoas} name="minPessoas"
                 type="text" inputMode="numeric" defaultValue={String(d.minPessoas)} />
          <Campo rotulo={p.maxPessoas} name="maxPessoas"
                 type="text" inputMode="numeric" defaultValue={String(d.maxPessoas)} />
          <label className="bo-campo">
            <input type="checkbox" name="permiteCombinacoes" value="1"
                   defaultChecked={d.permiteCombinacoes} />
            <span>{p.combinacoes}</span>
          </label>
          <Botao type="submit">{m.comum.guardar}</Botao>
        </form>
      </Cartao>
    </div>
  );
}
