import { notFound } from 'next/navigation';
import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarDispositivos, turnoAberto } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * DEV-003 · «Cocina 01» (atlas p. 131)
 *
 * A ficha de um dispositivo. O que ela mostra e o que **não** mostra vem da
 * regra 3 do `offline-e-fila-local`: quem olha para um aparelho não é o dono do
 * trabalho que lá está dentro. Por isso aparece o NÚMERO de rascunhos por
 * enviar, e nunca o que eles contêm.
 *
 * E «não reportou» não é zero. Um dispositivo que nunca falou não tem zero
 * rascunhos — não se sabe, e um zero tranquilizador que ninguém mediu é pior do
 * que a frase.
 */
export default async function FichaDoDispositivo({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; deviceId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, deviceId } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.salaE13;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const { dispositivo, turno } = await comEscopoDoPedido(sessao, async (db) => {
    const todos = await listarDispositivos(db, unidade.id);
    return {
      dispositivo: todos.find((d) => d.id === deviceId) ?? null,
      turno: await turnoAberto(db, deviceId),
    };
  });
  if (!dispositivo) notFound();
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/devices`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{dispositivo.estacao}</p>
          <h1>{dispositivo.nome}</h1>
        </div>
        {dispositivo.estado === 'REVOGADO' ? null : (
          <a className="bo-botao bo-botao--secundario" href={`${base}/${deviceId}/revogar`}>
            {s.accaoRevogar}
          </a>
        )}
      </div>

      {busca.aprovado === '1' ? <Aviso tom="sucesso" titulo={s.activo}>{dispositivo.nome}</Aviso> : null}
      {busca.revogado === '1' ? (
        <Aviso tom="aviso" titulo={s.revogado}>{s.avisoRevogar}</Aviso>
      ) : null}

      <Cartao titulo={s.estado}>
        <dl className="bo-estado__factos">
          <dt>{s.estado}</dt>
          <dd>
            <Etiqueta tom={dispositivo.estado === 'ACTIVO' ? 'sucesso' : dispositivo.estado === 'PENDENTE' ? 'aviso' : 'perigo'}>
              {dispositivo.estado === 'ACTIVO' ? s.activo
                : dispositivo.estado === 'PENDENTE' ? s.pendente : s.revogado}
            </Etiqueta>
          </dd>
          <dt>{s.ultimoVisto}</dt>
          <dd>{dispositivo.ultimoVistoEm ? formatarData(dispositivo.ultimoVistoEm, idioma) : s.nuncaVisto}</dd>
          <dt>{s.rascunhosPorEnviar}</dt>
          <dd>
            {dispositivo.rascunhosPorEnviar === null
              ? s.rascunhosDesconhecidos
              : dispositivo.rascunhosPorEnviar}
          </dd>
          <dt>{s.turno}</dt>
          <dd>{turno ? formatarData(turno.abertaEm, idioma) : s.semResponsavel}</dd>
          {dispositivo.estado === 'REVOGADO' ? (
            <>
              <dt>{s.motivo}</dt>
              <dd>{dispositivo.revogadoMotivo ?? '—'}</dd>
            </>
          ) : null}
        </dl>
      </Cartao>
    </div>
  );
}
