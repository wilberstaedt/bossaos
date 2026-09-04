import { notFound } from 'next/navigation';
import { Etiqueta } from '@bossaos/ui';
import { formatarDinheiro, type Idioma } from '@bossaos/i18n';
import {
  carregarStaff, produtoParaCompor,
} from '../../../../../../src/staff/carregar-staff.ts';
import { CabecalhoDoStaff, textosDoStaff } from '../../../../../../src/staff/PecasDoStaff.tsx';
import { PainelDaFila } from '../../../../../../src/staff/PainelDaFila.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-007 · «Prepara el detalle del plato» (atlas p. 166)
 *
 * ── É aqui que se compõe, e a fila vem junto ─────────────────────────────
 *
 * Compor sem ver a fila era a versão que o contrato proíbe pelo nome: alguém
 * carrega, não vê nada acontecer e carrega outra vez. O painel da fila fica na
 * mesma tela, com o preço deste prato a viajar no rascunho como **proposta**.
 */
export default async function PratoDoStaff({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; produtoId: string }>;
}) {
  const { idioma, locationId, produtoId } = await params;
  const s = textosDoStaff(idioma);
  const { sessao, unidade, orgSlug, particao } = await carregarStaff(idioma, locationId);
  const produto = await produtoParaCompor(sessao, produtoId, unidade.id);
  if (!produto) notFound();

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={produto.nome} tela="STAFF-007" actual="/catalogo" />

      <p data-teste="preco-da-carta">
        {produto.precoMenor !== null && produto.moeda
          ? formatarDinheiro({ montanteMenor: produto.precoMenor, moeda: produto.moeda }, idioma)
          : <Etiqueta tom="aviso">{s.semPrecoNaCarta}</Etiqueta>}
      </p>
      <h2>{s.descricao}</h2>
      <p className="bo-publico__texto" data-teste="descricao">
        {produto.descricao ?? s.semDescricao}
      </p>
      <p className="bo-campo__ajuda">{s.detalheAjuda}</p>

      <PainelDaFila
        particao={particao}
        orgSlug={orgSlug}
        locationSlug={unidade.slug}
        idioma={idioma}
        produtoDeTeste={{
          id: produto.id, nome: produto.nome,
          precoMenor: produto.precoMenor, moeda: produto.moeda,
        }}
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
