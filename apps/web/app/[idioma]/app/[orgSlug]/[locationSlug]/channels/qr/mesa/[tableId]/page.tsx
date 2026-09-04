import { notFound } from 'next/navigation';
import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { listarMesas, sessoesVivasDaMesa } from '@bossaos/db';
import { codificar, paraSvg } from '@bossaos/domain';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../../src/sala-da-pagina.ts';
import { obterEnv } from '../../../../../../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * QR-002 · «QR para una mesa» (atlas p. 85)
 *
 * ── Este QR é uma CREDENCIAL, ao contrário do QR-001 ──────────────────────
 *
 * O QR geral do E09 é um **endereço**: abre a carta e mais nada, e o que ele
 * contém está escrito por baixo dele. Este leva um **segredo** — quem o
 * fotografa leva a chave da mesa 5 para casa.
 *
 * É por isso que existe o par rodar/revogar, e é por isso que esta tela diz há
 * quanto tempo o código não é trocado. *«Informar não é decidir»*: com que
 * frequência se roda é do restaurante, e o sistema não traz um valor por omissão
 * que finja ser política.
 *
 * ── E o segredo NÃO está aqui ─────────────────────────────────────────────
 *
 * A base guarda o resumo. Esta tela mostra o código impresso **uma vez**, no
 * momento em que ele é gerado — o QR-005. Aqui mostra-se o estado, e o que se
 * pode fazer.
 */
export default async function QrDaMesa({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; tableId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, tableId } = await params;
  const m = mensagensDe(idioma);
  const s = m.visitanteE17;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const { mesa, vivas } = await comEscopoDoPedido(sessao, async (db) => {
    const mesas = await listarMesas(db, unidade.id);
    const achada = mesas.find((x: { id: string }) => x.id === tableId) ?? null;
    return {
      mesa: achada,
      vivas: achada ? await sessoesVivasDaMesa(db, achada.id) : [],
    };
  });
  if (!mesa) notFound();

  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/channels/qr`;
  // O endereço impresso é o público, e não o do painel: é o que o telemóvel de
  // quem se senta vai abrir.
  const enderecoLegivel = unidade.publicSlug
    ? `${obterEnv().BETTER_AUTH_URL}/r/${unidade.publicSlug}/${idioma}/menu?mesa=${mesa.id}`
    : null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome} · {mesa.codigo}</p>
          <h1 data-tela="QR-002">{s.qrDaMesa}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={base}>{m.comum.voltar}</a>
      </div>

      {mesa.qrSegredoHash === null ? (
        <div data-teste="sem-qr">
          <Aviso tom="aviso" titulo={s.qrDaMesa}>{s.semQr}</Aviso>
        </div>
      ) : (
        <Cartao titulo={s.qrDaMesa}>
          {/* O código desenhado é o ENDEREÇO, sem o segredo: serve para se ver
              que a mesa tem QR, e não para o imprimir. O que se imprime sai do
              QR-005, uma vez. */}
          {enderecoLegivel ? (
            <div data-teste="qr"
                 dangerouslySetInnerHTML={{
                   __html: paraSvg(codificar(enderecoLegivel, 'Q'), { tamanho: 280 }),
                 }} />
          ) : null}
          <dl className="bo-publico__contacto">
            <div>
              <dt>{s.rodadoHa}</dt>
              {/* «Nunca foi trocado» não é «há muito tempo»: é não ter acontecido.
                  Um zero tranquilizador aqui era pior do que a frase. */}
              <dd data-teste="rodado-em" data-nunca={mesa.qrRodadoEm ? '0' : '1'}>
                {mesa.qrRodadoEm ? formatarDataHora(mesa.qrRodadoEm, idioma) : s.nuncaRodado}
              </dd>
            </div>
            <div>
              <dt>{s.quantasVezes}</dt>
              <dd data-teste="geracao">{mesa.qrGeracao}</dd>
            </div>
            <div>
              <dt>{s.continuaram}</dt>
              <dd data-teste="vivas">{vivas.length}</dd>
            </div>
          </dl>
          <p className="bo-campo__ajuda">{s.comQueFrequencia}</p>
        </Cartao>
      )}

      {/* ── Os dois actos, SEPARADOS e explicados ────────────────────────────
          Um botão só a dizer «invalidar» era o colapso que o contrato existe
          para impedir: ou o restaurante nunca o carrega, ou expulsa gente da
          mesa a meio do prato. Aqui são dois, com a consequência escrita ao lado
          de cada um. */}
      <nav className="bo-publico__seccoes" data-teste="actos">
        <a href={`${base}/mesa/${mesa.id}/renovar`} data-seccao="QR-005">{s.rodar}</a>
        <a href={`${base}/sessoes`} data-seccao="QR-006">{s.sessoesActivas}</a>
      </nav>
      <p className="bo-campo__ajuda" data-teste="rodar-ajuda">{s.rodarAjuda}</p>

      <Etiqueta tom={vivas.length > 0 ? 'aviso' : 'neutro'}>
        {s.continuaram}: {vivas.length}
      </Etiqueta>
    </div>
  );
}
