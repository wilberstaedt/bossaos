import { Botao } from '@bossaos/ui';
import { MOEDA_COMERCIAL, precoDoPlano } from '@bossaos/domain';
import { formatarDinheiro, formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';
import { AvisoDeDemonstracao, Composicao, RANHURA_METADE } from '../../../src/componentes/Demonstracao.tsx';
import type { Metadata } from 'next';
import { metadadosDaRota } from '../../../src/seo/metadados.ts';

/**
 * MKT-006 · «Así empezamos contigo» (atlas p. 14)
 *
 * ── Esta rota NÃO é a que o atlas sugere, e o motivo é um conflito dele ───
 *
 * O atlas dá `/[locale]/onboarding` a esta tela **e** ao ONB-009 («Invita a tu
 * equipo»), que é do E04 e está **validado** nessa rota. Duas telas, duas
 * etapas, o mesmo endereço.
 *
 * Não mexo em trabalho validado para acomodar uma tela nova, e a colisão não é
 * minha para resolver: é uma correcção no atlas, e quem o assina é que a faz. O
 * MKT-006 fica em `/getting-started` e a divergência está declarada no `E10.md`
 * — como o conflito CT-03 / ADR 0001 ficou declarado no E01.
 *
 * ── O que esta página era, medido antes de lhe tocar ──────────────────────
 *
 * Duas secções, e o `h1` e o `h2` eram a **mesma chave** (`comecamosTitulo`): a
 * página dizia o próprio nome duas vezes antes de dizer o que faz. Os quatro
 * passos eram os da secção 9 da home, palavra por palavra. Zero preços, zero
 * imagens do produto, e **nenhuma** das três ressalvas do §6.6 — nem sequer
 * presentes na página. 1085 px de altura a 1440: quase não rolava.
 *
 * ── E o que é agora, que é o que a home e a `/plans` NÃO dão ──────────────
 *
 * A home tem os quatro passos numa linha cada. A `/plans` tem o dinheiro da
 * implantação por plano. Aqui chega quem **já decidiu** e quer saber o que
 * acontece quando o sistema entra na casa — e é a única página onde cabe a
 * pergunta que ninguém faz a tempo: *o que é que eu tenho de ter?*
 *
 *   · os mesmos quatro passos, mas com o que acontece DENTRO de cada um;
 *   · o acompanhamento em HORAS, com o preço ao lado — e não o contrário,
 *     que é o corte que a `/plans` já faz;
 *   · e o que é preciso ter pronto, com as três ressalvas do §6.6 no CORPO.
 *
 * ── Porque é que as ressalvas vão no corpo e não em letra pequena ─────────
 *
 * O §6.6 obriga a três: nenhum modelo é universalmente compatível sem
 * homologação; compra, garantia, rede, montagem e cabeamento não vão incluídos;
 * e não se publica kit fechado inexistente.
 *
 * Cumpri-las com uma nota de rodapé a 11 px passa um contador de ocorrências e
 * falha a pessoa: quem lê isto e conclui que compra um pacote e fica servido
 * descobre o contrário na semana da instalação. **Esta secção existe para
 * evitar essa semana**, e por isso a `rv100-implantacao.spec.ts` mede cada
 * ressalva com o TAMANHO DE LETRA em que aparece, em vez de contar
 * «homologação» na página.
 *
 * ── E porque é que não há preço de aparelho nem modelo nomeado ────────────
 *
 * A `PRECIFICACAO.md` não tem uma única ocorrência de hardware, equipamento,
 * aparelho, terminal, impressora, gaveta, leitor ou homologação — 63 linhas,
 * seis menções aos planos, zero de equipamento; o `.json` também não. O §6.6
 * manda «usar a linguagem vigente» numa fonte que **não tem essa linguagem**.
 *
 * A saída é o próprio §6.6, que está escrito todo em condicional — «pode
 * precisar de», «conforme operação», «quando aplicáveis» —, e é essa a voz que
 * aqui se usa. O que fica de fora é inventar preço de aparelho ou nomear
 * modelo: o D16 da `DECISOES.md` (hardware incluído) é pendente externo, e um
 * kit fechado publicado sobre uma decisão que não existe seria dado falso na
 * pior superfície possível.
 *
 * ── Nenhum número está escrito aqui ───────────────────────────────────────
 *
 * Preço de implantação e horas saem os dois de `precoDoPlano()`, que lê a
 * `PRECIFICACAO.json`. A `validar-precos.sh` reprova um `€ 99` escrito à mão, e
 * as horas seguem o mesmo caminho pela mesma razão: «duas horas» numa página
 * comercial é uma promessa de trabalho, e uma promessa escrita à mão
 * dessincroniza-se do dia em que a tabela mudar.
 */
export const dynamic = 'force-static';

export async function generateMetadata(
  { params }: { params: Promise<{ idioma: Idioma }> },
): Promise<Metadata> {
  const { idioma } = await params;
  return metadadosDaRota(idioma, '/getting-started');
}

/** Os quatro passos: o NOME é partilhado com a home, o detalhe é desta página. */
const PASSOS = ['passo1', 'passo2', 'passo3', 'passo4'] as const;

/** A ordem comercial dos planos, para as horas de acompanhamento. */
const PLANOS = [
  { codigo: 'STARTER', nome: 'planoStarter' },
  { codigo: 'RESTAURANT', nome: 'planoRestaurant' },
  { codigo: 'PRO', nome: 'planoPro' },
] as const;

/** Os quatro blocos do que é preciso ter pronto (§6.6, em condicional). */
const EQUIPAMENTOS = [
  'equipamentoPronto1', 'equipamentoPronto2', 'equipamentoPronto3', 'equipamentoPronto4',
] as const;

export default async function Comecamos({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;
  const euros = (centimos: number) =>
    formatarDinheiro({ montanteMenor: centimos, moeda: MOEDA_COMERCIAL }, idioma);

  return (
    <MolduraMkt idioma={idioma} actual="/getting-started">
      {/* ── O herói, com a composição cuja LARGURA DE CAPTURA serve a coluna ─
          O herói da home põe duas capturas de 1440 numa coluna de ~550, e elas
          ficam a 38-41% da escala a que foram tiradas — está aberto desde a L1e.
          Aqui a composição é o tablet, capturado a 834 em retrato: na mesma meia
          coluna renderiza-se muito mais perto da escala real.

          A regra do §6.4 — «produto legível, não uma miniatura indecifrável» —
          não se cumpre evitando a palavra «mockup». Cumpre-se escolhendo a
          captura cuja largura serve o sítio onde ela vai, e o instrumento mede a
          razão entre as duas. */}
      <section className="bo-mkt__heroi bo-mkt__heroi--duas">
        <div className="bo-mkt__heroi-texto">
          <h1>{k.implantacaoPagina}</h1>
          <p className="bo-publico__texto">{k.implantacaoPaginaTexto}</p>
          <p className="bo-mkt__chamada">
            <Botao tom="primario" href={`/${idioma}/demo`}>{k.pedirDemo}</Botao>
            <Botao tom="secundario" href={`/${idioma}/plans`}>{k.verPlanos}</Botao>
          </p>
        </div>
        <div className="bo-mkt__heroi-media">
          <figure className="bo-mkt__figura">
            <Composicao
              qual="tablet"
              idioma={idioma}
              prioritaria
              tamanhos={RANHURA_METADE}
            />
            <figcaption className="bo-mkt__legenda">{k.implantacaoHeroiLegenda}</figcaption>
          </figure>
        </div>
      </section>

      <AvisoDeDemonstracao idioma={idioma} />

      {/* ── Os quatro passos, com o que acontece DENTRO de cada um ──────────
          A `marketing.spec.ts` ancora o MKT-006 em `.bo-mkt__passos`, e essa
          âncora não se mexe. O que muda é o conteúdo: o `passoNTexto` da home
          fica na home — repeti-lo aqui era esta página ser a secção outra vez,
          que é o defeito que a `/product` teve até à L1e. */}
      <section className="bo-mkt__seccao" aria-labelledby="t-passos">
        <h2 id="t-passos">{k.comecamosTitulo}</h2>
        <p className="bo-publico__texto">{k.comecamosTexto}</p>
        <ol className="bo-mkt__passos">
          {PASSOS.map((p) => (
            <li key={p} className="bo-mkt__passo">
              <h3>{k[p]}</h3>
              <p>{k[`${p}Detalhe` as keyof typeof k] as string}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── O acompanhamento em HORAS, com o preço ao lado ──────────────────
          A `/plans` mostra o dinheiro em grande e as horas como nota, porque lá
          a pergunta é «quanto custa». Aqui a pergunta é «quanto tempo estão
          comigo», e por isso o número grande é o das horas. Mesma fonte, corte
          diferente — não é a mesma composição com mais espaço.

          O IVA e a unidade de cobrança vão em TODOS os cartões que mostram um
          valor: o §6.5 diz «todos os valores». A medição emparelha preço com
          nota; um aviso solitário no fim da página passaria uma contagem global
          e deixava três cartões nus no ecrã. */}
      <section className="bo-mkt__seccao" aria-labelledby="t-custo">
        <h2 id="t-custo">{k.implantacaoCustoTitulo}</h2>
        <p className="bo-publico__texto">{k.implantacaoCustoTexto}</p>
        <div className="bo-mkt__grelha">
          {PLANOS.map((plano) => {
            const preco = precoDoPlano(plano.codigo);
            if (preco === null) return null;
            return (
              <article className="bo-mkt__cartao" key={plano.codigo}>
                <h3>{k[plano.nome]}</h3>
                {preco.horasDeImplantacao !== null ? (
                  <p className="bo-mkt__horas">
                    <strong>{formatarNumero(preco.horasDeImplantacao, idioma)}</strong>
                  </p>
                ) : null}
                <p className="bo-mkt__preco-nota">{k.implantacaoHoras}</p>
                <p className="bo-mkt__preco">
                  <strong>
                    {preco.implantacaoAssistida === null
                      ? k.precoAOrcar
                      : euros(preco.implantacaoAssistida)}
                  </strong>
                </p>
                <p className="bo-mkt__preco-nota">{k.precoImplantacao}</p>
                <p className="bo-mkt__preco-nota">{k.precoImposto}</p>
                {/* `null` é «por definir», nunca «grátis» — e só o Starter tem
                    valor autogerido. Escrever «0» nos outros era vender de borla
                    um caminho que a fonte não concede. */}
                <p className="bo-mkt__preco-nota">
                  {k.precoImplantacaoSozinho}
                  {': '}
                  {preco.implantacaoSozinho === null
                    ? k.precoAOrcar
                    : euros(preco.implantacaoSozinho)}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── O que é preciso ter pronto (§6.6) ───────────────────────────────
          As três ressalvas, e onde cada uma vive:

            homologação  → no parágrafo de abertura E no terceiro cartão;
            não incluído → no quarto cartão (compra, garantia, rede, montagem,
                           cabeamento) — a palavra medida é «cabeamento», por ser
                           a menos reutilizável da lista: «rede» e «montagem»
                           aparecem noutros contextos comerciais, cabeamento não;
            sem kit      → no destaque, dito por extenso.

          Nenhuma vai em `.bo-mkt__preco-nota` (14 px) nem em `<small>`. Todas em
          corpo, e o instrumento devolve o tamanho de letra para o provar. */}
      <section className="bo-mkt__seccao" aria-labelledby="t-equipamentos">
        <h2 id="t-equipamentos">{k.equipamentosProntoTitulo}</h2>
        <p className="bo-publico__texto">{k.equipamentosProntoTexto}</p>
        <div className="bo-mkt__grelha">
          {EQUIPAMENTOS.map((e) => (
            <article className="bo-mkt__cartao" key={e}>
              <h3>{k[e]}</h3>
              <p>{k[`${e}Texto` as keyof typeof k] as string}</p>
            </article>
          ))}
        </div>
        <p className="bo-mkt__destaque">{k.equipamentosSemKit}</p>
      </section>

      {/* ── O fecho, e a única conversão que existe ─────────────────────────
          Não há registo público, checkout nem criação de assinatura: a entrada é
          por convite e a única porta pública é a demo. Um botão «Contratar»
          seria porta morta — não se esconde o caminho, muda-se-lhe o peso. */}
      <section className="bo-mkt__seccao bo-mkt__fecho" aria-labelledby="t-fecho">
        <h2 id="t-fecho">{k.implantacaoFechoTitulo}</h2>
        <p className="bo-publico__texto">{k.implantacaoFechoTexto}</p>
        <p className="bo-mkt__chamada">
          <Botao tom="primario" href={`/${idioma}/demo`}>{k.pedirDemo}</Botao>
          <Botao tom="secundario" href={`/${idioma}/plans`}>{k.verPlanos}</Botao>
        </p>
      </section>
    </MolduraMkt>
  );
}
