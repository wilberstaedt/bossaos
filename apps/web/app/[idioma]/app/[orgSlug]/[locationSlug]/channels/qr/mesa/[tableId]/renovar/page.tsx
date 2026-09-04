import { notFound } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { listarMesas, sessoesVivasDaMesa } from '@bossaos/db';
import { codificar, paraSvg } from '@bossaos/domain';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../../../src/sala-da-pagina.ts';
import { obterEnv } from '../../../../../../../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * QR-005 · «Renovar el acceso de la mesa» (atlas p. 86) — os DOIS actos.
 *
 * ── É esta tela que impede o colapso ──────────────────────────────────────
 *
 * *«Colapsar as duas num "invalidar" dá um sistema que ou nunca roda, ou expulsa
 * gente da mesa a meio do prato.»* A separação não pode viver só no código: quem
 * carrega no botão tem de saber qual dos dois está a fazer, e o que acontece a
 * quem está a comer.
 *
 * Por isso as duas acções estão aqui, com a consequência escrita ao lado de cada
 * uma — e o número das sessões vivas aparece **antes** de confirmar a revogação,
 * como no DEV-004 do E13: *«descartar é aceitável quando quem decide sabe o que
 * está a descartar; descobrir depois não é.»*
 *
 * ── E o segredo mostra-se UMA vez ─────────────────────────────────────────
 *
 * Depois de rodar, o código aparece aqui e não volta a aparecer: a base guarda o
 * resumo. Quem não o imprimir tem de rodar outra vez — que é barato, e é essa a
 * razão de rodar ser barato.
 */
export default async function RenovarAcessoDaMesa({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; tableId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, tableId } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.visitanteE17;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const { mesa, vivas } = await comEscopoDoPedido(sessao, async (db) => {
    const mesas = await listarMesas(db, unidade.id);
    const achada = mesas.find((x: { id: string }) => x.id === tableId) ?? null;
    return { mesa: achada, vivas: achada ? await sessoesVivasDaMesa(db, achada.id) : [] };
  });
  if (!mesa) notFound();

  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/channels/qr`;
  const segredoNovo = typeof busca.segredo === 'string' ? busca.segredo : null;
  const continuaram = typeof busca.continuaram === 'string' ? busca.continuaram : null;
  const enderecoImpresso = segredoNovo && unidade.publicSlug
    ? `${obterEnv().BETTER_AUTH_URL}/r/${unidade.publicSlug}/${idioma}/menu`
      + `?mesa=${mesa.id}&t=${segredoNovo}`
    : null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome} · {mesa.codigo}</p>
          <h1 data-tela="QR-005">{s.renovarAcesso}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/mesa/${mesa.id}`}>
          {m.comum.voltar}
        </a>
      </div>

      {/* ── Acabou de rodar: o código, uma vez só ──────────────────────────
          E o número das que CONTINUARAM, que é a pergunta de quem carregou:
          «estraguei o jantar de alguém?». A resposta é não, e é um número. */}
      {enderecoImpresso ? (
        <Cartao titulo={s.rodar}>
          <div data-teste="qr-novo"
               dangerouslySetInnerHTML={{
                 __html: paraSvg(codificar(enderecoImpresso, 'Q'), { tamanho: 280 }),
               }} />
          <p className="bo-publico__texto" data-teste="segredo">
            <code>{enderecoImpresso}</code>
          </p>
          <div data-teste="uma-vez">
            <Aviso tom="aviso" titulo={s.rodar}>{s.segredoUmaVez}</Aviso>
          </div>
          {continuaram !== null ? (
            <p data-teste="continuaram">
              <strong>{s.continuaram}</strong>: {continuaram} — {s.continuaramAjuda}
            </p>
          ) : null}
        </Cartao>
      ) : null}

      {busca.revogadas !== undefined ? (
        <div data-teste="revogadas">
          <Aviso tom="sucesso" titulo={s.revogar}>
            {s.vaoCair}: {String(busca.revogadas)}
          </Aviso>
        </div>
      ) : null}
      {busca.erro === 'sem_motivo' ? (
        <div data-teste="sem-motivo">
          <Aviso tom="perigo" titulo={s.revogar}>{s.revogarAjuda}</Aviso>
        </div>
      ) : null}

      {/* ── ACTO 1: rodar ──────────────────────────────────────────────── */}
      <Cartao titulo={s.rodar}>
        <p className="bo-campo__ajuda" data-teste="rodar-ajuda">{s.rodarAjuda}</p>
        <form method="post" action={`/api/org/${orgSlug}/qr`} data-teste="rodar">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="tableId" value={mesa.id} />
          <input type="hidden" name="accao" value="rodar" />
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{s.rodar}</button>
          </div>
        </form>
      </Cartao>

      {/* ── ACTO 2: revogar, com o número ANTES ───────────────────────────── */}
      <Cartao titulo={s.revogar}>
        <p className="bo-campo__ajuda" data-teste="revogar-ajuda">{s.revogarAjuda}</p>
        <p data-teste="vao-cair">
          <strong>{s.vaoCair}</strong>: {vivas.length}
        </p>
        {vivas.length === 0 ? (
          <p className="bo-campo__ajuda" data-teste="nenhuma-cai">{s.nenhumaVaiCair}</p>
        ) : null}
        <form method="post" action={`/api/org/${orgSlug}/qr`} data-teste="revogar">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="tableId" value={mesa.id} />
          <input type="hidden" name="accao" value="revogar" />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="motivo">{m.salaE13.accaoRevogar}</label>
            <input className="bo-campo__controlo" id="motivo" name="motivo" required />
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--perigo" type="submit">{s.revogar}</button>
          </div>
        </form>
      </Cartao>
    </div>
  );
}
