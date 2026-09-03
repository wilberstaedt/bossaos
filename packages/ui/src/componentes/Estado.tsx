import type { ReactNode } from 'react';

export interface Facto {
  rotulo: string;
  valor: string;
}

export type TomDeEstado = 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'info';

export interface EstadoProps {
  /** Etiqueta curta acima do título: CARGA, VACÍO, ERROR, PERMISOS… */
  sobrancelha: string;
  titulo: string;
  /** Cartão de situação, quando o estado tem um sinal a dar. */
  situacao?: { tom: TomDeEstado; titulo: string; detalhe?: string };
  /** Pares rótulo/valor. É a forma que o atlas usa em todos os estados. */
  factos?: readonly Facto[];
  /** Linhas de esqueleto, para o estado de carga. */
  esqueleto?: number;
  accaoPrincipal?: ReactNode;
  accaoSecundaria?: ReactNode;
  /**
   * Repete a acção principal no topo, à direita do título — como o atlas
   * desenha (pp. 387-402).
   *
   * Não é o valor por omissão, e a razão é o CT-13: o atlas é referência de
   * **hierarquia**, não justificação para replicar um problema de composição. A
   * tela do atlas é uma moldura fixa de 1100×740 onde o fim da página fica longe
   * do princípio; num cartão curto, dois botões primários idênticos no mesmo
   * ecrã são ruído — e, para quem usa leitor de ecrã, são a mesma acção
   * anunciada duas vezes. Liga-se onde o conteúdo é longo.
   *
   * Mesmo ligada, **desaparece abaixo de 768 px** — e isso não é uma
   * simplificação minha, é o que o atlas desenha: nas vistas móveis das páginas
   * 387 a 402 a acção aparece uma só vez, em baixo. Só vi isto ao comparar a
   * captura de 390 px com o desenho.
   */
  accaoNoTopo?: boolean;
  /** Envolve os factos num cartão branco (é como o atlas desenha STATE-007/016). */
  emCartao?: boolean;
  /** Nota final, discreta. */
  nota?: string;
}

const SIMBOLO: Record<TomDeEstado, string> = {
  neutro: '·',
  sucesso: '✓',
  aviso: '!',
  perigo: '+',
  info: 'i',
};

/**
 * Estado transversal — a família STATE do atlas.
 *
 * Um componente e não seis páginas. O CSV diz `(na rota que executa a ação)`:
 * estes estados acontecem DENTRO da rota que falhou, carregou ou ficou vazia, e
 * transformá-los em rotas próprias criaria seis endereços para onde ninguém
 * navega e obrigaria a perder o contexto do que se estava a fazer.
 *
 * A forma vem do atlas (pp. 387-402): sobrancelha, título, acção principal em
 * cima à direita, cartão de situação, pares rótulo/valor, acção em baixo. O
 * conteúdo vem de fora — texto traduzido, nunca escrito aqui.
 */
export function Estado({
  sobrancelha,
  titulo,
  situacao,
  factos,
  esqueleto,
  accaoPrincipal,
  accaoSecundaria,
  accaoNoTopo = false,
  emCartao = false,
  nota,
}: EstadoProps) {
  const corpo = (
    <>
      {factos && factos.length > 0 ? (
        <dl className="bo-estado__factos">
          {factos.map((f) => (
            <div key={f.rotulo}>
              <dt className="bo-estado__rotulo">{f.rotulo}</dt>
              <dd className="bo-estado__valor">{f.valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {accaoSecundaria || accaoPrincipal ? (
        <div className="bo-estado__accoes">
          {accaoSecundaria}
          {accaoPrincipal}
        </div>
      ) : null}
    </>
  );

  return (
    <section className="bo-estado">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{sobrancelha}</p>
          <h1>{titulo}</h1>
        </div>
        {accaoNoTopo && accaoPrincipal ? (
          <div className="bo-estado__accao-topo">{accaoPrincipal}</div>
        ) : null}
      </div>

      {situacao ? (
        <div
          className={`bo-aviso bo-aviso--${situacao.tom === 'neutro' ? 'info' : situacao.tom}`}
          role={situacao.tom === 'perigo' ? 'alert' : 'status'}
        >
          <div>
            {/* O símbolo é decorativo: o que informa é o título, em texto. */}
            <p className="bo-aviso__titulo">
              <span aria-hidden="true">{SIMBOLO[situacao.tom]}</span> {situacao.titulo}
            </p>
            {situacao.detalhe ? <p className="bo-aviso__corpo">{situacao.detalhe}</p> : null}
          </div>
        </div>
      ) : null}

      {esqueleto ? (
        <div aria-live="polite" aria-busy="true">
          {/* O texto abaixo é o que um leitor de ecrã anuncia. As barras são
              decorativas e não dizem nada a ninguém. */}
          <span className="bo-so-leitor">{titulo}</span>
          {Array.from({ length: esqueleto }, (_, i) => (
            <div
              key={i}
              className="bo-cartao"
              style={{ marginBottom: 'var(--bo-espaco-md)' }}
              aria-hidden="true"
            >
              <div className="bo-esqueleto" style={{ width: '40%', marginBottom: 8 }} />
              <div className="bo-esqueleto" style={{ width: '75%' }} />
            </div>
          ))}
        </div>
      ) : null}

      {emCartao ? <div className="bo-cartao">{corpo}</div> : corpo}

      {nota ? <p className="bo-campo__ajuda">{nota}</p> : null}
    </section>
  );
}
