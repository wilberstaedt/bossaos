import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Seletor } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { CANAIS, listarUnidades } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-003 · editar menu (atlas p. 55)
 *
 * O período é um intervalo **semiaberto** `[de, até)`, como tudo o resto no
 * produto: um menu de verão que acaba a 1 de Setembro e um de outono que começa
 * a 1 de Setembro não se sobrepõem num dia. Se fossem fechados dos dois lados,
 * haveria um dia com dois menus e ninguém saberia qual.
 *
 * As datas vão e vêm em `date`, sem hora. A rota interpreta-as no fuso da
 * unidade quando o menu tem unidade — o dia 1 de Setembro começa a horas
 * diferentes em Oropesa e em Brisbane, e o menu é do sítio.
 */
export default async function EditarMenu({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; menuId: string }>;
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug, menuId } = await params;
  const { guardado, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const menu = await db.menu.findFirst({
      where: { id: menuId },
      select: {
        id: true, nome: true, descricao: true, estado: true, version: true,
        locationId: true, periodoDe: true, periodoAte: true,
        canais: { select: { canal: true } },
      },
    });
    if (!menu) return null;
    return { menu, unidades: await listarUnidades(db) };
  });
  if (!dados) notFound();

  const { menu, unidades } = dados;
  const activos = new Set(menu.canais.map((k) => k.canal));
  const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

  return (
    <div className="bo-pagina">
      <form method="post" action={`/api/org/${orgSlug}/menus/${menuId}`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="versao" value={menu.version} />

        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{c.sobrancelhaMenus}</p>
            <h1>{c.tituloEditarMenu}</h1>
          </div>
          <Botao type="submit">{c.accaoGuardarMenu}</Botao>
        </div>

        {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}
        {erro === 'conflito_de_versao' ? <Aviso tom="perigo" titulo={c.conflito} urgente /> : null}

        <div className="bo-forma__grelha">
          <Campo rotulo={c.nome} name="nome" defaultValue={menu.nome} required />
          <Campo rotulo={c.descricao} name="descricao" defaultValue={menu.descricao ?? ''} />
          <Seletor rotulo={c.colunaAmbito} name="locationId" defaultValue={menu.locationId ?? ''}>
            <option value="">{c.ambitoMarca}</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Seletor>
          <Seletor rotulo={c.estado} name="estado" defaultValue={menu.estado}>
            <option value="RASCUNHO">{c.estadoRASCUNHO}</option>
            <option value="ACTIVO">{c.estadoACTIVO}</option>
            <option value="ARQUIVADO">{c.estadoARQUIVADO}</option>
          </Seletor>
          <Campo rotulo={c.periodo} name="periodoDe" type="date" defaultValue={dia(menu.periodoDe)} />
          <Campo rotulo={c.ate} name="periodoAte" type="date" defaultValue={dia(menu.periodoAte)} />
        </div>
        {/* Vazio nos dois lados não é um esquecimento: é uma decisão, e diz-se. */}
        <p className="bo-planos__nota">{c.todoOAno}</p>

        <Cartao>
          <h2 className="bo-planos__nome">{c.canais}</h2>
          {CANAIS.map((canal) => (
            <label key={canal} className="bo-campo__envolvente">
              <input type="checkbox" name="canal" value={canal} defaultChecked={activos.has(canal)} />
              <span>{(c as unknown as Record<string, string>)[`canal${canal}`] ?? canal}</span>
            </label>
          ))}
        </Cartao>

        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/catalogo/menus/${menuId}/ordem`}>{c.tituloOrdem}</a>
      </form>
    </div>
  );
}
