import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Seletor } from '@bossaos/ui';
import { carregarEquipa, hojeDaCasa } from '../../../../../../../src/ponto/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * HR-007 · «Registra tu jornada» (atlas)
 *
 * ── Não há campo de HORA, e é de propósito ────────────────────────────────
 *
 * Picar é dizer «agora». O momento é o carimbo do servidor, como em todo o
 * resto do produto — um campo onde a hora se escreve à mão transformava a
 * marcação numa declaração, e a declaração é a correcção, que tem outro
 * caminho, com autor e motivo.
 */
export default async function Picar({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).pontoE28;
  const b = await carregarEquipa(idioma, orgSlug, locationSlug);
  const hoje = hojeDaCasa(b.unidade.fuso ?? 'Europe/Madrid');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.unidade.nome}</p>
          <h1 data-tela="HR-007">{t.picar}</h1>
        </div>
      </div>
      <p data-teste="dia">{hoje}</p>
      <p data-teste="dia-de-servico">{t.diaDeServico}</p>
      <p data-teste="quantas-pessoas">{b.equipa.length}</p>
      <form method="post" action={`/api/org/${orgSlug}/ponto`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="picar" />
        <input type="hidden" name="locationId" value={b.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.pessoa} name="membershipId" required>
          {b.equipa.map((m) => (
            <option key={m.id} value={m.id}>{m.nome ?? m.email}</option>
          ))}
        </Seletor>
        <Seletor rotulo={t.momento} name="tipo" required>
          <option value="ENTRADA">{t.entrada}</option>
          <option value="SAIDA">{t.saida}</option>
        </Seletor>
        <Botao type="submit">{t.picar}</Botao>
      </form>
    </div>
  );
}
