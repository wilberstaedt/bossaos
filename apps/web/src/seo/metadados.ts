import type { Metadata } from 'next';
import { IDIOMAS, mensagensDe, type Idioma } from '@bossaos/i18n';
import { ORIGEM, absoluto } from './origem.ts';
import type { RotaIndexavel } from './rotas.ts';

/**
 * Os metadados de uma rota comercial, nas três línguas.
 *
 * ── Um sítio só, e não vinte `export const metadata` ──────────────────────
 *
 * A `[idioma]/layout.tsx` declarava **um** título — `'BossaOS'` — e **uma**
 * descrição, em português, para as rotas comerciais todas, incluindo a
 * espanhola, que é a língua do piloto. Não era descuido de tradução: era um
 * objecto **estático** num layout que gera três construções.
 *
 * A correcção não pode ser vinte objectos escritos à mão, porque vinte
 * objectos à mão são vinte sítios onde a próxima rota se esquece de um. Isto é
 * a função que os produz, e o `TITULOS` abaixo é o único sítio onde se diz que
 * rota usa que chave.
 *
 * ── O que cada campo faz, e porque nenhum é decoração ─────────────────────
 *
 * `title`/`description`  saem do i18n, na língua da rota. Nunca escritos aqui.
 * `alternates.canonical` diz qual é o endereço oficial **desta** língua.
 * `alternates.languages` nomeia as três, e é o que impede a versão espanhola e
 *                        a portuguesa de competirem uma com a outra.
 * `openGraph`            o que se vê quando alguém partilha a ligação. Sem
 *                        isto, uma partilha mostra o endereço cru.
 * `robots`               explícito, e não herdado: uma rota comercial que
 *                        deixasse de ser indexável por omissão seria invisível
 *                        e ninguém daria por isso.
 *
 * ── O que NÃO está aqui, e é deliberado ───────────────────────────────────
 *
 * **Zero dados estruturados.** O §6.8 permite-os «somente para factos
 * verdadeiros», e os factos que um JSON-LD comercial normalmente carrega —
 * `aggregateRating`, `reviewCount`, número de clientes — **não existem**: a
 * superfície comercial inteira tem zero prova social, por decisão. Um dado
 * estruturado é uma afirmação para uma máquina, e vale-lhe a mesma regra que
 * ao resto: se uma guarda não o prova, não se escreve. Não os ponho para
 * preencher um campo.
 */

/** A chave de i18n de cada rota. É aqui que se diz qual, e só aqui. */
export const TITULOS: Record<string, { titulo: string; descricao: string }> = {
  '': { titulo: 'seoHomeTitulo', descricao: 'seoHomeDescricao' },
  '/product': { titulo: 'seoProdutoTitulo', descricao: 'seoProdutoDescricao' },
  '/plans': { titulo: 'seoPlanosTitulo', descricao: 'seoPlanosDescricao' },
  '/getting-started': { titulo: 'seoImplantacaoTitulo', descricao: 'seoImplantacaoDescricao' },
  '/pilot': { titulo: 'seoPilotoTitulo', descricao: 'seoPilotoDescricao' },
  '/trust': { titulo: 'seoConfiancaTitulo', descricao: 'seoConfiancaDescricao' },
  '/faq': { titulo: 'seoPerguntasTitulo', descricao: 'seoPerguntasDescricao' },
  '/demo': { titulo: 'seoDemoTitulo', descricao: 'seoDemoDescricao' },
  '/privacy': { titulo: 'seoPrivacidadeTitulo', descricao: 'seoPrivacidadeDescricao' },
  '/demo/thanks': { titulo: 'seoObrigadoTitulo', descricao: 'seoObrigadoDescricao' },
};

/**
 * O caminho da imagem de partilha.
 *
 * Vive em `apps/web/public/` e não em `app/`: dentro de `app/` o Next só
 * reconhece os nomes das convenções (`icon`, `opengraph-image`, `favicon`), e
 * um ficheiro com outro nome não é servido — `/og.png` respondia **500**.
 *
 * Não uso a convenção `opengraph-image.png` de propósito: com ela o texto
 * alternativo vem de um `.alt.txt` ao lado, que é UM ficheiro e portanto UMA
 * língua. O alt desta imagem diz que o restaurante é de demonstração, e essa
 * frase tem de existir nas três — por isso a imagem fica estática e os
 * metadados declaram-na, com o alt vindo do i18n.
 */
export const OG_IMAGEM = '/og.png';
export const OG_LARGURA = 1200;
export const OG_ALTURA = 630;

export function metadadosDaRota(
  idioma: Idioma,
  rota: RotaIndexavel | '/demo/thanks',
  opcoes: { indexavel?: boolean } = {},
): Metadata {
  const indexavel = opcoes.indexavel ?? true;
  const k = mensagensDe(idioma).mktE10 as unknown as Record<string, string>;
  const chaves = TITULOS[rota];
  if (!chaves) throw new Error(`rota sem título declarado: ${rota}`);

  return {
    metadataBase: new URL(ORIGEM),
    title: k[chaves.titulo],
    description: k[chaves.descricao],
    alternates: {
      canonical: absoluto(`/${idioma}${rota}`),
      // As três, e a `x-default` para quem chega sem preferência declarada.
      // Sem ela, um motor escolhe sozinho — e escolhe mal quando o conteúdo é
      // equivalente nas três.
      languages: {
        ...Object.fromEntries(IDIOMAS.map((x) => [x, absoluto(`/${x}${rota}`)])),
        'x-default': absoluto(`/${IDIOMAS[0]}${rota}`),
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'BossaOS',
      locale: idioma,
      url: absoluto(`/${idioma}${rota}`),
      title: k[chaves.titulo],
      description: k[chaves.descricao],
      images: [{
        url: OG_IMAGEM,
        width: OG_LARGURA,
        height: OG_ALTURA,
        // O alt diz que o restaurante é de DEMONSTRAÇÃO. A imagem sai daqui
        // para redes sociais, longe do aviso que a página mostra ao lado das
        // composições — e uma captura de um restaurante inventado partilhada
        // sem marca lê-se como um cliente real.
        alt: k.ogAlt,
      }],
    },
    robots: indexavel
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}
