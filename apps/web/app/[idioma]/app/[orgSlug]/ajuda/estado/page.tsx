import { notFound } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { incidentesPublicos } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * HELP-004 · «Estado del sistema» (atlas p. 277)
 *
 * ── Um incidente que só nós vemos é um telefone a tocar ───────────────────
 *
 * Por isso os incidentes nascem **públicos**. É a decisão desconfortável: dizer
 * que alguma coisa está avariada custa, e não dizer custa mais — o cliente
 * descobre na mesma, e descobre a meio de um serviço, sem saber se o problema é
 * dele.
 *
 * E esta tela vem **antes** de abrir um pedido na HELP-001, de propósito: é o
 * que evita metade dos pedidos.
 */
export default async function EstadoDoSistema({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();
  const incidentes = await comEscopoDoPedido(sessao, (db) => incidentesPublicos(db));

  const abertos = incidentes.filter((i: { estado: string }) => i.estado !== 'FECHADO');
  const rotulo = (estado: string): string => {
    const v = (s as unknown as Record<string, unknown>)[`incidente${estado}`];
    return typeof v === 'string' ? v : estado;
  };

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.ajuda}</p>
          <h1 data-tela="HELP-004">{s.estadoDoSistema}</h1>
        </div>
      </div>

      {abertos.length === 0 ? (
        <div data-teste="sem-incidentes">
          <Aviso tom="sucesso" titulo={s.estadoDoSistema}>{s.semIncidentes}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="incidentes">
          {abertos.map((i: {
            id: string; titulo: string; resumo: string; estado: string; comecouEm: Date;
          }) => (
            <li key={i.id} data-teste="incidente">
              <span>{i.titulo}</span>{' '}
              <Etiqueta tom={i.estado === 'MITIGADO' ? 'aviso' : 'perigo'}>
                {rotulo(i.estado)}
              </Etiqueta>
              <p className="bo-campo__ajuda">{i.resumo}</p>
              <p className="bo-campo__ajuda">{formatarDataHora(i.comecouEm, idioma)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
