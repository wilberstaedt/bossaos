/**
 * Alérgenos: o que se sabe, e o que não se sabe.
 *
 * ── A regra que este ficheiro existe para tornar impossível de esquecer ─────
 *
 * > **Ausência de dados sobre alérgenos não significa ausência de alérgenos.**
 * > *Não gerar declarações a partir de nomes ou fotos.*
 *
 * Um campo vazio é **desconhecido**, nunca "não contém". A diferença entre as
 * duas é alguém no hospital, e é por isso que esta é a regra do produto inteiro
 * onde o erro tem consequência física.
 *
 * E a tentação que o contrato proíbe pelo nome é a que qualquer sistema moderno
 * teria: **inferir**. "Leva `queijo` no nome, logo contém lactose." Uma tarte de
 * amêndoa pode não levar amêndoa — leva o nome de uma receita, não a receita.
 * Uma salada verde pode levar mostarda no molho. Nada aqui olha para o nome.
 *
 * ── Segurança e preferência não são a mesma coisa ──────────────────────────
 *
 * "Contém amendoim" é uma declaração de **segurança**: quem a lê pode morrer se
 * ela estiver errada. "Vegetariano" é uma **preferência**: quem a lê fica
 * aborrecido se ela estiver errada. Vivem em tipos separados de propósito —
 * misturá-las num campo é o defeito que transforma uma preferência num risco,
 * porque a partir daí ninguém sabe qual das duas está a ler.
 */

/**
 * O estado de um alérgeno num produto.
 *
 * `DESCONHECIDO` não está aqui, e isso é deliberado: **é a ausência de
 * declaração**, não um valor que alguém escolhe. Um sistema onde "desconhecido"
 * fosse um estado guardável teria duas maneiras de o representar — a linha
 * ausente e a linha com `DESCONHECIDO` — e duas maneiras de representar a mesma
 * coisa é uma maneira de as ler diferente.
 */
export type EstadoDeclarado = 'CONTEM' | 'PODE_CONTER' | 'NAO_CONTEM';

export type EstadoDeAlergenio = EstadoDeclarado | 'DESCONHECIDO';

export interface Declaracao {
  alergenio: string;
  estado: EstadoDeclarado;
  /** Quem assinou. Uma declaração sem responsável não é uma declaração. */
  revistoPor?: string;
  revistoEm?: Date;
}

/**
 * Os catorze do anexo II do Regulamento (UE) 1169/2011.
 *
 * **Não é uma lista inventada nem "os que pareciam importantes"**: é a lista
 * legal da jurisdição onde o piloto opera. Está aqui como constante do domínio
 * porque o conjunto é fechado por lei, e não por nós.
 *
 * Outras jurisdições têm outras listas — a australiana inclui o gergelim desde
 * 2024 e trata os sulfitos por limiar; a brasileira segue a RDC 26/2015. Ficam
 * declaradas como pendência e entram com os mercados, com o marcador de região.
 * O que **não** se faz é assumir que a lista europeia serve em todo o lado.
 */
export const ALERGENIOS_UE = [
  'gluten', 'crustaceos', 'ovos', 'peixe', 'amendoins', 'soja', 'leite',
  'frutos-de-casca', 'aipo', 'mostarda', 'sesamo', 'sulfitos', 'tremoco', 'moluscos',
] as const;

export type AlergenioUE = (typeof ALERGENIOS_UE)[number];

/**
 * Preferências alimentares. **Não são declarações de segurança.**
 *
 * Um produto marcado `vegetariano` continua a ter de declarar leite e ovos: a
 * etiqueta diz o que a receita pretende ser, não o que a cozinha garante. É por
 * isso que este tipo não partilha nada com `EstadoDeAlergenio` — nem sequer o
 * vocabulário.
 */
export const PREFERENCIAS = ['vegetariano', 'vegano', 'sem-gluten-por-receita', 'halal', 'kosher'] as const;
export type Preferencia = (typeof PREFERENCIAS)[number];

/**
 * O estado de um alérgeno neste produto.
 *
 * **Só olha para as declarações.** Não recebe o nome do produto, nem a
 * descrição, nem as fotos — não por disciplina de quem chama, mas porque a
 * assinatura não os aceita. A inferência não é proibida aqui: é impossível.
 */
export function estadoDoAlergenio(
  declaracoes: readonly Declaracao[],
  alergenio: string,
): EstadoDeAlergenio {
  const d = declaracoes.find((x) => x.alergenio === alergenio);
  // Sem linha, desconhecido. É a única forma de "ninguém disse" — e é diferente
  // de `NAO_CONTEM`, que é alguém a dizer que não leva.
  return d ? d.estado : 'DESCONHECIDO';
}

export interface LinhaDeAlergenio {
  alergenio: string;
  estado: EstadoDeAlergenio;
  revistoPor?: string;
  revistoEm?: Date;
}

/**
 * A ficha completa: todos os alérgenos da lista, com o que se sabe de cada um.
 *
 * Devolve **os catorze**, não só os declarados. Um ecrã que só mostrasse as
 * linhas existentes deixaria os desconhecidos invisíveis — e invisível, para
 * quem lê uma carta, é indistinguível de "não leva".
 */
