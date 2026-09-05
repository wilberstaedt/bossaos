import { Botao, Campo, Seletor } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { caixaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-016 · «Movimiento de efectivo» (atlas)
 *
 * ── Aqui só entra dinheiro, e isso não é uma regra deste ecrã ─────────────
 *
 * A tabela dos movimentos **não tem** coluna de meio de pagamento: tudo o que lá
 * está é dinheiro. É por isso que este formulário não tem onde escolher «cartão»
 * — não é uma opção escondida, é uma coluna que não existe.
 *
 * A correcção é um registo novo que aponta para o que anula, e as duas linhas
 * ficam à vista. O original riscado é o que o gerente lê.
 */
export default async function MovimentoDeCaixa({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; registerId: string }> }) {
  const { idioma, locationId, registerId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { caixa, resumo, movimentos, orgSlug } = await caixaDoTpv(idioma, locationId, registerId);
  const d = (m: number) => formatarDinheiro({ montanteMenor: m, moeda: resumo.moeda }, idioma);
  const anulados = new Set(movimentos.map((m) => m.corrigeId).filter(Boolean));

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{caixa.nome}</p>
          <h1 data-tela="POS-016">{t.movimento}</h1>
        </div>
      </div>
      <p data-teste="esperado">{t.esperado} {d(resumo.esperadoMenor)}</p>
      <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="movimentar" />
        <input type="hidden" name="registerId" value={caixa.id} />
        <input type="hidden" name="locationId" value={locationId} />
        <Seletor rotulo={t.movimento} name="tipo">
          <option value="ENTRADA">{t.entrada}</option>
          <option value="SAIDA">{t.saida}</option>
        </Seletor>
        <Campo rotulo={t.esperado} name="valor" type="text" inputMode="decimal" required  />
        <Campo rotulo={t.motivo} name="motivo" required minLength={3} maxLength={140}  />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
      <p data-teste="so-dinheiro">{t.apenasDinheiro}</p>
      <ul className="bo-lista" data-teste="movimentos">
        {movimentos.map((m) => (
          <li key={m.id}>
            <span>{m.tipo === 'ENTRADA' ? t.entrada : t.saida}</span>
            <span>{d(m.montanteMenor)}</span>
            <span>{m.motivo}</span>
            {(m.corrigeId || anulados.has(m.id)) ? (
              <span data-teste="movimento-anulado">✕</span>
            ) : (
              // A correcção é um registo NOVO que aponta para o que anula. Sem
              // esta porta, o movimento imutável era uma armadilha: um valor mal
              // lançado ficava na gaveta para sempre.
              <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="accao" value="corrigir_movimento" />
                <input type="hidden" name="movimentoId" value={m.id} />
                <input type="hidden" name="registerId" value={caixa.id} />
                <input type="hidden" name="locationId" value={locationId} />
                <Campo rotulo={t.movimento} name="valor" type="text" inputMode="decimal" required />
                <Campo rotulo={t.motivo} name="motivo" required minLength={3} maxLength={140} />
                <Botao type="submit">{t.guardar}</Botao>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
