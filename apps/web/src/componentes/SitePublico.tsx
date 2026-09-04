import type { ReactNode } from 'react';
import type { SitePublico } from '@bossaos/domain';
import { mensagensDe, type Idioma } from '@bossaos/i18n';

/**
 * A moldura das páginas públicas do site do restaurante (PUB-001, 004, 005, 006).
 *
 * ── Porque é que isto é um componente e não copiado em quatro ficheiros ────
 *
 * As quatro páginas partilham cabeçalho, navegação entre secções e rodapé. Se
 * cada uma tivesse a sua cópia, a navegação de uma ficaria para trás no dia em
 * que se acrescentasse uma página — e o sintoma seria uma página pública que
 * existe e não se alcança de lado nenhum, que ninguém repara porque a rota
 * responde.
 *
 * ── A navegação só mostra o que ESTÁ publicado ────────────────────────────
 *
 * As ligações saem de `site.paginas`, e `site.paginas` já é a projecção — uma
 * página com `visivel = false` não está lá. Uma navegação construída a partir de
 * uma lista fixa de tipos ofereceria ligações para páginas que devolvem 404, que
 * é a forma mais rápida de um site parecer partido.
 */

const ROTA_DA_PAGINA = {
  INICIO: '', SOBRE: '/about', CONTACTO: '/contact',
} as const;

export interface MolduraDoSiteProps {
  slug: string;
  idioma: Idioma;
  unidade: string;
  marca: string;
  site: SitePublico;
  /** Qual das secções está aberta, para o `aria-current`. */
  actual?: 'INICIO' | 'SOBRE' | 'CONTACTO' | 'NOVIDADES' | 'CARTA';
  /**
   * O que vem depois do idioma no endereço actual (`''`, `/about`, …).
   *
   * Entra por parâmetro em vez de ser deduzido de `actual`: trocar de idioma tem
   * de ficar NA MESMA página, e uma dedução a partir da secção mandava as
   * novidades e a ficha de uma novidade as duas para o início. Trocar de idioma
   * e ser levado para outro sítio é a maneira mais rápida de perder quem estava
   * a ler.
   */
  caminho?: string;
  children: ReactNode;
}

export function MolduraDoSite({
  slug, idioma, unidade, marca, site, actual, caminho = '', children,
}: MolduraDoSiteProps) {
  const m = mensagensDe(idioma);
  const s = m.sitioE10;
  const base = `/r/${slug}/${idioma}`;
  const rotulo = { INICIO: s.inicio, SOBRE: s.sobre, CONTACTO: s.contacto } as const;

  return (
    <div className="bo-publico">
      <header className="bo-publico__cabecalho">
        <p className="bo-estado__sobrancelha">{marca}</p>
        <h1>{unidade}</h1>
      </header>

      {/* O idioma é uma ligação e não um formulário: continua a funcionar sem
          JavaScript, e o endereço fica partilhável — mesma decisão do E09. */}
      <nav className="bo-publico__idiomas" aria-label={m.publicoE09.tuIdioma}>
        {(['es-ES', 'pt-BR', 'en'] as const).map((x) => (
          <a key={x} href={`/r/${slug}/${x}${caminho}`}
             aria-current={x === idioma ? 'page' : undefined}>
            {x}
          </a>
        ))}
      </nav>

      <nav className="bo-publico__seccoes" aria-label={s.inicio}>
        {site.paginas.map((p) => (
          <a key={p.tipo} href={`${base}${ROTA_DA_PAGINA[p.tipo]}`}
             aria-current={actual === p.tipo ? 'page' : undefined}>
            {rotulo[p.tipo]}
          </a>
        ))}
        {/* A carta é do E09 e vive noutra rota. Aparece aqui porque, para quem
            visita, é a mesma casa. */}
        <a href={`${base}/menu`} aria-current={actual === 'CARTA' ? 'page' : undefined}>
          {s.nossaCarta}
        </a>
      </nav>

      <main className="bo-publico__conteudo" id="conteudo">{children}</main>

      <footer className="bo-publico__rodape">
        <p>{m.comum.asinatura}</p>
        {site.redes.length > 0 ? (
          <span className="bo-publico__redes">
            {site.redes.map((r) => (
              // `rel` completo: um site de restaurante liga para fora e a aba
              // aberta não pode ficar com acesso a esta.
              <a key={r.rede} href={r.url} rel="noopener noreferrer nofollow" target="_blank">
                {r.rede}
              </a>
            ))}
          </span>
        ) : null}
      </footer>
    </div>
  );
}
