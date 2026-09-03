import type { Capacidade } from './capacidades.ts';

/**
 * A lista de arranque (ONB-010), adaptada ao plano.
 *
 * O aceite 3 do E06: *"Onboarding Starter pode chegar ao passo de catálogo sem
 * exigir etapas Restaurant/Pro."* Uma lista fixa de seis itens com dois deles
 * impossíveis num Starter é uma lista que nunca fica verde — e uma lista que
 * nunca fica verde ensina a ignorá-la.
 *
 * ── Três estados por item, e é a mesma regra de sempre ──────────────────────
 *
 * `feito` · `pendente` · **`por_medir`**. O terceiro existe porque metade do que
 * o atlas desenha nesta tela — carta revista, QR lido em dois aparelhos, pedido
 * de prova — depende de módulos que ainda não existem. Pôr-lhes um visto seria
 * mentir; pôr-lhes uma cruz seria dizer que faltam quando ninguém os pode fazer.
 *
 * `nao_aplicavel` é o quarto, e é o que o aceite 3 pede: no Starter, o pedido de
 * prova não está pendente. **Não conta.**
 */
export type EstadoDoItem = 'feito' | 'pendente' | 'por_medir' | 'nao_aplicavel';

export interface ItemDeArranque {
  chave: string;
  estado: EstadoDoItem;
  /** Só quando é `por_medir`: porque é que ainda não se pode medir. */
  razao?: string;
}

/**
 * Os factos, MEDIDOS. Nenhum é uma estimativa.
 *
 * Os que ainda não se podem medir não estão aqui — entram como `por_medir` com
 * a razão escrita, em vez de virem a `false` e parecerem pendentes.
 */
export interface FactosDoArranque {
  perfilCompleto: boolean;
  temMarca: boolean;
  temUnidade: boolean;
  unidadeConfigurada: boolean;
  diasDeHorario: number;
  pessoasActivas: number;
}

interface Definicao {
  chave: string;
  /** Sem isto, aplica-se a todos os planos. */
  exigeCapacidade?: Capacidade;
  /** O que ainda não se pode medir, e porquê. */
  porMedir?: string;
  mede?: (f: FactosDoArranque) => boolean;
}

const ITENS: readonly Definicao[] = [
  { chave: 'organizacao', mede: (f) => f.perfilCompleto },
  { chave: 'marca', mede: (f) => f.temMarca },
  { chave: 'unidade', mede: (f) => f.temUnidade && f.unidadeConfigurada },
  { chave: 'horarios', mede: (f) => f.diasDeHorario > 0 },
  { chave: 'equipa', mede: (f) => f.pessoasActivas > 1 },
  // ── Daqui para baixo, o que o atlas desenha e ainda não existe ────────────
  { chave: 'carta', porMedir: 'catalogo' },
  { chave: 'qr', porMedir: 'catalogo' },
  // O item que o aceite 3 nomeia: **no Starter não se aplica**, não fica
  // pendente. Um Starter que precisasse de um pedido de prova para publicar a
  // carta era um Starter que nunca publicava.
  { chave: 'pedidoDeProva', exigeCapacidade: 'sala', porMedir: 'sala' },
  { chave: 'alternativaOperativa', porMedir: 'operacao' },
  { chave: 'publicacao', porMedir: 'publicacao' },
];

export function listaDeArranque(
  factos: FactosDoArranque,
  capacidades: ReadonlySet<string>,
): readonly ItemDeArranque[] {
  return ITENS.map((d): ItemDeArranque => {
    if (d.exigeCapacidade && !capacidades.has(d.exigeCapacidade)) {
      return { chave: d.chave, estado: 'nao_aplicavel' };
    }
    if (d.porMedir) return { chave: d.chave, estado: 'por_medir', razao: d.porMedir };
    return { chave: d.chave, estado: d.mede!(factos) ? 'feito' : 'pendente' };
  });
}

/**
 * O que falta de facto — e só conta o que é mensurável e aplicável.
 *
 * Um item `por_medir` **não** conta como pendente: ninguém o pode fazer hoje.
 * Contá-lo transformava a lista num bloqueio permanente, que é exactamente o
 * que o aceite 3 proíbe.
 */
export function pendentesDoArranque(itens: readonly ItemDeArranque[]): readonly string[] {
  return itens.filter((i) => i.estado === 'pendente').map((i) => i.chave);
}

/** Pode avançar para o passo do catálogo? É a pergunta do aceite 3. */
export function podeSeguirParaCatalogo(itens: readonly ItemDeArranque[]): boolean {
  return pendentesDoArranque(itens).length === 0;
}
