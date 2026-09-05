import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { carregarHoras, carregarPessoa } from '../../../../../../../src/ponto/pagina.ts';
import { horaDaMarcacao } from '../../../../../../../src/ponto/horas.ts';

export const dynamic = 'force-dynamic';

/**
 * HR-009 · «Solicita una corrección» (atlas)
 *
 * ── O motivo é obrigatório aqui, na base, e nos dois sítios ───────────────
 *
 * Uma correcção sem razão não se explica a ninguém — e é a quem foi corrigido
 * que ela tem de ser explicada. A base recusa-a com `correccao_exige_motivo`;
 * este campo `required` é só a cortesia de o dizer antes de submeter.
 */
export default async function PedirCorreccao({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).pontoE28;
  const b = await carregarHoras(idioma, orgSlug, locationSlug);
  // As marcações de hoje de toda a gente, para se escolher a que se corrige.
  const primeira = b.jornadas.find((j) => j.jornada.entradas > 0) ?? b.jornadas[0];
  const detalhe = primeira
    ? await carregarPessoa(idioma, orgSlug, locationSlug, primeira.membershipId, b.diaDeServico)
    : null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.diaDeServico}</p>
          <h1 data-tela="HR-009">{t.correccao}</h1>
        </div>
      </div>
      <p data-teste="marcacao-e-facto">{t.marcacaoEhFacto}</p>
      <p data-teste="quem-corrige">{t.quemCorrige}</p>
      <p data-teste="quantas-marcacoes">{detalhe?.marcacoes.length ?? 0}</p>
      <form method="post" action={`/api/org/${orgSlug}/ponto`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="corrigir" />
        <input type="hidden" name="locationId" value={b.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.original} name="marcacaoId" required>
          {(detalhe?.marcacoes ?? []).filter((m) => !m.corrigida).map((m) => (
            <option key={m.id} value={m.id}>
              {m.tipo === 'ENTRADA' ? t.entrada : t.saida} · {horaDaMarcacao(m.momento, b.fuso, b.diaDeServico)}
            </option>
          ))}
        </Seletor>
        <Campo rotulo={t.momento} name="momento" type="text" required
               placeholder="2026-09-04T18:00" />
        <Campo rotulo={t.motivo} name="motivo" required maxLength={200} />
        <Botao type="submit">{t.corrigir}</Botao>
      </form>
    </div>
  );
}
