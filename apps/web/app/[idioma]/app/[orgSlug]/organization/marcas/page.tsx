import { redirect } from 'next/navigation';
import { Botao, Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { estadoComercial, listarMarcas, podeCapacidade } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-002 · "Marcas de la organización" (atlas p. 39)
 *
 * O CSV marca esta tela como **Pro**, e o que isso quer dizer é *gerir várias*,
 * não *ver a sua*. Uma organização com uma marca vê a marca que tem em qualquer
 * plano; o que a quota decide é se pode criar outra — e é por isso que a acção
 * "Crear marca" fica desactivada em vez de a página desaparecer. Esconder a
 * página deixava quem tem uma marca sem sítio nenhum para lhe mudar o nome.
 *
 * O contador de produtos que o atlas desenha não está aqui: o catálogo é de uma
 * etapa posterior e "86 productos" seria um número inventado.
 */
export default async function MarcasDaOrganizacao({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const { marcas, podeCriar } = await comEscopoDoPedido(sessao, async (db) => {
    const lista = await listarMarcas(db);
    const estado = await estadoComercial(db, sessao.contexto.organizationId);
    return {
      marcas: lista,
      podeCriar: podeCapacidade(estado, {
        capacidade: 'marcas', intencao: 'criar', usoActual: lista.length,
      }).permitido,
    };
  });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.marca.sobrancelha}</p>
          <h1>{m.marca.tituloLista}</h1>
        </div>
        <Botao disabled={!podeCriar}>{m.marca.accaoCriar}</Botao>
      </div>

      <Tabela
        legenda={m.marca.tituloLista}
        colunas={[
          { chave: 'nome', rotulo: m.marca.colunaMarca },
          { chave: 'slug', rotulo: m.arranque.marca.identificador },
        ]}
        linhas={marcas.map((b) => ({ id: b.id, nome: b.nome, slug: b.slug }))}
        celula={(linha, coluna) =>
          coluna.chave === 'nome'
            ? <a href={`/${idioma}/app/${orgSlug}/organization/marcas/${linha.id}`}>{linha.nome}</a>
            : linha[coluna.chave]}
        vazio={m.plataforma.semRegistos}
      />
      <p className="bo-planos__nota">
        {m.plataforma.registosMostrados.replace('{n}', formatarNumero(marcas.length, idioma))}
        {podeCriar ? '' : ` · ${m.marca.quotaEsgotada}`}
      </p>
    </div>
  );
}
