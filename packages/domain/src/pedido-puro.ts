/**
 * Dinheiro e estado de um pedido — funções PURAS.
 *
 * ── Porque é que saíram do pacote da base ─────────────────────────────────
 *
 * Não tocam na base: recebem linhas e devolvem um número ou uma palavra. Viviam
 * em `@bossaos/db` por terem nascido ao lado das consultas que as alimentam.
 *
 * A guarda `rotas-com-porta.test.ts` apanhou a consequência: uma tela pública que
 * só queria somar um total tinha de importar `@bossaos/db`, e a guarda — que lê o
 * import e não o uso — dava-a como a tocar na base. A resposta certa não era
 * alargar a guarda: era pôr as funções onde elas pertencem.
 *
 * O pacote `db` continua a reexportá-las, para o resto do produto não mudar.
 */

/**
 * O estado de produção de um pedido, **derivado** das tarefas.
 *
 * ── Nunca escrito, e a base recusa quem tentar ────────────────────────────
 *
 * *«O estado do pedido deriva das tarefas; nunca se escreve directamente.
 * Guardar o estado em paralelo cria duas verdades, e a que o expo mostra passa a
 * depender de quem escreveu por último.»*
 *
 * ── «Pronto parcial não é pronto» ─────────────────────────────────────────
 *
 * Uma mesa com três pratos em que dois estão prontos é uma mesa que ainda não
 * sai. Mostrar «pronto» ali faz sair comida fria — e a contagem parcial é uma
 * **contagem**, não um estado novo.
 *
 * Devolve `null` quando não há tarefas nenhumas: ausência de produção não é
 * «por iniciar», é não haver o que iniciar.
 */
export function estadoDerivado(
  tarefas: readonly { estado: string }[],
): { estado: 'POR_INICIAR' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE'; prontas: number; total: number } | null {
  // As canceladas não contam para o total: uma linha cancelada não é trabalho
  // por fazer, e deixá-la no denominador fazia um pedido nunca ficar pronto.
  const vivas = tarefas.filter((t) => t.estado !== 'CANCELADA');
  if (vivas.length === 0) return null;

  const prontas = vivas.filter((t) => t.estado === 'PRONTA' || t.estado === 'ENTREGUE').length;
  const entregues = vivas.filter((t) => t.estado === 'ENTREGUE').length;

  if (entregues === vivas.length) {
    return { estado: 'ENTREGUE', prontas, total: vivas.length };
  }
  // TODAS, e é a palavra que carrega o aceite. Com a penúltima pronta, o pedido
  // ainda não está.
  if (prontas === vivas.length) return { estado: 'PRONTO', prontas, total: vivas.length };
  if (vivas.some((t) => t.estado === 'EM_PREPARO' || t.estado === 'PRONTA')) {
    return { estado: 'EM_PREPARO', prontas, total: vivas.length };
  }
  return { estado: 'POR_INICIAR', prontas, total: vivas.length };
}

/**
 * O total de um pedido, somado das linhas ACEITES.
 *
 * ── Não lê o catálogo, e é isso que o torna correcto ──────────────────────
 *
 * A régua reprova «preço lido no momento de fechar a conta». Este total é a soma
 * dos instantâneos: a conta de quem está sentado não muda porque a cozinha
 * actualizou a carta.
 *
 * E devolve `null` quando não há linhas aceites — não zero. Zero é um total; a
 * ausência de linhas não é um total de zero, é a ausência de conta.
 */
export function totalDoPedido(
  linhas: readonly {
    estado: string; precoMenor: number | null; quantidade: number; moeda: string | null;
    linhaPaiId?: string | null;
  }[],
): { montanteMenor: number; moeda: string } | null {
  // ── Um componente de combo NÃO entra na soma ───────────────────────────
  //
  // «Não some o preço do combo e de seus componentes duas vezes» (E14, entregar
  // 7). O componente existe para a cozinha saber o que fazer; o preço é do combo.
  // A base já lhe recusa preço — este filtro é a segunda porta, e as duas falham
  // por motivos diferentes, que é o que faz uma redundância valer alguma coisa.
  const aceites = linhas.filter(
    (l) => l.estado === 'ACEITE' && l.precoMenor !== null && !l.linhaPaiId);
  if (aceites.length === 0) return null;
  const moeda = aceites[0]!.moeda;
  if (!moeda) return null;
  // Moedas diferentes no mesmo pedido não se somam. Se acontecer, é defeito de
  // configuração e devolver um número escondia-o.
  if (aceites.some((l) => l.moeda !== moeda)) return null;
  return {
    montanteMenor: aceites.reduce((t, l) => t + l.precoMenor! * l.quantidade, 0),
    moeda,
  };
}
