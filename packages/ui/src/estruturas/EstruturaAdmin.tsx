'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Um item do menu: **ou** é uma ligação **ou** é um marcador do que falta —
 * nunca as duas coisas, e nunca nenhuma.
 *
 * ── Porque é uma união e não um objecto com campos opcionais ──────────────
 *
 * Enquanto o tipo dizia `href: string` obrigatório, o comentário abaixo dizia
 * «não tem href» e o tipo dizia o contrário: um item por construir era
 * obrigado a inventar um destino, e o `'#'` era a mentira que o tipo EXIGIA.
 * O `href: '#'` não era descuido de quem escrevia o menu — era a única forma
 * de o compilador aceitar o que se queria dizer.
 *
 * Com a união, o estado errado deixa de ter nome: um item com `porConstruir`
 * **não pode** ter `href`, e um item com `href` não pode ter `porConstruir`.
 * O compilador recusa a porta morta antes de a prova de navegação a apanhar,
 * que é a mesma escolha do resto do projecto — garantir na FORMA em vez de
 * confiar em quem escreve.
 */
/**
 * Um item da navegação.
 *
 * ── Aqui esteve uma união de dois braços, e o segundo estava morto ────────
 *
 * O outro braço era o `porConstruir`: um item sem `href` que dizia qual a etapa
 * que o ia construir. Existiu por uma razão boa — «um item que parece uma
 * ligação e não faz nada ensina a pessoa a desconfiar do menu inteiro» — e
 * deixou de ter quem o alimentasse quando o E30 fechou. Ficou o tipo, ficou o
 * ramo que o desenhava, e ficou a folha de estilo dele.
 *
 * Foi encontrado a medir outra coisa: a regra dos 14 px apanhou o
 * `.bo-admin__etapa` a 11. **Corrigir código morto é pior do que deixá-lo**, e
 * apagar só a folha de estilo era pior ainda: se alguém reavivasse o ramo, o
 * marcador saía sem estilo nenhum. Sai o caminho inteiro — tipo, ramo e regra.
 */
export type LigacaoDeNavegacao = {
  href: string;
  rotulo: string;
  activa?: boolean;
  /** Nome do ícone da família. Sem ele, o item leva o losango neutro. */
  icone?: string;
  /** Rótulo do grupo a que o item pertence. Sem ele, fica no primeiro. */
  grupo?: string;
};

/**
 * A família de ícones da navegação.
 *
 * ── Porque é que ela existe agora e não existia ontem ─────────────────────
 *
 * Aqui esteve um glifo único — quatro quadrados — para os catorze itens, com a
 * pendência escrita: «inventá-la daria um conjunto que teria de ser deitado
 * fora». O argumento era bom e caiu por uma razão que não é técnica: **foi o
 * dono do produto que pediu**. Um conjunto pedido não é um conjunto inventado.
 *
 * A especificação não é minha, é a que o manual já fixa (p. 18): traço de 2 px
 * em grelha de 24, uma família só, `currentColor` para herdar a cor de quem o
 * usa, e SVG em linha para não haver pedido de rede por ícone.
 *
 * `stroke-linecap` e `stroke-linejoin` a `round` nos catorze: é o que faz um
 * conjunto parecer um conjunto. Um ícone com cantos vivos no meio de treze
 * arredondados lê-se como erro antes de se ler como ícone.
 */
const ICONES: Record<string, ReactNode> = {
  inicio: <><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /></>,
  catalogo: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6M9 13h6M9 17h3" /></>,
  reservas: <><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M8 3v5M16 3v5M4 11h16" /></>,
  sala: <><circle cx="12" cy="9" r="4" /><path d="M4 20c0-3.3 3.6-5 8-5s8 1.7 8 5" /></>,
  levar: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  caixa: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 14h4" /></>,
  inventario: <><path d="M4 8 12 4l8 4v8l-8 4-8-4V8Z" /><path d="M4 8l8 4 8-4M12 12v8" /></>,
  compras: <><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /><path d="M3 4h2l2.6 10h10L20 7H6" /></>,
  clientes: <><circle cx="9" cy="9" r="3.5" /><path d="M3 19c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5" /><path d="M16 6.5a3.5 3.5 0 0 1 0 7" /></>,
  equipa: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" /></>,
  financeiro: <><path d="M4 19V9M10 19V5M16 19v-6M22 19H2" /></>,
  kiosks: <><rect x="6" y="3" width="12" height="15" rx="2" /><path d="M10 21h4M12 6v6" /></>,
  relatorios: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 15v-3M12 15V9M16 15v-5" /></>,
  ajuda: <><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3 2.5v1.5" /><path d="M12 17h.01" /></>,
};

/**
 * O glifo de um item. Sem `icone`, cai no losango neutro — que é uma forma
 * honesta de dizer «não há ícone para isto» em vez de repetir o do vizinho.
 */
// `icone?: string | undefined` e não `icone?: string`: o repositório corre com
// `exactOptionalPropertyTypes`, onde «ausente» e «presente e indefinido» são
// tipos diferentes — e o que vem de um item sem ícone é o segundo.
function MarcaDeNavegacao({ icone }: { icone?: string | undefined }) {
  return (
    <svg
      aria-hidden="true"
      className="bo-admin__glifo"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {(icone && ICONES[icone]) || <path d="M12 4l8 8-8 8-8-8 8-8Z" />}
    </svg>
  );
}

