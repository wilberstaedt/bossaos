import type { MetadataRoute } from 'next';
import { IDIOMAS } from '@bossaos/i18n';
import { ROTAS_INDEXAVEIS } from '../src/seo/rotas.ts';
import { absoluto } from '../src/seo/origem.ts';

/**
 * O sitemap: 9 rotas × 3 línguas, derivadas e não escritas.
 *
 * ── Nem uma linha desta lista está aqui ───────────────────────────────────
 *
 * As rotas vêm de `ROTAS_INDEXAVEIS` e as línguas de `IDIOMAS`. Uma rota
 * comercial nova aparece aqui por acrescentar-se lá — e a `validar-seo.sh`
 * reprova se existir uma pasta de rota pública que ninguém classificou, o que
 * fecha o caminho de a esquecer nos dois sítios.
 *
 * ── E cada entrada leva as suas irmãs ─────────────────────────────────────
 *
 * O `alternates.languages` repete, por entrada, os endereços das três línguas.
 * Sem isso o sitemap declara 27 páginas independentes e deixa a versão
 * espanhola a competir com a portuguesa pela mesma consulta — que é o defeito
 * que o `hreflang` existe para evitar e que um sitemap sem alternates recria.
 *
 * ── O que NÃO está aqui ───────────────────────────────────────────────────
 *
 * `/demo/thanks` e `/404`: as duas são públicas e nenhuma se indexa, e o motivo
 * de cada uma está escrito em `ROTAS_PUBLICAS_NAO_INDEXAVEIS` — no sítio onde a
 * decisão se lê, e não como ausência silenciosa aqui.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return IDIOMAS.flatMap((idioma) =>
    ROTAS_INDEXAVEIS.map((rota) => ({
      url: absoluto(`/${idioma}${rota}`),
      // A home acima das outras: é a única distinção de prioridade que
      // corresponde a um facto (é a porta), e não a uma opinião sobre quais
      // páginas importam mais.
      priority: rota === '' ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          IDIOMAS.map((x) => [x, absoluto(`/${x}${rota}`)]),
        ),
      },
    })),
  );
}
