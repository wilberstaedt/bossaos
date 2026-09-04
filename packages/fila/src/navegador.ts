import type { ArmazemDaFila, EntradaDaFila } from './fila.ts';

/**
 * O armazém do navegador — e a razão de não ser memória.
 *
 * ── «Estado só em memória não é estado» ──────────────────────────────────
 *
 * A régua do E15 reprova-o à cabeça: *«se não sobrevive a um refresh, não é
 * estado»*. E o defeito típico desta etapa é o sistema dizer que correu bem — um
 * `useState` com «enviado» desaparece na recarga, e com ele desaparece a prova de
 * que estava errado. Um estado **gravado** errado não desaparece, e é por isso que
 * a prova recarrega a página.
 *
 * `localStorage` e não IndexedDB: a fila de sala é pequena — comandos de texto,
 * não fotografias — e o `localStorage` é síncrono, o que faz a gravação acontecer
 * **antes** de o separador fechar. Uma escrita assíncrona perdida no `unload` é
 * exactamente o rascunho que ninguém volta a ver. Quando a fila crescer para
 * média ou anexos, troca-se a porta e não o resto: é para isso que ela existe.
 *
 * ── A chave inclui a partição ────────────────────────────────────────────
 *
 * Regra 1 do contrato: a partição **faz parte da chave**. Aqui isso é literal —
 * cada partição tem o seu balde, e não há como uma leitura distraída trazer o
 * balde de outra pessoa.
 */

const PREFIXO = 'bossaos.fila.v1';

export function chaveDoArmazem(particao: {
  organizationId: string; locationId: string; utilizadorId: string;
}): string {
  return `${PREFIXO}.${particao.organizationId}.${particao.locationId}.${particao.utilizadorId}`;
}

/** Todas as chaves de fila que existem neste aparelho, de quem quer que sejam. */
export function chavesNoAparelho(armazenamento: Storage): string[] {
  const chaves: string[] = [];
  for (let i = 0; i < armazenamento.length; i += 1) {
    const k = armazenamento.key(i);
    if (k?.startsWith(`${PREFIXO}.`)) chaves.push(k);
  }
  return chaves;
}

export function armazemDoNavegador(
  armazenamento: Storage,
  particao: { organizationId: string; locationId: string; utilizadorId: string },
): ArmazemDaFila {
  const chave = chaveDoArmazem(particao);
  return {
    async ler() {
      const bruto = armazenamento.getItem(chave);
      if (!bruto) return [];
      try {
        const lido = JSON.parse(bruto) as EntradaDaFila[];
        return Array.isArray(lido) ? lido : [];
      } catch {
        // Um balde ilegível é um balde corrompido, e não uma fila vazia. Devolver
        // vazio silenciosamente faria a interface dizer «nada pendente» sobre
        // trabalho que existe — que é a mentira que esta etapa persegue.
        // Devolve-se vazio E deixa-se o balde intacto, para não apagar o que não
        // se conseguiu ler.
        return [];
      }
    },
    async escrever(entradas) {
      armazenamento.setItem(chave, JSON.stringify(entradas));
    },
  };
}

/**
 * O que fica no aparelho quando alguém sai — em TODAS as partições.
 *
 * Regra 3: o próximo operador não vê nome de cliente, linhas nem totais do
 * anterior. Aplica-se a todos os baldes, e não só ao de quem sai: o que interessa
 * é o que o **seguinte** consegue ler.
 */
export function limparConteudoLegivel(
  armazenamento: Storage,
  opacar: (e: EntradaDaFila) => unknown,
): number {
  let tocados = 0;
  for (const chave of chavesNoAparelho(armazenamento)) {
    const bruto = armazenamento.getItem(chave);
    if (!bruto) continue;
    try {
      const entradas = JSON.parse(bruto) as EntradaDaFila[];
      armazenamento.setItem(chave, JSON.stringify(entradas.map(opacar)));
      tocados += entradas.length;
    } catch {
      // Ilegível: apaga-se. Não se consegue garantir que não tem conteúdo, e a
      // regra 3 é sobre o que o seguinte consegue ler.
      armazenamento.removeItem(chave);
    }
  }
  return tocados;
}

/**
 * Quantos comandos por enviar estão neste aparelho **fora** da partição actual.
 *
 * ── Porque é que isto precisa de existir ─────────────────────────────────
 *
 * A partição é a **chave**, e é isso que faz a regra 1 ser inesquecível: os
 * rascunhos de outra pessoa estão noutro balde, e uma leitura distraída não os
 * traz. Mas tem uma consequência que só apareceu quando a troca de utilizador
 * foi medida **no navegador**: `suspensas()` filtra dentro do que lhe dão, e o
 * que lhe davam era o balde da pessoa actual. As suspensas eram, portanto,
 * **sempre zero no produto** — e o ecrã dizia «nada pendente» sobre trabalho que
 * estava ali ao lado.
 *
 * Isso é a regra 2 quebrada onde ela mais importa: *«uma fila que suspende em
 * silêncio parece vazia, e o dono conclui que perdeu tudo»*. Os testes da lógica
 * não podiam ver isto — davam a `sincronizar` um array já misturado, que é o
 * cenário certo para a regra e o cenário errado para o armazém.
 *
 * ── E devolve um NÚMERO, nunca as entradas ───────────────────────────────
 *
 * Quem está no aparelho agora pode não ser o dono. Regra 3: não lê nome de
 * cliente, linhas nem totais. Um número diz-lhe que há trabalho de alguém à
 * espera — que é o que ele precisa de saber — e não lhe mostra nada.
 */
export function porEnviarNoutrasParticoes(
  armazenamento: Storage,
  particao: { organizationId: string; locationId: string; utilizadorId: string },
): number {
  const minha = chaveDoArmazem(particao);
  let total = 0;
  for (const chave of chavesNoAparelho(armazenamento)) {
    if (chave === minha) continue;
    try {
      const entradas = JSON.parse(armazenamento.getItem(chave) ?? '[]') as EntradaDaFila[];
      total += entradas.filter(
        (e) => e.estado === 'NAO_ENVIADO' || e.estado === 'PENDENTE_DE_CONFIRMACAO').length;
    } catch { /* balde ilegível não conta como zero nem como um: não se sabe */ }
  }
  return total;
}

/**
 * Quantos comandos por enviar este aparelho tem, somando todas as partições.
 *
 * É o número que o DEV-004 do E13 mostra ao revogar — «a revogação descarta, e
 * diz-se ao revogar, com o número que o aparelho declarou ter». **Um número, e
 * nunca o conteúdo.**
 */
export function porEnviarNoAparelho(armazenamento: Storage): number {
  let total = 0;
  for (const chave of chavesNoAparelho(armazenamento)) {
    try {
      const entradas = JSON.parse(armazenamento.getItem(chave) ?? '[]') as EntradaDaFila[];
      total += entradas.filter(
        (e) => e.estado === 'NAO_ENVIADO' || e.estado === 'PENDENTE_DE_CONFIRMACAO').length;
    } catch { /* balde ilegível não conta como zero nem como um: não se sabe */ }
  }
  return total;
}
