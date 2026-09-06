import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarDispositivos } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../src/sala-da-pagina.ts';
import { NavegacaoDaSala } from '../../../../../../src/componentes/NavegacaoDaSala.tsx';

export const dynamic = 'force-dynamic';

/**
 * DEV-001 · «Dispositivos del restaurante» (atlas p. 129)
 *
 * Os revogados **continuam na lista**, com o estado à vista. Tirá-los apagava a
 * única resposta à pergunta que se faz depois de um tablet desaparecer: já foi
 * retirado, quando, e por quem.
 */
export default async function DispositivosDaUnidade({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.salaE13;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const dispositivos = await comEscopoDoPedido(sessao, (db) => listarDispositivos(db, unidade.id));
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/devices`;

  const rotulo = (estado: string) =>
    estado === 'ACTIVO' ? s.activo : estado === 'PENDENTE' ? s.pendente : s.revogado;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{s.dispositivos}</h1>
        </div>
        <a className="bo-botao bo-botao--primario" href={`${base}/parear`}>{s.parear}</a>
      </div>

      <NavegacaoDaSala idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="devices" />

      {busca.pin === '1' ? <Aviso tom="sucesso" titulo={s.pin}>{m.comum.guardado}</Aviso> : null}
      {busca.erro === 'pin_fraco' ? <Aviso tom="perigo" titulo={s.pin}>{s.pinAjuda}</Aviso> : null}

      {/* DEV-005 vive ao lado dos outros aparelhos: uma impressora é um
          dispositivo do restaurante, e procurá-la noutro menu era a mesma
          porta morta que o E30 fechou no painel de gestão. */}
      <a className="bo-lista__ligacao" data-seccao="DEV-005"
         href={`${base}/impressoras`}>
        {m.kioskE31.impressoras}
      </a>

      {dispositivos.length === 0 ? (
        <Aviso titulo={s.dispositivos}>{s.semDispositivos}</Aviso>
      ) : (
        <ul className="bo-publico__lista">
          {dispositivos.map((d) => (
            <li key={d.id} className="bo-publico__produto">
              <a href={`${base}/${d.id}`}>
                <span className="bo-publico__nome">{d.nome}</span>
                <span className="bo-publico__preco">
                  <Etiqueta tom={d.estado === 'ACTIVO' ? 'sucesso' : d.estado === 'PENDENTE' ? 'aviso' : 'perigo'}>
                    {rotulo(d.estado)}
                  </Etiqueta>
                </span>
              </a>
              <p className="bo-publico__descricao">
                {s.estacao}: {d.estacao}
                {' · '}
                {/* «Nunca se ligou» é diferente de «ligou-se há muito tempo», e a
                    diferença aparece quando alguém procura um tablet perdido. */}
                {d.ultimoVistoEm
                  ? `${s.ultimoVisto}: ${formatarData(d.ultimoVistoEm, idioma)}`
                  : s.nuncaVisto}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
