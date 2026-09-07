import { Botao } from '@bossaos/ui';
import {
  COMISSAO_DIRECTOS, MENSALIDADES_NUM_ANO, MOEDA_COMERCIAL, precoDoPlano,
} from '@bossaos/domain';
import { formatarDinheiro, formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';
import { capacidadesDoPlano } from '../../../src/componentes/planos.ts';
import type { Metadata } from 'next';
import { metadadosDaRota } from '../../../src/seo/metadados.ts';

/**
 * MKT-005 · «Compara los planes» (atlas p. 11)
 *
 * ── Esta página NÃO é a secção de planos da home com mais espaço ──────────
 *
 * A home ganhou, na L1b, um bloco de planos com os doze valores. Se esta página
 * repetisse esse conteúdo era o mesmo defeito que a `/product` tem hoje — repete
 * os três cartões da home chave por chave —, só que numa página onde alguém
 * chega **já decidido a comparar**.
 *
 * Por isso o que aqui está é o que a secção NÃO dá:
 *
 *   · recomendação JUSTIFICADA, com o motivo de NÃO subir de escalão;
 *   · comparação completa, linha a linha, pelas três famílias do §6.5;
 *   · a implantação separada da assinatura, com horas e o caso do Starter;
 *   · adicionais e dependências ditos antes de alguém perguntar;
 *   · FAQ de cobrança e mudança de plano.
 *
 * Os rótulos de preço (`precoMes`, `precoImposto`…) são partilhados de
 * propósito: são **unidades**, não conteúdo. «al mes» escrito em duas chaves
 * diferentes é como uma tabela de preços se dessincroniza de si própria.
 *
 * ── Nenhum número está escrito nesta página ───────────────────────────────
 *
 * Preços, horas de implantação e comissão saem todos da `PRECIFICACAO.json`
 * através do `packages/domain`. A `validar-precos.sh` reprova um `€ 19` escrito
 * à mão, e é ela que impede esta página de divergir da fonte.
 *
 * ── E a comparação também não está escrita ────────────────────────────────
 *
 * As linhas saem de `capacidadesDoPlano()`, derivado da `DESTAQUES` — que a
 * `provas/planos.test.ts` já compara com o catálogo REAL na base e reprova se
 * algum plano prometer o que não concede, com controlo negativo. Uma tabela
 * escrita à mão aqui era uma segunda verdade a envelhecer sozinha.
 *
 * ── A tabela rola DENTRO da própria caixa ─────────────────────────────────
 *
 * Uma comparação de três colunas a 360 px ou rola ou deixa de se poder
 * comparar, que é para o que ela serve. A régua reprova a PÁGINA a rolar na
 * horizontal — não uma tabela com o seu próprio deslocamento.
 */
export const dynamic = 'force-static';

export async function generateMetadata(
  { params }: { params: Promise<{ idioma: Idioma }> },
): Promise<Metadata> {
  const { idioma } = await params;
  return metadadosDaRota(idioma, '/plans');
}

const PLANOS = [
  { codigo: 'STARTER', nome: 'planoStarter', titulo: 'recomendaStarter', porque: 'recomendaStarterTexto' },
  { codigo: 'RESTAURANT', nome: 'planoRestaurant', titulo: 'recomendaRestaurant', porque: 'recomendaRestaurantTexto' },
  { codigo: 'PRO', nome: 'planoPro', titulo: 'recomendaPro', porque: 'recomendaProTexto' },
] as const;

/**
 * As três famílias que o §6.5 nomeia — «catálogo/site, operação e gestão
 * avançada» — e as capacidades de cada uma. A ADESÃO de cada plano não está
 * aqui: vem derivada da tabela que a prova já guarda.
 */
const FAMILIAS = [
  {
    titulo: 'familiaCatalogo',
    linhas: [
      { capacidade: 'carta.digital', rotulo: 'capCarta' },
      { capacidade: 'site.restaurante', rotulo: 'capSite' },
      { capacidade: 'tema.coresProprias', rotulo: 'capCores' },
    ],
  },
  {
    titulo: 'familiaOperacao',
    linhas: [
      { capacidade: 'reservas', rotulo: 'capReservas' },
      { capacidade: 'sala', rotulo: 'capSala' },
      { capacidade: 'kds', rotulo: 'capKds' },
    ],
  },
  {
    titulo: 'familiaGestao',
    linhas: [
      { capacidade: 'tpv', rotulo: 'capTpv' },
      { capacidade: 'stock', rotulo: 'capStock' },
    ],
  },
] as const;

export default async function Planos({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);
  const k = m.mktE10;

  const euros = (centimos: number) =>
    formatarDinheiro({ montanteMenor: centimos, moeda: MOEDA_COMERCIAL }, idioma);

  const concede = new Map(PLANOS.map((p) => [p.codigo, capacidadesDoPlano(p.codigo)]));

  return (
    <MolduraMkt idioma={idioma} actual="/plans">
      {/* Divisão editorial: o título à esquerda, o corpo à direita.
          O vazio à direita não era composição — era o `max-width: 68ch`
          do lead a decidir sozinho o desenho (184 + 544 = 728, o mesmo
          número em cinco páginas). As duas medidas de leitura ficam
          intactas; o que muda é elas ocuparem o contentor. */}
      <section className="bo-mkt__heroi bo-mkt__heroi--editorial">
        <h1>{k.planosPagina}</h1>
        <div>
          <p className="bo-publico__texto">{k.planosPaginaTexto}</p>
        </div>
      </section>

      {/* ── Cards de decisão rápidos, com recomendação JUSTIFICADA ────────
          O §6.5 pede «recomendação justificada, sem manipulação enganosa». O que
          a torna honesta é dizer também quando NÃO subir: cada cartão traz o
          caso em que o escalão de cima ainda não compensa. Um comparador que só
          empurra para cima não é uma recomendação, é um funil. */}
      <section className="bo-mkt__seccao" aria-labelledby="t-escolher">
        <h2 id="t-escolher">{k.compararTitulo}</h2>
        <p className="bo-publico__texto">{k.compararTexto}</p>

        <div className="bo-mkt__grelha">
          {PLANOS.map((plano) => {
            const preco = precoDoPlano(plano.codigo);
            return (
              <article className="bo-mkt__cartao bo-mkt__plano" key={plano.codigo}>
                <h3>{k[plano.nome]}</h3>
                {preco === null ? (
                  <p className="bo-mkt__preco">{k.precoAOrcar}</p>
                ) : (
                  <>
                    <p className="bo-mkt__preco">
                      <strong>{euros(preco.mensal)}</strong> {k.precoMes}
                    </p>
                    <p className="bo-mkt__preco-ano">
                      {euros(preco.anual)} {k.precoAno}
                      {' — '}
                      {k.precoEquivalente.replace('{valor}', euros(preco.equivalenteMensal))}
                    </p>
                    <p className="bo-mkt__preco-nota">{k.precoImposto}</p>
                  </>
                )}
                <p className="bo-mkt__plano-quem"><strong>{k[plano.titulo]}</strong></p>
                <p>{k[plano.porque]}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Comparação completa, por família (§6.5) ─────────────────────── */}
      <section className="bo-mkt__seccao" aria-labelledby="comparar">
        <h2 id="comparar">{k.comparar}</h2>
        <div className="bo-mkt__tabela-envolve">
          <table>
            <thead>
              <tr>
                <th scope="col">{k.plano}</th>
                {PLANOS.map((p) => <th key={p.codigo} scope="col">{k[p.nome]}</th>)}
              </tr>
            </thead>
            {FAMILIAS.map((familia) => (
              <tbody key={familia.titulo}>
                <tr>
                  {/* A família é um cabeçalho de GRUPO: `colgroup` com `colSpan`,
                      para quem ouve saber que as linhas seguintes lhe pertencem
                      em vez de as apanhar soltas no meio da tabela. */}
                  <th scope="colgroup" colSpan={PLANOS.length + 1} className="bo-mkt__familia">
                    {k[familia.titulo]}
                  </th>
                </tr>
                {familia.linhas.map((linha) => (
                  <tr key={linha.capacidade}>
                    <th scope="row">{k[linha.rotulo]}</th>
                    {PLANOS.map((p) => (
                      <td key={p.codigo}>
                        {/* Texto, e não um símbolo: um visto verde e uma cruz
                            vermelha dizem a diferença só a quem distingue as
                            cores, e é a mesma regra do E02 para os estados. */}
                        {concede.get(p.codigo)?.has(linha.capacidade) ? k.incluido : k.naoIncluido}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      {/* ── A implantação, separada da assinatura (§6.5) ────────────────── */}
      <section className="bo-mkt__seccao" aria-labelledby="t-implantacao">
        <h2 id="t-implantacao">{k.implantacaoTitulo}</h2>
        <p className="bo-publico__texto">{k.implantacaoTexto}</p>
        <div className="bo-mkt__grelha">
          {PLANOS.map((plano) => {
            const preco = precoDoPlano(plano.codigo);
            if (preco === null) return null;
            return (
              <article className="bo-mkt__cartao" key={plano.codigo}>
                <h3>{k[plano.nome]}</h3>
                <p className="bo-mkt__preco">
                  <strong>
                    {preco.implantacaoAssistida === null
                      ? k.precoAOrcar
                      : euros(preco.implantacaoAssistida)}
                  </strong>
                </p>
                <p className="bo-mkt__preco-nota">{k.precoImplantacao}</p>
                {/* O IVA e a unidade de cobranca tambem aqui, e nao so nos
                    cartoes de assinatura: o §6.5 diz «todos os valores» e a
                    implantacao e' um deles. O instrumento apanhou-me — seis
                    blocos com preco e so tres com a nota ao lado. */}
                <p className="bo-mkt__preco-nota">{k.precoImposto}</p>
                {preco.horasDeImplantacao !== null ? (
                  <p className="bo-mkt__preco-nota">
                    {k.implantacaoHoras}: {formatarNumero(preco.horasDeImplantacao, idioma)}
                  </p>
                ) : null}
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
        <p className="bo-mkt__destaque">{k.implantacaoStarterNota}</p>
      </section>

      {/* ── Adicionais e dependências honestos (§6.5) ───────────────────── */}
      <section className="bo-mkt__seccao" aria-labelledby="t-adicionais">
        <h2 id="t-adicionais">{k.adicionaisTitulo}</h2>
        <div className="bo-mkt__grelha">
          <article className="bo-mkt__cartao"><h3>{k.adicional1}</h3><p>{k.adicional1Texto}</p></article>
          <article className="bo-mkt__cartao"><h3>{k.adicional2}</h3><p>{k.adicional2Texto}</p></article>
          <article className="bo-mkt__cartao"><h3>{k.adicional3}</h3><p>{k.adicional3Texto}</p></article>
          <article className="bo-mkt__cartao">
            <h3>{k.adicional4}</h3>
            {/* Zero é um VALOR comercial, não uma ausência: sai da fonte, para
                que uma frase escrita à mão não continue a prometer zero no dia
                em que deixar de o ser. */}
            <p>{k.adicional4Texto.replace(
              '{valor}',
              formatarNumero(COMISSAO_DIRECTOS / 100, idioma, { style: 'percent' }),
            )}</p>
          </article>
        </div>
      </section>

      {/* ── FAQ de cobrança e mudança de plano (§6.5) ───────────────────── */}
      <section className="bo-mkt__seccao" aria-labelledby="t-cobranca">
        <h2 id="t-cobranca">{k.cobrancaTitulo}</h2>
        <div className="bo-mkt__faq">
          <article>
            <h3>{k.cobranca1}</h3>
            <p data-mensalidades={MENSALIDADES_NUM_ANO}>{k.cobranca1Texto}</p>
          </article>
          <article><h3>{k.cobranca2}</h3><p>{k.cobranca2Texto}</p></article>
          <article><h3>{k.cobranca3}</h3><p>{k.cobranca3Texto}</p></article>
          <article><h3>{k.cobranca4}</h3><p>{k.cobranca4Texto}</p></article>
          <article><h3>{k.cobranca5}</h3><p>{k.cobranca5Texto}</p></article>
        </div>
      </section>

      {/* ── CTA coerente com a disponibilidade REAL (§6.5) ────────────────
          Não há registo público, nem checkout, nem pagamento neste produto: a
          entrada faz-se por convite, e a única porta pública é a demo. Um botão
          «Contratar» aqui era uma porta morta — e a `validar-portas-mortas.sh`
          existe por causa dessa classe de mentira.

          O padrão é o da tela do tema: **não se esconde o caminho**, muda-se-lhe
          o peso. Quem já é cliente continua a ver por onde entrar, em
          secundário; quem ainda não é vê o caminho que existe, em primário. */}
      <section className="bo-mkt__seccao bo-mkt__fecho" aria-labelledby="t-contratar">
        <h2 id="t-contratar">{k.contratarTitulo}</h2>
        <p className="bo-publico__texto">{k.contratarTexto}</p>
        <p className="bo-mkt__chamada">
          <Botao tom="primario" href={`/${idioma}/demo`}>{k.pedirDemo}</Botao>
          <Botao tom="secundario" href={`/${idioma}/auth/login`}>
            {m.entrar.accao}
          </Botao>
        </p>
      </section>
    </MolduraMkt>
  );
}
