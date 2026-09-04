import { Aviso } from '@bossaos/ui';
import { listarPedidos, salaAgora, totalDoPedido } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import {
  CabecalhoDoStaff, LinhaDoPedido, TotalDoPedido, motivoDaRecusa, textosDoStaff,
} from '../../../../../src/staff/PecasDoStaff.tsx';
import { RecusaFinanceira } from '../../../../../src/staff/RecusaFinanceira.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-018 · «Prepara la cuenta» (atlas p. 177)
 *
 * ── «Preparar» é o verbo certo, e não é modéstia ─────────────────────────
 *
 * *Regra 5 do contrato:* offline **não faz pagamento**, e isso é desenho e não
 * limitação da primeira versão. Esta tela soma o que está aceite, com o preço de
 * quando foi aceite, e muda o estado da mesa para «a pedir a conta». Cobrar
 * exige o servidor a dizer que sim — e a tentativa de o fazer sem rede é
 * **recusada com o motivo**, nunca enfileirada: enfileirar prometia que ia
 * acontecer.
 *
 * O total não lê a carta. A conta de quem está sentado não muda porque a cozinha
 * actualizou os preços a meio do jantar.
 */
export default async function ContaDoStaff({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, locationId } = await params;
  const busca = (await searchParams) ?? {};
  const s = textosDoStaff(idioma);
  const { sessao, unidade, orgSlug } = await carregarStaff(idioma, locationId);
  const { mesas, pedidos } = await comEscopoDoPedido(sessao, async (db) => ({
    mesas: await salaAgora(db, unidade.id, sessao.contexto.organizationId),
    pedidos: await listarPedidos(db, unidade.id),
  }));
  const abertas = mesas.filter((m) => m.sessao !== null);

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.conta} tela="STAFF-018" actual="/conta" />

      {motivoDaRecusa(idioma, busca.erro) ? (
        <div data-teste="recusa">
          <Aviso tom="perigo" titulo={s.conta}>{motivoDaRecusa(idioma, busca.erro)}</Aviso>
        </div>
      ) : null}

      <p className="bo-campo__ajuda">{s.contaAjuda}</p>

      {abertas.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-sessoes">{s.semSessoesAbertas}</p>
      ) : (
        abertas.map((mesa) => {
          const daMesa = pedidos.filter(
            (p: { tableSessionId: string | null }) => p.tableSessionId === mesa.sessao?.id);
          const linhas = daMesa.flatMap((p) => p.linhas);
          return (
            <section key={mesa.id} data-teste="conta-da-mesa">
              <h2>{mesa.codigo}</h2>
              {linhas.length === 0 ? (
                <p className="bo-campo__ajuda">{s.semLinhas}</p>
              ) : (
                <ul className="bo-publico__lista">
                  {linhas.map((l) => <LinhaDoPedido key={l.id} linha={l} idioma={idioma} s={s} />)}
                </ul>
              )}
              <TotalDoPedido total={totalDoPedido(linhas)} idioma={idioma} s={s} />
              <form method="post" action={`/api/org/${orgSlug}/staff`}>
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="locationId" value={locationId} />
                <input type="hidden" name="accao" value="pedir_conta" />
                <input type="hidden" name="sessionId" value={mesa.sessao?.id ?? ''} />
                <div className="bo-estado__accoes">
                  <button className="bo-botao bo-botao--secundario" type="submit"
                          data-teste="pedir-conta">
                    {s.accaoPedirConta}
                  </button>
                </div>
              </form>
            </section>
          );
        })
      )}

      <RecusaFinanceira
        m={{ semRede: s.semRede, semRedeTitulo: s.semRedeTitulo,
             pagamentoNoServidor: s.pagamentoNoServidor }}
      />
    </div>
  );
}
