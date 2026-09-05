import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Seletor } from '@bossaos/ui';
import { carregarCrm } from '../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * CRM-003 · «Une contactos duplicados» (atlas)
 *
 * O produto **não adivinha** que duas pessoas são a mesma. Junta quando alguém
 * o decide — e o absorvido não se apaga, porque quem for ver uma visita antiga
 * tem de chegar à pessoa certa.
 */
export default async function Juntar({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).crmE27;
  const { unidade, clientes } = await carregarCrm(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="CRM-003">{t.juntar}</h1>
        </div>
      </div>
      <p data-teste="quantos-clientes">{clientes.length}</p>
      <form method="post" action={`/api/org/${orgSlug}/crm`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="juntar" />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.absorvido} name="absorvidoId" required>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Seletor>
        <Seletor rotulo={t.fica} name="ficaId" required>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Seletor>
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
