import type { ReactNode } from 'react';
import { EstruturaPublica } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Wordmark } from './Marca.tsx';

/**
 * A moldura das páginas comerciais (família MKT).
 *
 * ── Uma navegação só, e num sítio só ──────────────────────────────────────
 *
 * São doze telas. Com a navegação copiada em doze ficheiros, a décima terceira
 * página nasce inalcançável e ninguém repara — a rota responde, e só não há
 * ligação para lá. É o mesmo motivo por que a moldura do site do restaurante
 * também é um componente.
 *
 * ── E não há paleta nova aqui ─────────────────────────────────────────────
 *
 * O E02 decidiu as cores e o E10 usa-as. Uma landing com cores próprias parece
 * inofensiva e é o começo de um segundo sistema visual — que depois falha o
 * contraste sem ninguém estar a medir aquele lado.
 */

export const PAGINAS_MKT = [
  { rota: '/product', chave: 'produtoPagina' },
  { rota: '/plans', chave: 'planosPagina' },
  { rota: '/getting-started', chave: 'comecamosTitulo' },
  { rota: '/pilot', chave: 'pilotoTitulo' },
  { rota: '/trust', chave: 'confiancaTitulo' },
  { rota: '/faq', chave: 'faqTitulo' },
] as const;

export function MolduraMkt({
  idioma, actual, children,
}: {
  idioma: Idioma;
  /** A rota aberta, para o `aria-current`. `''` é a landing. */
  actual: string;
  children: ReactNode;
}) {
  const m = mensagensDe(idioma);
  const k = m.mktE10 as unknown as Record<string, string>;

  return (
    <EstruturaPublica
      marca={<Wordmark />}
      rotuloSaltar={m.comum.saltarParaConteudo}
      assinatura={m.comum.asinatura}
    >
      <nav className="bo-publico__seccoes" aria-label={k.produtoPagina}>
        {PAGINAS_MKT.map((p) => (
          <a key={p.rota} href={`/${idioma}${p.rota}`}
             aria-current={actual === p.rota ? 'page' : undefined}>
            {k[p.chave]}
          </a>
        ))}
        <a href={`/${idioma}/demo`} aria-current={actual === '/demo' ? 'page' : undefined}>
          {k.pedirDemo}
        </a>
      </nav>
      {children}
    </EstruturaPublica>
  );
}
