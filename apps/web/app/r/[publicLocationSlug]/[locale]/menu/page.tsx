import { notFound } from 'next/navigation';
import { Etiqueta, variaveisDoTema } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { abertoAgora, cartaPublica, horarioPublico, registarConsulta, temaPublico } from '@bossaos/db';
import { IDIOMAS_DE_CONTEUDO, procurarNaCarta, type IdiomaDeConteudo } from '@bossaos/domain';
import { obterBase, obterLogger } from '../../../../../src/servidor.ts';

/**
 * MENU-001 a 004 e 019 · a carta pública (atlas pp. 78-82, 96)
 *
 * ── A primeira superfície que um estranho vê ───────────────────────────────
 *
 * Até aqui tudo era interno: quem entrava tinha sessão. Aqui não há sessão, e por
 * isso não há `app.organization_id` — a leitura passa pela porta estreita
 * `publico_carta`, que só devolve o que está **publicado** naquele canal.
 *
 * O que esta página manda para o navegador é a **projecção**, e a projecção é uma
 * lista de permissão: o SKU, o custo e a margem não existem do lado de cá porque
 * nunca foram lidos, e não porque alguém se lembrou de os apagar.
 *
 * ── Os quatro estados são o mesmo endereço ─────────────────────────────────
 *
 * O atlas desenha MENU-001 a 004 e 019 como ecrãs; são **um endereço com
 * parâmetros**, e é assim de propósito. Um QR impresso aponta para aqui, e
 * escolher idioma, filtrar categoria ou procurar não pode mudar o endereço
 * impresso na mesa.
 *
 * Tudo por GET, sem JavaScript: quem chega por QR está num telemóvel com a rede
 * do restaurante, e uma carta que precisa de JavaScript para filtrar é uma carta
 * que às vezes não abre.
 */
export const dynamic = 'force-dynamic';

const ORIGENS = ['qr', 'link', 'directo', 'motor-de-busca'] as const;

