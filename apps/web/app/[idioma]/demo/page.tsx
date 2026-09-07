import { cookies } from 'next/headers';
import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';
import type { Metadata } from 'next';
import { metadadosDaRota } from '../../../src/seo/metadados.ts';

/**
 * MKT-007 · «Ve BossaOS en una demo» (atlas p. 13)
 *
 * ── O formulário GRAVA, e é por isso que existe uma tabela para ele ───────
 *
 * A saída barata era desenhar os campos e mandar para uma página de obrigado sem
 * gravar nada. É o defeito que o aceite 2 desta etapa persegue — e escrito de
 * propósito na página cujo trabalho é angariar clientes.
 *
 * `demo_requests` existe fora do espaço de inquilino porque quem pede uma demo
 * não é inquilino de ninguém, e o runtime nem sequer tem `SELECT` nela: escreve
 * por uma porta que só sabe inserir.
 *
 * Os desfechos vêm no endereço, como no contacto do restaurante: o estado
 * sobrevive a um recarregar e é o servidor quem decide o que dizer.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ idioma: Idioma }> },
): Promise<Metadata> {
  const { idioma } = await params;
  return metadadosDaRota(idioma, '/demo');
}

export default async function Demo({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { idioma } = await params;
  const { erro } = await searchParams;
  /**
   * O que a pessoa escreveu, devolvido depois de uma recusa (RV100-021).
   *
   * Vazio quando não houve recusa — e nesse caso os campos nascem vazios, como
   * devem. O `catch` é largo de propósito: um cookie corrompido não pode
   * impedir o formulário de aparecer, e a consequência de o ignorar é a de
   * antes, não um ecrã partido.
   */
  const repor = await (async () => {
    try {
      const cru = (await cookies()).get('bo_demo_repor')?.value;
      if (!cru) return {} as Record<string, string>;
      const v = JSON.parse(cru) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(v).filter(([, x]) => typeof x === 'string'),
      ) as Record<string, string>;
    } catch { return {} as Record<string, string>; }
  })();
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/demo">
      {/* Divisão editorial: o título à esquerda, o corpo à direita.
          O vazio à direita não era composição — era o `max-width: 68ch`
          do lead a decidir sozinho o desenho (184 + 544 = 728, o mesmo
          número em cinco páginas). As duas medidas de leitura ficam
          intactas; o que muda é elas ocuparem o contentor. */}
      <section className="bo-mkt__heroi bo-mkt__heroi--editorial">
        <h1>{k.demoTitulo}</h1>
        <div>
          <p className="bo-publico__texto">{k.demoTexto}</p>
        </div>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="pedir">
        <h2 id="pedir">{k.demoEnviar}</h2>

        {/* ── Os dois erros deixam de dizer a mesma coisa ──────────────────
            A rota já distinguia validação de falha de escrita — `erro=campos` e
            `erro=gravacao` são redireccionamentos diferentes. **O ecrã desfazia
            a distinção**: as duas mostravam `demoErro`/`demoErroTexto`, que diz
            «volta a tentar daqui a um momento».

            Para uma base em baixo isso é o conselho certo. Para um email sem
            arroba é o conselho ERRADO — esperar não corrige um campo, e mandar
            alguém esperar por causa do que ele escreveu é fazê-lo perder o
            pedido. A distinção existia no caminho e morria na mensagem. */}
        {erro === 'gravacao' ? (
          <Aviso tom="perigo" titulo={k.demoErro}>{k.demoErroTexto}</Aviso>
        ) : null}
        {erro === 'campos' ? (
          <Aviso tom="aviso" titulo={k.demoErroCampos}>{k.demoErroCamposTexto}</Aviso>
        ) : null}

        <form method="post" action="/api/publico/demo" className="bo-publico__formulario">
          <input type="hidden" name="idioma" value={idioma} />
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="nome">{k.demoNome}</label>
            <input className="bo-campo__controlo" id="nome" name="nome" defaultValue={repor.nome ?? ''} required
                   autoComplete="name" maxLength={200} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="email">{k.demoEmail}</label>
            <input className="bo-campo__controlo" id="email" name="email" defaultValue={repor.email ?? ''} type="email" required
                   autoComplete="email" maxLength={320} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="restaurante">{k.demoRestaurante}</label>
            <input className="bo-campo__controlo" id="restaurante" name="restaurante" defaultValue={repor.restaurante ?? ''} required
                   autoComplete="organization" maxLength={200} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="telefone">{k.demoTelefone}</label>
            <input className="bo-campo__controlo" id="telefone" name="telefone" defaultValue={repor.telefone ?? ''}
                   autoComplete="tel" inputMode="tel" maxLength={40} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="mensagem">{k.demoMensagem}</label>
            <textarea id="mensagem" name="mensagem" maxLength={4000}
                      defaultValue={repor.mensagem ?? ''} />
          </div>
          {/* ── O consentimento para MARKETING, separado e por marcar ───────
              O §6.7 manda «diferenciar contacto transaccional de consentimento
              para marketing». Quem preenche isto está a pedir uma demonstração:
              **responder-lhe é o objecto do pedido** e não precisa de caixa.
              Receber outra coisa depois é uma decisão diferente, e é esta.

              `defaultChecked` NÃO existe aqui, e é a linha que interessa: uma
              caixa pré-marcada recolhe o consentimento de quem não reparou, o
              que é o contrário de consentir. Uma caixa não marcada nem sequer é
              enviada pelo navegador — a ausência é a resposta, e a resposta é
              não.

              E o campo é `consentimentoMarketing`, separado de tudo o resto: a
              coluna existe na base com a data ao lado, porque um consentimento
              sem data não se prova. */}
          <div className="bo-campo bo-campo--caixa">
            {/* A caixa vive DENTRO do rótulo, e isso não é arrumação de estilo.
                Tocar em qualquer ponto do texto marca a caixa — que é o alvo de
                44 px que a régua pede, sem inchar a caixa para 44, o que daria
                uma tela pior. O `htmlFor`/`id` fica na mesma: a associação
                explícita é a que os leitores de ecrã anunciam melhor. */}
            <label className="bo-campo__rotulo" htmlFor="consentimentoMarketing">
              <input
                className="bo-campo__caixa"
                id="consentimentoMarketing"
                name="consentimentoMarketing"
                type="checkbox"
                value="sim"
              />
              <span>{k.demoConsentimento}</span>
            </label>
            <p className="bo-campo__ajuda">{k.demoConsentimentoNota}</p>
          </div>

          {/* ── O aviso vem ANTES do botão, e não na página de obrigado ──────
              Depois de enviar já não é aviso, é notícia: a pessoa entregou os
              dados antes de saber o que lhes acontece. Fica no fluxo de leitura
              imediatamente acima da acção, que é o último sítio onde ainda dá
              para mudar de ideias.

              O que ele afirma é verificável: a migração `20260904150000` faz
              `REVOKE ALL ON demo_requests FROM bossaos_app`, portanto o runtime
              escreve e **não lê**. E a ausência de cookies de análise não fica
              só escrita — a `rv100-demo.spec.ts` mede-a, pela mesma regra que a
              página de confiança já segue: uma afirmação nova precisa de
              guarda. */}
          <p className="bo-mkt__tratamento">
            {k.demoTratamento}{' '}
            <a href={`/${idioma}/privacy`}>{k.demoTratamentoLigacao}</a>
          </p>

          <p className="bo-publico__texto">{k.demoPassoSeguinte}</p>

          <p><button type="submit" className="bo-botao bo-botao--primario">{k.demoEnviar}</button></p>
        </form>
      </section>
    </MolduraMkt>
  );
}
