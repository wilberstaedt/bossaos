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

/** Onde fica a sessão que o `preparar` guarda e o projecto `painel` carrega. */
export const FICHEIRO_DE_SESSAO = 'inspeccao/.resultados/sessao.json';

/** O email da conta do arnês. Do domínio da inspecção, para a limpeza o apanhar. */
export const EMAIL_DO_ARNES = 'painel@inspeccao.example';