export function fichaDeAlergenios(
  declaracoes: readonly Declaracao[],
  lista: readonly string[] = ALERGENIOS_UE,
): readonly LinhaDeAlergenio[] {
  return lista.map((a) => {
    const d = declaracoes.find((x) => x.alergenio === a);
    return {
      alergenio: a,
      estado: d ? d.estado : 'DESCONHECIDO',
      ...(d?.revistoPor ? { revistoPor: d.revistoPor } : {}),
      ...(d?.revistoEm ? { revistoEm: d.revistoEm } : {}),
    };
  });
}

/**
 * Quantos alérgenos continuam por declarar.
 *
 * É o número que a lista de arranque e o resumo do catálogo mostram — e mostra-se
 * porque um produto com catorze desconhecidos e um com zero são coisas muito
 * diferentes, e a carta não os distingue sozinha.
 */
export function porDeclarar(
  declaracoes: readonly Declaracao[],
  lista: readonly string[] = ALERGENIOS_UE,
): number {
  return lista.filter((a) => !declaracoes.some((d) => d.alergenio === a)).length;
}

/**
 * A ficha está revista?
 *
 * *"A revisão exige responsável e data, e o ecrã diz quando foi a última."*
 * Uma ficha onde falta uma declaração **não está revista**, mesmo que todas as
 * que existem tenham assinatura: rever é dizer alguma coisa sobre os catorze.
 */
export function revisaoDaFicha(
  declaracoes: readonly Declaracao[],
  lista: readonly string[] = ALERGENIOS_UE,
): { completa: boolean; ultimaRevisao: Date | null; semResponsavel: number } {
  const semResponsavel = declaracoes.filter((d) => !d.revistoPor).length;
  const datas = declaracoes.map((d) => d.revistoEm).filter((d): d is Date => d instanceof Date);
  return {
    completa: porDeclarar(declaracoes, lista) === 0 && semResponsavel === 0,
    // A mais ANTIGA, não a mais recente: a ficha vale o que vale a declaração
    // menos revista. Mostrar a mais recente daria a uma ficha com treze
    // declarações de 2019 e uma de hoje o ar de estar revista hoje.
    ultimaRevisao: datas.length > 0
      ? new Date(Math.min(...datas.map((d) => d.getTime())))
      : null,
    semResponsavel,
  };
}

/**
 * O peso visual de um aviso. `neutro` é o que ninguém declarou — e o que nunca
 * pode partilhar a aparência de `sucesso`.
 */
export type TomDeAviso = 'perigo' | 'aviso' | 'sucesso' | 'neutro';

/**
 * O que se mostra a quem lê a carta.
 *
 * `desconhecido` **não desaparece** e **não vira "não contém"**. O texto é da
 * interface; o que este módulo garante é que o estado que chega lá é o certo.
 */
export function avisoDeSeguranca(ficha: readonly LinhaDeAlergenio[]): {
  contem: readonly string[];
  podeConter: readonly string[];
  naoContem: readonly string[];
  desconhecidos: readonly string[];
} {
  const de = (e: EstadoDeAlergenio) => ficha.filter((l) => l.estado === e).map((l) => l.alergenio);
  return {
    contem: de('CONTEM'),
    podeConter: de('PODE_CONTER'),
    naoContem: de('NAO_CONTEM'),
    desconhecidos: de('DESCONHECIDO'),
  };
}

/**
 * O aviso de cada alérgeno, **linha a linha**, para quem desenha a carta.
 *
 * ── Porque é que isto existe, e é derivado ────────────────────────────────
 *
 * O `avisoDeSeguranca` devolve quatro listas, e um ecrã que mostra os catorze
 * pela ordem fixa não consegue usá-las sem as reagrupar. Foi por isso que a
 * tela pública do produto acabou a repetir a regra num encadeado de ternários
 * — e, com a cópia, a guarda desta regra passou a vigiar o lado que **não
 * corre**: plantar o defeito aqui não mexia uma vírgula no que a pessoa lê.
 *
 * Esta função não é uma segunda regra: é a PRIMEIRA, vista de outro ângulo.
 * É calculada **a partir** do `avisoDeSeguranca`, e por isso um defeito lá
 * chega cá — e daqui ao ecrã. Uma regra, um sítio, um caminho.
 *
 * ── O tom faz parte da regra, não da decoração ────────────────────────────
 *
 * `DESCONHECIDO` tem de sair `neutro` e nunca `sucesso`. Se o tom vivesse no
 * ecrã, esta linha — a que separa "ninguém declarou" de "não contém" — ficava
 * fora do alcance da guarda outra vez, que é exactamente o defeito que isto
 * corrige. O que o ecrã escolhe é a cor do `neutro`; o que **não** escolhe é
 * qual dos catorze é neutro.
 */
export function avisosPorAlergenio(
  ficha: readonly LinhaDeAlergenio[],
): readonly { alergenio: string; estado: EstadoDeAlergenio; tom: TomDeAviso }[] {
  const aviso = avisoDeSeguranca(ficha);
  const tomDe = (alergenio: string): TomDeAviso =>
    aviso.contem.includes(alergenio) ? 'perigo'
      : aviso.podeConter.includes(alergenio) ? 'aviso'
      : aviso.naoContem.includes(alergenio) ? 'sucesso'
      : 'neutro';
  return ficha.map((l) => ({ alergenio: l.alergenio, estado: l.estado, tom: tomDe(l.alergenio) }));
}