export interface EstruturaAdminProps {
  /** A marca entra como nó: o pacote de interface não conhece o Next nem imagens. */
  marca: ReactNode;
  /** O caminho actual, para o item activo sair da rota e não da posição. */
  caminhoActual?: string;
  organizacao: string;
  /**
   * A unidade em que se está — **quando existe uma**.
   *
   * Era obrigatória, e o `layout.tsx` da organização preenchia-a com o email de
   * quem estava autenticado: a caixa dizia «bossa-demo / demo@bossaos.invalid»,
   * um trocador de UNIDADE a mostrar uma PESSOA. Passa a opcional porque ao
   * nível da organização **não há unidade resolvida** — o `ContextoDeInquilino`
   * traz `locationId` opcional e o `resolverPedido` não o preenche. Sem ela, a
   * caixa mostra a organização e a acção de trocar, que é o que é verdade.
   */
  unidade?: string;
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
  caminhoActual,
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

  // ── O item activo sai da ROTA, e não da posição no array ────────────────
  //
  // Estava `activa: i === navegacao.length - 1`: o último item do array acendia
  // em qualquer rota, e o `aria-current="page"` ia com ele. Quem navega por
  // leitor de ecrã era informado, em todas as páginas, de que estava nos
  // Relatórios. Havia a mesma linha no `navegacaoInferior` (`activa: true` no
  // primeiro) e uma terceira no layout da plataforma: três instâncias da mesma
  // doença, e por isso a cura vive aqui e não em cada chamador.
  //
  // A rota entra por PROPRIEDADE e não por `usePathname`: este pacote não
  // conhece o Next, de propósito, e a primeira versão disto importava-lhe o
  // `next/navigation` — o typecheck recusou, e ainda bem. Quem sabe a rota é o
  // invólucro do lado da aplicação; aqui só se sabe compará-la.
  const caminho = caminhoActual;

  /**
   * O item que corresponde ao caminho actual: o **prefixo mais longo** que casa.
   *
   * O prefixo mais longo e não o primeiro que casa, porque o `início` é
   * `/es-ES/app/marina-oropesa` e é prefixo de todos os outros — pelo primeiro
   * que casasse, ele acendia sempre. E a fronteira tem de ser um `/`: sem isso,
   * `/ir/sala` acenderia em `/ir/salaoNobre`.
   */
  const alvoActivo = (() => {
    if (!caminho) return null;
    let melhor: string | null = null;
    for (const l of navegacao) {
      const href = 'href' in l ? l.href : undefined;
      if (!href) continue;
      const casa = caminho === href || caminho.startsWith(`${href}/`);
      if (casa && (melhor === null || href.length > melhor.length)) melhor = href;
    }
    return melhor;
  })();

  /**
   * O mesmo para a barra inferior, que tinha `activa: true` fixo no primeiro.
   * Lista própria e portanto prefixo próprio: partilhar o `alvoActivo` da
   * lateral fazia a barra do telemóvel acender por uma rota que ela não tem.
   */
  const alvoInferior = (() => {
    if (!caminho || !navegacaoInferior) return null;
    let melhor: string | null = null;
    for (const l of navegacaoInferior) {
      const href = l.href;
      if (!href) continue;
      const casa = caminho === href || caminho.startsWith(`${href}/`);
      if (casa && (melhor === null || href.length > melhor.length)) melhor = href;
    }
    return melhor;
  })();
  const estaActivaInferior = (l: { href?: string; activa?: boolean }) =>
    (l.activa !== undefined ? l.activa : l.href === alvoInferior);

  const estaActiva = (l: LigacaoDeNavegacao) => {
    if (l.activa !== undefined) return l.activa; // o catálogo de desenho força
    return 'href' in l && l.href === alvoActivo;
  };

  // Os grupos, pela ordem em que aparecem. Sem `grupo`, tudo cai num só — que é
  // exactamente o que havia antes, e continua a funcionar para quem não agrupar.
  const itensComGrupo = (() => {
    const ordem: string[] = [];
    const por = new Map<string, LigacaoDeNavegacao[]>();
    for (const l of navegacao) {
      const g = l.grupo ?? '';
      if (!por.has(g)) { por.set(g, []); ordem.push(g); }
      por.get(g)?.push(l);
    }
    return ordem.map((grupo) => ({ grupo, itens: por.get(grupo) ?? [] }));
  })();

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
            {unidade ?? rotuloTrocarUnidade} <span aria-hidden="true">▾</span>
          </span>
          <span className="bo-so-leitor">{rotuloTrocarUnidade}</span>
        </button>

        <nav className="bo-admin__navegacao" aria-label={migalha}>
          {itensComGrupo.map(({ grupo, itens }, iG) => (
          <div key={grupo || `g${iG}`} className="bo-admin__grupo">
            {grupo ? <p className="bo-admin__grupo-titulo">{grupo}</p> : null}
          {itens.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="bo-admin__ligacao"
              aria-current={estaActiva(l) ? 'page' : undefined}
            >
              <MarcaDeNavegacao icone={l.icone} />
              {l.rotulo}
            </a>
          ))}
          </div>
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
              <a key={l.rotulo} href={l.href} aria-current={estaActivaInferior(l) ? 'page' : undefined}>
                {l.rotulo}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
