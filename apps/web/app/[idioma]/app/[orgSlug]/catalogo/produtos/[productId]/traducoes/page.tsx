import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Etiqueta } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { obterProduto, traducoesDoProduto } from '@bossaos/db';
import { IDIOMAS_DE_CONTEUDO } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-015 · "Traduce el producto" (atlas p. 67)
 *
 * ── Três estados, não dois ─────────────────────────────────────────────────
 *
 * `pendente` é "foi escrita e ninguém confirmou". `obsoleta` é "foi confirmada e
 * **depois** o original mudou" — e essa é a perigosa, porque tem assinatura e
 * data e por isso parece verificada. Colapsá-las num "por rever" faria a segunda
 * desaparecer dentro da primeira.
 *
 * O texto original fica **ao lado**, e não atrás de um separador: quem revê uma
 * tradução obsoleta precisa de ver o que mudou, e ir buscá-lo a outro ecrã é o
 * que faz a pessoa carregar em "revista" sem comparar.
 *
 * Não há aqui botão de tradução automática. **Não é uma omissão**: não há
 * fornecedor configurado, e o ecrã di-lo em vez de mostrar um botão que falha.
 */
export default async function TraducoesDoProduto({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; productId: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { idioma, orgSlug, productId } = await params;
  const { guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.publicacaoE08;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const produto = await obterProduto(db, productId);
    if (!produto) return null;
    return { produto, traducoes: await traducoesDoProduto(db, productId) };
  });
  if (!dados) notFound();

  const { produto, traducoes } = dados;
  const porIdioma = new Map((traducoes?.linhas ?? []).map((l) => [l.idioma, l]));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaTraducoes}</p>
          <h1>{produto.nome}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/catalogo/traducoes`}>{c.tituloLote}</a>
      </div>
      {guardado ? <Aviso tom="sucesso" titulo={m.catalogoE07.guardado} /> : null}

      <Cartao variante="suave">
        <h2 className="bo-planos__nome">{c.textoOriginal}</h2>
        <p>{produto.nome}</p>
        <p className="bo-uso__nota">{produto.descricao ?? '—'}</p>
      </Cartao>

      {IDIOMAS_DE_CONTEUDO.map((lingua) => {
        const t = porIdioma.get(lingua);
        const estado = t?.estado;
        return (
          <Cartao key={lingua}>
            <div className="bo-estado__cabecalho">
              <h2 className="bo-planos__nome">{lingua}</h2>
              <Etiqueta tom={
                estado === 'revisada' ? 'sucesso'
                  : estado === 'obsoleta' ? 'aviso'
                  : estado === 'pendente' ? 'info' : 'neutro'
              }>
                {estado === 'revisada' ? c.estadoRevisada
                  : estado === 'obsoleta' ? c.estadoObsoleta
                  : estado === 'pendente' ? c.estadoPendente
                  : c.semTraducao}
              </Etiqueta>
            </div>

            {estado === 'obsoleta'
              ? <Aviso tom="aviso" titulo={c.estadoObsoleta}>{c.notaObsoleta}</Aviso> : null}

            <form method="post"
                  action={`/api/org/${orgSlug}/produtos/${productId}/traducoes`}
                  className="bo-forma">
              <input type="hidden" name="idioma" value={idioma} />
              <input type="hidden" name="lingua" value={lingua} />
              <div className="bo-forma__grelha">
                <Campo rotulo={m.catalogoE07.nome} name="nome" defaultValue={t?.nome ?? ''} required />
                <Campo rotulo={m.catalogoE07.descricao} name="descricao" defaultValue={t?.descricao ?? ''} />
              </div>
              <label className="bo-campo__envolvente">
                {/*
                  Marcar como revista grava a impressão do original DE AGORA. Não
                  vem do formulário: se viesse, quem quisesse silenciar o aviso
                  mandava a impressão actual com um texto velho.
                */}
                <input type="checkbox" name="revista" value="1" />
                <span>{c.marcarRevisada}</span>
              </label>
              {t?.revistoPor ? (
                <p className="bo-uso__nota">
                  {`${m.catalogoE07.revistoPor} ${t.revistoPor}`}
                  {t.revistoEm ? ` · ${formatarData(t.revistoEm, idioma)}` : ''}
                </p>
              ) : null}
              <Botao type="submit">{c.accaoGuardarTraducao}</Botao>
            </form>
          </Cartao>
        );
      })}

      {/* A pendência declarada, no ecrã e não só no documento. */}
      <p className="bo-planos__nota">{c.notaSemFornecedor}</p>
    </div>
  );
}
