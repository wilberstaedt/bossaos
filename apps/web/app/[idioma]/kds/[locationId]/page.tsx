import { Aviso, Etiqueta } from '@bossaos/ui';
import { type Idioma } from '@bossaos/i18n';
import { carregarKds } from '../../../../src/kds/carregar-kds.ts';
import {
  CabecalhoDoKds, porChaveDoKds, textosDoKds,
} from '../../../../src/kds/PecasDoKds.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-001 · «Tu estación de trabajo» (atlas p. 184)
 *
 * ── Sem estações, esta tela DIZ-O ─────────────────────────────────────────
 *
 * Uma lista vazia lê-se como «ainda não carregou». Uma unidade sem estações não
 * é um ecrã em branco: é um restaurante onde o que for pedido não chega a lado
 * nenhum, e esta tela tem de o dizer por palavras a quem a abre pela primeira
 * vez.
 */
export default async function EstacoesDoKds({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = textosDoKds(idioma);
  const { unidade, estacoes } = await carregarKds(idioma, locationId);
  const base = `/${idioma}/kds/${locationId}`;

  return (
    <div className="bo-pagina">
      <CabecalhoDoKds sobrancelha={unidade.nome} titulo={s.estacao} tela="KDS-001" />

      {/* Contado antes de afirmar seja o que for. */}
      <p data-teste="quantas">{estacoes.length}</p>

      {estacoes.length === 0 ? (
        <div data-teste="sem-estacoes">
          <Aviso tom="aviso" titulo={s.estacao}>{s.semEstacoes}</Aviso>
        </div>
      ) : (
        <ul className="bo-publico__lista" data-teste="estacoes">
          {estacoes.map((e: { id: string; nome: string; tipo: string; limiteVisivel: number }) => (
            <li key={e.id} className="bo-publico__produto" data-teste="estacao" data-tipo={e.tipo}>
              <a href={`${base}/${e.id}`}>
                <span className="bo-publico__nome">{e.nome}</span>
                <span className="bo-publico__preco">
                  <Etiqueta tom={e.tipo === 'EXPO' ? 'info' : 'neutro'}>
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

      <nav className="bo-publico__seccoes" data-teste="fora-da-estacao">
        <a href={`${base}/ecras`} data-seccao="KDS-015">{s.ecras}</a>
      </nav>
    </div>
  );
}
