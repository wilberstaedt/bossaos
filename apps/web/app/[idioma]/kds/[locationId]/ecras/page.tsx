import { Aviso, Etiqueta } from '@bossaos/ui';
import { listarDispositivos } from '@bossaos/db';
import { formatarDataHora, type Idioma } from '@bossaos/i18n';
import { carregarKds } from '../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import {
  CabecalhoDoKds, porChaveDoKds, textosDoKds,
} from '../../../../../src/kds/PecasDoKds.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-015 · «Pantallas de cocina» (atlas p. 198)
 *
 * As estações desta unidade e os aparelhos que as servem, lado a lado. É onde se
 * vê que existe uma estação **sem ecrã nenhum** — que é um destino sem
 * destinatário: o bilhete é encaminhado e não aparece a ninguém.
 */
export default async function EcrasDeCozinha({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = textosDoKds(idioma);
  const { sessao, unidade, estacoes } = await carregarKds(idioma, locationId);
  const dispositivos = await comEscopoDoPedido(sessao,
    (db) => listarDispositivos(db, unidade.id));
  const activos = dispositivos.filter((d: { estado: string }) => d.estado === 'ACTIVO');

  return (
    <div className="bo-pagina">
      <CabecalhoDoKds sobrancelha={unidade.nome} titulo={s.ecras} tela="KDS-015" />

      <p data-teste="quantas">{estacoes.length}</p>
      {estacoes.length === 0 ? (
        <div data-teste="sem-estacoes">
          <Aviso tom="aviso" titulo={s.ecras}>{s.semEstacoes}</Aviso>
        </div>
      ) : (
        <ul className="bo-publico__lista" data-teste="estacoes">
          {estacoes.map((e: { id: string; nome: string; tipo: string; limiteVisivel: number }) => (
            <li key={e.id} className="bo-publico__produto" data-teste="estacao">
              <a href={`/${idioma}/kds/${locationId}/${e.id}`}>
                <span className="bo-publico__nome">{e.nome}</span>
                <span className="bo-publico__preco">
                  <Etiqueta tom="neutro">
                    {porChaveDoKds(s, `tipo${e.tipo}`) ?? e.tipo}
                  </Etiqueta>
                </span>
              </a>
              <p className="bo-publico__descricao">
                {s.limiteVisivel}: {e.limiteVisivel}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h2>{s.ultimoSinal}</h2>
      <p className="bo-campo__ajuda">{s.batimentoNaoProva}</p>
      <ul className="bo-lista" data-teste="aparelhos">
        {activos.map((d: { id: string; nome: string; estacao: string; ultimoVistoEm: Date | null }) => (
          <li key={d.id} data-teste="aparelho">
            {d.nome} · {d.estacao} ·{' '}
            {d.ultimoVistoEm ? formatarDataHora(d.ultimoVistoEm, idioma) : s.nuncaDeuSinal}
          </li>
        ))}
      </ul>
    </div>
  );
}
