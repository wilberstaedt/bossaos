import { notFound } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { salaAgora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-011 · «Termina el servicio de la mesa» (atlas p. 123)
 *
 * ── Dois passos, e o do meio não é decoração ─────────────────────────────
 *
 * «Pedir a conta» põe a sessão em `A_ENCERRAR` e **a mesa continua ocupada**;
 * «fechar» liberta-a. Um passo só obrigava a escolher entre libertar cedo — e
 * sentar alguém em cima da conta de quem ainda lá está — ou tarde, e a sala
 * mentir sobre o que tem livre.
 *
 * ── Sobre o pagamento, e o que este ecrã NÃO diz ─────────────────────────
 *
 * O E13 manda respeitar: *«no Restaurant, o fecho operacional pode registar
 * resolução externa autorizada; não registar isso como pagamento processado pela
 * BossaOS»*. Fechar aqui é um acto de **sala** — a mesa fica livre — e não uma
 * cobrança. O produto não afirma que alguém pagou, porque não viu pagar nada.
 * O dinheiro é da E32.
 */
export default async function EncerrarSessao({
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
  const mesas = await comEscopoDoPedido(sessao, (db) => salaAgora(db, unidade.id));

  const mesa = mesas.find((x) => x.sessao?.id === sessionId) ?? null;
  if (!mesa?.sessao) notFound();
  const activa = mesa.sessao;
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/floor`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{mesa.codigo} · {mesa.area.nome}</p>
          <h1>{s.accaoEncerrar}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/sessoes/${sessionId}`}>
          {m.comum.voltar}
        </a>
      </div>

      {busca.feito === '1' ? <Aviso tom="sucesso" titulo={s.accaoEncerrar}>{s.aEncerrar}</Aviso> : null}
      {busca.erro ? <Aviso tom="perigo" titulo={s.accaoEncerrar}>{m.comum.tenteOutraVez}</Aviso> : null}

      <Cartao titulo={mesa.codigo}>
        <dl className="bo-estado__factos">
          <dt>{s.estado}</dt>
          <dd>{activa.estado === 'A_ENCERRAR' ? s.aEncerrar : s.ocupada}</dd>
          <dt>{s.comensais}</dt>
          <dd>{activa.comensais}</dd>
          <dt>{s.abertaEm}</dt>
          <dd>{formatarHora(activa.abertaEm, idioma)}</dd>
        </dl>

        {activa.estado === 'ABERTA' ? (
          <form method="post" action={`/api/org/${orgSlug}/sala`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="pedir_conta" />
            <input type="hidden" name="sessaoId" value={sessionId} />
            <button className="bo-botao bo-botao--primario" type="submit">{s.accaoPedirConta}</button>
          </form>
        ) : (
          <form method="post" action={`/api/org/${orgSlug}/sala`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="fechar" />
            <input type="hidden" name="sessaoId" value={sessionId} />
            <button className="bo-botao bo-botao--primario" type="submit">{s.accaoFechar}</button>
          </form>
        )}
      </Cartao>
    </div>
  );
}