export default async function CartaPublica({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
  searchParams: Promise<{ view?: string; categoria?: string; q?: string; de?: string }>;
}) {
  const { publicLocationSlug, locale } = await params;
  const procura = await searchParams;

  const idioma: IdiomaDeConteudo = (IDIOMAS_DE_CONTEUDO as readonly string[]).includes(locale)
    ? (locale as IdiomaDeConteudo) : 'es-ES';
  const m = mensagensDe(idioma as Idioma);
  const c = m.publicoE09;

  const prisma = obterBase();
  const servida = await cartaPublica(prisma, publicLocationSlug, 'CARTA', idioma);
  // Endereço que não existe, unidade arquivada e nada publicado dão a MESMA
  // resposta. Dizer "existe mas não publicou" a um estranho é contar que o
  // restaurante existe.
  if (!servida) notFound();

  // ── O tema tem de CHEGAR aqui, e não só existir na base ────────────────
  //
  // A régua do E12 diz que o ataque é ler a cor que o NAVEGADOR calcula na rota
  // pública. Até agora nenhuma rota pública aplicava tema: as cores estavam
  // guardadas e a página servia a paleta BossaOS a toda a gente.
  //
  // É o mesmo defeito que o E09 escondeu — as classes existiam, o ficheiro é que
  // não chegava à página —, com outro nome.
  const tema = await temaPublico(prisma, publicLocationSlug);

  const horario = await horarioPublico(prisma, publicLocationSlug);
  const abertura = horario ? abertoAgora(horario) : null;

  // A origem é uma CATEGORIA e vem de um parâmetro fechado — nunca o `Referer`,
  // que é ele próprio um dado sobre a pessoa.
  const origem = (ORIGENS as readonly string[]).includes(procura.de ?? '')
    ? (procura.de as (typeof ORIGENS)[number]) : 'directo';
  const contagem = await registarConsulta(prisma, {
    organizationId: servida.organizationId,
    locationId: servida.locationId,
    revisionId: servida.revisionId,
    idioma, canal: 'CARTA', origem,
  });
  // Uma contagem que falha não impede a carta de ser servida — mas também não
  // desaparece em silêncio, que foi o defeito que este caminho já teve.
  if (!contagem.contou) {
    obterLogger().warn('consulta não contada', {
      erro: contagem.erro ?? 'desconhecido', slug: publicLocationSlug,
    });
  }

  const { carta } = servida;
  const termo = procura.q?.trim() ?? '';
  const encontrados = termo === '' ? null : procurarNaCarta(carta, termo);
  const categoria = procura.categoria
    ? carta.categorias.find((x) => x.id === procura.categoria)
    : undefined;
  const aMostrar = encontrados
    ? [{ id: 'busca', nome: c.buscar, produtos: encontrados }]
    : categoria ? [categoria] : carta.categorias;

  const base = `/r/${publicLocationSlug}/${idioma}/menu`;

  return (
    <div className="bo-publico" style={variaveisDoTema(tema) as React.CSSProperties}>
      <header className="bo-publico__cabecalho">
        <p className="bo-estado__sobrancelha">{carta.marca}</p>
        <h1>{carta.unidade}</h1>
        {/* Fora de horas a carta CONTINUA aqui — o que muda é o aviso. Um
            restaurante fechado que esconde a carta perde quem está a decidir
            onde vai jantar amanhã. */}
        {horario?.porConfigurar
          ? <Etiqueta tom="neutro">{c.horarioPorConfigurar}</Etiqueta>
          : abertura?.estado === 'aberto'
            ? <Etiqueta tom="sucesso">{c.abertoAgora}</Etiqueta>
            : abertura?.estado === 'fechado'
              ? <Etiqueta tom="aviso">{c.fechadoAgora}</Etiqueta>
              : <Etiqueta tom="neutro">{c.horarioPorConfigurar}</Etiqueta>}
        {abertura?.estado === 'fechado' ? (
          <div className="bo-publico__fechado">
            <h2>{c.tituloCartaFechado}</h2>
            <p>{c.notaFechado}</p>
          </div>
        ) : null}
      </header>

      {/* MENU-002 · o idioma é uma ligação, não um formulário: continua a
          funcionar sem JavaScript e o endereço fica partilhável. */}
      <nav className="bo-publico__idiomas" aria-label={c.tuIdioma}>
        {IDIOMAS_DE_CONTEUDO.map((x) => (
          <a key={x} href={`/r/${publicLocationSlug}/${x}/menu`}
             aria-current={x === idioma ? 'page' : undefined}>
            {x}
          </a>
        ))}
      </nav>

      {/* MENU-004 · a busca é um GET. */}
      <form method="get" className="bo-publico__busca" role="search">
        <label htmlFor="q" className="bo-so-leitor">{c.buscar}</label>
        <input id="q" name="q" type="search" defaultValue={termo}
               placeholder={c.buscar} className="bo-campo__controlo" />
        <button type="submit" className="bo-botao bo-botao--secundario">{c.buscar}</button>
      </form>

      {/* MENU-003 · as categorias, também por ligação. */}
      <nav className="bo-publico__categorias" aria-label={c.todasCategorias}>
        <a href={base} aria-current={!categoria && !encontrados ? 'page' : undefined}>
          {c.todasCategorias}
        </a>
        {carta.categorias.map((x) => (
          <a key={x.id} href={`${base}?categoria=${x.id}`}
             aria-current={categoria?.id === x.id ? 'page' : undefined}>
            {x.nome}
          </a>
        ))}
      </nav>

      {encontrados?.length === 0 ? <p className="bo-publico__vazio">{c.semResultados}</p> : null}

      {aMostrar.map((cat) => (
        <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
          <h2 id={`cat-${cat.id}`}>{cat.nome}</h2>
          <ul className="bo-publico__lista">
            {cat.produtos.map((p) => (
              <li key={p.id} className="bo-publico__produto">
                <a href={`${base}/produto/${p.id}`}>
                  <span className="bo-publico__nome">{p.nome}</span>
                  {/* Sem preço diz-se com palavras. Um zero ofereceria o prato. */}
                  <span className="bo-publico__preco">
                    {p.preco ? formatarDinheiro(p.preco, idioma as Idioma) : c.semPreco}
                  </span>
                </a>
                {p.descricao ? <p className="bo-publico__descricao">{p.descricao}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {carta.categorias.length === 0 ? <p className="bo-publico__vazio">{c.semCarta}</p> : null}

      <footer className="bo-publico__rodape">
        <p>{c.assinatura}</p>
      </footer>
    </div>
  );
}
