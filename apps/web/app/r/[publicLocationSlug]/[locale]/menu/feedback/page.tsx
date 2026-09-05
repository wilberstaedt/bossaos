import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';

export const dynamic = 'force-dynamic';

/**
 * MENU-017 · «¿Cómo fue tu visita?» (atlas) — a tela pública.
 *
 * ── Deixar uma opinião NÃO é aceitar publicidade ──────────────────────────
 *
 * Esta tela é a fronteira mais fácil de estragar da etapa: alguém escreve que
 * gostou do jantar, deixa o email para o caso de haver resposta, e passa a
 * receber promoções para sempre.
 *
 * Por isso o consentimento de campanha é uma pergunta **separada e explícita**,
 * com a resposta a começar em «não». Uma caixa pré-marcada não é consentimento,
 * e um formulário que o infere da presença do email também não.
 */
export default async function Feedback({
  params,
}: { params: Promise<{ publicLocationSlug: string; locale: Idioma }> }) {
  const { publicLocationSlug, locale } = await params;
  const t = mensagensDe(locale).crmE27;

  return (
    <div className="bo-publico">
      <div className="bo-publico__cabecalho">
        <h1 data-tela="MENU-017">{t.comoFoi}</h1>
      </div>
      <p data-teste="servico-nao-da-campanha">{t.servicoNaoDaCampanha}</p>
      <form method="post" action={`/api/publico/${publicLocationSlug}/feedback`}
            className="bo-forma">
        <input type="hidden" name="idioma" value={locale} />
        <Seletor rotulo={t.nota} name="nota" required>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
        </Seletor>
        <Campo rotulo={t.comentario} name="comentario" maxLength={400} />
        <Campo rotulo={t.email} name="email" type="email" maxLength={160} />
        {/* Começa em «não», e é uma pergunta à parte. Uma caixa pré-marcada não
            é consentimento, e inferi-lo da presença do email também não. */}
        <Seletor rotulo={t.campanhaFinalidade} name="consenteCampanha" required>
          <option value="NAO">{t.retirado}</option>
          <option value="SIM">{t.dado}</option>
        </Seletor>
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
