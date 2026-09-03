import type { Dinheiro } from './dinheiro.ts';

/**
 * Qual é o preço deste produto, aqui e agora.
 *
 * ── A precedência, e o que fazer com empates ───────────────────────────────
 *
 * O `catalogo-e-publicacao.md` fixa-a antes desta etapa existir:
 *
 * ```
 * 1. regra activa explícita  unidade + canal + período
 * 2. override                unidade + canal
 * 3. override                unidade
 * 4. base da marca
 * ```
 *
 * > **Duas regras de igual prioridade a colidir são erro, não sorteio.**
 *
 * A tentação é ordenar e ficar com a primeira. Isso funciona — até ao dia em que
 * o Postgres devolve as linhas por outra ordem porque o plano de execução mudou,
 * e o preço de um prato muda sozinho sem ninguém ter tocado em nada. Ninguém
 * liga uma alteração de preço a um `ORDER BY` ausente; procura-se durante uma
 * semana no sítio errado.
 *
 * ── E a moeda não se converte ──────────────────────────────────────────────
 *
 * Converter exigiria uma taxa, e uma taxa exige uma data e uma fonte. Nada disso
 * existe aqui, e inventá-lo daria um total que ninguém reproduz amanhã.
 */

/** Da mais específica para a mais geral. O número é a prioridade. */
export const NIVEIS = ['unidade_canal_periodo', 'unidade_canal', 'unidade', 'base'] as const;
export type Nivel = (typeof NIVEIS)[number];

export interface RegraDePreco {
  id: string;
  montanteMenor: number;
  moeda: string;
  /** Ausente = vale para todas as unidades da marca. */
  locationId?: string;
  /** Ausente = vale para todos os canais. */
  canal?: string;
  /** Janela de validade. Ausente dos dois lados = sempre. */
  deQuando?: Date;
  ateQuando?: Date;
}

export interface PedidoDePreco {
  regras: readonly RegraDePreco[];
  locationId: string;
  canal: string;
  /** A moeda da UNIDADE. É contra ela que se compara — não contra a da marca. */
  moedaDaUnidade: string;
  quando?: Date;
}

export type ResultadoDePreco =
  | {
      ok: true;
      preco: Dinheiro;
      nivel: Nivel;
      regraId: string;
      /** `true` quando veio da base da marca. É o "Heredado" do atlas. */
      herdado: boolean;
    }
  | { ok: false; erro: 'conflito'; nivel: Nivel; regras: readonly string[] }
  | { ok: false; erro: 'moeda_incompativel'; esperada: string; encontrada: string; regraId: string }
  | { ok: false; erro: 'sem_preco' };

/** A regra aplica-se a este pedido? Uma que não se aplique não entra em nada. */
function aplicavel(r: RegraDePreco, p: PedidoDePreco, agora: Date): boolean {
  if (r.locationId !== undefined && r.locationId !== p.locationId) return false;
  if (r.canal !== undefined && r.canal !== p.canal) return false;
  // Intervalo semiaberto, como em todo o produto: uma regra que acaba às 16:00 e
  // outra que começa às 16:00 não se sobrepõem.
  if (r.deQuando && agora.getTime() < r.deQuando.getTime()) return false;
  if (r.ateQuando && agora.getTime() >= r.ateQuando.getTime()) return false;
  return true;
}

/**
 * O nível de uma regra, pela forma dela — não pela ordem em que apareceu.
 *
 * Uma regra com unidade, canal e janela é do nível 1 mesmo que a janela seja de
 * um ano. O que a distingue não é ser recente: é ser mais específica.
 */
export function nivelDaRegra(r: RegraDePreco): Nivel {
  const temPeriodo = r.deQuando !== undefined || r.ateQuando !== undefined;
  if (r.locationId !== undefined && r.canal !== undefined && temPeriodo) return 'unidade_canal_periodo';
  if (r.locationId !== undefined && r.canal !== undefined) return 'unidade_canal';
  if (r.locationId !== undefined) return 'unidade';
  return 'base';
}

export function resolverPreco(pedido: PedidoDePreco): ResultadoDePreco {
  const agora = pedido.quando ?? new Date();
  const aplicaveis = pedido.regras.filter((r) => aplicavel(r, pedido, agora));

  for (const nivel of NIVEIS) {
    const desteNivel = aplicaveis.filter((r) => nivelDaRegra(r) === nivel);
    if (desteNivel.length === 0) continue;

    if (desteNivel.length > 1) {
      // **Recusa, não desempate.** Devolver a primeira faria o preço depender da
      // ordem de leitura da base, que é estável até deixar de ser.
      return { ok: false, erro: 'conflito', nivel, regras: desteNivel.map((r) => r.id).sort() };
    }

    const r = desteNivel[0]!;
    if (r.moeda.toUpperCase() !== pedido.moedaDaUnidade.toUpperCase()) {
      return {
        ok: false, erro: 'moeda_incompativel',
        esperada: pedido.moedaDaUnidade.toUpperCase(),
        encontrada: r.moeda.toUpperCase(),
        regraId: r.id,
      };
    }
    return {
      ok: true,
      preco: { montanteMenor: r.montanteMenor, moeda: r.moeda.toUpperCase() },
      nivel,
      regraId: r.id,
      herdado: nivel === 'base',
    };
  }

  // **Sem preço não é preço zero.** Um produto sem regra nenhuma não custa nada
  // grátis: não se sabe quanto custa, e vender por zero é pior do que não vender.
  return { ok: false, erro: 'sem_preco' };
}

/**
 * O preço de cada canal, com a origem visível.
 *
 * É o que o CAT-010 mostra: `Heredado · 8,00 €` contra `Local · 8,00 €` — o
 * mesmo número, origens diferentes. Sem a origem, quem edita não sabe se está a
 * mudar aquele canal ou a herança de todos.
 */
export function precosPorCanal(
  regras: readonly RegraDePreco[],
  canais: readonly string[],
  locationId: string,
  moedaDaUnidade: string,
  quando?: Date,
): ReadonlyMap<string, ResultadoDePreco> {
  return new Map(
    canais.map((canal) => [
      canal,
      resolverPreco({
        regras, locationId, canal, moedaDaUnidade,
        ...(quando ? { quando } : {}),
      }),
    ]),
  );
}

/**
 * As unidades afectadas por mudar a base da marca.
 *
 * *"Editar base de marca deve mostrar as unidades afetadas."* Uma unidade com
 * override próprio **não** é afectada — e é por isso que isto não é a lista de
 * todas as unidades. Mostrar todas seria assustar quem edita com um número que
 * não é verdade.
 */
export function unidadesAfectadasPelaBase(
  regras: readonly RegraDePreco[],
  unidades: readonly string[],
  canais: readonly string[],
): readonly string[] {
  return unidades.filter((u) =>
    // Basta um canal a herdar para a unidade ser afectada.
    canais.some((c) => {
      const especificas = regras.filter(
        (r) => nivelDaRegra(r) !== 'base' && aplicavel(r, {
          regras, locationId: u, canal: c, moedaDaUnidade: 'XXX',
        }, new Date()),
      );
      return especificas.length === 0;
    }),
  );
}
