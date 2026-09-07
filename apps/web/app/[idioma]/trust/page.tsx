import { ACCOES_QUE_EXIGEM_REDE, type AccaoQueExigeRede } from '@bossaos/fila';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';
import type { Metadata } from 'next';
import { metadadosDaRota } from '../../../src/seo/metadados.ts';

/**
 * MKT-008 · «Una base para trabajar con confianza» (atlas p. 16)
 *
 * As afirmações desta página são todas verificáveis no produto, e é por isso que
 * estão aqui e não outras: o isolamento entre restaurantes tem prova própria
 * desde o E03, a exportação existe desde o E08, e o alérgeno por declarar vale
 * DESCONHECIDO por tipo desde o E07 — não por convenção.
 *
 * Uma página de confiança com promessas que o código não cumpre é a primeira a
 * ser desmentida, e é desmentida pelo cliente.
 *
 * ── O quarto pilar é o assunto sobre o qual a FAQ mentia ──────────────────
 *
 * O `faq4` dizia, nas três línguas, que «a sala continua a trabalhar e
 * sincroniza quando a ligação volta». As duas metades eram falsas: o service
 * worker recusa guardar telas com dados de inquilino, e nada sincroniza
 * sozinho — o ouvinte de `online` troca o rótulo, o envio é um toque.
 *
 * O pilar honesto **não é «funciona offline»**. É: *o que se pode fazer sem
 * rede está delimitado, e o que não se pode não finge*. É mais difícil de
 * escrever e é a única versão que uma guarda consegue provar.
 *
 * ── E a lista NÃO está escrita aqui, o que é o ponto ──────────────────────
 *
 * Os nomes das acções saem de `ACCOES_QUE_EXIGEM_REDE`, a lista fechada do
 * `@bossaos/fila` que o produto usa para recusar. A página lê a mesma constante
 * que o `PainelDaFila` — não uma cópia dela.
 *
 * E o mapa é `Record<AccaoQueExigeRede, string>`: **uma acção nova na lista
 * fechada parte o build** até alguém lhe dar nome nesta página. O compilador é
 * a guarda, que é o mesmo desenho do `precificacao.ts` a importar o JSON dos
 * preços em vez de copiar a tabela.
 *
 * Sem isto, a página dizia «quatro» num texto fixo e ficava a mentir no dia em
 * que passassem a cinco — que é exactamente como o `faq4` chegou onde chegou.
 *
 * ── O que esta página NÃO diz, e é deliberado ─────────────────────────────
 *
 * Não diz que compor um pedido «sincroniza sozinho», porque não sincroniza. Diz
 * que fica em fila e que o ecrã não lhe chama enviado — que é o que o
 * `porEnviarNoAparelho` e os rótulos `Sin enviar`/`Não enviados`/`Not sent`
 * mostram, e o que a `provar-fila.sh` já mede.
 */
export const dynamic = 'force-static';

export async function generateMetadata(
  { params }: { params: Promise<{ idioma: Idioma }> },
): Promise<Metadata> {
  const { idioma } = await params;
  return metadadosDaRota(idioma, '/trust');
}

const PILARES = ['confianca1', 'confianca2', 'confianca3'] as const;

/**
 * O nome comercial de cada acção que exige servidor.
 *
 * `Record<AccaoQueExigeRede, …>` e não `Record<string, …>`: o tipo obriga a
 * cobrir a lista fechada inteira, e recusa uma chave que não seja membro dela.
 */
const NOME_DA_ACCAO: Record<AccaoQueExigeRede, string> = {
  'pagamento': 'accaoRedePagamento',
  'reserva.confirmar': 'accaoRedeReservaConfirmar',
  'conta.fechar': 'accaoRedeContaFechar',
  'desconto.autorizar': 'accaoRedeDescontoAutorizar',
};

export default async function Confianca({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/trust">
      {/* Divisão editorial: o título à esquerda, o corpo à direita.
          O vazio à direita não era composição — era o `max-width: 68ch`
          do lead a decidir sozinho o desenho (184 + 544 = 728, o mesmo
          número em cinco páginas). As duas medidas de leitura ficam
          intactas; o que muda é elas ocuparem o contentor. */}
      <section className="bo-mkt__heroi bo-mkt__heroi--editorial">
        <h1>{k.confiancaTitulo}</h1>
        <div>
          <p className="bo-publico__texto">{k.confiancaTexto}</p>
        </div>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="pilares">
        <h2 id="pilares">{k.confiancaPaginaTitulo}</h2>
        <p className="bo-publico__texto">{k.confiancaPaginaTexto}</p>
        <div className="bo-mkt__grelha">
          {PILARES.map((p) => (
            <article key={p} className="bo-mkt__cartao">
              <h3>{k[p]}</h3>
              <p>{k[`${p}Texto` as keyof typeof k] as string}</p>
              {/* A PROVA de cada pilar — o que a secção da home não carrega.
                  O bloco 10 da home mostra estes mesmos três pilares com o
                  mesmo texto; era isso que fazia desta página o bloco da home
                  com mais espaço. O que ela pode dar a mais não é mais copy: é
                  COMO se verifica cada afirmação, que é a única coisa que uma
                  secção de resumo não tem sítio para dizer. */}
              <p className="bo-mkt__prova">{k[`${p}Prova` as keyof typeof k] as string}</p>
            </article>
          ))}

          {/* ── O quarto pilar: a operação degradada, delimitada ─────────────
              A lista vem da constante e não daqui. Se o produto passar a exigir
              rede para uma quinta acção, ou esta página ganha o nome dela ou o
              build parte — e nenhuma das duas é a página continuar a dizer
              quatro. */}
          <article className="bo-mkt__cartao" data-teste="pilar-offline">
            <h3>{k.confianca4}</h3>
            <p>{k.confianca4Texto}</p>
            <ul className="bo-mkt__lista-limite">
              {ACCOES_QUE_EXIGEM_REDE.map((accao) => (
                <li key={accao}>{k[NOME_DA_ACCAO[accao] as keyof typeof k] as string}</li>
              ))}
            </ul>
            <p>{k.confianca4Nota}</p>
            <p className="bo-mkt__prova">{k.confianca4Prova}</p>
          </article>
        </div>
      </section>
    </MolduraMkt>
  );
}
