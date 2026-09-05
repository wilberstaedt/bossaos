import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { carregarModelos } from '../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/** CRM-010 · «Mensajes reutilizables» (atlas) */
export default async function Modelos({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).crmE27;
  const { unidade, modelos } = await carregarModelos(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="CRM-010">{t.modelos}</h1>
        </div>
      </div>
      <p data-teste="quantos-modelos">{modelos.length}</p>
      {modelos.length === 0 ? <p data-teste="sem-modelos">{t.semModelos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="modelos">
          {modelos.map((m) => (
            <li key={m.id}>
              <span data-teste="nome">{m.nome}</span>
              <span data-teste="canal">{m.canal}</span>
              <span data-teste="assunto">{m.assunto ?? '—'}</span>
            </li>
          ))}
        </ul>
      )}
      <form method="post" action={`/api/org/${orgSlug}/crm`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_modelo" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.nome} name="nome" required maxLength={80} />
        <Seletor rotulo={t.canal} name="canal" required>
          <option value="EMAIL">EMAIL</option>
          <option value="SMS">SMS</option>
        </Seletor>
        <Campo rotulo={t.assunto} name="assunto" maxLength={120} />
        <Campo rotulo={t.corpo} name="corpo" required maxLength={500} />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
