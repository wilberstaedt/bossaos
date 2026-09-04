import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';

/**
 * MKT-005 · «Compara los planes» (atlas p. 11)
 *
 * ── Não há preços nesta página, e é deliberado ────────────────────────────
 *
 * Os escalões — Starter, Restaurant, Pro — são reais: estão no atlas e são o que
 * as concessões do E05 referenciam. **Os preços não existem.** Nenhum documento
 * deste projecto os decide, e escrever números aqui era inventar dados numa
 * página comercial, que é a pior superfície onde o fazer: um preço publicado
 * passa a ser uma promessa a quem o leu.
 *
 * Fica declarado no `E10.md` como decisão de negócio por tomar, não como algo
 * esquecido. Quando existirem, entram aqui e nesta tabela.
 *
 * ── A tabela rola DENTRO da própria caixa ─────────────────────────────────
 *
 * Uma comparação de três colunas a 360 px ou rola ou deixa de se poder comparar,
 * que é para o que ela serve. A régua reprova a PÁGINA a rolar na horizontal —
 * não uma tabela com o seu próprio deslocamento, que é o comportamento certo.
 */
export const dynamic = 'force-static';

const ESCALOES = ['Starter', 'Restaurant', 'Pro'] as const;

const LINHAS = [
  { chave: 'cartaoCarta', em: ['Starter', 'Restaurant', 'Pro'] },
  { chave: 'cartaoWeb', em: ['Starter', 'Restaurant', 'Pro'] },
  { chave: 'cartaoSala', em: ['Restaurant', 'Pro'] },
] as const;

export default async function Planos({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/plans">
      <section className="bo-mkt__heroi">
        <h1>{k.planosPagina}</h1>
        <p className="bo-publico__texto">{k.planosTexto}</p>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="comparar">
        <h2 id="comparar">{k.comparar}</h2>
        <div className="bo-mkt__tabela-envolve">
          <table>
            <thead>
              <tr>
                <th scope="col">{k.plano}</th>
                {ESCALOES.map((e) => <th key={e} scope="col">{e}</th>)}
              </tr>
            </thead>
            <tbody>
              {LINHAS.map((l) => (
                <tr key={l.chave}>
                  <th scope="row">{k[l.chave]}</th>
                  {ESCALOES.map((e) => (
                    <td key={e}>
                      {/* Texto, e não um símbolo: um visto verde e uma cruz
                          vermelha dizem a diferença só a quem distingue as
                          cores, e é a mesma regra do E02 para os estados. */}
                      {(l.em as readonly string[]).includes(e) ? k.incluido : k.naoIncluido}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="bo-mkt__chamada" style={{ marginTop: 'var(--bo-espaco-xl)' }}>
          <a className="bo-botao bo-botao--primario" href={`/${idioma}/demo`}>{k.contactar}</a>
        </p>
      </section>
    </MolduraMkt>
  );
}
