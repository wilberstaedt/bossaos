import { listarTiposDeServico } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { CabecalhoDoStaff, textosDoStaff } from '../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/** Minutos desde a meia-noite → `HH:MM`. O fuso é da unidade e já está aplicado. */
function hora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * STAFF-011 · «Sirve por tiempos» (atlas p. 170)
 *
 * Os tempos de serviço da unidade. São minutos desde a meia-noite **local**, e
 * não instantes — guardar um instante obrigava a recalcular todos os dias, e é a
 * decisão do modelo, não uma escolha desta tela.
 */
export default async function CursosDoStaff({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = textosDoStaff(idioma);
  const { sessao, unidade } = await carregarStaff(idioma, locationId);
  const tipos = await comEscopoDoPedido(sessao, (db) => listarTiposDeServico(db, unidade.id));

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.cursos} tela="STAFF-011" actual="/cursos" />

      {tipos.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-cursos">{s.semCursos}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="cursos">
          {tipos.map((t: { id: string; nome: string; inicioMinutos: number; fimMinutos: number }) => (
            <li key={t.id} className="bo-publico__produto" data-teste="curso">
              <span className="bo-publico__nome">{t.nome}</span>
              <span className="bo-publico__preco">
                {s.deQueHora} {hora(t.inicioMinutos)} {s.ateQueHora} {hora(t.fimMinutos)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
