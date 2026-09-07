'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Os dois controlos de abrir e fechar da moldura comercial.
 *
 * ── Porque é que são clientes e o resto da moldura não é ──────────────────
 *
 * A `MolduraMkt` é servidor: lê o catálogo de mensagens e desenha ligações. Só
 * duas coisas precisam de estado no navegador — a gaveta do telemóvel e o grupo
 * de itens secundários —, e é só isso que atravessa a fronteira. O conteúdo
 * continua a ser desenhado no servidor e entra aqui como `children`: assim as
 * ligações existem no HTML mesmo sem JavaScript, e o que o JavaScript acrescenta
 * é o abrir e o fechar, não a navegação.
 *
 * ── E porque é que a gaveta NÃO é uma sobreposição ────────────────────────
 *
 * O painel entra no fluxo e empurra o conteúdo para baixo, em vez de flutuar por
 * cima com a página presa atrás. Um painel no fluxo rola com a página — que é o
 * «scroll correcto» que o §6.1 pede no telemóvel — sem precisar de trancar o
 * corpo, e uma tranca esquecida é a maneira mais comum de uma gaveta deixar uma
 * página impossível de ler.
 */
export function MenuMkt({
  rotuloAbrir,
  rotuloFechar,
  children,
}: {
  rotuloAbrir: string;
  rotuloFechar: string;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    // Escape fecha E devolve o foco ao botão. Fechar sem devolver o foco deixa a
    // tabulação a começar do princípio do documento, que para quem navega por
    // teclado é o mesmo que ter sido atirado para fora da página.
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      setAberto(false);
      botao.current?.focus();
    };
    const aoCarregarFora = (evento: PointerEvent) => {
      const alvo = evento.target as Node | null;
      if (!alvo) return;
      if (painel.current?.contains(alvo) || botao.current?.contains(alvo)) return;
      setAberto(false);
    };

    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('pointerdown', aoCarregarFora);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('pointerdown', aoCarregarFora);
    };
  }, [aberto]);

  return (
    <div className={`bo-mkt__menu${aberto ? ' bo-mkt__menu--aberto' : ''}`}>
      <button
        ref={botao}
        type="button"
        className="bo-mkt__abrir"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((v) => !v)}
      >
        <span aria-hidden="true">{aberto ? '✕' : '☰'}</span>
        <span className="bo-so-leitor">{aberto ? rotuloFechar : rotuloAbrir}</span>
      </button>
      <div className="bo-mkt__painel" id={id} ref={painel}>
        {children}
      </div>
    </div>
  );
}

/**
 * O grupo de itens secundários da navegação.
 *
 * O §6.1 pede **no máximo quatro agrupamentos visíveis** e «itens secundários em
 * menu estruturado quando necessário». Sete `<a>` irmãos não são quatro
 * agrupamentos, e o §4.5 nomeia esse defeito pelo nome. Três ficam à vista, três
 * entram aqui, e o CTA fica separado dos dois.
 *
 * **Fechado sempre, em qualquer largura.** Abri-lo por omissão nas três páginas
 * que vivem lá dentro daria um painel a flutuar sobre o conteúdo à chegada, sem
 * ninguém ter pedido. O que a página activa recebe é o realce no botão do grupo
 * — e a ligação lá dentro continua a levar `aria-current="page"` para quando ele
 * abre. **Fica dito o que isto custa:** com o grupo fechado, um leitor de ecrã
 * não ouve «página actual» ao percorrer a barra nessas três páginas.
 */
export function GrupoMkt({
  rotulo,
  activo,
  children,
}: {
  rotulo: string;
  /** Alguma das ligações lá dentro é a página aberta. */
  activo: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      setAberto(false);
      botao.current?.focus();
    };
    const aoCarregarFora = (evento: PointerEvent) => {
      const alvo = evento.target as Node | null;
      if (!alvo) return;
      if (painel.current?.contains(alvo) || botao.current?.contains(alvo)) return;
      setAberto(false);
    };
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('pointerdown', aoCarregarFora);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('pointerdown', aoCarregarFora);
    };
  }, [aberto]);

  return (
    <div className={`bo-mkt__grupo${aberto ? ' bo-mkt__grupo--aberto' : ''}`}>
      <button
        ref={botao}
        type="button"
        className={`bo-mkt__grupo-botao${activo ? ' bo-mkt__grupo-botao--activo' : ''}`}
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((v) => !v)}
      >
        {rotulo}
        <span aria-hidden="true" className="bo-mkt__seta">▾</span>
      </button>
      <div className="bo-mkt__grupo-painel" id={id} ref={painel}>
        {children}
      </div>
    </div>
  );
}
