import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { dividirEmPartes, dividirPorPesos } from '@bossaos/domain';
import { contaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-009 · «Divide la cuenta» (atlas)
 *
 * ── O aceite do CT-11, visível ────────────────────────────────────────────
 *
 * 10,00 € por três dá 3,34 + 3,33 + 3,33. O ecrã mostra as partes E a soma, e a
 * soma existe no ecrã por uma razão: é a propriedade que interessa. «Cada parte é
 * 3,33» é uma frase que só é verdade quando a divisão é exacta.
 */
export default async function DividirNoTpv({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; billId: string }>;
  searchParams: Promise<{ partes?: string; pesos?: string }>;
}) {
  const { idioma, locationId, billId } = await params;
  const { partes, pesos } = await searchParams;
  const t = mensagensDe(idioma).tpvE22;
  const { conta, somas } = await contaDoTpv(idioma, locationId, billId);
  // `parseInt` sobre um nome que não é de dinheiro: são pessoas, não cêntimos.
  const quantas = Math.min(Math.max(parseInt(partes ?? '2', 10) || 2, 1), 20);
  // ── Por partes iguais, ou por PESOS ──────────────────────────────────
  //
  // «Divisão por item, pessoa ou valor.» Quem paga mais por ter comido mais é a
  // divisão por pesos, e o resíduo segue a mesma ordem: às primeiras. A
  // propriedade medida é a mesma nas duas — a soma bate ao cêntimo.
  const lista = (pesos ?? '').split(',').map((x) => parseInt(x.trim(), 10))
    .filter((x) => Number.isFinite(x) && x >= 0);
  const total = { montanteMenor: somas.devidoMenor, moeda: conta.moeda };
  const fatias = lista.length > 1 ? dividirPorPesos(total, lista)
    : dividirEmPartes(total, quantas);
  const soma = fatias.reduce((a, b) => a + b.montanteMenor, 0);

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{conta.numero}</p>
          <h1 data-tela="POS-009">{t.dividir}</h1>
        </div>
      </div>
      <form method="get">
        <Campo rotulo={t.partes} name="partes" type="text" inputMode="numeric" defaultValue={String(quantas)}  />
        <Campo rotulo={t.porPessoa} name="pesos" type="text" inputMode="numeric"
               defaultValue={pesos ?? ''} placeholder="3,5,7" />
        <Botao type="submit">{t.aplicar}</Botao>
      </form>
      <ul className="bo-lista" data-teste="partes">
        {fatias.map((f, i) => (
          <li key={i}>
            <span>{t.porPessoa} {i + 1}</span>
            <span>{formatarDinheiro(f, idioma)}</span>
          </li>
        ))}
      </ul>
      <p data-teste="soma-das-partes">
        {formatarDinheiro({ montanteMenor: soma, moeda: conta.moeda }, idioma)}
      </p>
      <p data-teste="divisao-ajuda">{t.divisaoAjuda}</p>
    </div>
  );
}
