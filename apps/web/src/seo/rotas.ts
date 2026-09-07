/**
 * Que endereços públicos existem, e quais entram no sitemap.
 *
 * ── Porque é que a fonte NÃO é a `COBERTURA_TELAS.csv` ────────────────────
 *
 * A instrução dizia «o sitemap é gerado do atlas». Fui ver o que o atlas dá
 * para a família MKT, e ele **não sabe responder a esta pergunta**:
 *
 *   · `MKT-002` e `MKT-003` são `/[locale]?section=product` e `?section=plans`
 *     — **o mesmo byte da home**. Está medido no `06_O_PORTAO_DE_COBERTURA.md`:
 *     `force-static` serve o mesmo `md5` para as três. Três entradas de sitemap
 *     para uma página é conteúdo duplicado declarado por nós próprios.
 *   · `MKT-006` diz `/[locale]/onboarding`, e a rota real é `/getting-started`.
 *     A divergência é do atlas e está registada como **RV100-020**, aceite.
 *   · `MKT-011` é `/demo/thanks` e `MKT-012` é a `/404` — nenhuma das duas se
 *     indexa: uma é o destino de um POST, a outra já declara `index: false`.
 *
 * O atlas é o registo dos **IDs**, e é excelente nisso — é o que mantém os 396.
 * Não é um mapa de endereços indexáveis, e a prova é que três dos seus doze MKT
 * dariam entradas erradas.
 *
 * ── Então a lista é escrita à mão? Não: é escrita e VIGIADA ───────────────
 *
 * A objecção da instrução é a certa: *«uma lista à mão fica velha na primeira
 * rota nova»*. Por isso esta lista não vive sozinha — a `validar-seo.sh`
 * compara-a com **o sistema de ficheiros** e reprova quando aparece uma pasta
 * de rota pública que ninguém classificou.
 *
 * Uma rota nova obriga a uma decisão explícita: indexável ou não. Não há
 * omissão silenciosa em nenhum dos dois sentidos — que é mais do que um glob
 * daria, porque um glob indexaria sozinho a próxima rota autenticada.
 */

/** Os caminhos públicos da família comercial, relativos a `/{idioma}`. */
export const ROTAS_INDEXAVEIS = [
  '',
  '/product',
  '/plans',
  '/getting-started',
  '/pilot',
  '/trust',
  '/faq',
  '/demo',
  '/privacy',
] as const;

export type RotaIndexavel = (typeof ROTAS_INDEXAVEIS)[number];

/**
 * Públicas mas FORA do índice, e o motivo de cada uma.
 *
 * Estar aqui é uma decisão, não um esquecimento — e é o que faz a guarda
 * conseguir distinguir as duas.
 */
export const ROTAS_PUBLICAS_NAO_INDEXAVEIS: Record<string, string> = {
  '/demo/thanks': 'destino de um POST; indexá-la punha um "obrigado" nos resultados sem o pedido',
  '/404': 'já declara robots.index=false desde o E10',
};

/**
 * Os prefixos que exigem sessão ou são internos. **Nada aqui se indexa.**
 *
 * O §6.8 pede «páginas autenticadas, previews e tokens fora de indexação», e é
 * a metade que ninguém tinha verificado.
 */
export const PREFIXOS_AUTENTICADOS = [
  '/app', '/auth', '/interno', '/kds', '/kiosk', '/onboarding',
  '/platform', '/pos', '/staff',
] as const;

/**
 * Os ficheiros que vivem na RAIZ e nunca levam idioma à frente.
 *
 * ── Isto é um defeito que a medição desta etapa encontrou ─────────────────
 *
 * O `proxy.ts` redirecciona para `/{idioma}{caminho}` tudo o que não comece por
 * `/api/` nem por `/r/`. É uma lista de excepções, e por isso **cada rota nova
 * na raiz nasce com idioma à frente** — foi o que aconteceu ao sitemap e ao
 * robots assim que existiram: `/robots.txt` respondia **307 para
 * `/es-ES/robots.txt`**.
 *
 * E `/es-ES/robots.txt` não serve para nada. O `robots.txt` é lido **só** na
 * raiz do domínio, por definição do protocolo; um rastreador nunca lá vai. O
 * sitemap seria alcançável mas ficaria com três endereços para o mesmo
 * documento, um por língua.
 *
 * O ícone e a imagem de partilha pela mesma razão: o `<link rel=icon>` e o
 * `og:image` que o Next gera apontam à raiz.
 *
 * A lista vive aqui, e não escrita dentro do `proxy.ts`, porque é a mesma
 * pergunta que este ficheiro já responde — que endereços existem e o que se faz
 * a cada um.
 */
export const FICHEIROS_NA_RAIZ = [
  '/sitemap.xml',
  '/robots.txt',
  '/icon.png',
  '/og.png',
  '/favicon.ico',
] as const;
