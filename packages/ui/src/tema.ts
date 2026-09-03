import { melhorTextoSobre, razaoArredondada, type TamanhoDeTexto } from './contraste.ts';
import { LIMIAR } from './contraste.ts';
import { TOKENS_TEMAVEIS, marca, superficie, texto, type TokenTemavel } from './fichas.ts';

/**
 * Tema público de um restaurante.
 *
 * Só existe nas superfícies PÚBLICAS (site, carta, jornadas do cliente) e só a
 * partir do plano Restaurant. A administração, os estados operacionais, o foco,
 * a grade e a tipografia não passam por aqui — manual p. 20.
 */
export type TemaPublico = Record<TokenTemavel, string>;

/** O tema de origem. É o que o plano Starter usa, sem excepção. */
export const TEMA_BOSSAOS: TemaPublico = {
  primaria: marca.primaria,
  acento: marca.acento,
  fundo: superficie.base,
};

/**
 * Candidatas a cor de texto. Duas, de propósito: o manual manda **gerar** a cor
 * de texto a partir do fundo, não deixar o restaurante escolhê-la. Quem escolhe
 * o fundo não devia poder escolher também o texto que vai por cima.
 */
const CANDIDATAS_DE_TEXTO = [texto.primario, texto.inverso] as const;

export interface VeredictoDeToken {
  token: TokenTemavel;
  cor: string;
  /** Contra o que foi medido, em palavras. */
  contra: string;
  razao: number;
  limiar: number;
  tamanho: TamanhoDeTexto;
  cumpre: boolean;
  /** Cor de texto gerada para usar sobre esta cor, quando aplicável. */
  textoGerado?: string;
}

export interface ResultadoDeTema {
  aprovado: boolean;
  veredictos: VeredictoDeToken[];
  /** Motivos que BLOQUEIAM a publicação. */
  reprovacoes: string[];
  /** Observações que não bloqueiam, mas limitam o uso da cor. */
  avisos: string[];
}

/**
 * Valida um tema. **Corre no servidor** (CT-13).
 *
 * Não é validação de formato: é a única coisa entre um restaurante entusiasmado
 * e uma carta que ninguém consegue ler ao sol.
 *
 * O que BLOQUEIA, e porquê só isto:
 *
 *   fundo     o corpo de texto assenta nele        → texto comum, 4,5
 *   primaria  é o preenchimento do botão principal → texto comum, 4,5
 *
 * O acento é medido e **reportado**, mas não bloqueia. A razão apareceu ao pôr o
 * tema de origem a validar-se a si próprio: o Coral Bossa sobre a Areia Clara dá
 * **2,77** — o número está publicado no manual (p. 16) e voltou a ser medido no
 * ADR 0001. Uma regra que exigisse 3:1 ao acento reprovaria a paleta da própria
 * BossaOS.
 *
 * E reprovar seria errado, não inconveniente: a WCAG 1.4.11 pede 3:1 a
 * componentes de interface e a gráficos que CARREGAM informação — não a
 * decoração editorial, que é o que o coral é no manual (um traço acima de um
 * título). O que o produto tem de garantir é que ninguém use esta cor para
 * desenhar um controlo ou um sinal, e é isso que o aviso diz.
 */
export function validarTema(entrada: Partial<TemaPublico>): ResultadoDeTema {
  const tema: TemaPublico = { ...TEMA_BOSSAOS, ...entrada };
  const veredictos: VeredictoDeToken[] = [];
  const reprovacoes: string[] = [];
  const avisos: string[] = [];

  const medir = (
    token: TokenTemavel,
    contra: string,
    descricao: string,
    tamanho: TamanhoDeTexto,
    bloqueia: boolean,
    textoGerado?: string,
  ) => {
    const razao = razaoArredondada(tema[token], contra);
    const cumpre = razao >= LIMIAR[tamanho];
    veredictos.push({
      token,
      cor: tema[token],
      contra: descricao,
      razao,
      limiar: LIMIAR[tamanho],
      tamanho,
      cumpre,
      ...(textoGerado ? { textoGerado } : {}),
    });
    if (cumpre) return;

    const frase =
      `${token} (${tema[token]}) contra ${descricao}: ${razao}:1, ` +
      `abaixo do mínimo de ${LIMIAR[tamanho]}:1 para ` +
      `${tamanho === 'normal' ? 'texto comum' : 'elemento gráfico'}.`;

    if (bloqueia) {
      reprovacoes.push(frase);
    } else {
      avisos.push(
        `${frase} Serve como decoração editorial, mas não pode desenhar um ` +
          `controlo, um estado nem um gráfico que carregue informação.`,
      );
    }
  };

  // O texto do corpo é GERADO a partir do fundo, e depois medido contra ele.
  const sobreFundo = melhorTextoSobre(tema.fundo, CANDIDATAS_DE_TEXTO, 'normal');
  medir('fundo', sobreFundo.cor, `o texto gerado (${sobreFundo.cor})`, 'normal', true, sobreFundo.cor);

  const sobrePrimaria = melhorTextoSobre(tema.primaria, CANDIDATAS_DE_TEXTO, 'normal');
  medir(
    'primaria',
    sobrePrimaria.cor,
    `o rótulo do botão (${sobrePrimaria.cor})`,
    'normal',
    true,
    sobrePrimaria.cor,
  );

  // Acento: medido como gráfico, reportado, não bloqueante. Ver acima.
  medir('acento', tema.fundo, 'o fundo', 'grande', false);

  return { aprovado: reprovacoes.length === 0, veredictos, reprovacoes, avisos };
}

/** Chaves que chegaram e não são temáveis. Vazio quando está tudo em ordem. */
export function tokensNaoPermitidos(entrada: Record<string, unknown>): string[] {
  const permitidos = new Set<string>(TOKENS_TEMAVEIS);
  return Object.keys(entrada).filter((k) => !permitidos.has(k));
}

/**
 * Variáveis CSS de um tema público, para injectar na superfície do restaurante.
 *
 * Repare no que **não** está aqui: nem estados, nem foco, nem tipografia, nem
 * grade. Não é esquecimento — é a fronteira. Se um dia alguém precisar de
 * temar um estado, tem de vir mudar esta função e explicar porquê.
 */
export function variaveisDoTema(tema: TemaPublico): Record<string, string> {
  const sobreFundo = melhorTextoSobre(tema.fundo, CANDIDATAS_DE_TEXTO, 'normal');
  const sobrePrimaria = melhorTextoSobre(tema.primaria, CANDIDATAS_DE_TEXTO, 'normal');
  return {
    '--bo-publico-primaria': tema.primaria,
    '--bo-publico-primaria-texto': sobrePrimaria.cor,
    '--bo-publico-acento': tema.acento,
    '--bo-publico-fundo': tema.fundo,
    '--bo-publico-texto': sobreFundo.cor,
  };
}
