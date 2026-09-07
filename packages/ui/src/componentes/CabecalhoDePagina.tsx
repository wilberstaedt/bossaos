/**
 * A sobrancelha e o título de uma página — um componente, não quatro.
 *
 * ── Este componente já existia. Existia TRÊS vezes ────────────────────────
 *
 * `CabecalhoDoKds`, `CabecalhoDaVisita` e `CabecalhoDoKiosk` eram **byte a byte
 * a mesma coisa** — as mesmas três propriedades, a mesma marcação, as mesmas
 * duas classes. Medido a 07/09 com um `diff` depois de tirar o nome: **uma
 * forma, três cópias**, em 36 ecrãs.
 *
 * Não é um caso de «podia haver um componente partilhado». É o defeito já
 * consumado: **três sítios para uma decisão**. Mudar o cabeçalho de página
 * obrigava a acertar três ficheiros ou a esquecer um — e o que se esquece não
 * dá erro, dá uma superfície que envelhece sozinha enquanto as outras andam.
 *
 * O `CabecalhoDoStaff` fica com nome próprio porque faz mais: é este mais a
 * navegação. Compõe, não copia.
 *
 * ── O `data-tela` não é decoração ─────────────────────────────────────────
 *
 * É o identificador do atlas no DOM, e a inspecção afirma-o em cada visita com
 * `h1[data-tela="…"]`. Vive no `h1` e não no contentor de propósito: no E15 a
 * navegação escrevia o id de cada secção em todas as páginas, o selector ficava
 * sempre satisfeito, e a asserção «cheguei a esta tela» não conseguia falhar.
 * Uma ligação para uma página não é a página.
 */
export interface CabecalhoDePaginaProps {
  /** O contexto acima do título: a unidade, a estação, o que situa. */
  sobrancelha: string;
  titulo: string;
  /** O ID do atlas. É o que a inspecção usa para provar que chegou aqui. */
  tela: string;
}

export function CabecalhoDePagina({ sobrancelha, titulo, tela }: CabecalhoDePaginaProps) {
  return (
    <div className="bo-estado__cabecalho">
      <div>
        <p className="bo-estado__sobrancelha">{sobrancelha}</p>
        <h1 data-tela={tela}>{titulo}</h1>
      </div>
    </div>
  );
}
