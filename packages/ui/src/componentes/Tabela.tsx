import type { ReactNode } from 'react';

export interface Coluna<L> {
  chave: keyof L & string;
  rotulo: string;
  /** Alinha à direita e usa algarismos de largura fixa. Para dinheiro e contagens. */
  numero?: boolean;
}

export interface TabelaProps<L extends { id: string }> {
  /** Obrigatória: uma tabela sem legenda não se anuncia a quem não a vê. */
  legenda: string;
  colunas: ReadonlyArray<Coluna<L>>;
  linhas: readonly L[];
  celula?: (linha: L, coluna: Coluna<L>) => ReactNode;
  /** Mostrado quando não há linhas. Vazio nunca é uma tabela em branco. */
  vazio?: ReactNode;
}

/**
 * Tabela que muda de forma, não de escala.
 *
 * Abaixo de 768 px cada linha passa a cartão e cada célula mostra o seu rótulo à
 * frente do valor (`data-rotulo`, no CSS). É a diferença entre reorganizar a
 * hierarquia e encolher a versão de secretária inteira — que é precisamente o
 * que o CT-13 e o E02 proíbem.
 *
 * O cabeçalho continua no DOM em telemóvel, escondido só visualmente: quem usa
 * leitor de ecrã continua a ouvir a associação célula/coluna.
 */
export function Tabela<L extends { id: string }>({
  legenda,
  colunas,
  linhas,
  celula,
  vazio,
}: TabelaProps<L>) {
  if (linhas.length === 0 && vazio) {
    return <>{vazio}</>;
  }

  return (
    <div className="bo-tabela__envolvente">
      <table className="bo-tabela bo-tabela--adaptavel">
        <caption className="bo-so-leitor">{legenda}</caption>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.chave} scope="col" className={c.numero ? 'bo-tabela__numero' : undefined}>
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.id}>
              {colunas.map((c) => (
                <td
                  key={c.chave}
                  data-rotulo={c.rotulo}
                  className={c.numero ? 'bo-tabela__numero' : undefined}
                >
                  {celula ? celula(linha, c) : String(linha[c.chave] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
