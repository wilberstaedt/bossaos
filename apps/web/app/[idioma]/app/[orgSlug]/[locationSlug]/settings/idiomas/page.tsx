import { notFound, redirect } from 'next/navigation';
import { Cartao, Etiqueta } from '@bossaos/ui';
import { IDIOMAS, mensagensDe, NOME_DO_IDIOMA, type Idioma } from '@bossaos/i18n';
import { listarMarcas, listarUnidades } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-002 · "Idiomas de tu experiencia" (atlas p. 342)
 *
 * ── Duas divergências, e a segunda é a que importa ─────────────────────────
 *
 * 1. O atlas lista **quatro** cartas: ES, EN, FR e PT. O produto suporta três
 *    idiomas de interface — `es-ES`, `pt-BR`, `en` — fixados no E02. Mostrar FR
 *    seria oferecer uma língua que não existe em lado nenhum do sistema.
 * 2. As linhas de carta dizem **"Publicado"** e **"En revisión"** no atlas. A
 *    carta é E07/E08 e não existe: aqui dizem que ainda não se podem medir.
 *
 * O que é real nesta tela: os idiomas de interface que existem, e o idioma
 * principal da marca — que é o que decide em que língua o conteúdo público sai
 * por omissão, e que foi escolhido no ONB-002 sem valor sugerido.
 */
export default async function IdiomasDaUnidade({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const p = m.preferencias;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    const unidade = unidades.find((u) => u.slug === locationSlug);
    if (!unidade) return null;
    return { unidade, marcas: await listarMarcas(db) };
  });
  if (!dados) notFound();

  const principal = (dados.marcas[0] as { idiomaPrincipal?: string | null } | undefined)?.idiomaPrincipal ?? null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{p.sobrancelhaIdiomas}</p>
          <h1>{p.tituloIdiomas}</h1>
        </div>
      </div>

      <div className="bo-plataforma__lista">
        <Cartao className="bo-plataforma__linha">
          <span>
            <span className="bo-tema__rotulo">{p.interfaz}</span>
            <span className="bo-uso__nota">{NOME_DO_IDIOMA[idioma]}</span>
          </span>
          <Etiqueta tom="sucesso">{m.arranque.feito}</Etiqueta>
        </Cartao>

        <Cartao className="bo-plataforma__linha">
          <span>
            <span className="bo-tema__rotulo">{m.arranque.marca.idioma}</span>
            <span className="bo-uso__nota">
              {principal ? (NOME_DO_IDIOMA[principal as Idioma] ?? principal) : m.arranque.porEscolher}
            </span>
          </span>
          <Etiqueta tom={principal ? 'sucesso' : 'aviso'}>
            {principal ? m.arranque.feito : m.arranque.pendente}
          </Etiqueta>
        </Cartao>

        {/* Uma linha por idioma que o produto SUPORTA, não por idioma que o
            atlas desenhou. E o estado é "por medir" porque a carta não existe. */}
        {IDIOMAS.map((i) => (
          <Cartao key={i} className="bo-plataforma__linha">
            <span>
              <span className="bo-tema__rotulo">{m.unidades.catalogo} · {NOME_DO_IDIOMA[i]}</span>
              <span className="bo-uso__nota">{p.cartaPorMedir}</span>
            </span>
            <Etiqueta tom="neutro">{m.arranque.porMedir}</Etiqueta>
          </Cartao>
        ))}

        <Cartao className="bo-plataforma__linha">
          <span>
            <span className="bo-tema__rotulo">{p.predeterminado}</span>
            <span className="bo-uso__nota">{p.segundoNavegador}</span>
          </span>
          <Etiqueta tom="sucesso">{m.arranque.feito}</Etiqueta>
        </Cartao>
      </div>
    </div>
  );
}
