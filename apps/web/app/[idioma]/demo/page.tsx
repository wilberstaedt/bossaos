import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';

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

export default async function Demo({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { idioma } = await params;
  const { erro } = await searchParams;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/demo">
      <section className="bo-mkt__heroi">
        <h1>{k.demoTitulo}</h1>
        <p className="bo-publico__texto">{k.demoTexto}</p>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="pedir">
        <h2 id="pedir">{k.demoEnviar}</h2>

        {erro === 'gravacao' ? (
          <Aviso tom="perigo" titulo={k.demoErro}>{k.demoErroTexto}</Aviso>
        ) : null}
        {erro === 'campos' ? (
          <Aviso tom="aviso" titulo={k.demoErro}>{k.demoErroTexto}</Aviso>
        ) : null}

        <form method="post" action="/api/publico/demo" className="bo-publico__formulario">
          <input type="hidden" name="idioma" value={idioma} />
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="nome">{k.demoNome}</label>
            <input className="bo-campo__controlo" id="nome" name="nome" required
                   autoComplete="name" maxLength={200} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="email">{k.demoEmail}</label>
            <input className="bo-campo__controlo" id="email" name="email" type="email" required
                   autoComplete="email" maxLength={320} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="restaurante">{k.demoRestaurante}</label>
            <input className="bo-campo__controlo" id="restaurante" name="restaurante" required
                   autoComplete="organization" maxLength={200} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="telefone">{k.demoTelefone}</label>
            <input className="bo-campo__controlo" id="telefone" name="telefone"
                   autoComplete="tel" inputMode="tel" maxLength={40} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="mensagem">{k.demoMensagem}</label>
            <textarea id="mensagem" name="mensagem" maxLength={4000} />
          </div>
          <p><button type="submit" className="bo-botao bo-botao--primario">{k.demoEnviar}</button></p>
        </form>
      </section>
    </MolduraMkt>
  );
}
