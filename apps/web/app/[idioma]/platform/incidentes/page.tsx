import { redirect } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, incidentesTodos, obterPrisma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-016 · «Incidencias» (atlas p. 246)
 *
 * ── A coluna «público» é uma decisão desconfortável ───────────────────────
 *
 * Nasce `true`. Dizer que alguma coisa está avariada custa, e não dizer custa
 * mais: o cliente descobre na mesma, a meio de um serviço, sem saber se o
 * problema é dele — e passa a hora seguinte a procurar no sítio errado.
 *
 * O interruptor existe para o caso raro em que a divulgação faz mal (um
 * incidente de segurança em curso). O que ele **não** é: um sítio para esconder
 * o que dá má impressão.
 */
export default async function Incidentes({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const incidentes = await comIdentidade(prisma, actor.id, (db) => incidentesTodos(db));
  const escondidos = incidentes.filter(
    (i: { publico: boolean; estado: string }) => !i.publico && i.estado !== 'FECHADO');

  const rotulo = (estado: string): string => {
    const v = (s as unknown as Record<string, unknown>)[`incidente${estado}`];
    return typeof v === 'string' ? v : estado;
  };

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.painel}</p>
          <h1 data-tela="PLAT-016">{s.incidentes}</h1>
        </div>
      </div>

      {/* Quantos estão abertos e escondidos. O número existe para incomodar. */}
      <p data-teste="quantos-escondidos">{escondidos.length}</p>

      {incidentes.length === 0 ? (
        <div data-teste="sem-incidentes">
          <Aviso tom="sucesso" titulo={s.incidentes}>{s.semIncidentes}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="incidentes">
          {incidentes.map((i: {
            id: string; titulo: string; resumo: string; estado: string;
            publico: boolean; comecouEm: Date;
          }) => (
            <li key={i.id} data-teste="incidente">
              <span>{i.titulo}</span>{' '}
              <Etiqueta tom={i.estado === 'FECHADO' ? 'neutro' : 'perigo'}>
                {rotulo(i.estado)}
              </Etiqueta>
              {i.publico ? null : (
                <Etiqueta tom="aviso">{s.segredoEmFalta}</Etiqueta>
              )}
              <p className="bo-campo__ajuda">{i.resumo}</p>
              <p className="bo-campo__ajuda">{formatarDataHora(i.comecouEm, idioma)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
