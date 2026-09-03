'use client';

import type { ReactNode } from 'react';

export interface NotificacaoProps {
  titulo: string;
  detalhe?: ReactNode;
  aoFechar?: () => void;
  rotuloFechar: string;
  urgente?: boolean;
}

/**
 * Notificação passageira.
 *
 * Não fecha sozinha por omissão, e isso é uma decisão: um aviso que desaparece
 * ao fim de três segundos é inacessível a quem lê devagar, a quem usa lupa e a
 * quem estava a olhar para outro lado — que num restaurante é toda a gente.
 * Quem quiser o desaparecimento automático tem de o pedir explicitamente e
 * garantir que a mesma informação fica noutro sítio.
 */
export function Notificacao({
  titulo,
  detalhe,
  aoFechar,
  rotuloFechar,
  urgente = false,
}: NotificacaoProps) {
  return (
    <div className="bo-notificacao" role={urgente ? 'alert' : 'status'}>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600 }}>{titulo}</p>
        {detalhe ? <div style={{ opacity: 0.85 }}>{detalhe}</div> : null}
      </div>
      {aoFechar ? (
        <button type="button" className="bo-notificacao__fechar" onClick={aoFechar}>
          <span aria-hidden="true">×</span>
          <span className="bo-so-leitor">{rotuloFechar}</span>
        </button>
      ) : null}
    </div>
  );
}

export function Notificacoes({ children }: { children: ReactNode }) {
  return (
    <div className="bo-notificacoes" aria-live="polite">
      {children}
    </div>
  );
}
