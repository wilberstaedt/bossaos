import { redirect } from 'next/navigation';
import { Botao, Campo, Cartao, Seletor } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMarcas } from '@bossaos/db';
import {
  actorDoPedido, comEscopoDoPedido, organizacoesDoActor, resolverPedido,
} from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ONB-005 · "Importa tu carta" (atlas p. 29)
 *
 * O mesmo motor do CAT-027, no passo do arranque. **A diferença é uma só, e é a
 * que importa:** aqui a estratégia nem sequer aparece — no arranque não há nada
 * para actualizar, por definição, e mostrar a escolha era pedir uma decisão
 * sobre um caso que não existe.
 *
 * Fica `criar_apenas` fixo. Quem já tem catálogo e quer sincronizar vai ao
 * CAT-027, onde a escolha é real.
 *
 * E **saltar é uma saída**, não um botão escondido: uma carta importa-se quando
 * há um ficheiro, e obrigar a passar por aqui faz quem não tem inventar um.
 */
export default async function ImportarNoArranque({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ org?: string; erro?: string }>;
}) {
  const { idioma } = await params;
  const { org, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.publicacaoE08;

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);
  const minhas = await organizacoesDoActor(actor.id);
  const activa = minhas.find((o) => o.slug === org) ?? minhas.find((o) => o.estado === 'ACTIVO');
  if (!activa) redirect(`/${idioma}/onboarding/organizacao`);

  const sessao = await resolverPedido(activa.slug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);
  const marcas = await comEscopoDoPedido(sessao, (db) => listarMarcas(db));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaImportar}</p>
          <h1>{c.tituloImportarArranque}</h1>
        </div>
      </div>
      {erro ? <p className="bo-campo__erro">{erro}</p> : null}

      <Cartao>
        <form method="post" action={`/api/org/${activa.slug}/importacoes`}
              encType="multipart/form-data" className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          {/* No arranque não há nada para actualizar. A escolha existe no
              CAT-027, onde é uma decisão a sério. */}
          <input type="hidden" name="estrategia" value="criar_apenas" />
          <input type="hidden" name="arranque" value="1" />
          <div className="bo-forma__grelha">
            <Seletor rotulo="Marca" name="brandId" required>
              {marcas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </Seletor>
            <Campo rotulo={c.ficheiro} name="ficheiro" type="file" accept=".csv,text/csv" required />
            <Seletor rotulo={c.separador} name="separador" defaultValue="">
              <option value="">{m.arranque.porEscolher}</option>
              <option value=";">;</option>
              <option value=",">,</option>
            </Seletor>
          </div>
          <Botao type="submit">{c.accaoPrevisualizar}</Botao>
        </form>
        <p className="bo-planos__nota">{c.notaPrevia}</p>
      </Cartao>

      <div className="bo-estado__accoes">
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/onboarding/menu?org=${activa.slug}`}>{c.tituloMenuInicial}</a>
      </div>
    </div>
  );
}
