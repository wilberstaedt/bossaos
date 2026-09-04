import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { CabecalhoDoStaff, textosDoStaff } from '../../../../../src/staff/PecasDoStaff.tsx';
import { DiagnosticoDaLigacao } from '../../../../../src/staff/DiagnosticoDaLigacao.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-024 · «Conexión interrumpida» (atlas p. 183) — e a casa do STATE-004.
 *
 * ── Uma tela, e não um toast ─────────────────────────────────────────────
 *
 * «Estamos sin conexión» é um **estado**: fica enquanto durar, e a recarga volta
 * a mostrá-lo. Um toast desaparece na recarga, e a régua reprova à cabeça
 * qualquer coisa que não sobreviva a um F5.
 *
 * A tela diz três coisas que se leem do aparelho, e nenhuma é adivinhada: se há
 * rede agora, quantos comandos estão neste telemóvel, e quantos ficaram
 * suspensos à espera do dono.
 */
export default async function LigacaoDoStaff({
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
                        titulo={s.ligacao} tela="STAFF-024" actual="/ligacao" />
      <p className="bo-campo__ajuda">{s.ligacaoAjuda}</p>
      <DiagnosticoDaLigacao
        particao={particao}
        m={{
          semLigacao: s.semLigacao, semLigacaoAjuda: s.semLigacaoAjuda,
          comLigacao: s.comLigacao, porEnviarNoAparelho: s.porEnviarNoAparelho,
          suspensos: s.suspensos, suspensosAjuda: s.suspensosAjuda,
          naoEnviado: s.naoEnviado, aguardando: s.aguardando,
          naoEnviadoAjuda: s.naoEnviadoAjuda, aguardandoAjuda: s.aguardandoAjuda,
        }}
      />
    </div>
  );
}
