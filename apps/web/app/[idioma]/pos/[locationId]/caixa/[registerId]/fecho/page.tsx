import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, formatarHora, type Idioma } from '@bossaos/i18n';
import { rastoDaCaixa } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { caixaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-018 · «Cierra el turno de caja» (atlas)
 *
 * ── A diferença só fecha com autorização, e o rasto fica ──────────────────
 *
 * O campo de quem autoriza aparece **porque há diferença**, e não sempre: um
 * campo que está lá em todos os fechos é um campo que se preenche sem pensar. E
 * o rasto por baixo mostra tudo o que aconteceu a esta caixa — abrir, contar,
 * fechar, reabrir — porque é isso que alguém vai ler quando o dinheiro não bater.
 */
export default async function FechoDeCaixa({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; registerId: string }> }) {
  const { idioma, locationId, registerId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { caixa, resumo, orgSlug, sessao } = await caixaDoTpv(idioma, locationId, registerId);
  const rasto = await comEscopoDoPedido(sessao, (db) => rastoDaCaixa(db, registerId));
  const d = (m: number) => formatarDinheiro({ montanteMenor: m, moeda: resumo.moeda }, idioma);
  const diferenca = resumo.diferencaMenor;

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{caixa.nome}</p>
          <h1 data-tela="POS-018">{t.fecho}</h1>
        </div>
      </div>
      <p data-teste="estado-caixa">{resumo.estado}</p>
      <p data-teste="esperado">{t.esperado} {d(resumo.esperadoMenor)}</p>
      <p data-teste="contado">
        {t.contado} {resumo.contadoMenor === null ? '—' : d(resumo.contadoMenor)}
      </p>
      <p data-teste="diferenca">{t.diferenca} {diferenca === null ? '—' : d(diferenca)}</p>

      {resumo.estado === 'FECHADA' ? (
        <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="accao" value="reabrir_caixa" />
          <input type="hidden" name="registerId" value={caixa.id} />
          <input type="hidden" name="locationId" value={locationId} />
          <Campo rotulo={t.motivo} name="motivo" required minLength={3} maxLength={140}  />
          <Botao type="submit">{t.reabrir}</Botao>
        </form>
      ) : (
        <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="accao" value="fechar_caixa" />
          <input type="hidden" name="registerId" value={caixa.id} />
          <input type="hidden" name="locationId" value={locationId} />
          {diferenca !== null && diferenca !== 0 && (
            <>
              <p data-teste="divergencia-ajuda">{t.divergenciaAjuda}</p>
              <Campo rotulo={t.motivo} name="motivo" required minLength={3} maxLength={140}  />
              <input type="hidden" name="autoriza" value="1" />
            </>
          )}
          <Botao type="submit">{t.fecho}</Botao>
        </form>
      )}

      <h2>{t.rasto}</h2>
      <ul className="bo-lista" data-teste="rasto">
        {rasto.map((e, i) => (
          <li key={i}>
            <span>{e.tipo}</span>
            <span>{formatarHora(e.criadoEm, idioma)}</span>
            {e.contadoMenor !== null && <span>{d(e.contadoMenor)}</span>}
            {e.motivo && <span data-teste="rasto-motivo">{e.motivo}</span>}
            {e.autorizadoPor && <span data-teste="rasto-autoriza">{t.autoriza}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
