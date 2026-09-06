/**
 * As regras da impressão, onde o produto deixa de poder verificar o que afirma.
 *
 * ── A frase que decide o módulo ────────────────────────────────────────────
 *
 * > **«Entregue à ponte» não é «imprimiu».**
 *
 * O papel pode ter acabado, a tampa pode estar aberta, a impressora pode estar
 * desligada. Chamar impresso ao que foi enviado é a mesma família de erro que
 * chamar entregue a um HTTP 200 — e essa já custou um incidente real.
 *
 * ── E não saber é um ESTADO, não um erro ───────────────────────────────────
 *
 * O produto **não escolhe por conta própria** entre imprimiu e não imprimiu
 * quando não tem informação, porque as duas decisões erradas custam coisas
 * diferentes: uma manda o cliente esperar por comida que ninguém está a fazer,
 * a outra faz a cozinha fazer duas. Uma comanda em «não sei» aparece na tela
 * como não sei, e **alguém decide**.
 */

/** O que a base guarda de um envio. Só o que esta leitura precisa. */
export interface EnvioDeImpressao {
  readonly estado:
    | 'POR_ENVIAR'
    | 'ENTREGUE_A_PONTE'
    | 'CONFIRMADO_PELO_APARELHO'
    | 'RECUSADO_PELO_APARELHO';
  readonly entregueEm: Date | null;
  readonly respondidoEm: Date | null;
  readonly resposta: string | null;
}

/**
 * O que se pode dizer sobre um envio — e o `sabe: false` é a razão de a leitura
 * ser uma união em vez de uma cadeia de textos.
 *
 * Mesma figura do `Medido<T>` do E30: **a ausência tem um ramo próprio**, e por
 * isso quem consome é obrigado pelo compilador a tratá-la. Um `estado: string`
 * deixava «não sei» ser mais um texto entre outros, e o primeiro `switch` sem
 * `default` mandava-o silenciosamente para o lado errado.
 */
export type LeituraDeImpressao =
  | { readonly sabe: true; readonly estado: 'por_enviar' | 'entregue' | 'impresso' | 'recusado' }
  | { readonly sabe: false; readonly desde: Date };

/**
 * Quanto tempo se espera pela resposta do aparelho antes de a ausência passar a
 * ser uma resposta em si.
 *
 * Não é uma constante escondida: é um argumento com valor por omissão, porque
 * uma cozinha com uma impressora de rede lenta e um balcão com USB não têm o
 * mesmo limite, e fixá-lo aqui era decidir por eles.
 */
export const SEGUNDOS_ATE_NAO_SABER = 30;

/**
 * O estado de um envio, **derivado** — nunca lido de uma coluna.
 *
 * O caso que paga o módulo é o do meio: `ENTREGUE_A_PONTE` sem resposta e com o
 * tempo passado **não** é `impresso` e **não** é `recusado`. É não sei.
 */
export function estadoDeImpressao(
  envio: EnvioDeImpressao,
  agora: Date,
  segundosAteNaoSaber: number = SEGUNDOS_ATE_NAO_SABER,
): LeituraDeImpressao {
  // A confirmação exige resposta do APARELHO. Sem ela não há afirmação: o
  // estado pode ter sido escrito por engano, e o `resposta` é a prova de que
  // alguém do outro lado falou. É a mesma exigência que o CHECK faz na base —
  // aqui outra vez porque quem lê não tem como saber se a linha veio de lá.
  if (envio.estado === 'CONFIRMADO_PELO_APARELHO' && envio.resposta !== null) {
    return { sabe: true, estado: 'impresso' };
  }
  if (envio.estado === 'RECUSADO_PELO_APARELHO' && envio.resposta !== null) {
    return { sabe: true, estado: 'recusado' };
  }
  if (envio.estado === 'POR_ENVIAR') {
    return { sabe: true, estado: 'por_enviar' };
  }

  // Daqui para baixo: saiu, e não há resposta.
  const desde = envio.entregueEm ?? envio.respondidoEm;
  if (desde === null) {
    // Entregue sem carimbo é uma linha que a base não deixa existir. Se chegar
    // aqui, é um dado que não se entende — e não se entender é não saber.
    return { sabe: false, desde: agora };
  }

  const decorridos = (agora.getTime() - desde.getTime()) / 1000;
  if (decorridos > segundosAteNaoSaber) {
    return { sabe: false, desde };
  }
  return { sabe: true, estado: 'entregue' };
}

/**
 * A identidade de um envio — a mesma que o gatilho da base deriva.
 *
 * Está escrita nos dois sítios de propósito, e não é duplicação de regra: a
 * base é quem GARANTE (restrição única sobre esta cadeia), e esta cópia é para
 * quem precisa de saber a identidade **antes** de escrever, sem ir à base
 * perguntar. Se as duas divergirem, a base ganha e a inserção falha — que é o
 * modo de falha certo, ruidoso e do lado seguro.
 */
export function identidadeDeImpressao(
  tipo: string,
  documentoId: string,
  via: number,
): string {
  return `${tipo}:${documentoId}:${via}`;
}

/** Uma linha do talão, tal como sai no papel. */
export interface LinhaDeTalao {
  readonly texto: string;
  readonly quantidade?: number;
}

/**
 * A marca da reimpressão, **no papel**.
 *
 * ── Porque é um número e não uma palavra ───────────────────────────────────
 *
 * A cozinha lê o talão na língua da casa, mas a garantia não pode depender
 * disso: a base procura `VIA <n>` e recusa o conteúdo que não a traga. Uma
 * palavra traduzida fazia a garantia valer numa língua e falhar noutra, em
 * silêncio, e o silêncio aqui é uma cozinha a fazer o mesmo prato duas vezes.
 */
export function marcaDaVia(via: number): string {
  return `VIA ${via}`;
}

/**
 * O talão que vai para a impressora.
 *
 * **A segunda via distingue-se no papel — não no ecrã de quem reimprime.** É na
 * cozinha que a decisão errada custa: uma segunda via sem marca é
 * indistinguível de um segundo pedido, e ninguém lá tem como saber a diferença.
 *
 * A marca vai na PRIMEIRA linha por isso mesmo. Um talão que só diz «segunda
 * via» no rodapé é um talão que já foi lido e já foi cozinhado.
 */
export function renderizarComanda(
  pedido: {
    readonly numero: string;
    readonly canal: string;
    readonly linhas: readonly LinhaDeTalao[];
  },
  via: number,
  rotulos: { readonly reimpressao: string; readonly pedido: string },
): string {
  const corpo = [
    `${rotulos.pedido} ${pedido.numero}`,
    pedido.canal,
    '',
    ...pedido.linhas.map((l) => (l.quantidade === undefined
      ? l.texto
      : `${l.quantidade} x ${l.texto}`)),
  ];

  if (via <= 1) return corpo.join('\n');

  return [
    `*** ${rotulos.reimpressao} ${marcaDaVia(via)} ***`,
    ...corpo,
  ].join('\n');
}
