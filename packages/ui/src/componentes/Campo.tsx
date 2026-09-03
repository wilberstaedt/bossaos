import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

interface Comum {
  rotulo: string;
  /** Texto de apoio. Descreve o que se espera, não repete o rótulo. */
  ajuda?: string;
  /**
   * Mensagem de erro. Fica **associada** ao controlo por `aria-describedby` e
   * marca `aria-invalid` — sem isso, quem usa leitor de ecrã ouve o campo e não
   * ouve o motivo pelo qual ele está vermelho (CT-13, E02 "erros associados").
   */
  erro?: string;
}

export interface CampoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>, Comum {}

export function Campo({ rotulo, ajuda, erro, className, ...resto }: CampoProps) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  const descrito = [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(' ');

  return (
    <div className={['bo-campo', erro && 'bo-campo--invalido', className].filter(Boolean).join(' ')}>
      <label className="bo-campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        className="bo-campo__controlo"
        aria-invalid={erro ? true : undefined}
        aria-describedby={descrito || undefined}
        {...resto}
      />
      {ajuda ? (
        <span className="bo-campo__ajuda" id={idAjuda}>
          {ajuda}
        </span>
      ) : null}
      {erro ? (
        // `role="alert"` para o erro ser anunciado quando aparece depois de uma
        // tentativa de gravar, e não só quando alguém volta ao campo.
        <span className="bo-campo__erro" id={idErro} role="alert">
          {erro}
        </span>
      ) : null}
    </div>
  );
}

export interface SeletorProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>,
    Comum {
  children: ReactNode;
}

export function Seletor({ rotulo, ajuda, erro, className, children, ...resto }: SeletorProps) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  const descrito = [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(' ');

  return (
    <div className={['bo-campo', erro && 'bo-campo--invalido', className].filter(Boolean).join(' ')}>
      <label className="bo-campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <select
        id={id}
        className="bo-campo__controlo"
        aria-invalid={erro ? true : undefined}
        aria-describedby={descrito || undefined}
        {...resto}
      >
        {children}
      </select>
      {ajuda ? (
        <span className="bo-campo__ajuda" id={idAjuda}>
          {ajuda}
        </span>
      ) : null}
      {erro ? (
        <span className="bo-campo__erro" id={idErro} role="alert">
          {erro}
        </span>
      ) : null}
    </div>
  );
}
