import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { CabecalhoDoStaff, textosDoStaff } from '../../../../../src/staff/PecasDoStaff.tsx';
import { RevisaoDaFila } from '../../../../../src/staff/RevisaoDaFila.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-008 · «Revisa antes de enviar» (atlas p. 167)
 *
 * ── Lê o ARMAZÉM, e é isso que a torna uma revisão ───────────────────────
 *
 * O que está por enviar não vem de memória nenhuma: vem do `localStorage` deste
 * aparelho. Uma revisão feita sobre um estado em memória mostrava o que a última
 * página tinha na cabeça, e um F5 esvaziava-a — que é precisamente o defeito que
 * a régua reprova à cabeça («estado só em memória não é estado»).
 */
export default async function RevisaoDoStaff({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = textosDoStaff(idioma);
  const { unidade, particao } = await carregarStaff(idioma, locationId);

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.revisao} tela="STAFF-008" actual="/revisao" />
      <p className="bo-campo__ajuda">{s.revisaoAjuda}</p>
      <RevisaoDaFila
        particao={particao}
        m={{
          naoEnviado: s.naoEnviado, aguardando: s.aguardando, confirmado: s.confirmado,
          conflito: s.conflito, nadaPorRever: s.nadaPorRever, comandos: s.comandos,
          suspensos: s.suspensos, suspensosAjuda: s.suspensosAjuda,
        }}
      />
    </div>
  );
}
