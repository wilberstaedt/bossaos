import fonte from '../../../docs/bossaos/PRECIFICACAO.json' with { type: 'json' };

/**
 * Os preços, lidos da fonte e não copiados dela.
 *
 * ── Porque é que este ficheiro importa um JSON de fora do pacote ───────────
 *
 * `scripts/validar-precos.sh` diz o essencial: *«o preço tem UMA fonte»*, e a
 * razão é que a `validar-dinheiro.sh` não distingue um inteiro certo de um
 * inteiro errado. 1583 e 1900 são ambos inteiros e só um deles é o preço.
 *
 * A alternativa era copiar a tabela para dentro do pacote e escrever uma guarda
 * que comparasse as duas cópias. Uma guarda a vigiar uma duplicação que eu
 * próprio criei é pior do que não duplicar: o `import` faz o compilador ser a
 * guarda, e uma cópia que ninguém pode dessincronizar não precisa de vigilante.
 *
 * ── A armadilha que nenhuma guarda apanha, escrita onde se lê ─────────────
 *
 * **O ano custa DEZ mensalidades.** O equivalente mensal (`equivalenteMensal`) é
 * APRESENTAÇÃO: serve para escrever "€65,83/mês" ao lado do plano anual. Cobrar
 * doze vezes esse equivalente arredondado dá um número **errado** — e como os
 * dois são inteiros de cêntimos, nada no sistema de tipos o vê.
 *
 * Por isso o equivalente é `readonly` e sai daqui já arredondado, com o nome a
 * dizer o que é. Quem quiser cobrar um ano usa `anual`, que é o valor integral.
 */

export type CodigoDePlano = 'STARTER' | 'RESTAURANT' | 'PRO';

export interface PrecoDePlano {
  /** Cêntimos, por estabelecimento físico e por mês. Acrescido de IVA. */
  mensal: number;
  /** Cêntimos, por estabelecimento físico e por ano. **Dez** mensalidades. */
  anual: number;
  /**
   * Cêntimos por mês **para apresentar** ao lado do preço anual. Arredondado.
   * NÃO é um valor de cobrança: multiplicá-lo por doze não dá `anual`.
   */
  equivalenteMensal: number;
  /** Cêntimos. `null` significa **por definir**, nunca "grátis". */
  implantacaoSozinho: number | null;
  /** Cêntimos. `null` significa **por definir**, nunca "grátis". */
  implantacaoAssistida: number | null;
}

/**
 * A moeda em que a tabela comercial está escrita.
 *
 * Sai da fonte e não de uma constante `'EUR'` numa tela: o dia em que houver
 * preço noutra moeda, quem esquecer um ecrã fica com um número certo e um
 * símbolo errado — que é pior do que não ter número nenhum.
 */
export const MOEDA_COMERCIAL: string = fonte.moeda;

/** Quantas mensalidades custa um ano. Está na fonte; não se assume doze. */
export const MENSALIDADES_NUM_ANO: number = fonte.anual.mensalidades_cobradas;

/** O IVA está incluído nos valores? A fonte diz que não, e isso vai para o ecrã. */
export const IMPOSTOS_INCLUIDOS: boolean = fonte.impostos.incluidos;

/**
 * O preço de um plano, ou `null` se a fonte não o tiver.
 *
 * `null` e não um valor por omissão: *«um campo sem valor não vira gratuito,
 * ilimitado nem integração activa»*. Um plano que a fonte não conheça é um plano
 * **a orçar**, e o ecrã tem de o dizer com essas palavras.
 */
export function precoDoPlano(codigo: string): PrecoDePlano | null {
  const p = (fonte.planos as Record<string, {
    mensal: number; anual: number;
    implantacao_sozinho: number | null; implantacao_assistida: number | null;
  } | undefined>)[codigo];
  if (!p) return null;
  return {
    mensal: p.mensal,
    anual: p.anual,
    // Doze, e não `MENSALIDADES_NUM_ANO`: o equivalente responde a "quanto me
    // fica por mês se pagar o ano", e um ano tem doze meses mesmo quando custa
    // dez mensalidades. Trocar o doze pelo dez daria de volta a mensalidade e
    // fazia o desconto desaparecer do ecrã.
    equivalenteMensal: Math.round(p.anual / 12),
    implantacaoSozinho: p.implantacao_sozinho,
    implantacaoAssistida: p.implantacao_assistida,
  };
}

/**
 * As cores públicas que cada plano permite, **segundo a fonte comercial**.
 *
 * Existe para o ecrã não repetir a regra por palavras suas. O motor de direitos
 * continua a ser `podeCapacidade` — esta função descreve o que foi vendido, não
 * o que o servidor autoriza, e as duas coisas têm de bater uma na outra.
 */
export function coresPublicasDoPlano(codigo: string): 'fixas_bossaos' | 'personalizaveis' | null {
  const v = (fonte.cores_publicas as Record<string, string | undefined>)[codigo];
  if (v === 'fixas_bossaos' || v === 'personalizaveis') return v;
  return null;
}

/**
 * O ano custa `MENSALIDADES_NUM_ANO` mensalidades — verificado, não assumido.
 *
 * Devolve os planos onde a fonte NÃO cumpre a regra. Vazio é o estado normal.
 * Existe porque a regra vive no texto (`PRECIFICACAO.md`) e os números vivem no
 * JSON: sem isto, alguém corrige um preço mensal, esquece o anual, e a página
 * comercial passa a anunciar um desconto que não existe.
 */
export function planosComAnualIncoerente(): string[] {
  return Object.entries(fonte.planos as Record<string, { mensal: number; anual: number }>)
    .filter(([, p]) => p.anual !== p.mensal * MENSALIDADES_NUM_ANO)
    .map(([codigo]) => codigo);
}
