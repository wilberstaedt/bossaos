import type { ReactNode } from 'react';
import { EstruturaPublica } from '@bossaos/ui';
import { IDIOMAS, NOME_DO_IDIOMA, mensagensDe, type Idioma } from '@bossaos/i18n';
import { Wordmark } from './Marca.tsx';
import { GrupoMkt, MenuMkt } from './MenuMkt.tsx';

/**
 * A moldura das páginas comerciais (família MKT).
 *
 * ── Uma navegação só, e num sítio só ──────────────────────────────────────
 *
 * São doze telas. Com a navegação copiada em doze ficheiros, a décima terceira
 * página nasce inalcançável e ninguém repara — a rota responde, e só não há
 * ligação para lá. É o mesmo motivo por que a moldura do site do restaurante
 * também é um componente.
 *
 * ── E não há paleta nova aqui ─────────────────────────────────────────────
 *
 * O E02 decidiu as cores e o E10 usa-as. Uma landing com cores próprias parece
 * inofensiva e é o começo de um segundo sistema visual — que depois falha o
 * contraste sem ninguém estar a medir aquele lado.
 *
 * ── RV100 · o que este lote corrigiu, e porque foi tudo de uma vez ────────
 *
 * A moldura atinge **dez rotas**: as oito páginas comerciais mais a
 * `/demo/thanks` e a `/404`, que a herdam. Seis defeitos medidos viviam aqui, e
 * uma edição fecha-os nos dez sítios:
 *
 *   ① a assinatura saía a 81 × 28 px e o mínimo documentado é 120 de largura
 *      (§4.1); passa a `altura={50}`, que dá 145 — dentro do alvo de 144–168;
 *   ② a marca não ligava a lado nenhum; passa a ligar ao início, com nome
 *      acessível que diz PARA ONDE VAI e não «logo»;
 *   ③ sete `<a>` iguais em cápsula numa `<nav>` — o defeito que o §4.5 nomeia
 *      literalmente; passa a três ligações, um grupo e o CTA à parte;
 *   ④ não havia entrada para os três idiomas, que existem no produto inteiro;
 *   ⑤ não havia entrada na conta, e a rota `/auth/login` existe desde o E04;
 *   ⑥ não havia menu de telemóvel: abaixo de 1024 px a navegação era uma pilha
 *      de sete pílulas empilhadas, uma por linha.
 *
 * E o rodapé, que era uma linha com a assinatura, passa a ter grupos.
 *
 * ── O rodapé só liga ao que existe ────────────────────────────────────────
 *
 * O §6.3.14 lista «produto, planos, recursos, idiomas, contacto, redes, login,
 * privacidade, termos e cookies **conforme disponibilidade real**». **Não
 * invento nenhuma:** uma ligação que dá 404 é pior do que a ausência dela, e o
 * §6.3.14 ganha ao §10 exactamente por dizer «conforme disponibilidade real».
 *
 * **Actualizado na L1g:** `/privacy` passou a existir — o formulário de demo
 * recolhe dados pessoais e precisava de dizer o que lhes acontece antes de os
 * pedir. O rodapé liga-lhe. **Termos, cookies e contas de rede social continuam
 * sem rota e continuam sem ligação**, e a falta segue registada no
 * `11_OPEN_FINDINGS.md`.
 */

/** As três que ficam à vista na barra. */
const PAGINAS_PRINCIPAIS = [
  { rota: '/product', chave: 'navProduto' },
  { rota: '/plans', chave: 'navPlanos' },
  { rota: '/getting-started', chave: 'navImplantacao' },
] as const;

/** As três que entram no grupo «Recursos» — secundárias, não escondidas. */
const PAGINAS_RECURSOS = [
  { rota: '/pilot', chave: 'navPiloto' },
  { rota: '/trust', chave: 'navConfianca' },
  { rota: '/faq', chave: 'navPerguntas' },
] as const;

/**
 * As seis rotas da família que não são a demo, na ordem em que se alcançam.
 *
 * Continua a ser uma lista só, e continua exportada: é ela que garante que
 * nenhuma das páginas nasce inalcançável, e a `marketing.spec.ts` mede
 * exactamente isso a partir da landing.
 */
export const PAGINAS_MKT = [...PAGINAS_PRINCIPAIS, ...PAGINAS_RECURSOS] as const;

