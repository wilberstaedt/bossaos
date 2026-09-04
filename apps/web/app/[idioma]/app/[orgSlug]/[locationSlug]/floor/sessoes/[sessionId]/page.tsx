import { notFound } from 'next/navigation';
import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { historicoDaSessao, salaAgora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-008 · «Mesa 07 · Terraza» (atlas p. 120)
 *
 * A ficha de uma sessão a decorrer, com o **histórico** que o E13 pede. O
 * histórico é append-only por privilégio — o runtime não tem `UPDATE` nem
 * `DELETE` em `table_session_events` —, e por isso o que está aqui aconteceu
 * mesmo. Um histórico reescrevível é uma versão dos factos.
 */
export default async function FichaDaSessao({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; sessionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, sessionId } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.salaE13;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const { mesa, historico } = await comEscopoDoPedido(sessao, async (db) => {
    const mesas = await salaAgora(db, unidade.id);
    return {
      mesa: mesas.find((x) => x.sessao?.id === sessionId) ?? null,
      historico: await historicoDaSessao(db, sessionId),
    };
  });

  // Uma sessão fechada já não está na sala — e o histórico dela sozinho não é
  // esta tela. Ausência, como sempre: a diferença entre «não é tua» e «já
  // acabou» não se diz a quem pergunta pelo endereço.
  if (!mesa?.sessao) notFound();
  const activa = mesa.sessao;
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/floor`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{mesa.area.nome}</p>
          <h1>{mesa.codigo}</h1>
        </div>
        <div className="bo-estado__accoes">
          <a className="bo-botao bo-botao--secundario" href={`${base}/sessoes/${sessionId}/transferir`}>
            {s.accaoTransferir}
          </a>
          <a className="bo-botao bo-botao--primario" href={`${base}/sessoes/${sessionId}/encerrar`}>
            {s.accaoEncerrar}
          </a>
        </div>
      </div>

      {busca.aberta === '1' ? <Aviso tom="sucesso" titulo={s.abrir}>{s.ocupada}</Aviso> : null}
      {busca.transferida === '1' ? <Aviso tom="sucesso" titulo={s.accaoTransferir}>{mesa.codigo}</Aviso> : null}
      {busca.erro ? <Aviso tom="perigo" titulo={s.tempoReal}>{m.comum.tenteOutraVez}</Aviso> : null}

      <Cartao titulo={s.tempoReal}>
        <dl className="bo-estado__factos">
          <dt>{s.estado}</dt>
          <dd>
            <Etiqueta tom={activa.estado === 'A_ENCERRAR' ? 'aviso' : 'perigo'}>
              {activa.estado === 'A_ENCERRAR' ? s.aEncerrar : s.ocupada}
            </Etiqueta>
          </dd>
          <dt>{s.comensais}</dt>
          <dd>{activa.comensais}</dd>
          <dt>{s.abertaEm}</dt>
          <dd>{formatarHora(activa.abertaEm, idioma)} · {activa.abertaPor}</dd>
          <dt>{s.responsavel}</dt>
          <dd>{activa.responsavel?.user.nome ?? activa.responsavel?.user.email ?? s.semResponsavel}</dd>
        </dl>
      </Cartao>

      <section aria-labelledby="historico">
        <h2 id="historico">{s.historico}</h2>
        <ul className="bo-lista">
          {historico.map((e) => (
            <li key={e.id}>
              {formatarHora(e.createdAt, idioma)} · {e.accao} · {e.actorEmail}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
