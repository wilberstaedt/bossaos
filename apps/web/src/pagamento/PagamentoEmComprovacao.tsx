import { mensagensDe, type Idioma } from '@bossaos/i18n';

/**
 * STATE-011 · «El pago sigue en comprobación» (atlas)
 *
 * ── O estado que mais dói, com ecrã próprio ───────────────────────────────
 *
 * «Uma tentativa que teve timeout NÃO falhou. Não se sabe.» E o que se diz a
 * quem está à espera decide se ele é cobrado uma ou duas vezes.
 *
 * Por isso este ecrã não tem botão de tentar outra vez. Diz o contrário: **não
 * tentes**. Um botão aqui seria a interface a convidar para o defeito que a
 * etapa inteira existe para impedir — e a pessoa que carrega nele tem toda a
 * razão em carregar, porque ninguém lhe disse o que estava a acontecer.
 */
export function PagamentoEmComprovacao({ idioma }: { idioma: Idioma }) {
  const t = mensagensDe(idioma).pagamentoE23;
  return (
    <div className="bo-aviso bo-aviso--aviso" data-tela="STATE-011">
      <p data-teste="em-comprovacao">{t.emComprovacao}</p>
      <p data-teste="nao-tentes-outra-vez">{t.emComprovacaoAjuda}</p>
    </div>
  );
}
