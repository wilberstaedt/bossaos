import { Etiqueta } from '@bossaos/ui';
import { listarPedidos, salaAgora } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { CabecalhoDoStaff, textosDoStaff } from '../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-013 · «El cliente necesita algo» (atlas p. 172) — e a casa do STATE-015.
 *
 * ── O que precisa de atenção é DERIVADO, e não uma caixa de entrada ──────
 *
 * Não há tabela de avisos, de propósito. Uma tabela de avisos precisa de alguém
 * a escrevê-los e a apagá-los, e o dia em que a escrita falha o ecrã fica calmo
 * sobre uma sala em pânico. Aqui cada aviso é uma **consulta ao estado real**:
 * mesas a pedir a conta, mesas por limpar, e linhas rejeitadas que ninguém
 * resolveu. Não pode ficar dessincronizado do que se passa porque não é uma
 * cópia do que se passa.
 */
export default async function AvisosDoStaff({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = textosDoStaff(idioma);
  const { sessao, unidade } = await carregarStaff(idioma, locationId);
  const { mesas, pedidos } = await comEscopoDoPedido(sessao, async (db) => ({
    mesas: await salaAgora(db, unidade.id, sessao.contexto.organizationId),
    pedidos: await listarPedidos(db, unidade.id),
  }));
  const base = `/${idioma}/staff/${locationId}`;

  const aPedirConta = mesas.filter((m) => m.sessao?.estado === 'A_ENCERRAR');
  const porLimpar = mesas.filter((m) => m.sessao?.estado === 'EM_LIMPEZA');
  const comRejeitadas = pedidos.filter((p) =>
    p.estado !== 'CANCELADO'
    && p.linhas.some((l: { estado: string }) => l.estado === 'REJEITADA'));
  const quantos = aPedirConta.length + porLimpar.length + comRejeitadas.length;

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.avisos} tela="STAFF-013" actual="/avisos" />

      {/* STATE-015 · «Lo que necesita tu atención». Contado antes de afirmar. */}
      <section data-tela="STATE-015" aria-labelledby="atencao">
        <h2 id="atencao">{s.precisaAtencao}</h2>
        <p data-teste="quantos">{quantos}</p>
        {quantos === 0 ? (
          <p className="bo-campo__ajuda" data-teste="nada-precisa-atencao">
            {s.nadaPrecisaAtencao}
          </p>
        ) : (
          <ul className="bo-publico__lista" data-teste="avisos">
            {aPedirConta.map((m) => (
              <li key={`conta-${m.id}`} className="bo-publico__produto" data-teste="aviso"
                  data-tipo="conta">
                <a href={`${base}/mesas/${m.sessao?.id ?? ''}`}>
                  <span className="bo-publico__nome">{m.codigo}</span>
                  <span className="bo-publico__preco">
                    <Etiqueta tom="aviso">{s.avisoPedeConta}</Etiqueta>
                  </span>
                </a>
              </li>
            ))}
            {porLimpar.map((m) => (
              <li key={`limpar-${m.id}`} className="bo-publico__produto" data-teste="aviso"
                  data-tipo="limpar">
                <a href={`${base}/mesas/${m.sessao?.id ?? ''}`}>
                  <span className="bo-publico__nome">{m.codigo}</span>
                  <span className="bo-publico__preco">
                    <Etiqueta tom="info">{s.avisoPorLimpar}</Etiqueta>
                  </span>
                </a>
              </li>
            ))}
            {comRejeitadas.map((p) => (
              <li key={`rej-${p.id}`} className="bo-publico__produto" data-teste="aviso"
                  data-tipo="rejeitadas">
                <a href={`${base}/andamento`}>
                  <span className="bo-publico__nome">{p.numero}</span>
                  <span className="bo-publico__preco">
                    <Etiqueta tom="perigo">{s.avisoRejeitadas}</Etiqueta>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
