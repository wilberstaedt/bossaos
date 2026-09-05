import { mensagensDe, formatarHora, type Idioma } from '@bossaos/i18n';
import { filaDoCanal } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';

export const dynamic = 'force-dynamic';

/**
 * STAFF-021 · «Pedidos para llevar» (atlas)
 *
 * ── O filtro por canal esconde da SALA sem tirar da cozinha ───────────────
 *
 * É o par que a régua exige e que só um modelo unificado passa: esta tela mostra
 * **apenas** o takeaway, e o KDS continua a ver as mesmas tarefas de produção.
 * Com duas tabelas, um dos dois partia — ou, pior, passavam os dois e os números
 * do relatório deixavam de bater.
 */
export default async function LevarNoStaff({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).levarE20;
  const { sessao, unidade } = await carregarStaff(idioma, locationId);
  const fila = await comEscopoDoPedido(sessao, (db) => filaDoCanal(db, unidade.id, 'TAKEAWAY'));

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="STAFF-021">{t.levar}</h1>
        </div>
      </div>
      <p data-teste="quantos">{fila.length} {t.quantos}</p>
      {fila.length === 0 ? <p data-teste="sem-pedidos">{t.semPedidos}</p> : (
        <ul className="bo-lista">
          {fila.map((p) => (
            <li key={p.id}>
              <span>{p.numero}</span>
              <span>{p.entregarAs ? formatarHora(p.entregarAs, idioma) : '—'}</span>
              <span>{p.naCozinha ? t.producao : t.porEntrar}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
