import { notFound, redirect } from 'next/navigation';
import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { gruposDoProduto, obterProduto } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-012 · "Opciones y extras" (atlas p. 64)
 *
 * O ecrã mostra os limites; **não é ele quem os aplica**. O aceite 2 do E07 é
 * explícito: os modificadores têm de ser *"validados também por chamada direta
 * da API"*. Um mínimo e um máximo desenhados aqui e verificados só aqui são uma
 * sugestão: quem chamar a rota com `curl` passa por cima deles.
 *
 * Quem valida é `validarEscolhasDoProduto`, que lê os limites **da base** e não
 * do que o cliente enviou. Está provado em `provas/catalogo.test.ts`, chamando a
 * função directamente, sem formulário nenhum pelo meio.
 */
export default async function OpcoesDoProduto({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; productId: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { idioma, orgSlug, productId } = await params;
  const { guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const produto = await obterProduto(db, productId);
    if (!produto) return null;
    return { produto, grupos: await gruposDoProduto(db, productId) };
  });
  if (!dados) notFound();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaOpcoes}</p>
          <h1>{dados.produto.nome}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`/${idioma}/app/${orgSlug}/catalogo/opcoes`}>
          {c.tituloBiblioteca}
        </a>
      </div>
      {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}

      {dados.grupos.map((g) => (
        <Cartao key={g.id}>
          <div className="bo-estado__cabecalho">
            <h2 className="bo-planos__nome">{g.nome}</h2>
            <Etiqueta tom={g.obrigatorio ? 'realce' : 'neutro'}>
              {g.obrigatorio ? c.obrigatoria : c.opcional}
            </Etiqueta>
          </div>
          <dl className="bo-estado__factos">
            <div><dt>{c.minimo}</dt><dd>{formatarNumero(g.minimo, idioma)}</dd></div>
            <div>
              <dt>{c.maximo}</dt>
              {/* Sem tecto diz-se com palavras. Um "∞" ou um campo vazio
                  seriam lidos como zero por alguém. */}
              <dd>{g.maximo === undefined ? c.semTecto : formatarNumero(g.maximo, idioma)}</dd>
            </div>
            <div><dt>{c.opcoes}</dt><dd>{formatarNumero(g.opcoes.length, idioma)}</dd></div>
          </dl>
          <ul className="bo-lista">
            {g.opcoes.map((o) => <li key={o.id}>{o.nome}</li>)}
          </ul>
          <a className="bo-botao bo-botao--secundario"
             href={`/${idioma}/app/${orgSlug}/catalogo/opcoes/${g.id}`}>{c.accaoGuardarGrupo}</a>
        </Cartao>
      ))}
      {dados.grupos.length === 0 ? <Cartao variante="suave">{m.plataforma.semRegistos}</Cartao> : null}
    </div>
  );
}
