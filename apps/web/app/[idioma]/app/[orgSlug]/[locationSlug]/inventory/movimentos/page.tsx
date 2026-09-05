import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarStock } from '../../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INV-007 · «t.movimentos» (atlas)
 *
 * Todos os movimentos da unidade, por insumo. É a leitura que explica um saldo
 * — e é a que transforma «a contagem não bate» numa pergunta com resposta.
 */
export default async function TelaINV007({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).stockE25;
  const { unidade, insumos } = await carregarStock(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INV-007">{t.movimentos}</h1>
        </div>
      </div>
      <p data-teste="quantos-insumos">{insumos.length}</p>
      <p data-teste="saldo-derivado">{t.saldoDerivado}</p>
      {insumos.length === 0 ? <p data-teste="sem-insumos">{t.semInsumos}</p> : (
        <ul className="bo-lista" data-teste="insumos">
          {insumos.map((i) => (
            <li key={i.id}>
              <a className="bo-lista__ligacao" href={`/${idioma}/app/${orgSlug}/${locationSlug}/inventory/itens/${i.id}`}>{i.nome}</a>
              <span data-teste="saldo">{String(i.saldoMili)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
