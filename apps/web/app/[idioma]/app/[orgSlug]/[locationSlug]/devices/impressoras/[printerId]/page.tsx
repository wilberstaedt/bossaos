import { notFound } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { filaDaUnidade, impressorasDaUnidade } from '@bossaos/db';
import { estadoDeImpressao } from '@bossaos/domain';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * DEV-006 · «Comprueba la conexión» (atlas p. 132)
 *
 * ── A tela onde «não sei» tem de aparecer como não sei ────────────────────
 *
 * > **«Entregue à ponte» não é «imprimiu».**
 *
 * Esta é a superfície onde essa frase deixa de ser arquitectura e passa a ser
 * uma pessoa a decidir. Um envio que saiu e a que ninguém respondeu **não** se
 * mostra como impresso nem como falhado: mostra-se como não sei, com o «desde
 * quando» ao lado — porque é isso que permite escolher entre esperar mais e ir
 * à cozinha ver.
 *
 * As duas decisões erradas custam coisas diferentes: uma manda o cliente
 * esperar por comida que ninguém está a fazer, a outra faz a cozinha fazer
 * duas. O produto não escolhe nenhuma quando não sabe.
 */
export default async function DiagnosticoDaImpressora({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; printerId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, printerId } = await params;
  const s = mensagensDe(idioma).kioskE31;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const [impressoras, fila] = await Promise.all([
    comEscopoDoPedido(sessao, (db) => impressorasDaUnidade(db, unidade.id)),
    comEscopoDoPedido(sessao, (db) => filaDaUnidade(db, unidade.id)),
  ]);
  const impressora = impressoras.find((p: { id: string }) => p.id === printerId);
  if (!impressora) notFound();

  const agora = new Date();
  const desta = fila.filter((j: { printerId: string }) => j.printerId === printerId);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{impressora.nome}</p>
          <h1 data-tela="DEV-006">{s.diagnostico}</h1>
        </div>
      </div>

      <p className="bo-campo__ajuda">
        {s.destino}: {impressora.destino} · {s.modelo}: {impressora.modelo} ·{' '}
        {s.ligacao}: {impressora.ligacao}
      </p>

      {impressora.homologadaEm === null ? (
        <div data-teste="por-testar">
          <Aviso tom="aviso" titulo={s.porTestar}>{s.porTestarAjuda}</Aviso>
        </div>
      ) : null}

      <h2>{s.fila}</h2>
      <p className="bo-campo__ajuda" data-teste="entregue-nao-e-impresso">
        {s.entregueNaoEImpresso}
      </p>

      {desta.length === 0 ? (
        <p data-teste="fila-vazia">{s.filaVazia}</p>
      ) : (
        <ul className="bo-lista" data-teste="envios">
          {desta.map((j: {
            id: string; tipo: string; via: number;
            estado: 'POR_ENVIAR' | 'ENTREGUE_A_PONTE'
              | 'CONFIRMADO_PELO_APARELHO' | 'RECUSADO_PELO_APARELHO';
            entregueEm: Date | null; respondidoEm: Date | null; resposta: string | null;
          }) => {
            const leitura = estadoDeImpressao(j, agora);
            return (
              <li key={j.id} data-teste="envio">
                <span>{j.tipo} · {s.via} {j.via}</span>{' '}
                {leitura.sabe ? (
                  <Etiqueta tom={
                    leitura.estado === 'impresso' ? 'sucesso'
                      : leitura.estado === 'recusado' ? 'perigo' : 'neutro'
                  } >
                    {leitura.estado === 'impresso' ? s.estadoIMPRESSO
                      : leitura.estado === 'recusado' ? s.estadoRECUSADO
                      : leitura.estado === 'entregue' ? s.estadoENTREGUE
                      : s.estadoPOR_ENVIAR}
                  </Etiqueta>
                ) : (
                  // O ramo que a etapa existe para ter. `neutro`, e nunca
                  // `sucesso` — a aparência não pode dizer o que a leitura
                  // recusa dizer.
                  <span data-teste="nao-sei">
                    <Etiqueta tom="aviso">{s.estadoNAO_SEI}</Etiqueta>
                    <span className="bo-campo__ajuda">
                      {' '}{s.desde} {formatarDataHora(leitura.desde, idioma)}
                    </span>
                  </span>
                )}
                {j.resposta ? <p className="bo-campo__ajuda">{j.resposta}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="bo-campo__ajuda">{s.naoSeiAjuda}</p>
    </div>
  );
}
