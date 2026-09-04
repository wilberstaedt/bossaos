import { Etiqueta } from '@bossaos/ui';
import { formatarDinheiro, type Idioma } from '@bossaos/i18n';
import {
  carregarStaff, produtosParaCompor,
} from '../../../../../src/staff/carregar-staff.ts';
import { CabecalhoDoStaff, textosDoStaff } from '../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-006 · «¿Qué vamos a servir?» (atlas p. 165)
 *
 * ── O preço que aparece aqui é uma PROPOSTA ──────────────────────────────
 *
 * É o que a carta diz agora, e é o que o aparelho vai guardar no rascunho. Entre
 * escrever e o servidor aceitar pode passar uma hora sem rede — e se a carta
 * mudar nesse tempo, o servidor rejeita a linha com o motivo em vez de
 * reprecificar em silêncio. Está decidido em
 * `docs/architecture/preco-de-um-pedido-escrito-offline.md`.
 *
 * **Sem preço na carta não é «grátis».** É um prato que não se pode cobrar, e
 * escrever zero ali era inventar um facto.
 */
export default async function CatalogoDoStaff({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = textosDoStaff(idioma);
  const { sessao, unidade } = await carregarStaff(idioma, locationId);
  const produtos = await produtosParaCompor(sessao, unidade.id);
  const base = `/${idioma}/staff/${locationId}`;

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.catalogo} tela="STAFF-006" actual="/catalogo" />

      <p className="bo-campo__ajuda">{s.catalogoAjuda}</p>

      {produtos.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-catalogo">{s.semCatalogo}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="catalogo">
          {produtos.map((p) => (
            <li key={p.id} className="bo-publico__produto" data-teste="prato"
                data-disponivel={p.disponivel ? '1' : '0'}>
              <a href={`${base}/catalogo/${p.id}`}>
                <span className="bo-publico__nome">{p.nome}</span>
                <span className="bo-publico__preco">
                  {p.precoMenor !== null && p.moeda
                    ? formatarDinheiro({ montanteMenor: p.precoMenor, moeda: p.moeda }, idioma)
                    : <Etiqueta tom="aviso">{s.semPrecoNaCarta}</Etiqueta>}
                </span>
              </a>
              {p.disponivel ? null : (
                <p className="bo-publico__descricao" data-teste="esgotado">{s.motivoESGOTADO}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
