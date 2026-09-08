import { Botao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Composicao } from '../../../../src/componentes/Demonstracao.tsx';

export const dynamic = 'force-static';

/**
 * O sistema visual do North Star v2, em página inteira, para MEDIR.
 *
 * ── Porque é que isto existe, e porque é interno ──────────────────────────
 *
 * A Fase 1 do norte entrega um SISTEMA e não uma página: fundos, tipografia de
 * display, cabeçalho, botões, molduras, bento, preços, shell e a mesa visual.
 * Um sistema não se prova a ler CSS — a régua desta entrega é textual: *«mede-se
 * a página renderizada, nunca o código; ler `background: verde` no CSS não prova
 * que a secção é verde»*.
 *
 * Por isso o sistema nasce com uma superfície onde ele existe para valer, no
 * sítio da casa para isso: `interno/`, ao lado do catálogo de desenho e das
 * estruturas. **Não é a landing** — a landing é a Fase 2, e reescrevê-la aqui
 * seria fazer a fase seguinte antes de esta ser revista.
 *
 * ── O que aqui NÃO há ────────────────────────────────────────────────────
 *
 * Nenhum depoimento, cliente, logótipo ou métrica: o §8 reprova-os e o §5 diz
 * «não invente». Os textos são os que a landing já usa, vindos do catálogo, e
 * os números de preço não são escritos — vêm do `CartoesDePlano` na Fase 2. As
 * mesas são uma demonstração do SISTEMA e estão marcadas como tal.
 */
export default async function SistemaNs2({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10 as unknown as Record<string, string>;

  const mesas = [
    { nome: '01', lugares: 2, estado: 'livre' },
    { nome: '02', lugares: 4, estado: 'ocupada', desde: '38 min' },
    { nome: '03', lugares: 4, estado: 'reservada', hora: '21:30' },
    { nome: '04', lugares: 6, estado: 'ocupada', desde: '12 min' },
    { nome: '05', lugares: 2, estado: 'atencao', desde: '74 min' },
    { nome: '06', lugares: 8, estado: 'livre' },
  ] as const;

  const rotulo: Record<string, string> = {
    livre: 'Libre', ocupada: 'Ocupada', reservada: 'Reservada', atencao: 'Atención',
  };

  return (
    <>
      {/* ── 1 · Herói escuro: marca, promessa, produto e CTA no mesmo ecrã ── */}
      <section className="ns-seccao ns-seccao--verde" data-ns="heroi">
        <div>
          <header className="ns-cabecalho" data-ns="cabecalho">
            <strong>BossaOS</strong>
          </header>
          <h1 className="ns-display">{k.heroiTitulo ?? 'Todo tu restaurante. Un solo ritmo.'}</h1>
          <p className="ns-lead">{k.heroiTexto ?? ''}</p>
          <p>
            <Botao tom="primario" className="ns-accao-heroi" href={`/${idioma}/demo`}>
              {k.pedirDemo ?? 'Pedir una demo'}
            </Botao>
          </p>
          <div className="ns-moldura" data-ns="moldura">
            <Composicao qual="salaRecorte" idioma={idioma} ranhura="larga" />
          </div>
        </div>
      </section>

      {/* ── 2 · Bento sobre verde: quatro capacidades, tamanhos diferentes ── */}
      <section className="ns-seccao ns-seccao--verde" data-ns="bento">
        <div>
          <h2 className="ns-titulo">{k.produtoTitulo ?? 'El producto'}</h2>
          <div className="ns-bento">
            <div className="ns-bento__area ns-bento__area--principal">
              <div className="ns-moldura ns-moldura--sobreposta">
                <Composicao qual="kdsRecorte" idioma={idioma} ranhura="larga" />
              </div>
            </div>
            <div className="ns-bento__area ns-bento__area--media"><h3 className="ns-titulo">Carta</h3></div>
            <div className="ns-bento__area ns-bento__area--media"><h3 className="ns-titulo">Sala</h3></div>
            <div className="ns-bento__area ns-bento__area--larga"><h3 className="ns-titulo">Gestión</h3></div>
          </div>
        </div>
      </section>

      {/* ── 3 · Areia: o ritmo alterna, que é o primeiro ponto reprovado ──── */}
      <section className="ns-seccao ns-seccao--areia" data-ns="areia">
        <div>
          <h2 className="ns-titulo">{k.comoFuncionaTitulo ?? 'Una comanda atraviesa el sistema'}</h2>
          <p className="ns-corpo">{k.comoFuncionaTexto ?? ''}</p>
        </div>
      </section>

      {/* ── 4 · Branca: os cartões de preço, com destaque editorial ───────── */}
      <section className="ns-seccao ns-seccao--branca" data-ns="precos">
        <div>
          <h2 className="ns-titulo">{k.planosTitulo ?? 'Planes'}</h2>
          <div className="ns-precos">
            <article className="ns-preco"><h3 className="ns-titulo">Starter</h3></article>
            <article className="ns-preco ns-preco--destaque"><h3 className="ns-titulo">Restaurant</h3></article>
            <article className="ns-preco"><h3 className="ns-titulo">Pro</h3></article>
          </div>
        </div>
      </section>

      {/* ── 5 · O shell autenticado e a MESA VISUAL ───────────────────────── */}
      <section className="ns-seccao ns-seccao--suave" data-ns="mesas">
        <div>
          <h2 className="ns-titulo">Mesas en tiempo real</h2>
          <div className="ns-shell" data-ns="shell">
            <nav className="ns-shell__lado" aria-label="Demostración del sistema">
              <a className="ns-shell__item" aria-current="page" href="#mesas">Sala</a>
              <a className="ns-shell__item" href="#cocina">Cocina</a>
              <a className="ns-shell__item" href="#gestion">Gestión</a>
            </nav>
            <div className="ns-shell__conteudo">
              <p className="ns-resumo" data-ns="resumo">
                <span>Libres 2</span><span>Ocupadas 2</span><span>Reservadas 1</span><span>Atención 1</span>
              </p>
              <div className="ns-mesas" data-ns="mapa">
                {mesas.map((m) => (
                  <article key={m.nome} className={`ns-mesa ns-mesa--${m.estado}`} data-estado={m.estado}>
                    <span className="ns-mesa__nome">{m.nome}</span>
                    <span className="ns-mesa__capacidade">{m.lugares} pax</span>
                    {/* O estado leva rótulo e não só cor: cor sozinha não é
                        informação para quem não a distingue. */}
                    <span className="ns-mesa__estado">
                      {rotulo[m.estado]}{'desde' in m && m.desde ? ` · ${m.desde}` : ''}
                      {'hora' in m && m.hora ? ` · ${m.hora}` : ''}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="ns-rodape" data-ns="rodape">
        <div className="ns-seccao"><p>BossaOS</p></div>
      </footer>
    </>
  );
}
