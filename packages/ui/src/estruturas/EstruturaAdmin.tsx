'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

export interface LigacaoDeNavegacao {
  href: string;
  rotulo: string;
  activa?: boolean;
}

/**
 * A marca da navegação: quatro quadrados numa grelha de 2×2, como o atlas
 * desenha. É a única forma que reproduzo — a **família de ícones** do produto
 * (traço de 2 px em grelha de 24, manual p. 18) é um activo de design que ainda
 * não existe, e inventá-la aqui daria um conjunto que teria de ser deitado fora.
 * Fica declarada como pendência.
 */
function MarcaDeNavegacao() {
  return (
    <span aria-hidden="true" className="bo-admin__glifo">
      <i /><i /><i /><i />
    </span>
  );
}

export interface EstruturaAdminProps {
  /** A marca entra como nó: o pacote de interface não conhece o Next nem imagens. */
  marca: ReactNode;
  organizacao: string;
  unidade: string;
  rotuloTrocarUnidade: string;
  navegacao: readonly LigacaoDeNavegacao[];
  migalha: string;
  /** Canto superior direito: estado de ligação, ambiente, etc. */
  topoDireita?: ReactNode;
  rodapeLateral?: ReactNode;
  /** Quem está a usar. Iniciais + nome, como no atlas. */
  utilizador?: { iniciais: string; nome: string };
  /** Barra inferior do telemóvel. Sem ela, a navegação some abaixo de 1024 px. */
  navegacaoInferior?: readonly LigacaoDeNavegacao[];
  rotuloAbrirMenu: string;
  rotuloSaltar: string;
  children: ReactNode;
}

/**
 * Estrutura da administração.
 *
 * Barra lateral escura e fixa em ecrã largo; abaixo de 1024 px passa a gaveta,
 * porque 260 px de menu num tablet de 768 comem um terço da área de trabalho.
 * A troca de unidade está no topo da lateral e é **explícita** (atlas p. 3:
 * "Troca de unidade explícita"): saber em que casa se está antes de mexer em
 * preços não é um detalhe de navegação.
 *
 * Esta estrutura não conhece regra de negócio nenhuma — recebe a navegação já
 * decidida por quem sabe o que este actor pode ver.
 */
export function EstruturaAdmin({
  marca,
  organizacao,
  unidade,
  rotuloTrocarUnidade,
  navegacao,
  migalha,
  topoDireita,
  rodapeLateral,
  utilizador,
  navegacaoInferior,
  rotuloAbrirMenu,
  rotuloSaltar,
  children,
}: EstruturaAdminProps) {
  const [aberta, setAberta] = useState(false);

  return (
    <div className={`bo-admin${aberta ? ' bo-admin--aberta' : ''}`}>
      <a className="bo-saltar" href="#conteudo">
        {rotuloSaltar}
      </a>

      <aside className="bo-admin__lateral bo-inverso">
        <div className="bo-admin__marca">{marca}</div>

        <button type="button" className="bo-admin__unidade">
          <strong>{organizacao}</strong>
          <span>
            {unidade} <span aria-hidden="true">▾</span>
          </span>
          <span className="bo-so-leitor">{rotuloTrocarUnidade}</span>
        </button>

        <nav className="bo-admin__navegacao" aria-label={migalha}>
          {navegacao.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="bo-admin__ligacao"
              aria-current={l.activa ? 'page' : undefined}
            >
              <MarcaDeNavegacao />
              {l.rotulo}
            </a>
          ))}
        </nav>

        {rodapeLateral || utilizador ? (
          <div className="bo-admin__rodape">
            {rodapeLateral}
            {utilizador ? (
              <p className="bo-admin__utilizador">
                <span className="bo-admin__iniciais" aria-hidden="true">
                  {utilizador.iniciais}
                </span>
                {utilizador.nome}
              </p>
            ) : null}
          </div>
        ) : null}
      </aside>

      <div className="bo-admin__principal">
        <header className="bo-admin__topo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="bo-botao bo-botao--fantasma bo-admin__abrir"
              aria-expanded={aberta}
              onClick={() => setAberta((v) => !v)}
            >
              <span aria-hidden="true">☰</span>
              <span className="bo-so-leitor">{rotuloAbrirMenu}</span>
            </button>
            <span className="bo-admin__movel">
              <strong>{marca}</strong>
              <span className="bo-campo__ajuda">{unidade}</span>
            </span>
            <span className="bo-campo__ajuda bo-admin__larga">{migalha}</span>
          </div>
          {topoDireita ? <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{topoDireita}</div> : null}
        </header>

        <main className="bo-admin__conteudo" id="conteudo">
          {children}
        </main>

        {navegacaoInferior && navegacaoInferior.length > 0 ? (
          <nav className="bo-admin__inferior" aria-label={migalha}>
            {navegacaoInferior.map((l) => (
              <a key={l.rotulo} href={l.href} aria-current={l.activa ? 'page' : undefined}>
                {l.rotulo}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
