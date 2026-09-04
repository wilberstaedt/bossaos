import { Aviso } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';

export interface LinhaDeRelatorio {
  chave: string;
  quantidade: number;
  valorOperacionalMenor: number | null;
  moeda: string | null;
}

/**
 * A tabela de um relatório operacional, e o aviso que a acompanha sempre.
 *
 * ── «Valor operacional» aparece em todas, e é uma decisão ────────────────
 *
 * O E14 manda distinguir valor operacional de receita liquidada. A distinção só
 * serve se estiver **onde o número está**: numa nota de rodapé de outro ecrã,
 * quem lê o número não a vê, e fecha o mês com ele.
 */
export function TabelaDeRelatorio({
  idioma, titulo, linhas,
}: {
  idioma: Idioma; titulo: string; linhas: readonly LinhaDeRelatorio[];
}) {
  const p = mensagensDe(idioma).pedidosE14;
  if (linhas.length === 0) return <Aviso titulo={titulo}>{p.semDados}</Aviso>;

  return (
    <>
      <Aviso tom="info" titulo={p.valorOperacional}>{p.naoEReceita}</Aviso>
      <table className="bo-tabela">
        <thead>
          <tr>
            <th scope="col">{titulo}</th>
            <th scope="col">{p.quantidade}</th>
            <th scope="col">{p.valorOperacional}</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.chave}>
              <th scope="row">{l.chave}</th>
              <td>{l.quantidade}</td>
              <td>
                {/* Sem valor não é zero: é «não se sabe somar isto», e o caso
                    real é um pedido com moedas diferentes. Um zero escondia-o. */}
                {l.valorOperacionalMenor !== null && l.moeda
                  ? formatarDinheiro({ montanteMenor: l.valorOperacionalMenor, moeda: l.moeda }, idioma)
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
