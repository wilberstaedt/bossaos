/**
 * O site do restaurante: o que dele é público, e o que fica cá dentro.
 *
 * ── A mesma armadilha do E09, noutra superfície ────────────────────────────
 *
 * A régua do E10 diz que o rascunho não pode mudar o site público. Isso decide-se
 * em dois sítios, e os dois têm de estar certos:
 *
 * 1. **de onde se lê** — a porta pública lê a revisão publicada, nunca as
 *    tabelas de rascunho. Isso é a `publico_site` na base;
 * 2. **o que entra na revisão** — e é aqui.
 *
 * Uma página com `visivel = false` é o "produto oculto" desta etapa: existe no
 * rascunho, e um `...pagina` escrito por conveniência põe-na na internet aberta
 * com um `hidden` no HTML à frente. Isso não é privacidade, é uma cortina.
 *
 * ── Lista de PERMISSÃO, e não de exclusão ──────────────────────────────────
 *
 * Cada campo é lido pelo nome. O que não está escrito não sai — um campo novo no
 * rascunho é invisível por omissão. As constantes `CAMPOS_*` existem para isso
 * poder ser **medido** contra uma lista de permitidos, não de proibidos.
 */

/** As páginas que o site pode ter. Fechada: cada uma tem rota e desenho próprios. */
export const TIPOS_DE_PAGINA = ['INICIO', 'SOBRE', 'CONTACTO'] as const;
export type TipoDePagina = (typeof TIPOS_DE_PAGINA)[number];

export const CAMPOS_DE_SITE = [
  'unidade', 'marca', 'revisao', 'seo', 'redes', 'paginas', 'novidades', 'assinatura',
] as const;
export const CAMPOS_DE_PAGINA = ['tipo', 'titulo', 'corpo', 'contacto'] as const;
export const CAMPOS_DE_POST = ['slug', 'titulo', 'resumo', 'corpo', 'publicadoEm'] as const;

/** O contacto que a página de contacto mostra. Tudo isto é para ser visto. */
export interface ContactoPublico {
  morada: string | null;
  telefone: string | null;
  email: string | null;
}

export interface PaginaPublica {
  tipo: TipoDePagina;
  titulo: string | null;
  corpo: string | null;
  contacto: ContactoPublico | null;
}

export interface NovidadePublica {
  slug: string;
  titulo: string;
  resumo: string | null;
  corpo: string | null;
  /** ISO 8601. `null` é "sem data", e mostra-se como tal — nunca a de hoje. */
  publicadoEm: string | null;
}

export interface SitePublico {
  seo: { titulo: string | null; descricao: string | null };
  redes: LigacaoSocial[];
  paginas: PaginaPublica[];
  novidades: NovidadePublica[];
}

export interface LigacaoSocial {
  rede: string;
  url: string;
}

/**
 * As redes que se podem ligar. Fechada de propósito: um campo de rede livre
 * torna-se um campo de URL livre, e um campo de URL livre acaba com
 * `javascript:` lá dentro no dia em que alguém escreve um `<a href>` com ele.
 */
export const REDES = ['instagram', 'facebook', 'tripadvisor', 'youtube', 'tiktok', 'x'] as const;
export type Rede = (typeof REDES)[number];

/**
 * Aceita uma ligação social, ou diz porquê não.
 *
 * **Só `https:`.** Não é rigor decorativo: `javascript:alert(1)` é um URL válido
 * para o `URL` do Node e para o atributo `href` do navegador. Uma verificação que
 * só olhasse à forma deixava-o passar, e o próximo a ler o código concluía que
 * estava verificado.
 */
export function ligacaoSocialValida(rede: string, url: string): boolean {
  if (!(REDES as readonly string[]).includes(rede)) return false;
  let alvo: URL;
  try {
    alvo = new URL(url);
  } catch {
    return false;
  }
  return alvo.protocol === 'https:';
}

/** O que veio da base, em rascunho. Só os campos que a projecção pode ler. */
export interface RascunhoDeSite {
  seoTitulo: string | null;
  seoDescricao: string | null;
  redes: unknown;
  paginas: {
    tipo: TipoDePagina;
    visivel: boolean;
    titulo: string | null;
    corpo: string | null;
    contacto: unknown;
  }[];
  posts: {
    slug: string;
    titulo: string;
    resumo: string | null;
    corpo: string | null;
    publicadoEm: Date | null;
    visivel: boolean;
  }[];
}

function contactoDe(bruto: unknown): ContactoPublico | null {
  if (bruto === null || typeof bruto !== 'object') return null;
  const o = bruto as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null);
  const c = {
    morada: texto(o.morada),
    telefone: texto(o.telefone),
    email: texto(o.email),
  };
  return c.morada === null && c.telefone === null && c.email === null ? null : c;
}

function redesDe(bruto: unknown): LigacaoSocial[] {
  if (!Array.isArray(bruto)) return [];
  const saida: LigacaoSocial[] = [];
  for (const item of bruto) {
    if (item === null || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.rede !== 'string' || typeof o.url !== 'string') continue;
    // A verificação acontece OUTRA VEZ aqui, e não só ao gravar. Uma ligação
    // gravada antes desta regra existir continua na base, e a projecção é o
    // último sítio antes da internet aberta.
    if (!ligacaoSocialValida(o.rede, o.url)) continue;
    saida.push({ rede: o.rede, url: o.url });
  }
  return saida;
}

/**
 * O retrato que vai para a revisão publicada.
 *
 * Nada é espalhado. E o que está escondido **não entra** — não entra escondido,
 * não entra de todo.
 */
export function projectarSite(rascunho: RascunhoDeSite): SitePublico {
  const paginas: PaginaPublica[] = [];
  for (const p of rascunho.paginas) {
    if (!p.visivel) continue;
    paginas.push({
      tipo: p.tipo,
      titulo: p.titulo,
      corpo: p.corpo,
      contacto: contactoDe(p.contacto),
    });
  }

  const novidades: NovidadePublica[] = [];
  for (const n of rascunho.posts) {
    if (!n.visivel) continue;
    novidades.push({
      slug: n.slug,
      titulo: n.titulo,
      resumo: n.resumo,
      corpo: n.corpo,
      publicadoEm: n.publicadoEm ? n.publicadoEm.toISOString() : null,
    });
  }
  // A ordem é decidida aqui e não pela base: a página pública é a mesma para
  // toda a gente, e depender da ordem de chegada da consulta faz duas visitas
  // renderem coisas diferentes.
  novidades.sort((a, b) => (b.publicadoEm ?? '').localeCompare(a.publicadoEm ?? ''));

  return {
    seo: { titulo: rascunho.seoTitulo, descricao: rascunho.seoDescricao },
    redes: redesDe(rascunho.redes),
    paginas,
    novidades,
  };
}

/** A novidade pedida, ou `null`. Nunca a primeira da lista. */
export function novidadeDoSite(site: SitePublico, slug: string): NovidadePublica | null {
  return site.novidades.find((n) => n.slug === slug) ?? null;
}

/** A página pedida, ou `null` — que é o que uma página desligada tem de dar. */
export function paginaDoSite(site: SitePublico, tipo: TipoDePagina): PaginaPublica | null {
  return site.paginas.find((p) => p.tipo === tipo) ?? null;
}
