import { listarDispositivos } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { CabecalhoDoStaff, textosDoStaff } from '../../../../../src/staff/PecasDoStaff.tsx';
import { FimDoTurno } from '../../../../../src/staff/FimDoTurno.tsx';
import { EsteAparelho } from '../../../../../src/staff/EsteAparelho.tsx';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * STAFF-023 · «Tu perfil y tu turno» (atlas p. 182)
 *
 * ── Fechar o turno OPACA, e não apaga ────────────────────────────────────
 *
 * *Regra 3 do contrato:* o próximo operador não vê nome de cliente, linhas nem
 * totais do anterior; e o que sobrevive é o mínimo para o dono recuperar o
 * rascunho. As duas metades importam: apagar era perder o trabalho de alguém, e
 * deixar legível era o tablet partilhado a mostrar a mesa de outra pessoa.
 */
export default async function PerfilDoStaff({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = textosDoStaff(idioma);
  const { sessao, unidade, actor, particao, orgSlug } = await carregarStaff(idioma, locationId);
  const dispositivos = await comEscopoDoPedido(sessao, (db) => listarDispositivos(db, unidade.id));
  const activos = dispositivos.filter((d: { estado: string }) => d.estado === 'ACTIVO');

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.perfil} tela="STAFF-023" actual="/perfil" />

      <dl className="bo-publico__contacto">
        <div>
          <dt>{s.operador}</dt>
          <dd data-teste="operador">{actor.email}</dd>
        </div>
        <div>
          <dt>{s.unidadeActual}</dt>
          <dd data-teste="unidade">{unidade.nome}</dd>
        </div>
      </dl>

      <EsteAparelho
        particao={particao}
        orgSlug={orgSlug}
        locationId={locationId}
        idioma={idioma}
        dispositivos={activos.map((d: { id: string; nome: string }) => ({ id: d.id, nome: d.nome }))}
        m={{
          esteAparelho: s.esteAparelho, esteAparelhoAjuda: s.esteAparelhoAjuda,
          aparelhoPorEscolher: s.aparelhoPorEscolher, declarado: s.declarado,
          semDispositivosNaUnidade: s.semDispositivosNaUnidade,
          porEnviarNoAparelho: s.porEnviarNoAparelho,
        }}
      />

      <FimDoTurno
        particao={particao}
        m={{
          porEnviarNoAparelho: s.porEnviarNoAparelho, sairAjuda: s.sairAjuda,
          accaoSair: s.accaoSair, suspensos: s.suspensos, suspensosAjuda: s.suspensosAjuda,
        }}
      />
    </div>
  );
}
