import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { conectorDePagamento } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INT-005 · «Proveedor de pagos» (atlas)
 *
 * ── O que este ecrã diz é o que NÃO está feito ────────────────────────────
 *
 * «Sem credenciais, implemente porta e testes determinísticos, marque integração
 * pendente e não declare pagamento real pronto.»
 *
 * Está aqui por palavras, no ecrã, e não numa nota de progresso que o
 * restaurante nunca lê. Um produto que anuncia os seus limites não deixa o
 * utilizador descobri-los ao vivo com um cliente à frente.
 */
export default async function ProvedorDePagamentos({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const p = mensagensDe(idioma).pagamentoE23;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const conector = await comEscopoDoPedido(sessao, (db) => conectorDePagamento(db, unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INT-005">{t.conta}</h1>
        </div>
      </div>
      <p data-teste="estado-conector">{conector?.activo ? p.ligado : p.desligado}</p>
      <p data-teste="integracao-pendente">{p.integracaoPendente}</p>
      <p data-teste="sem-adquirente">{p.semAdquirente}</p>
      <p data-teste="segredo-fora">{p.segredoFora}</p>
      <a className="bo-botao" data-seccao="configurar" href={`/${idioma}/pos/${unidade.id}/pagamentos`}>{t.guardar}</a>
    </div>
  );
}
