import { Aviso } from '@bossaos/ui';
import { formatarData, formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { facturasDoSaas } from '@bossaos/db';
import { doisDinheiros } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * ORG-011 · «Historial de facturación» (atlas p. 143)
 *
 * ── Os dois dinheiros não somam, e por isso não estão na mesma tela ───────
 *
 * Isto é o que a **casa nos paga**. O que a casa factura aos clientes dela vive
 * no financeiro do E29, noutro sítio, com outra conciliação.
 *
 * Podiam estar os dois aqui, com um total por baixo. Esse total responderia a
 * uma pergunta que ninguém faz — e esconderia as duas que se fazem: «quanto
 * facturou a casa» e «quanto é que ela me paga».
 *
 * A separação está na estrutura: não há chave estrangeira nenhuma entre a
 * `saas_invoices` e a família do E22, e há uma prova que a mede.
 */
export default async function HistoricoDeCobranca({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();

  const facturas = await comEscopoDoPedido(sessao,
    (db) => facturasDoSaas(db, sessao.contexto.organizationId));

  // ── Os dois dinheiros, lado a lado e SEM total ──────────────────────────
  //
  // O tipo não tem `total`. Não é que ninguém o calcule aqui: é que a forma não
  // o tem, e por isso não há como o escrever por distracção.
  //
  // O que a casa factura aos clientes dela vive no financeiro do E29 e não é
  // lido aqui — o zero abaixo é a ausência dessa leitura, e a tela diz por
  // palavras que são duas contabilidades.
  const dinheiros = doisDinheiros(
    0,
    facturas.reduce((soma: number, f: { montanteMenor: number }) => soma + f.montanteMenor, 0),
    facturas[0]?.moeda ?? 'EUR',
  );

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.dinheiroDoSaas}</p>
          <h1 data-tela="ORG-011">{s.cobranca}</h1>
        </div>
      </div>

      {/* A frase por palavras, para quem lê não procurar o total que não existe. */}
      <p className="bo-campo__ajuda" data-teste="dois-dinheiros">{s.doisDinheiros}</p>
      <p data-teste="do-saas">
        {s.dinheiroDoSaas}:{' '}
        {formatarDinheiro({ montanteMenor: dinheiros.doSaasMenor, moeda: dinheiros.moeda }, idioma)}
      </p>

      {facturas.length === 0 ? (
        <div data-teste="sem-facturas">
          <Aviso tom="info" titulo={s.cobranca}>{s.semFacturas}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="facturas">
          {facturas.map((f: {
            id: string; numero: string; montanteMenor: number; moeda: string;
            estado: string; emitidaEm: Date;
          }) => (
            <li key={f.id} data-teste="factura">
              <span>{f.numero}</span>{' · '}
              <span data-teste="montante">
                {formatarDinheiro({ montanteMenor: f.montanteMenor, moeda: f.moeda }, idioma)}
              </span>
              <p className="bo-campo__ajuda">
                {s.emitida}: {formatarData(f.emitidaEm, idioma)} · {f.estado}
              </p>
            </li>
          ))}
        </ul>
      )}

      <a className="bo-lista__ligacao" data-seccao="ORG-012"
         href={`/${idioma}/app/${orgSlug}/organization/cobranca/metodo`}>
        {s.metodo}
      </a>
    </div>
  );
}
