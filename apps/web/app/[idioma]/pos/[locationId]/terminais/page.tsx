import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { conectorDePagamento, listarDispositivos } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { carregarTpv } from '../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-023 · «Terminales de pago» (atlas)
 *
 * ── Um terminal que responde ao ping não recebeu o pagamento ──────────────
 *
 * É a mesma lição do KDS, escrita em `state-machines.md`: «heartbeat não
 * comprova recebimento». O estado do aparelho e a confirmação do dinheiro são
 * duas medições diferentes, e a segunda é a que importa.
 *
 * Por isso esta lista mostra os aparelhos e **não** diz que o pagamento passou
 * por eles. Sem adquirente ligado, não há terminal nenhum a apresentar — e
 * di-lo, em vez de mostrar uma lista vazia que parece uma avaria.
 */
export default async function TerminaisDePagamento({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const p = mensagensDe(idioma).pagamentoE23;
  const { unidade, sessao } = await carregarTpv(idioma, locationId);
  const conector = await comEscopoDoPedido(sessao, (db) => conectorDePagamento(db, unidade.id));
  const aparelhos = conector?.activo
    ? await comEscopoDoPedido(sessao, (db) => listarDispositivos(db, unidade.id))
    : [];

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="POS-023">{t.operador}</h1>
        </div>
      </div>
      {!conector?.activo ? (
        <p data-teste="sem-adquirente">{p.semAdquirente}</p>
      ) : (
        <ul className="bo-lista" data-teste="terminais">
          {(aparelhos as { id: string; nome: string; estado: string }[]).map((a) => (
            <li key={a.id}><span>{a.nome}</span><span>{a.estado}</span></li>
          ))}
        </ul>
      )}
      <p data-teste="ping-nao-prova">{p.pingNaoProva}</p>
    </div>
  );
}
