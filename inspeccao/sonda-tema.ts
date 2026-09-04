import type { Page } from '@playwright/test';

/**
 * A sonda do revisor para o E12: qual é a cor que o NAVEGADOR calcula.
 *
 * Escrita a 04/09, com o E12 a meio e antes de haver o que medir. A régua dessa
 * etapa (`docs/reviews/ALVO-E12.md`) diz que o aceite 1 carrega numa palavra — o
 * tema **efectivamente** aplicado — e que uma tela a mostrar a cor guardada no
 * formulário mostra o que se escreveu, não o que chega ao cliente.
 *
 * Foi assim que o E09 escondeu uma carta pública servida **sem folha de estilos**:
 * as classes existiam, o `tsc` não vê dentro de uma cadeia, e o ficheiro é que não
 * chegava à página. Ler a variável resolvida é a única leitura que atravessa isso.
 */

/**
 * O que o restaurante PODE mudar. Cinco, e nenhum deles é um estado.
 */
export const TOKENS_PUBLICOS = [
  '--bo-publico-acento',
  '--bo-publico-fundo',
  '--bo-publico-primaria',
  '--bo-publico-primaria-texto',
  '--bo-publico-texto',
] as const;

/**
 * O que continua a NÃO ser dele, mesmo no plano de cima.
 *
 * `PRECIFICACAO.md`, vindo do PDF comercial: *«a personalização preserva
 * tipografia, componentes, legibilidade e cores dos estados»*. Um cliente que
 * repinte o vermelho de perigo passa o aceite 1 e quebra a leitura de um ecrã de
 * operação — quem está ao balcão deixa de distinguir um aviso de um erro.
 *
 * O foco entra aqui por ser acessibilidade e não decoração: um anel de foco que o
 * restaurante possa apagar é uma tela que deixa de se navegar por teclado.
 */
export const TOKENS_FIXOS = [
  '--bo-estado-sucesso',
  '--bo-estado-aviso',
  '--bo-estado-perigo',
  '--bo-estado-info',
  '--bo-fonte-titulo',
  '--bo-fonte-corpo',
  '--bo-foco-cor',
] as const;

/**
 * Lê os tokens RESOLVIDOS na raiz do documento, como o navegador os calcula.
 *
 * Não lê o CSS declarado nem o que a API devolve: lê o que fica de pé depois de a
 * folha carregar, a cascata resolver e o tema do inquilino entrar. É a diferença
 * entre «está escrito» e «está aplicado».
 *
 * ── O selector, e porque é que ele passou a existir (E12, 04/09) ──────────
 *
 * A sonda lia sempre `:root`, e a implementação aplica o tema **no elemento da
 * superfície pública** (`.bo-publico`), não na raiz. Não é um pormenor de
 * arrumação: é o que impede o tema de um restaurante de escorrer para os ecrãs de
 * operação, que partilham o mesmo documento em nenhuma rota mas o mesmo CSS em
 * todas.
 *
 * Por isso a leitura passa a dizer ONDE lê, e ler nos dois sítios prova duas
 * coisas diferentes:
 *   `.bo-publico` → os cinco tokens públicos MUDAM com o tema publicado;
 *   `:root`       → e ali continuam nos valores de origem, ou seja o tema está
 *                   contido na superfície onde devia estar.
 *
 * O valor por omissão continua `:root`, para o que já estava escrito não mudar de
 * significado.
 */
export async function tokensAplicados(
  pagina: Page,
  nomes: readonly string[],
  seletor = ':root',
): Promise<Record<string, string>> {
  return pagina.evaluate(([lista, alvo]) => {
    const el = document.querySelector(alvo as string);
    if (!el) throw new Error(`não encontrei ${alvo} na página servida`);
    const estilo = getComputedStyle(el);
    const saida: Record<string, string> = {};
    for (const nome of lista as string[]) saida[nome] = estilo.getPropertyValue(nome).trim();
    return saida;
  }, [[...nomes], seletor] as const);
}

/**
 * Guarda do próprio leitor: se os tokens vierem VAZIOS, a folha não chegou.
 *
 * Sem isto, uma página servida sem estilos devolveria `''` para tudo e a
 * comparação «antes e depois» diria que nada mudou — verde sobre nada, e
 * exactamente o defeito que esta sonda existe para apanhar.
 */
export function exigirTokensLidos(valores: Record<string, string>): void {
  const vazios = Object.entries(valores).filter(([, v]) => v === '').map(([k]) => k);
  if (vazios.length > 0) {
    throw new Error(
      `os tokens vieram vazios (${vazios.join(', ')}) — a folha de estilos não chegou à página, ` +
        'e comparar valores vazios diria que "nada mudou" sobre uma página sem estilo nenhum',
    );
  }
}
