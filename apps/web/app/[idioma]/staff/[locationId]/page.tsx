import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarStaff, primeiroProduto } from '../../../../src/staff/carregar-staff.ts';
import { PainelDaFila } from '../../../../src/staff/PainelDaFila.tsx';
import { NavegacaoDoStaff } from '../../../../src/staff/NavegacaoDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-001 · «Tu turno, a la vista» (atlas p. 160) — e a casa dos STATE-004 e 015.
 *
 * ── O que esta tela é ────────────────────────────────────────────────────
 *
 * O primeiro ecrã do turno, e o sítio onde o estado da ligação e o da fila local
 * vivem. Os dois STATE moram aqui porque é aqui que eles **acontecem**:
 * desenhá-los noutro sítio fazia deles ilustrações, e uma ilustração de «sem
 * conexão» passa o aceite sem que a fila exista.
 *
 * ── E nunca diz «enviado» sobre o que só está no telemóvel ───────────────
 *
 * O painel lê o armazém, não a memória. É a diferença que a régua persegue com
 * mais força: um toast desaparece na recarga, um estado gravado errado não — e é
 * por isso que a prova recarrega a página.
 */
export default async function TurnoDoStaff({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const m = mensagensDe(idioma);
  const s = m.staffE15;
  const { sessao, unidade, orgSlug, particao, actor } = await carregarStaff(idioma, locationId);
  const produto = await primeiroProduto(sessao, unidade.id);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{s.turno}</h1>
        </div>
      </div>

      <NavegacaoDoStaff idioma={idioma} locationId={locationId} actual="" />

      <p className="bo-campo__ajuda" data-teste="operador">{actor.email}</p>

      <PainelDaFila
        particao={particao}
        orgSlug={orgSlug}
        locationSlug={unidade.slug}
        idioma={idioma}
        produtoDeTeste={produto}
        m={{
          naoEnviado: s.naoEnviado, aguardando: s.aguardando, confirmado: s.confirmado,
          conflito: s.conflito, naoEnviadoAjuda: s.naoEnviadoAjuda,
          aguardandoAjuda: s.aguardandoAjuda, conflitoAjuda: s.conflitoAjuda,
          semLigacao: s.semLigacao, semLigacaoAjuda: s.semLigacaoAjuda,
          comLigacao: s.comLigacao, porEnviar: s.porEnviar, suspensos: s.suspensos,
          suspensosAjuda: s.suspensosAjuda, comandos: s.comandos, semComandos: s.semComandos,
          accaoSincronizar: s.accaoSincronizar, accaoCompor: s.accaoCompor,
          semRede: s.semRede, semRedeTitulo: s.semRedeTitulo,
          pagamentoNoServidor: s.pagamentoNoServidor,
          sessaoMorreu: s.sessaoMorreu, sessaoMorreuAjuda: s.sessaoMorreuAjuda,
          accaoEntrarOutraVez: s.accaoEntrarOutraVez,
        }}
      />
    </div>
  );
}
