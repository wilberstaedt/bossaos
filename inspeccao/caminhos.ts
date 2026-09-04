/**
 * Constantes do arnês, sem efeitos.
 *
 * ── Porque é que isto não vive no `autenticar.setup.ts` ───────────────────
 *
 * Vivia, e o Playwright recusou-se a arrancar: *"did not expect test() to be
 * called here"*. O `playwright.config.ts` importava o ficheiro do setup só para
 * ler o caminho da sessão, e importar um ficheiro de teste a partir da
 * configuração corre as chamadas a `test()` no sítio errado.
 *
 * É o mesmo defeito que o `publico.spec.ts` teve com a semeadura — importar um
 * nome de um módulo com efeitos corre os efeitos —, e é a segunda vez no mesmo
 * dia. A regra que fica: **constantes vivem em módulos sem efeitos**, e quem as
 * quiser não paga por isso.
 */

/**
 * Onde fica a sessão que o `preparar` guarda e o projecto `painel` carrega.
 *
 * ── FORA do `outputDir`, e isto foi uma corrida a sério ───────────────────
 *
 * Estava em `inspeccao/.resultados/`, que é o `outputDir` do Playwright — e o
 * Playwright **limpa o `outputDir` quando cada projecto arranca**. O `preparar`
 * escrevia lá o ficheiro e o `painel`, ao arrancar, apagava-o: 79 falhas com
 * `ENOENT` em telas que tinham passado dez minutos antes.
 *
 * O que torna isto perigoso não é a falha — é que a corrida também podia dar
 * verde. Um resultado que muda sem ninguém tocar em nada não é uma medição, e
 * essa regra vale nos dois sentidos.
 */
export const FICHEIRO_DE_SESSAO = 'inspeccao/.sessao/estado.json';

/** O email da conta do arnês. Do domínio da inspecção, para a limpeza o apanhar. */
export const EMAIL_DO_ARNES = 'painel@inspeccao.example';

/**
 * A SEGUNDA sessão, no outro inquilino — e é ela que torna a prova uma prova.
 *
 * A revisão do marco E11 reprovou o aceite do isolamento com uma frase exacta:
 * *«a prova de RLS mostra que a base recusa; falta mostrar que o produto
 * recusa»*. Mostrar a recusa exige duas contas, não uma: com uma só, «o produto
 * recusou» e «o produto recusa tudo» são indistinguíveis.
 *
 * Esta conta vive na organização B e serve **o par**: o mesmo recurso, pedido
 * pelo dono, tem de aparecer.
 */
export const EMAIL_DO_ARNES_B = 'painel-b@inspeccao.example';
export const FICHEIRO_DE_SESSAO_B = 'inspeccao/.sessao/estado-b.json';

/**
 * A TERCEIRA conta — e é a única que mede a partição por UTILIZADOR.
 *
 * A conta B vive noutra organização, e por isso a troca A→B mede a partição por
 * **organização**: uma implementação que particionasse só por inquilino passava
 * o caso e continuava a mandar os rascunhos de A com a sessão de B na mesma
 * unidade. Que é o cenário que decide o desenho inteiro do contrato — o tablet
 * partilhado entre o turno da tarde e o da noite.
 *
 * Esta vive **na mesma organização e na mesma unidade** que A. É outra pessoa, e
 * mais nada muda. Sem ela, «trocar de utilizador» não tinha como ser medido no
 * produto.
 */
export const EMAIL_DO_ARNES_C = 'painel-c@inspeccao.example';
export const FICHEIRO_DE_SESSAO_C = 'inspeccao/.sessao/estado-c.json';
