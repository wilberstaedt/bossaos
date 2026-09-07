import { Aviso, CabecalhoDePagina, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { filaDaUnidade } from '@bossaos/db';
import { estadoDeImpressao } from '@bossaos/domain';
import { carregarKds } from '../../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * KDS-016 · «Alternativa de impresión» (atlas p. 199)
 *
 * ── Porque é que esta tela existe ─────────────────────────────────────────
 *
 * A comanda saiu, ninguém respondeu, e **a cozinha não sabe o que tem para
 * fazer**. Sem esta tela, a alternativa a papel é uma pessoa a gritar do
 * balcão — e é assim que se perde um pedido num serviço cheio.
 *
 * O que se mostra é o CONTEÚDO que foi enviado ao aparelho, tal como foi
 * enviado. Não é uma segunda renderização feita aqui: se fosse, a cozinha podia
 * estar a ler uma coisa e a impressora a ter cuspido outra, e ninguém dava por
 * isso. É o mesmo texto, lido de outro sítio.
 *
 * ── E a segunda via continua a dizer que é segunda via ────────────────────
 *
 * Também aqui. Se o talão em papel saiu e ninguém sabe, e alguém lê este ecrã e
 * cozinha, e depois o papel aparece — a marca é a única coisa que impede o
 * segundo prato.
 */
export default async function FallbackDeImpressao({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; stationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = mensagensDe(idioma).kioskE31;
  const { sessao, unidade } = await carregarKds(idioma, locationId);
  const fila = await comEscopoDoPedido(sessao, (db) => filaDaUnidade(db, unidade.id));
  const agora = new Date();

  // ── Só o que a cozinha PRECISA de ler ────────────────────────────────
  //
  // Um envio confirmado pelo aparelho já saiu em papel: mostrá-lo aqui era
  // convidar alguém a cozinhar duas vezes. O que fica são as comandas cujo
  // destino ninguém confirmou — incluindo, e sobretudo, as que estão em «não
  // sei».
  const porResolver = fila.filter((j: {
    tipo: string;
    estado: 'POR_ENVIAR' | 'ENTREGUE_A_PONTE'
      | 'CONFIRMADO_PELO_APARELHO' | 'RECUSADO_PELO_APARELHO';
    entregueEm: Date | null; respondidoEm: Date | null; resposta: string | null;
  }) => {
    if (j.tipo !== 'COMANDA') return false;
    const leitura = estadoDeImpressao(j, agora);
    return !leitura.sabe || leitura.estado !== 'impresso';
  });

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={unidade.nome} titulo={s.fallback} tela="KDS-016" />

      <p className="bo-campo__ajuda">{s.fallbackAjuda}</p>

      {porResolver.length === 0 ? (
        <div data-teste="fila-vazia">
          <Aviso tom="sucesso" titulo={s.fila}>{s.filaVazia}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista" data-teste="comandas">
          {porResolver.map((j: {
            id: string; via: number; conteudo: string;
            estado: 'POR_ENVIAR' | 'ENTREGUE_A_PONTE'
              | 'CONFIRMADO_PELO_APARELHO' | 'RECUSADO_PELO_APARELHO';
            entregueEm: Date | null; respondidoEm: Date | null; resposta: string | null;
          }) => {
            const leitura = estadoDeImpressao(j, agora);
            return (
              <li key={j.id} data-teste="comanda">
                <div>
                  {leitura.sabe ? (
                    <Etiqueta tom={leitura.estado === 'recusado' ? 'perigo' : 'neutro'}>
                      {leitura.estado === 'recusado' ? s.estadoRECUSADO
                        : leitura.estado === 'entregue' ? s.estadoENTREGUE
                        : s.estadoPOR_ENVIAR}
                    </Etiqueta>
                  ) : (
                    <span data-teste="nao-sei">
                      <Etiqueta tom="aviso">{s.estadoNAO_SEI}</Etiqueta>
                      <span className="bo-campo__ajuda">
                        {' '}{s.desde} {formatarDataHora(leitura.desde, idioma)}
                      </span>
                    </span>
                  )}
                  {j.via > 1
                    ? <Etiqueta tom="aviso">{s.via} {j.via}</Etiqueta>
                    : null}
                </div>
                {/* O texto que foi para o aparelho, tal como foi. */}
                <pre className="bo-talao" data-teste="talao">{j.conteudo}</pre>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
