import { notFound } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarIntegracoes } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INT-002 · «Detalle de la conexión» (atlas p. 255)
 *
 * ── Esta tela não mostra credenciais, e não é por elas estarem escondidas ──
 *
 * É porque não estão aqui. A credencial de uma integração entra pelo ambiente
 * autorizado e não tem coluna na base — a mesma decisão do segredo do webhook
 * no E23. Uma tela que mostrasse «••••••» estaria a dizer que ela existe do
 * lado de cá.
 */
export default async function DetalheDaIntegracao({
  params,
}: {
  params: Promise<{
    idioma: Idioma; orgSlug: string; locationSlug: string; integrationId: string;
  }>;
}) {
  const { idioma, orgSlug, locationSlug, integrationId } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const integracoes = await comEscopoDoPedido(sessao,
    (db) => listarIntegracoes(db, sessao.contexto.organizationId));
  const integracao = integracoes.find((i: { id: string }) => i.id === integrationId);
  if (!integracao) notFound();

  const rotulo = (estado: string): string => {
    const v = (s as unknown as Record<string, unknown>)[`estado${estado}`];
    return typeof v === 'string' ? v : estado;
  };

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INT-002">{s.detalhe}</h1>
        </div>
      </div>

      <p data-teste="quem">{integracao.familia} · {integracao.provedor}</p>
      <p><Etiqueta tom={
        integracao.estado === 'ACTIVA' ? 'sucesso'
          : integracao.estado === 'ERRO' ? 'perigo' : 'neutro'
      }>{rotulo(integracao.estado)}</Etiqueta></p>

      {integracao.estado === 'DESLIGADA' ? (
        <div data-teste="nao-ligada">
          <Aviso tom="info" titulo={s.estadoDESLIGADA}>{s.naoLigada}</Aviso>
          <p className="bo-campo__ajuda" data-teste="requisitos">
            {s.requisitos}: {integracao.requisitos}
          </p>
        </div>
      ) : null}

      {integracao.ultimoErro ? (
        <div data-teste="ultimo-erro">
          <Aviso tom="perigo" titulo={s.estadoERRO}>{integracao.ultimoErro}</Aviso>
        </div>
      ) : null}

      <p className="bo-campo__ajuda">
        {formatarDataHora(integracao.actualizadaEm, idioma)}
      </p>
    </div>
  );
}
