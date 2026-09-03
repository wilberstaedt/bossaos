/**
 * Contraste WCAG 2.2, calculado e não estimado.
 *
 * Existe aqui, no pacote de interface, porque o CT-13 manda **calcular o
 * contraste de temas personalizados no servidor**: um restaurante do plano
 * Restaurant escolhe cores próprias, e a única forma de garantir que a carta
 * dele continua legível é medir o par antes de o publicar, não confiar no olho
 * de quem o escolheu.
 *
 * Os limiares são da WCAG; a paleta é da marca. Esta distinção importa: quando
 * um par falha, o produto não pode "arredondar para cima" porque a cor é bonita.
 */

/** Limiares da WCAG 2.2 para texto sobre fundo. */
export const LIMIAR = {
  /** Texto comum (abaixo de 18,66 px negrito / 24 px normal). */
  normal: 4.5,
  /** Texto grande, e elementos gráficos e de interface. */
  grande: 3,
} as const;

export type TamanhoDeTexto = keyof typeof LIMIAR;

/** `#RGB` ou `#RRGGBB`, com ou sem cardinal. Devolve os canais em 0-255. */
export function lerHex(cor: string): [number, number, number] {
  const limpo = cor.trim().replace(/^#/, '');
  const expandido =
    limpo.length === 3
      ? limpo
          .split('')
          .map((c) => c + c)
          .join('')
      : limpo;

  if (!/^[0-9a-fA-F]{6}$/.test(expandido)) {
    throw new Error(`cor hexadecimal inválida: ${cor}`);
  }
  return [
    parseInt(expandido.slice(0, 2), 16),
    parseInt(expandido.slice(2, 4), 16),
    parseInt(expandido.slice(4, 6), 16),
  ];
}

/**
 * Luminância relativa (WCAG 2.x).
 *
 * O `0.03928` e a divisão por `12.92` não são arbitrários: é a linearização do
 * sRGB, e trocá-la por um `^2.2` ingénuo desloca as razões o suficiente para um
 * par reprovado passar a aprovado.
 */
export function luminanciaRelativa(cor: string): number {
  const canais = lerHex(cor).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

/** Razão de contraste entre duas cores. Simétrica: a ordem não altera o valor. */
export function razaoDeContraste(a: string, b: string): number {
  const la = luminanciaRelativa(a);
  const lb = luminanciaRelativa(b);
  const claro = Math.max(la, lb);
  const escuro = Math.min(la, lb);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Arredonda para duas casas, como o manual apresenta os pares. */
export function razaoArredondada(a: string, b: string): number {
  return Math.round(razaoDeContraste(a, b) * 100) / 100;
}

export function cumpre(
  texto: string,
  fundo: string,
  tamanho: TamanhoDeTexto = 'normal',
): boolean {
  return razaoDeContraste(texto, fundo) >= LIMIAR[tamanho];
}

export interface EscolhaDeTexto {
  cor: string;
  razao: number;
  cumpre: boolean;
}

/**
 * Escolhe a cor de texto legível sobre um fundo, entre candidatas.
 *
 * Devolve a melhor **mesmo quando nenhuma cumpre**, com `cumpre: false` — quem
 * chama tem de decidir o que fazer com isso. Devolver `null` em silêncio faria
 * o chamador cair num valor por omissão e publicar um par ilegível sem aviso.
 */
export function melhorTextoSobre(
  fundo: string,
  candidatas: readonly string[],
  tamanho: TamanhoDeTexto = 'normal',
): EscolhaDeTexto {
  if (candidatas.length === 0) throw new Error('sem cores candidatas');

  let melhor: EscolhaDeTexto | undefined;
  for (const cor of candidatas) {
    const razao = razaoDeContraste(cor, fundo);
    if (!melhor || razao > melhor.razao) {
      melhor = { cor, razao, cumpre: razao >= LIMIAR[tamanho] };
    }
  }
  return melhor as EscolhaDeTexto;
}
