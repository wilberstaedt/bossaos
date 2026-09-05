/**
 * Agregação — as contas PURAS do E30.
 *
 * ── Porque é que isto vive no domínio e não no pacote da base ─────────────
 *
 * Nenhuma destas funções faz uma consulta. Estavam em `@bossaos/db` só porque
 * foi lá que nasceram, e a consequência apareceu quando duas telas precisaram
 * de formatar uma média: importar `@bossaos/db` fez a guarda das rotas
 * acusá-las de tocar na base sem passar pela porta.
 *
 * É o mesmo movimento que o E28 fez com o `diaDeServicoDe`. A guarda está
 * certa das duas vezes: a cura não é abrir-lhe excepção, é a função pura
 * deixar de viver no sítio onde tocar na base é o normal.
 */
/**
 * ── AUSÊNCIA NÃO É ZERO ───────────────────────────────────────────────────
 *
 * Há três respostas, não duas: um valor, **zero medido**, e **não há dados**.
 * As duas últimas escrevem-se iguais no ecrã se ninguém as separar, e
 * significam o contrário uma da outra:
 *
 * `0 €` ao almoço quer dizer *a casa abriu e não vendeu*. Sem dados ao almoço
 * quer dizer *ninguém sabe*. Quem lê o primeiro fecha o turno de almoço; se o
 * que lá estava era o segundo, fechou-o por engano.
 *
 * Por isso nenhum agregado deste ficheiro devolve um número: devolve isto, e
 * quem o mostra tem de decidir o que escrever nos dois casos.
 */
export type Medido<T> =
  | { medido: true; valor: T }
  | { medido: false };

export const SEM_DADOS = { medido: false } as const;
export function medido<T>(valor: T): Medido<T> {
  return { medido: true, valor };
}

/**
 * Um agregado carrega o NUMERADOR e o DENOMINADOR, e nunca só a média.
 *
 * Uma média de médias está errada sempre que os denominadores diferem — e
 * diferem quase sempre. Duas unidades com ticket médio de 20 € não dão 20 €
 * juntas se uma vendeu 10 mesas e a outra 200.
 */
export interface Agregado {
  moeda: string;
  /** O numerador: a soma, em unidade menor. */
  somaMenor: bigint;
  /** O denominador: quantas linhas a formaram. */
  contagem: number;
}

/**
 * A média calcula-se NO FIM, sobre as somas e as contagens juntas.
 *
 * Não há aqui nenhuma função `mediaDeMedias` — não porque seja difícil, mas
 * porque existir era convidar alguém a chamá-la.
 */
export function mediaPonderada(partes: Agregado[]): Medido<Agregado> {
  const porMoeda = new Map<string, Agregado>();
  for (const p of partes) {
    // Moedas não se somam: agrupa-se. É a lei do E29, e vale aqui igual.
    const actual = porMoeda.get(p.moeda)
      ?? { moeda: p.moeda, somaMenor: 0n, contagem: 0 };
    porMoeda.set(p.moeda, {
      moeda: p.moeda,
      somaMenor: actual.somaMenor + p.somaMenor,
      contagem: actual.contagem + p.contagem,
    });
  }
  const vivos = [...porMoeda.values()].filter((a) => a.contagem > 0);
  // Sem linhas nenhumas não há média: há ausência. Devolver `0` aqui era
  // dizer «vendeu zero» a quem não mediu nada.
  if (vivos.length === 0) return SEM_DADOS;
  if (vivos.length > 1) {
    // Mais de uma moeda: a média de um total misturado não existe. Devolve-se
    // a maior por contagem e quem mostra tem de agrupar — nunca se soma.
    vivos.sort((a, b) => b.contagem - a.contagem);
  }
  return medido(vivos[0]!);
}

/** O valor médio por linha, em unidade menor. Inteiro, com o resto truncado. */
export function porLinhaMenor(a: Agregado): bigint {
  return a.contagem === 0 ? 0n : a.somaMenor / BigInt(a.contagem);
}
