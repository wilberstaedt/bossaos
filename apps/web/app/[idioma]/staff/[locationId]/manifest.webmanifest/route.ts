import { NextResponse } from 'next/server';
import { eIdioma, mensagensDe } from '@bossaos/i18n';

export const dynamic = 'force-dynamic';

/**
 * O manifesto do Staff PWA — **um por unidade**, e é essa a decisão.
 *
 * ── `start_url` aponta para a unidade, não para a raiz ───────────────────
 *
 * O atalho fica no telemóvel de quem trabalha naquela sala. Um manifesto único
 * na raiz punha toda a gente a abrir na mesma página e a ter de escolher a
 * unidade outra vez, todos os turnos — e num telemóvel de trabalho isso é a
 * diferença entre uma aplicação e um marcador.
 *
 * Pela mesma razão o endereço leva o **identificador** e não o `slug`: um `slug`
 * renomeado deixava o atalho impresso a apontar para nada, e é a mesma família de
 * defeito do endereço público do E10.
 *
 * ── Não exige sessão, e não devolve nada de dentro ───────────────────────
 *
 * Um manifesto é pedido pelo navegador **sem credenciais** — pedi-las daria um
 * manifesto que nunca carrega. Por isso este responde a toda a gente, e por isso
 * só diz o que não é privado: o nome da aplicação, o endereço de arranque e as
 * cores. Nada aqui vem da base de dados, e o identificador da unidade já estava
 * no endereço de quem o pediu.
 */
export async function GET(
  _pedido: Request,
  ctx: { params: Promise<{ idioma: string; locationId: string }> },
) {
  const { idioma, locationId } = await ctx.params;
  if (!eIdioma(idioma)) return NextResponse.json({ erro: 'idioma' }, { status: 404 });
  const s = mensagensDe(idioma).staffE15;

  return NextResponse.json({
    name: s.nomeDaApp,
    short_name: s.nomeDaApp,
    description: s.descricaoDaApp,
    start_url: `/${idioma}/staff/${locationId}`,
    scope: `/${idioma}/staff/`,
    display: 'standalone',
    orientation: 'portrait',
    lang: idioma,
    background_color: '#ffffff',
    theme_color: '#1f2933',
    icons: [
      { src: `/${idioma}/staff/icone.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }, { headers: { 'content-type': 'application/manifest+json' } });
}
