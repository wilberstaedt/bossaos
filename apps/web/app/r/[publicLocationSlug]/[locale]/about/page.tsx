import { notFound } from 'next/navigation';
import { sitePublico, temaPublico } from '@bossaos/db';
import { paginaDoSite } from '@bossaos/domain';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraDoSite } from '../../../../../src/componentes/SitePublico.tsx';
import { obterBase } from '../../../../../src/servidor.ts';

/**
 * PUB-004 · «Una mesa para encontrarnos» — a página Sobre (atlas p. 11)
 *
 * ── Uma página desligada dá 404, e não uma página em branco ───────────────
 *
 * `paginaDoSite` devolve `null` quando a página não está na revisão publicada —
 * e não está lá quando o dono a deixou oculta. Aqui isso vira `notFound()`.
 *
 * A alternativa fácil, desenhar a moldura com o miolo vazio, seria pior de duas
 * maneiras: diz ao visitante que o restaurante tem uma página Sobre por escrever,
 * e dá 200 a um endereço que não tem conteúdo — o que põe uma página vazia nos
 * motores de busca com o nome do cliente em cima.
 */
export const dynamic = 'force-dynamic';

const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;

export default async function SobrePublica({
  params,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
}) {
  const { publicLocationSlug, locale } = await params;
  const idioma: Idioma = (IDIOMAS as readonly string[]).includes(locale)
    ? (locale as Idioma) : 'es-ES';
  const s = mensagensDe(idioma).sitioE10;

  const prisma = obterBase();
  const servida = await sitePublico(prisma, publicLocationSlug);
  // O tema tem de chegar à página. Ver `publico_tema` e a régua do E12: o ataque
  // é ler a cor que o NAVEGADOR calcula, e não a que o CSS declara.
  const tema = await temaPublico(prisma, publicLocationSlug);
  if (!servida) notFound();

  const pagina = paginaDoSite(servida.site, 'SOBRE');
  if (!pagina) notFound();

  return (
    <MolduraDoSite
      slug={publicLocationSlug} idioma={idioma} unidade={servida.unidade}
      marca={servida.marca} site={servida.site} tema={tema} actual="SOBRE" caminho="/about"
    >
      <section className="bo-publico__heroi">
        <h1>{pagina.titulo ?? s.sobre}</h1>
      </section>
      <div className="bo-publico__texto">
        {pagina.corpo
          ? pagina.corpo.split('\n\n').map((p, i) => <p key={i}>{p}</p>)
          : <p>{s.semConteudo}</p>}
      </div>
    </MolduraDoSite>
  );
}
