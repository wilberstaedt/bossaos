import type { MetadataRoute } from 'next';
import { IDIOMAS } from '@bossaos/i18n';
import { PREFIXOS_AUTENTICADOS, ROTAS_PUBLICAS_NAO_INDEXAVEIS } from '../src/seo/rotas.ts';
import { absoluto } from '../src/seo/origem.ts';

/**
 * O `robots.txt`, derivado da mesma classificação que o sitemap.
 *
 * ── Cinto E suspensórios, e os dois são precisos ──────────────────────────
 *
 * As rotas autenticadas já não se indexam pelo `robots` da moldura, que nega
 * por omissão. Isto repete a negação **em texto**, e não é redundância inútil:
 * a etiqueta `noindex` só actua depois de a página ser pedida e lida, e uma
 * rota de sessão devolve um redireccionamento ou um 401 a quem não tem sessão —
 * ou seja, o rastreador pode nunca chegar a ver a etiqueta que o mandava
 * embora. O `robots.txt` diz-lhe para não bater à porta.
 *
 * O `/api/` entra pela mesma razão, e é a parte de «tokens fora de indexação»:
 * as rotas de API não têm HTML onde pôr uma etiqueta.
 */
export default function robots(): MetadataRoute.Robots {
  const naoIndexaveis = Object.keys(ROTAS_PUBLICAS_NAO_INDEXAVEIS);
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        // `/{idioma}/{prefixo}/` para as três línguas: os caminhos reais levam
        // sempre a língua à frente, e um `/staff` sem ela não casa com nada.
        ...IDIOMAS.flatMap((idioma) =>
          PREFIXOS_AUTENTICADOS.map((prefixo) => `/${idioma}${prefixo}/`)),
        ...IDIOMAS.flatMap((idioma) =>
          naoIndexaveis.map((rota) => `/${idioma}${rota}`)),
      ],
    }],
    sitemap: absoluto('/sitemap.xml'),
  };
}
