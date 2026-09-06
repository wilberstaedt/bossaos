import { notFound, redirect } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, obterPrisma } from '@bossaos/db';
import { estadoDaSessao } from '@bossaos/domain';
import { actorDoPedido } from '../../../../../src/sessao.ts';
import { obterEnv } from '../../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-008 · «Sesión de soporte asistido» (atlas p. 238)
 *
 * ── O que esta tela mostra, e o que deliberadamente NÃO mostra ────────────
 *
 * Mostra as quatro condições da sessão: quem, porquê, até quando, com que
 * âmbito. **Não mostra os dados da casa.**
 *
 * Podia — quem tem uma sessão viva tem acesso. Mas uma tela de suporte que
 * mostra o conteúdo do restaurante ao lado do botão de fechar convida a olhar
 * sem motivo, e o motivo é uma das quatro condições. O acesso faz-se pelas telas
 * do produto, com a sessão a autorizar; aqui vê-se a sessão, e não o que ela
 * abre.
 *
 * ── E o botão de fechar não é a garantia ──────────────────────────────────
 *
 * A garantia é a expiração. Isto é a conveniência de sair mais cedo — e a
 * diferença entre as duas é a razão pela qual a coluna `expira_em` é
 * obrigatória.
 */
export default async function SessaoDeSuporte({
  params,
}: {
  params: Promise<{ idioma: Idioma; sessionId: string }>;
}) {
  const { idioma, sessionId } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const sessao = await comIdentidade(prisma, actor.id, (db) =>
    db.supportSession.findFirst({
      where: { id: sessionId },
      select: {
        id: true, organizationId: true, staffEmail: true, motivo: true,
        ambito: true, abertaEm: true, expiraEm: true, terminadaEm: true,
        terminadaMotivo: true, consentidaPor: true,
      },
    }));
  if (!sessao) notFound();

  const estado = estadoDaSessao(sessao, new Date());

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.filaDeSuporte}</p>
          <h1 data-tela="PLAT-008">{s.sessaoAssistida}</h1>
        </div>
      </div>

      <p data-teste="quem">{s.quemEntrou}: {sessao.staffEmail}</p>
      <p data-teste="porque">{s.porque}: {sessao.motivo}</p>
      <p data-teste="ate-quando">
        {s.ateQuando}: {formatarDataHora(sessao.expiraEm, idioma)}{' '}
        <Etiqueta tom={
          estado === 'viva' ? 'aviso' : estado === 'expirada' ? 'perigo' : 'neutro'
        }>
          {estado === 'viva' ? s.sessaoViva
            : estado === 'terminada' ? s.sessaoTerminada : s.sessaoExpirada}
        </Etiqueta>
      </p>
      <p data-teste="ambito">{s.ambito}: {sessao.ambito.join(', ')}</p>
      {sessao.consentidaPor ? (
        <p className="bo-campo__ajuda" data-teste="consentida">{sessao.consentidaPor}</p>
      ) : null}

      <div data-teste="vemos-o-que-precisamos">
        <Aviso tom="info" titulo={s.ambito}>{s.vemosOQuePrecisamos}</Aviso>
      </div>

      {estado === 'viva' ? (
        <form method="post" action={`/api/plataforma/suporte/${sessao.id}/terminar`}>
          <label className="bo-campo__linha">
            <span>{s.motivo}</span>
            <input type="text" name="motivo" required data-teste="motivo-de-saida" />
          </label>
          <button className="bo-botao" type="submit" data-teste="terminar">
            {s.sessaoTerminada}
          </button>
          <p className="bo-campo__ajuda">{s.expiraSozinha}</p>
        </form>
      ) : (
        <p className="bo-campo__ajuda" data-teste="ja-fechada">
          {sessao.terminadaMotivo ?? s.expiraSozinha}
        </p>
      )}
    </div>
  );
}
