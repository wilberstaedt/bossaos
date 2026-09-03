'use client';

import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface Separador {
  chave: string;
  rotulo: string;
  conteudo: ReactNode;
}

export interface SeparadoresProps {
  etiqueta: string;
  separadores: readonly Separador[];
  inicial?: string;
}

/**
 * Separadores (tabs) com teclado, segundo o padrão ARIA.
 *
 * Só o separador activo é alcançável por Tab (`tabIndex -1` nos outros); entre
 * separadores navega-se com as setas, Home e End. É o comportamento que as
 * pessoas que usam teclado esperam — com todos os separadores no percurso de
 * Tab, uma barra de oito abas obriga a oito tabulações para chegar ao conteúdo.
 */
export function Separadores({ etiqueta, separadores, inicial }: SeparadoresProps) {
  const base = useId();
  const primeiro = separadores[0]?.chave ?? '';
  const [activo, setActivo] = useState(inicial ?? primeiro);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const indice = separadores.findIndex((s) => s.chave === activo);

  function irPara(novo: number) {
    const alvo = separadores[(novo + separadores.length) % separadores.length];
    if (!alvo) return;
    setActivo(alvo.chave);
    refs.current[alvo.chave]?.focus();
  }

  function aoTeclar(e: KeyboardEvent<HTMLButtonElement>) {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        irPara(indice + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        irPara(indice - 1);
        break;
      case 'Home':
        e.preventDefault();
        irPara(0);
        break;
      case 'End':
        e.preventDefault();
        irPara(separadores.length - 1);
        break;
      default:
        break;
    }
  }

  // O envolvente não leva classe: nada o estiliza, e um nome que o CSS não
  // define é um gancho que só parece existir. Encontrou-o o
  // `scripts/validar-classes.sh`, escrito no E07. Quando houver regra para o
  // bloco, o nome volta com ela.
  return (
    <div>
      <div className="bo-separadores__lista" role="tablist" aria-label={etiqueta}>
        {separadores.map((s) => {
          const seleccionado = s.chave === activo;
          return (
            <button
              key={s.chave}
              ref={(el) => {
                refs.current[s.chave] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-t-${s.chave}`}
              aria-controls={`${base}-p-${s.chave}`}
              aria-selected={seleccionado}
              tabIndex={seleccionado ? 0 : -1}
              className="bo-separadores__botao"
              onClick={() => setActivo(s.chave)}
              onKeyDown={aoTeclar}
            >
              {s.rotulo}
            </button>
          );
        })}
      </div>

      {separadores.map((s) => (
        <div
          key={s.chave}
          role="tabpanel"
          id={`${base}-p-${s.chave}`}
          aria-labelledby={`${base}-t-${s.chave}`}
          hidden={s.chave !== activo}
          tabIndex={0}
          className="bo-separadores__painel"
        >
          {s.conteudo}
        </div>
      ))}
    </div>
  );
}
