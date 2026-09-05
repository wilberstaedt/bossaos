import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-005 · «Nueva reserva» (atlas p. 141)
 *
 * A reserva do telefone. Passa pelo MESMO motor que a da rua — a antecedência, a
 * capacidade da zona, a exclusão da mesa — e a única diferença é a origem, que
 * fica gravada porque o relatório do RES-B-019 a separa.
 *
 * Um caminho «do host» que saltasse as verificações seria a forma mais rápida de
 * duas famílias à porta: quem atende o telefone não vê a sala.
 */
export default async function NovaReserva({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const h = m.hostE19;
  const { unidade } = await carregarReservas(idioma, orgSlug, locationSlug);

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-005" titulo={h.nova} activa="">
      {busca.erro ? <p data-teste="erro">{String(busca.erro)}</p> : null}
      <form method="post" action={`/api/org/${orgSlug}/reservas`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="nova_reserva" />
        <Campo rotulo={h.nome} name="nome" type="text" defaultValue="" required />
        <Campo rotulo={h.contacto} name="contacto" type="text" defaultValue="" required />
        <Campo rotulo={h.pessoas} name="pessoas" type="text" inputMode="numeric" defaultValue="2" />
        <Campo rotulo={h.dia} name="dia" type="date" defaultValue="" required />
        <Campo rotulo={h.hora} name="hora" type="time" defaultValue="20:00" required />
        <Campo rotulo={h.notas} name="notas" type="text" defaultValue="" />
        <Botao type="submit" data-teste="criar">{h.criar}</Botao>
      </form>
    </EstruturaDoHost>
  );
}
