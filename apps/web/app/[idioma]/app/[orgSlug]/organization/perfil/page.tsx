import { redirect } from 'next/navigation';
import { Aviso, Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { lerPerfil, perfilCompleto } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { CampoPorEscolher } from '../../../../../../src/componentes/CampoPorEscolher.tsx';
import { fusos, MOEDAS, PAISES } from '../../../../../../src/componentes/opcoes.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-001 · "Perfil de la organización" (atlas p. 38)
 *
 * O mesmo formulário do ONB-001, agora a editar. A diferença que interessa: os
 * selectores mostram o valor **guardado** — e quando não há valor guardado
 * mostram "por escolher", não o primeiro da lista. Um perfil incompleto tem de
 * se ver que está incompleto.
 */
export default async function PerfilDaOrganizacao({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const { guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const a = m.arranque;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);
  const perfil = await comEscopoDoPedido(sessao, (db) => lerPerfil(db, sessao.contexto.organizationId));

  return (
    <div className="bo-pagina">
      <form method="post" action={`/api/org/${orgSlug}/perfil`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{m.preferencias.sobrancelha}</p>
            <h1>{a.org.titulo}</h1>
          </div>
          <Botao type="submit">{m.comum.guardar}</Botao>
        </div>

        {guardado ? <Aviso tom="sucesso" titulo={m.comum.guardado} /> : null}
        {perfilCompleto(perfil) ? null : (
          // Não é um erro: é um facto. País e fuso em falta impedem saber que
          // horas são e que regras se aplicam, e a lista de arranque conta com
          // isso — dizer aqui poupa uma viagem.
          <Aviso tom="aviso" titulo={a.itemOrganizacao}>{a.faltamPaisEFuso}</Aviso>
        )}

        <div className="bo-forma__grelha">
          <Campo rotulo={a.org.nomeComercial} name="nome" defaultValue={perfil?.nome ?? ''} required />
          <Campo rotulo={a.org.nomeLegal} name="nomeLegal" defaultValue={perfil?.nomeLegal ?? ''}
                 placeholder={a.porConfirmar} />
          <CampoPorEscolher rotulo={a.org.pais} name="pais" opcoes={PAISES}
                            valor={perfil?.pais} rotuloVazio={a.porEscolher} />
          <CampoPorEscolher rotulo={a.org.fuso} name="fuso" opcoes={fusos()}
                            valor={perfil?.fuso} rotuloVazio={a.porEscolher} />
          <CampoPorEscolher rotulo={a.org.moeda} name="moedaPadrao" opcoes={MOEDAS}
                            valor={perfil?.moedaPadrao} rotuloVazio={a.porEscolher}
                            ajuda={a.moedaSugestao} />
          <Campo rotulo={a.org.responsavel} name="responsavel" defaultValue={perfil?.responsavel ?? ''} />
        </div>
        <p className="bo-planos__nota">{a.guardadoNoAmbito}</p>
      </form>
    </div>
  );
}
