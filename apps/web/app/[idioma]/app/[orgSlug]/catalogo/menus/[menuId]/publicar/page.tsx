import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Cartao, Etiqueta, Seletor } from '@bossaos/ui';
import { formatarDataHora, formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { CANAIS, listarUnidades, preverPublicacao, publicacaoActual } from '@bossaos/db';
import type { Canal } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-025 · "Revisa antes de publicar" (atlas p. 75)
 *
 * ── O ecrã existe para o momento em que o restaurante fica exposto ─────────
 *
 * Publicar troca o que o cliente vê. O que este ecrã mostra antes disso são
 * **duas listas que não se misturam**:
 *
 * 1. **o que muda** — acrescentado, alterado e removido, cada um com o seu
 *    rótulo. O removido é o que mais custa a notar numa lista de cinquenta
 *    linhas, e é o que um cliente encontra primeiro;
 * 2. **o que impede** — e nada aqui preenche nada. O prompt do E08 é explícito:
 *    *"não invente conteúdo para passar no checklist"*. Um produto sem preço
 *    aparece bloqueado, não publicado a zero.
 *
 * A pré-visualização passa pelo mesmo `montarRevisao` que a publicação usa. Se
 * fossem dois caminhos, o que se vê aqui e o que vai para o ar podiam divergir —
 * e divergiriam no dia em que alguém corrigisse um só deles.
 */
export default async function Publicar({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; menuId: string }>;
  searchParams: Promise<{ canal?: string; unidade?: string; publicado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug, menuId } = await params;
  const procura = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.publicacaoE08;
  const cat = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const canal: Canal = (CANAIS as readonly string[]).includes(procura.canal ?? '')
    ? (procura.canal as Canal) : 'CARTA';

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const menu = await db.menu.findFirst({
      where: { id: menuId }, select: { id: true, nome: true },
    });
    if (!menu) return null;
    const unidades = await listarUnidades(db);
    const unidade = unidades.find((u) => u.id === procura.unidade) ?? unidades[0];
    if (!unidade) return { menu, unidades, unidade: null, previa: null, actual: null };
    return {
      menu, unidades, unidade,
      previa: await preverPublicacao(db, { menuId, locationId: unidade.id, canal }),
      actual: await publicacaoActual(db, menuId, canal),
    };
  });
  if (!dados) notFound();

  const { menu, unidades, unidade, previa, actual } = dados;
  const rotulo = (chave: string) =>
    (c as unknown as Record<string, string>)[chave] ?? chave;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaPublicar}</p>
          <h1>{c.tituloPublicar}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/catalogo/menus/${menuId}/historico`}>
          {c.tituloHistorico}
        </a>
      </div>

      {procura.publicado ? <Aviso tom="sucesso" titulo={c.publicado} /> : null}
      {procura.erro === 'bloqueado'
        ? <Aviso tom="perigo" titulo={c.bloqueios} urgente>{c.notaBloqueios}</Aviso> : null}

      {/* Escolher unidade e canal é um GET: a pré-visualização é partilhável
          entre quem decide, e o botão "voltar" faz o que se espera. */}
      <Cartao>
        <form method="get" className="bo-forma__grelha">
          <Seletor rotulo={cat.unidade} name="unidade" defaultValue={unidade?.id ?? ''}>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Seletor>
          <Seletor rotulo={cat.canais} name="canal" defaultValue={canal}>
            {CANAIS.map((k) => (
              <option key={k} value={k}>
                {(cat as unknown as Record<string, string>)[`canal${k}`] ?? k}
              </option>
            ))}
          </Seletor>
          <Botao type="submit" tom="secundario">{c.accaoPrever}</Botao>
        </form>
        <p className="bo-planos__nota">
          {actual
            ? `${c.noAr}: ${c.colunaRevisao} ${formatarNumero(actual.revisao.numero, idioma)} · ${
                formatarDataHora(actual.publicadaEm, idioma, unidade?.fuso ?? 'UTC')} · ${actual.publicadaPor}`
            : c.porPublicar}
        </p>
      </Cartao>

      {previa && previa.bloqueios.length > 0 ? (
        <Cartao variante="suave">
          <h2 className="bo-planos__nome">{c.bloqueios}</h2>
          <ul className="bo-lista">
            {previa.bloqueios.map((b) => (
              <li key={`${b.productId}-${b.motivo}`}>
                <Etiqueta tom="perigo">
                  {rotulo(`motivo${b.motivo.replace(/_(.)/g, (_, x: string) => x.toUpperCase())
                    .replace(/^(.)/, (x: string) => x.toUpperCase())}`)}
                </Etiqueta>{' '}
                {b.nome}{b.detalhe ? ` (${b.detalhe})` : ''}
              </li>
            ))}
          </ul>
          {/* A frase que impede a "correcção" rápida de inventar um preço. */}
          <p className="bo-planos__nota">{c.notaBloqueios}</p>
        </Cartao>
      ) : null}

      <Cartao>
        <h2 className="bo-planos__nome">{menu.nome}</h2>
        {previa && previa.mudancas.length === 0
          ? <p className="bo-planos__nota">{c.semMudancas}</p>
          : (
            <ul className="bo-lista">
              {previa?.mudancas.map((mu) => (
                <li key={mu.productId}>
                  <Etiqueta tom={
                    mu.tipo === 'removido' ? 'aviso'
                      : mu.tipo === 'acrescentado' ? 'sucesso' : 'info'
                  }>
                    {rotulo(`mudanca${mu.tipo.replace(/^(.)/, (x: string) => x.toUpperCase())}`)}
                  </Etiqueta>{' '}
                  {mu.nome}
                  {mu.campos?.map((campo) => (
                    <span key={campo.campo} className="bo-uso__nota">
                      {` · ${campo.campo}: ${campo.antes} → ${campo.depois}`}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}

        <form method="post" action={`/api/org/${orgSlug}/menus/${menuId}/publicar`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="canal" value={canal} />
          <input type="hidden" name="locationId" value={unidade?.id ?? ''} />
          {/* Desligado quando há bloqueios — e a rota recusa na mesma, que é
              onde a recusa conta. O `disabled` é cortesia. */}
          <Botao type="submit" disabled={!previa || previa.bloqueios.length > 0}>
            {c.accaoPublicar}
          </Botao>
        </form>
        {/* Do E00: o pedido guarda um retrato. Publicar não reescreve o passado. */}
        <p className="bo-planos__nota">{c.notaPedidos}</p>
      </Cartao>
    </div>
  );
}
