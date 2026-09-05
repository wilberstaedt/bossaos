import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { carregarEquipa, hojeDaCasa } from '../../../../../../../../src/ponto/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * HR-005 · «Define el turno» (atlas)
 *
 * Os minutos escrevem-se como minutos desde a meia-noite do dia de serviço: as
 * 18h são `1080` e a 1h da manhã seguinte é `1500`. Parece cru, e é de
 * propósito — um campo de «hora de fim» com um selector de relógio obriga a
 * decidir se `01:00` é hoje ou amanhã, e essa decisão é a que corta o turno ao
 * meio.
 */
export default async function NovoTurno({
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
          <h1 data-tela="HR-005">{t.novoTurno}</h1>
        </div>
      </div>
      <p data-teste="dia-de-servico">{t.diaDeServico}</p>
      <p data-teste="minutos-inteiros">{t.minutosInteiros}</p>
      <form method="post" action={`/api/org/${orgSlug}/ponto`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_turno" />
        <input type="hidden" name="locationId" value={b.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.pessoa} name="membershipId" required>
          {b.equipa.map((m) => (
            <option key={m.id} value={m.id}>{m.nome ?? m.email}</option>
          ))}
        </Seletor>
        <Seletor rotulo={t.funcao} name="roleId">
          <option value="">—</option>
          {b.funcoes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Seletor>
        <Campo rotulo={t.dia} name="dia" type="text" defaultValue={hoje} required />
        {/* Texto e não `number`: o `step` do HTML5 recusa valores pela restrição
            nativa antes de o JS os ver, e o erro aparece sem explicação. */}
        <Campo rotulo={t.inicio} name="inicioMinutos" type="text" inputMode="numeric" required />
        <Campo rotulo={t.fim} name="fimMinutos" type="text" inputMode="numeric" required />
        <Campo rotulo={t.nota} name="nota" maxLength={120} />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
