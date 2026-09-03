import { notFound, redirect } from 'next/navigation';
import { Botao, Etiqueta, Tabela } from '@bossaos/ui';
import { formatarDataHora, formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { CANAIS, historicoDeRevisoes, listarUnidades, publicacaoActual } from '@bossaos/db';
import type { Canal } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-026 · "Historial del catálogo" (atlas p. 76)
 *
 * A linha do tempo do que esteve no ar. Serve uma pergunta concreta, e é a que
 * se faz **depois** de uma reclamação: *"o que é que a carta dizia no dia 4?"*.
 *
 * Por isso restaurar **cria uma revisão nova** e o número nunca recua. Uma
 * história que se reescreve deixa de responder à pergunta que existe para
 * responder — e o botão diz isso ao lado, em vez de o deixar por descobrir.
 */
export default async function Historico({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; menuId: string }>;
  searchParams: Promise<{ canal?: string; restaurado?: string }>;
}) {
  const { idioma, orgSlug, menuId } = await params;
  const procura = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.publicacaoE08;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const canal: Canal = (CANAIS as readonly string[]).includes(procura.canal ?? '')
    ? (procura.canal as Canal) : 'CARTA';

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const menu = await db.menu.findFirst({ where: { id: menuId }, select: { id: true, nome: true } });
    if (!menu) return null;
    const unidades = await listarUnidades(db);
    return {
      menu,
      revisoes: await historicoDeRevisoes(db, menuId),
      actual: await publicacaoActual(db, menuId, canal),
      fuso: unidades[0]?.fuso ?? 'UTC',
      unidadeId: unidades[0]?.id ?? '',
    };
  });
  if (!dados) notFound();

  const { menu, revisoes, actual, fuso, unidadeId } = dados;
  const porId = new Map(revisoes.map((r) => [r.id, r.numero]));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaHistorico}</p>
          <h1>{menu.nome}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/catalogo/menus/${menuId}/publicar`}>
          {c.tituloPublicar}
        </a>
      </div>

      <Tabela
        legenda={c.tituloHistorico}
        colunas={[
          { chave: 'numero', rotulo: c.colunaRevisao, numero: true },
          { chave: 'quando', rotulo: c.colunaQuando },
          { chave: 'quem', rotulo: c.colunaQuem },
          { chave: 'origem', rotulo: c.accaoRestaurar },
          { chave: 'estado', rotulo: m.catalogoE07.colunaEstado },
        ]}
        linhas={revisoes.map((r) => ({
          id: r.id,
          numero: formatarNumero(r.numero, idioma),
          quando: formatarDataHora(r.createdAt, idioma, fuso),
          quem: r.criadaPor,
          // Uma revisão que nasceu de restaurar diz de qual: sem isso, o
          // histórico mostra duas revisões iguais e nada explica porquê.
          origem: r.restauraDeId
            ? c.restauraDe.replace('{n}', String(porId.get(r.restauraDeId) ?? '?'))
            : '—',
          estado: r.id === actual?.revisao.id ? c.noAr : '',
        }))}
        celula={(linha, coluna) =>
          coluna.chave === 'estado'
            ? (linha.estado ? <Etiqueta tom="sucesso">{linha.estado}</Etiqueta> : (
                <form method="post" action={`/api/org/${orgSlug}/menus/${menuId}/restaurar`}>
                  <input type="hidden" name="idioma" value={idioma} />
                  <input type="hidden" name="canal" value={canal} />
                  <input type="hidden" name="locationId" value={unidadeId} />
                  <input type="hidden" name="revisionId" value={linha.id} />
                  <Botao type="submit" tom="secundario">
                    {c.accaoRestaurar}
                  </Botao>
                </form>
              ))
            : linha[coluna.chave]}
        vazio={c.porPublicar}
      />
      <p className="bo-planos__nota">{c.notaRestauro}</p>
    </div>
  );
}