export function MolduraMkt({
  idioma, actual, sufixo, children,
}: {
  idioma: Idioma;
  /** A rota aberta, para o `aria-current`. `''` é a landing. */
  actual: string;
  /**
   * O caminho a seguir ao idioma, para a troca de língua manter a página.
   *
   * Por omissão é o `actual`, que serve as oito rotas comerciais. A
   * `/demo/thanks` passa-o à mão porque ali o `actual` é `/demo` — sem isto,
   * quem trocasse de língua no ecrã de obrigado voltava ao formulário.
   */
  sufixo?: string;
  children: ReactNode;
}) {
  const m = mensagensDe(idioma);
  /**
   * Duas vistas do MESMO objecto, e as duas são precisas.
   *
   * `mkt` é o catálogo tipado: `mkt.recursos` é `string` e o compilador recusa
   * uma chave que não exista. `k` é a vista por índice, que serve as listas de
   * rotas acima — mas com `noUncheckedIndexedAccess` devolve `string |
   * undefined`, e é por isso que as duas coexistem em vez de haver só a segunda.
   */
  const mkt = m.mktE10;
  const k = mkt as unknown as Record<string, string>;
  const caminho = sufixo ?? actual;

  const ligacao = (rota: string, rotulo: string) => (
    <a
      key={rota}
      href={`/${idioma}${rota}`}
      aria-current={actual === rota ? 'page' : undefined}
    >
      {rotulo}
    </a>
  );

  const recursoActivo = PAGINAS_RECURSOS.some((p) => p.rota === actual);

  return (
    <EstruturaPublica
      marca={(
        // ② A marca liga ao início. O nome acessível diz o DESTINO — um
        // `aria-label` a dizer «logo» descreve a imagem e não a ligação, e quem
        // ouve fica a saber o que aquilo é sem saber o que faz.
        <a className="bo-mkt__marca" href={`/${idioma}`} aria-label={mkt.irParaInicio}>
          {/* ① 50 px de altura dão 145 de largura pela proporção do ficheiro. */}
          <Wordmark altura={50} />
        </a>
      )}
      navegacao={(
        <MenuMkt rotuloAbrir={m.comum.abrirMenu} rotuloFechar={m.comum.fechar}>
          <nav className="bo-publico__seccoes" aria-label={mkt.navegacaoPrincipal}>
            {PAGINAS_PRINCIPAIS.map((p) => ligacao(p.rota, k[p.chave] ?? p.rota))}

            {/* ③ Os secundários num grupo, e não em mais três pílulas iguais. */}
            <GrupoMkt rotulo={mkt.recursos} activo={recursoActivo}>
              {PAGINAS_RECURSOS.map((p) => ligacao(p.rota, k[p.chave] ?? p.rota))}
            </GrupoMkt>

            {/* O CTA fica DENTRO da mesma `<nav>` de propósito: é a partir dela
                que a regressão prova que as sete rotas se alcançam da landing, e
                movê-lo para fora seria partir essa prova para arrumar marcação.
                O que o separa dos outros é o desenho, não o sítio. */}
            <a
              className="bo-mkt__cta"
              href={`/${idioma}/demo`}
              aria-current={actual === '/demo' ? 'page' : undefined}
            >
              {mkt.pedirDemo}
            </a>
          </nav>

          {/* ④ Os três idiomas, com a rota mantida. */}
          <nav className="bo-mkt__idiomas" aria-label={m.entrar.idioma}>
            {IDIOMAS.map((x) => (
              <a
                key={x}
                href={`/${x}${caminho}`}
                lang={x}
                hrefLang={x}
                aria-label={NOME_DO_IDIOMA[x]}
                aria-current={x === idioma ? 'true' : undefined}
              >
                {x.slice(0, 2).toUpperCase()}
              </a>
            ))}
          </nav>

          {/* ⑤ A entrada na conta. A rota existe desde o E04. */}
          <a className="bo-mkt__entrar" href={`/${idioma}/auth/login`}>
            {m.entrar.accao}
          </a>
        </MenuMkt>
      )}
      rodape={(
        <div className="bo-mkt__rodape">
          <nav className="bo-mkt__rodape-grupo" aria-labelledby="rod-plataforma">
            <p className="bo-mkt__rodape-titulo" id="rod-plataforma">{mkt.rodapePlataforma}</p>
            {PAGINAS_PRINCIPAIS.map((p) => (
              <a key={p.rota} href={`/${idioma}${p.rota}`}>{k[p.chave]}</a>
            ))}
          </nav>

          <nav className="bo-mkt__rodape-grupo" aria-labelledby="rod-recursos">
            <p className="bo-mkt__rodape-titulo" id="rod-recursos">{mkt.recursos}</p>
            {PAGINAS_RECURSOS.map((p) => (
              <a key={p.rota} href={`/${idioma}${p.rota}`}>{k[p.chave]}</a>
            ))}
          </nav>

          <nav className="bo-mkt__rodape-grupo" aria-labelledby="rod-comecar">
            <p className="bo-mkt__rodape-titulo" id="rod-comecar">{mkt.rodapeComecar}</p>
            <a href={`/${idioma}/demo`}>{mkt.pedirDemo}</a>
            <a href={`/${idioma}/auth/login`}>{m.entrar.accao}</a>
            {/* A única das rotas legais do §6.3.14 que passou a existir. Termos
                e cookies continuam sem rota e continuam sem ligação. */}
            <a href={`/${idioma}/privacy`}>{mkt.navPrivacidade}</a>
          </nav>

          <nav className="bo-mkt__rodape-grupo" aria-labelledby="rod-idiomas">
            <p className="bo-mkt__rodape-titulo" id="rod-idiomas">{m.entrar.idioma}</p>
            {IDIOMAS.map((x) => (
              <a key={x} href={`/${x}${caminho}`} lang={x} hrefLang={x}
                 aria-current={x === idioma ? 'true' : undefined}>
                {NOME_DO_IDIOMA[x]}
              </a>
            ))}
          </nav>
        </div>
      )}
      rotuloSaltar={m.comum.saltarParaConteudo}
      assinatura={m.comum.asinatura}
      variante="comercial"
    >
      {children}
    </EstruturaPublica>
  );
}
