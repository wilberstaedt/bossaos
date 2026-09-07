import { notFound } from 'next/navigation';
import { Etiqueta, variaveisDoTema } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { cartaPublica, temaPublico } from '@bossaos/db';
import {
  IDIOMAS_DE_CONTEUDO, avisosPorAlergenio, produtoDaCarta, type IdiomaDeConteudo,
} from '@bossaos/domain';
import { obterBaseDeEcra } from '../../../../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * MENU-005 · o detalhe do produto (atlas p. 82)
 *
 * ── Procura DENTRO da projecção, e não na base ─────────────────────────────
 *
 * Se fosse à base, este ecrã teria de repetir os filtros de publicação, de canal,
 * de estado e de visibilidade — e bastava esquecer um para o detalhe mostrar o
 * que a lista esconde. É o caminho clássico da fuga: a lista está certa e a
 * página de detalhe não.
 *
 * ── Os alérgenos, à frente de quem vai comer ───────────────────────────────
 *
 * Os catorze aparecem todos, incluindo os que **ninguém declarou**. Omitir um
 * lê-se como "não contém", que é a inferência que o E07 existe para impedir — e
 * aqui a diferença entre as duas é alguém no hospital.
 *
 * A nota por baixo diz por palavras que "sem declarar" não é "não contém", e
 * manda perguntar à equipa. É a última coisa que o produto pode fazer por quem
 * tem uma alergia.
 */
export default async function ProdutoPublico({
  params,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string; produtoId: string }>;
}) {
  const { publicLocationSlug, locale, produtoId } = await params;
  const idioma: IdiomaDeConteudo = (IDIOMAS_DE_CONTEUDO as readonly string[]).includes(locale)
    ? (locale as IdiomaDeConteudo) : 'es-ES';
  const m = mensagensDe(idioma as Idioma);
  const c = m.publicoE09;

  const prisma = obterBaseDeEcra();
  const servida = await cartaPublica(prisma, publicLocationSlug, 'CARTA', idioma);
  // O tema tem de chegar à página. Ver `publico_tema` e a régua do E12: o ataque
  // é ler a cor que o NAVEGADOR calcula, e não a que o CSS declara.
  const tema = await temaPublico(prisma, publicLocationSlug);
  if (!servida) notFound();

  const produto = produtoDaCarta(servida.carta, produtoId);
  // Um produto que não está na carta pública não existe aqui — a mesma resposta
  // que um identificador inventado.
  if (!produto) notFound();

  const base = `/r/${publicLocationSlug}/${idioma}/menu`;
  const rotulo = (chave: string) => (c as unknown as Record<string, string>)[chave] ?? chave;

  return (
    <div className="bo-publico" style={variaveisDoTema(tema) as React.CSSProperties}>
      <nav className="bo-publico__voltar">
        <a href={base}>{servida.carta.unidade}</a>
      </nav>

      <header className="bo-publico__cabecalho">
        <h1>{produto.nome}</h1>
        <p className="bo-publico__preco">
          {produto.preco ? formatarDinheiro(produto.preco, idioma as Idioma) : c.semPreco}
        </p>
        {produto.descricao ? <p>{produto.descricao}</p> : null}
      </header>

      {produto.variantes.length > 0 ? (
        <section aria-labelledby="variantes">
          <h2 id="variantes">{c.variantes}</h2>
          <ul className="bo-lista">
            {produto.variantes.map((v) => (
              <li key={v.nome}>
                {v.nome}
                {v.predefinida ? <Etiqueta tom="neutro">{m.catalogoE07.predefinida}</Etiqueta> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="alergenos">
        <h2 id="alergenos">{c.alergenos}</h2>
        <ul className="bo-publico__alergenos">
          {/* ── O tom vem do domínio, e não daqui ────────────────────────
              Isto era um encadeado de ternários a repetir a regra dos
              alérgenos. Uma cópia da regra é uma regra que a guarda não
              vigia: `validar-alergenios.sh` lê o módulo do domínio, e com o
              ternário aqui plantar-lhe um defeito não mudava NADA do que
              esta pessoa lê — o controlo acendia num sítio onde o ecrã não
              passa. Agora há um caminho só, e ele passa pela regra. */}
          {avisosPorAlergenio(
            produto.alergenos.map((a) => ({ alergenio: a.codigo, estado: a.estado })),
          ).map((a) => (
            <li key={a.alergenio}>
              <span>
                {(m.alergenios as unknown as Record<string, string>)[a.alergenio] ?? a.alergenio}
              </span>
              {/* Texto e não só cor: quem não distingue vermelho de verde tem de
                  conseguir ler a diferença entre "contém" e "não contém". */}
              <Etiqueta tom={a.tom}>{rotulo(`estado${a.estado}`)}</Etiqueta>
            </li>
          ))}
        </ul>
        {/* A última coisa que o produto pode fazer por quem tem uma alergia. */}
        <p className="bo-publico__aviso">{c.notaAlergenosPublica}</p>
      </section>

      {produto.preferencias.length > 0 ? (
        <section aria-labelledby="preferencias">
          <h2 id="preferencias">{c.preferencias}</h2>
          <ul className="bo-lista">
            {produto.preferencias.map((p) => (
              <li key={p}>
                {(m.preferenciasAlimentares as unknown as Record<string, string>)[p] ?? p}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="bo-publico__rodape">
        <p>{c.assinatura}</p>
      </footer>
    </div>
  );
}
