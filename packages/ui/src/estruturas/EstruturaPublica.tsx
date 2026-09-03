import type { CSSProperties, ReactNode } from 'react';

export interface EstruturaPublicaProps {
  marca: ReactNode;
  /**
   * Variáveis do tema do restaurante, vindas de `variaveisDoTema()` — **já
   * validadas no servidor**. Ausentes, fica o tema BossaOS.
   */
  tema?: Record<string, string>;
  navegacao?: ReactNode;
  rodape?: ReactNode;
  rotuloSaltar: string;
  /** Assinatura da plataforma. O manual (p. 20) diz que permanece. */
  assinatura: string;
  children: ReactNode;
}

/**
 * Estrutura pública: página comercial, site do restaurante, carta, jornadas do
 * cliente. É a **única** que segue o tema do restaurante, e mesmo essa só nos
 * cinco tokens que `variaveisDoTema` devolve.
 */
export function EstruturaPublica({
  marca,
  tema,
  navegacao,
  rodape,
  rotuloSaltar,
  assinatura,
  children,
}: EstruturaPublicaProps) {
  return (
    <div className="bo-publico" style={tema as CSSProperties | undefined}>
      <a className="bo-saltar" href="#conteudo">
        {rotuloSaltar}
      </a>
      <header className="bo-publico__cabecalho">
        {marca}
        {navegacao}
      </header>
      <main className="bo-publico__conteudo" id="conteudo">
        {children}
      </main>
      <footer className="bo-publico__rodape">
        <span>{assinatura}</span>
        {rodape}
      </footer>
    </div>
  );
}
