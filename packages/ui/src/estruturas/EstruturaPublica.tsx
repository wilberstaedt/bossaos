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
  /**
   * Qual das duas superfícies públicas se está a desenhar.
   *
   * `leitura` (o padrão) é a da carta: 640 px, uma coluna, corpo maior — lê-se
   * a uma mão, em pé, com o telemóvel a 30 cm da mesa.
   *
   * `comercial` é a landing da BossaOS: precisa da largura toda para a grelha de
   * três colunas abrir. Sem esta distinção a landing herdava o tubo de 640 px da
   * carta num ecrã de 1440, e a grelha nunca abria — o que não dava erro nenhum,
   * só um desenho errado que ninguém estava a medir.
   */
  variante?: 'leitura' | 'comercial';
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
  variante = 'leitura',
  children,
}: EstruturaPublicaProps) {
  return (
    <div
      className={variante === 'comercial' ? 'bo-publico bo-publico--comercial' : 'bo-publico'}
      style={tema as CSSProperties | undefined}
    >
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
