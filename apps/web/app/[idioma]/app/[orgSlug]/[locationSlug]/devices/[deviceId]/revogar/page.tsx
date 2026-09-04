import { notFound } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarDispositivos } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * DEV-004 · «Retira el acceso» (atlas p. 132)
 *
 * ── A decisão da regra 3-bis vive neste ecrã ─────────────────────────────
 *
 * O contrato `offline-e-fila-local.md` deixou uma aresta em aberto: a regra 2
 * manda os rascunhos ficarem suspensos *«até o dono se reautenticar»*, e num
 * aparelho revogado o dono não volta. Das três saídas nomeadas — resolver noutro
 * aparelho, um administrador resolver por ele, ou a revogação descartar —
 * **ficou a terceira**, e a condição que a torna honesta é esta página: **diz-se
 * ao revogar, e não depois**.
 *
 * As outras duas não são implementáveis no caso que interessa. «Resolver noutro
 * aparelho» exige que os rascunhos tenham saído do tablet — se tivessem saído não
 * eram rascunhos por enviar, e o aparelho pode estar sem rede exactamente quando
 * é revogado, que é o caso típico de um tablet perdido. «Um administrador
 * resolve por ele» exige que alguém LEIA o trabalho de outra pessoa, e a regra 3
 * diz o contrário.
 *
 * ── E o número aparece antes de confirmar, quando existe ─────────────────
 *
 * `rascunhosPorEnviar` é o que o dispositivo declarou na última vez que falou —
 * um número, nunca conteúdo. Quando é `null`, a página **diz que não sabe** em
 * vez de mostrar um zero que ninguém mediu.
 */
export default async function RevogarDispositivo({
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

  const dispositivo = await comEscopoDoPedido(sessao, async (db) => {
    const todos = await listarDispositivos(db, unidade.id);
    return todos.find((d) => d.id === deviceId) ?? null;
  });
  if (!dispositivo) notFound();
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/devices`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{dispositivo.nome}</p>
          <h1>{s.accaoRevogar}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/${deviceId}`}>{m.comum.voltar}</a>
      </div>

      {busca.erro === 'sem_motivo' ? (
        <Aviso tom="perigo" titulo={s.motivo}>{s.motivoObrigatorio}</Aviso>
      ) : null}

      {/* O custo, dito ANTES e não depois. É a metade da decisão que a torna
          defensável: descartar é aceitável quando quem decide sabe o que
          descarta; descobrir depois não é. */}
      <Aviso tom="perigo" urgente titulo={s.avisoRevogar}>
        <p>{s.avisoRevogarPorque}</p>
        <p>
          {s.rascunhosPorEnviar}:{' '}
          {dispositivo.rascunhosPorEnviar === null
            ? s.rascunhosDesconhecidos
            : dispositivo.rascunhosPorEnviar}
        </p>
      </Aviso>

      <Cartao titulo={s.accaoRevogar}>
        <form method="post" action={`/api/org/${orgSlug}/dispositivos`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="revogar" />
          <input type="hidden" name="deviceId" value={deviceId} />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="motivo">{s.motivo}</label>
            {/* Obrigatório no SERVIDOR, e não só aqui: uma revogação sem motivo é
                uma que ninguém consegue rever daqui a seis meses. */}
            <input className="bo-campo__controlo" id="motivo" name="motivo" required />
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{s.accaoRevogar}</button>
          </div>
        </form>
      </Cartao>
    </div>
  );
}
