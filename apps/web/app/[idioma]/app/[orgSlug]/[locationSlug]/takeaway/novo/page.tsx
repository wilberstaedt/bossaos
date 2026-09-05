import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarLevar } from '../../../../../../../src/levar/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * TAKE-001 · «Pedido para llevar» (atlas)
 *
 * ── A hora é da CASA, e é aqui que ela entra ──────────────────────────────
 *
 * O que se escreve aqui é hora local. Quem a resolve é o fuso da unidade, na
 * camada de dados — e é por isso que este formulário manda `dia` e `hora`
 * separados em vez de um instante montado no navegador.
 *
 * Aqui a hora não avisa ninguém: **arranca a cozinha**. Um pedido para as 20:30
 * com 25 minutos de preparo entra em produção às 20:05, e com hora de parede
 * gravada como UTC entraria às 22:05 — comida feita duas horas depois de a
 * pessoa a ter vindo buscar.
 */
export default async function NovoPedidoParaLevar({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const t = mensagensDe(idioma).levarE20;
  const { unidade } = await carregarLevar(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="TAKE-001">{t.cliente}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/takeaway`}>{t.voltar}</a>
      </div>

      {busca.erro === 'SEM_FUSO' ? <p data-teste="erro">{String(busca.erro)}</p> : null}

      <form method="post" action={`/api/org/${orgSlug}/levar`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="novo_takeaway" />
        <Campo rotulo={t.cliente_} name="cliente" type="text" defaultValue="" required />
        {/* Dia e hora separados: o instante monta-se onde a unidade é conhecida. */}
        <Campo rotulo={t.hora} name="dia" type="date" defaultValue="" required />
        <Campo rotulo={t.hora} name="hora" type="time" defaultValue="20:30" required />
        <Botao type="submit" data-teste="criar">{t.criar}</Botao>
      </form>
    </div>
  );
}
