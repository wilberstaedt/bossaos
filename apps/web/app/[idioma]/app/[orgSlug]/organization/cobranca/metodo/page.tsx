import { notFound } from 'next/navigation';
import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-012 · «Método de pago de la suscripción» (atlas p. 144)
 *
 * ── A pendência desta etapa, dita nesta tela ──────────────────────────────
 *
 * **Não há provedor de assinatura.** Não há conta, não há chaves, e inventar um
 * contrato de provedor a fingir seria o erro do E24 outra vez.
 *
 * O que esta tela faz é dizer isso. Não desenha um formulário de cartão que não
 * cobra nada, não põe um botão «adicionar método» que abre um ecrã vazio —
 * porque um produto que parece ligado é pior do que um que diz que não está: o
 * primeiro só se descobre quando alguém contava com ele.
 *
 * O que ela mostra de útil é a LIGAÇÃO, quando existe: qual é o cliente do
 * provedor associado a esta organização. É essa ligação — criada por alguém
 * autenticado, do nosso lado — que autoriza qualquer mudança de plano vinda de
 * fora. Sem ela, um webhook não muda nada, por mais bem assinado que esteja.
 */
export default async function MetodoDePagamentoSaas({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();

  const ligacoes = await comEscopoDoPedido(sessao, (db) =>
    db.saasCustomer.findMany({
      where: { organizationId: sessao.contexto.organizationId },
      select: { id: true, provedor: true, provedorClienteId: true, criadoPor: true },
    }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.dinheiroDoSaas}</p>
          <h1 data-tela="ORG-012">{s.metodo}</h1>
        </div>
      </div>

      <div data-teste="sem-provedor">
        <Aviso tom="info" titulo={s.semProvedor}>{s.semProvedorAjuda}</Aviso>
      </div>

      {ligacoes.length > 0 ? (
        <ul className="bo-lista bo-lista--blocos" data-teste="ligacoes">
          {ligacoes.map((l: {
            id: string; provedor: string; provedorClienteId: string; criadoPor: string;
          }) => (
            <li key={l.id} data-teste="ligacao">
              {l.provedor} · {l.provedorClienteId}
              <p className="bo-campo__ajuda">{s.vincular}: {l.criadoPor}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p data-teste="sem-ligacao">{s.vincular}</p>
      )}
    </div>
  );
}
