import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo } from '@bossaos/ui';
import { carregarCrm } from '../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/** CRM-001 · «Tus clientes» (atlas) */
export default async function Clientes({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).crmE27;
  const { unidade, clientes } = await carregarCrm(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/customers`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="CRM-001">{t.clientes}</h1>
        </div>
      </div>
      {/* A frase que esta etapa inteira existe para respeitar. */}
      <p data-teste="servico-nao-da-campanha">{t.servicoNaoDaCampanha}</p>
      <p data-teste="quantos-clientes">{clientes.length}</p>
      {clientes.length === 0 ? <p data-teste="sem-clientes">{t.semClientes}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="clientes">
          {clientes.map((c) => (
            <li key={c.id}>
              <a className="bo-lista__ligacao" href={`${base}/${c.id}`}>{c.nome}</a>
              <span data-teste="origem">{c.origem ?? '—'}</span>
              <span data-teste="saldo">{String(c.saldoPontos)}</span>
            </li>
          ))}
        </ul>
      )}
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="segmentos" href={`${base}/segmentos`}>{t.segmentos}</a>
        <a className="bo-botao" data-seccao="campanhas" href={`${base}/campanhas`}>{t.campanhas}</a>
        <a className="bo-botao" data-seccao="modelos" href={`${base}/modelos`}>{t.modelos}</a>
        <a className="bo-botao" data-seccao="fidelidade" href={`${base}/fidelidade`}>{t.fidelidade}</a>
        <a className="bo-botao" data-seccao="vozes" href={`${base}/vozes`}>{t.voz}</a>
        <a className="bo-botao" data-seccao="origens" href={`${base}/origens`}>{t.origens}</a>
        <a className="bo-botao" data-seccao="juntar" href={`${base}/juntar`}>{t.juntar}</a>
      </nav>
      <form method="post" action={`/api/org/${orgSlug}/crm`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_cliente" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.nome} name="nome" required maxLength={120} />
        <Campo rotulo={t.email} name="email" type="email" maxLength={160} />
        <Campo rotulo={t.telefone} name="telefone" maxLength={40} />
        <Campo rotulo={t.origem} name="origem" maxLength={60} />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
