import { Etiqueta } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';

export interface LinhaParaMostrar {
  id: string;
  nome: string;
  quantidade: number;
  precoMenor: number | null;
  precoPropostoMenor?: number | null;
  moeda: string | null;
  estado: string;
  motivoRejeicao?: string | null;
}

/**
 * As linhas de um pedido, num sítio só.
 *
 * ── Uma linha rejeitada APARECE, e diz porquê ────────────────────────────
 *
 * O aceite 3 é «item esgotado é rejeitado **com carrinho preservado**». Esconder
 * a linha rejeitada é a versão visual de limpar o carrinho: a pessoa deixa de
 * saber o que aconteceu ao que pediu, e pede outra vez.
 *
 * E o motivo vem por palavras. «Indisponível» sem dizer porquê faz alguém pedir a
 * mesma coisa a seguir; «esgotado» faz pedir outra.
 */
export function LinhasDoPedido({ idioma, linhas }: { idioma: Idioma; linhas: readonly LinhaParaMostrar[] }) {
  const p = mensagensDe(idioma).pedidosE14;

  const rotulo = (estado: string) =>
    estado === 'ACEITE' ? p.aceite
      : estado === 'REJEITADA' ? p.rejeitada
      : estado === 'CANCELADA' ? p.cancelada : p.proposta;

  const motivo = (m: string | null | undefined) =>
    m === 'ESGOTADO' ? p.esgotado
      : m === 'SEM_PRECO' ? p.semPreco
      : m === 'PRECO_DIVERGENTE' ? p.precoDivergente
      : m === 'PRODUTO_DESCONHECIDO' ? p.produtoDesconhecido : null;

  return (
    <ul className="bo-publico__lista">
      {linhas.map((l) => (
        <li key={l.id} className="bo-publico__produto">
          <a href={`#linha-${l.id}`} id={`linha-${l.id}`}>
            <span className="bo-publico__nome">{l.quantidade}× {l.nome}</span>
            <span className="bo-publico__preco">
              {l.precoMenor !== null && l.moeda
                ? formatarDinheiro({ montanteMenor: l.precoMenor, moeda: l.moeda }, idioma)
                : '—'}
            </span>
          </a>
          <p className="bo-publico__descricao">
            <Etiqueta tom={l.estado === 'ACEITE' ? 'sucesso' : l.estado === 'REJEITADA' ? 'perigo' : 'neutro'}>
              {rotulo(l.estado)}
            </Etiqueta>
            {motivo(l.motivoRejeicao) ? ` · ${p.motivo}: ${motivo(l.motivoRejeicao)}` : ''}
            {/* A divergência mostra AS DUAS: o que foi proposto e o que o
                servidor diz. Sem as duas, quem está à mesa não tem como
                perceber o que se passou. */}
            {l.motivoRejeicao === 'PRECO_DIVERGENTE'
              && l.precoPropostoMenor != null && l.moeda
              ? ` (${formatarDinheiro({ montanteMenor: l.precoPropostoMenor, moeda: l.moeda }, idioma)} → ${
                  l.precoMenor !== null
                    ? formatarDinheiro({ montanteMenor: l.precoMenor, moeda: l.moeda }, idioma) : '—'})`
              : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}
