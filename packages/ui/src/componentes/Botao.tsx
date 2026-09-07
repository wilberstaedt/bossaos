import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type TomDoBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma';
/** `publico` = alvo de 44 px, `operacao` = 48 px. Padrão interno, CT-13. */
export type Densidade = 'publico' | 'operacao';

interface Comuns {
  tom?: TomDoBotao;
  densidade?: Densidade;
  largo?: boolean;
  children: ReactNode;
}

/**
 * Botão e ligação-com-aspecto-de-botão, num componente só.
 *
 * ── Porque é que isto NÃO são dois componentes ────────────────────────────
 *
 * O `Botao` fixava `<button type="button">` e não aceitava `href`, portanto toda
 * a navegação com aspecto de botão era escrita à mão:
 * `<a className="bo-botao bo-botao--primario">`. Contadas **283 ocorrências em
 * 172 ecrãs** — e cada uma é uma cópia da lista de classes que ninguém verifica
 * e que envelhece sozinha no dia em que o componente mudar.
 *
 * A saída fácil era um `BotaoLigacao` ao lado. Seria o mesmo defeito, mais
 * arrumado: **duas coisas para uma decisão**. A próxima propriedade — um tom
 * novo, uma densidade nova — teria de ser escrita nas duas ou seria esquecida
 * numa, e quem escolhesse entre elas passava a ter de saber que eram duas.
 *
 * Aqui há um componente e ele decide pelo que recebe: **com `href` é uma
 * ligação, sem `href` é um botão.** A distinção não é de estilo — uma ligação
 * navega e entra no histórico, um botão faz. Quem ouve por leitor de ecrã ouve
 * «ligação» ou «botão» conforme o que a coisa FAZ, e não conforme o que parece.
 *
 * A união é discriminada de propósito: com `href`, o TypeScript recusa
 * `disabled` e `aCarregar`, que são de botão. Uma ligação desactivada não
 * existe — ou se navega, ou não se põe lá a ligação.
 */
export type BotaoProps =
  | (Comuns & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    href?: undefined;
    /** Em curso: marca `aria-busy` e desactiva, sem trocar o rótulo por um símbolo. */
    aCarregar?: boolean;
  })
  | (Comuns & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
    href: string;
    aCarregar?: undefined;
  });

export function Botao(props: BotaoProps) {
  const classes = [
    'bo-botao',
    `bo-botao--${props.tom ?? 'primario'}`,
    (props.densidade ?? 'publico') === 'operacao' && 'bo-botao--operacao',
    props.largo && 'bo-botao--largo',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  if (props.href !== undefined) {
    const {
      tom: _tom, densidade: _densidade, largo: _largo, className: _classe,
      children, aCarregar: _aCarregar, ...resto
    } = props;
    return <a className={classes} {...resto}>{children}</a>;
  }

  const {
    tom: _tom, densidade: _densidade, largo: _largo, className: _classe,
    children, aCarregar = false, disabled, href: _href, ...resto
  } = props;
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || aCarregar}
      aria-busy={aCarregar || undefined}
      {...resto}
    >
      {children}
    </button>
  );
}
