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
 * Normaliza uma cor para `#rrggbb`, ou devolve `null` se não for uma.
 *
 * ── Porque é que isto tinha de existir antes de o E12 ter uma tela ─────────
 *
 * `validarTema` mede contraste, e para medir chama `lerHex`, que **atira** em
 * cor inválida. Medido a 04/09 contra a rota que já existia desde o E05: um
 * `PUT /api/org/<org>/tema` com `{"primaria":"red"}` não dava uma recusa — dava
 * **500**. O caminho nunca tinha sido exercido porque nenhuma prova mandava uma
 * cor que não fosse hexadecimal.
 *
 * E há a segunda razão, que é a do contrato: *«Não injete CSS recebido do
 * cliente»*. Estas três cadeias acabam num atributo `style` de uma página
 * pública. Um valor como `red;--bo-foco:transparent` é sintacticamente uma cor
 * para quem só verificar que não está vazio — e desligava o anel de foco do site
 * inteiro. A única defesa que não depende de eu me lembrar é esta: **o que não
 * for exactamente seis dígitos hexadecimais não passa**.
 *
 * Aceita `#abc`, `abc`, `#AABBCC` — as formas que uma pessoa escreve — e devolve
 * sempre a mesma. Não aceita nomes de cor (`red`), funções (`rgb(...)`) nem nada
 * com um caractere a mais.
 */
export function normalizarCor(cor: unknown): string | null {
  if (typeof cor !== 'string') return null;
  const limpo = cor.trim().replace(/^#/, '');
  const expandido = limpo.length === 3 ? limpo.split('').map((c) => c + c).join('') : limpo;
  if (!/^[0-9a-fA-F]{6}$/.test(expandido)) return null;
  return `#${expandido.toLowerCase()}`;
}

/** Os tokens cujo valor não é uma cor. Vazio quando está tudo em ordem. */
export function coresMalFormadas(entrada: Partial<Record<TokenTemavel, unknown>>): TokenTemavel[] {
  return TOKENS_TEMAVEIS.filter(
    (t) => entrada[t] !== undefined && normalizarCor(entrada[t]) === null,
  );
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
 * título).
 *
 * O que o produto tem de garantir é que ninguém use esta cor para desenhar um
 * controlo ou um sinal. Esta frase acabava aqui a dizer "e é isso que o aviso
 * diz" — e um aviso **diz, não impede**. No mesmo dia em que a regra passou a
 * aviso, o sublinhado do separador activo foi pintado com o acento, a 2,77:1, e
 * nada ficou vermelho. Quem impede é `acento.test.ts`, que reprova o acento em
 * qualquer papel visual sem justificação escrita; e para o papel de sinal existe
 * `acentoSinal`, que chega aos 3:1.
 */
export function validarTema(entrada: Partial<TemaPublico>): ResultadoDeTema {
  const veredictos: VeredictoDeToken[] = [];
  const reprovacoes: string[] = [];
  const avisos: string[] = [];

  // ── A forma antes do contraste, e sai daqui sem medir ──────────────────
  //
  // Medir o contraste de uma cadeia que não é uma cor não dá um número mau: dá
  // uma excepção, e a rota devolvia 500 a um pedido que só estava errado. Uma
  // recusa que se lê como avaria manda quem a recebeu procurar no sítio errado.
  const malFormadas = coresMalFormadas(entrada);
  if (malFormadas.length > 0) {
    return {
      aprovado: false,
      veredictos,
      reprovacoes: malFormadas.map(
        (t) => `${t}: "${String(entrada[t])}" não é uma cor hexadecimal (#rrggbb).`,
      ),
      avisos,
    };
  }

  const normalizada = Object.fromEntries(
    TOKENS_TEMAVEIS.filter((t) => entrada[t] !== undefined)
      .map((t) => [t, normalizarCor(entrada[t])!]),
  ) as Partial<TemaPublico>;
  const tema: TemaPublico = { ...TEMA_BOSSAOS, ...normalizada };

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
  // ── A última porta antes da internet aberta ────────────────────────────
  //
  // Estes cinco valores vão para um atributo `style` de uma página que qualquer
  // pessoa abre. `guardarTema` já recusa o que não for cor — mas esta função
  // recebe o que está GUARDADO, e o que está guardado pode ter entrado por uma
  // migração, por um `psql` de madrugada ou por um defeito que ainda não existe.
  //
  // Cor malformada volta ao token da BossaOS em vez de rebentar: uma carta com a
  // paleta de origem lê-se, e uma carta que dá 500 não. O que **não** acontece é
  // o valor passar tal e qual — que é como um `--bo-foco: transparent` entra
  // numa folha de estilos sem ninguém escrever CSS.
  const seguro = (valor: string, alternativa: string) => normalizarCor(valor) ?? alternativa;
  const primaria = seguro(tema.primaria, TEMA_BOSSAOS.primaria);
  const acento = seguro(tema.acento, TEMA_BOSSAOS.acento);
  const fundo = seguro(tema.fundo, TEMA_BOSSAOS.fundo);

  const sobreFundo = melhorTextoSobre(fundo, CANDIDATAS_DE_TEXTO, 'normal');
  const sobrePrimaria = melhorTextoSobre(primaria, CANDIDATAS_DE_TEXTO, 'normal');
  return {
    '--bo-publico-primaria': primaria,
    '--bo-publico-primaria-texto': sobrePrimaria.cor,
    '--bo-publico-acento': acento,
    '--bo-publico-fundo': fundo,
    '--bo-publico-texto': sobreFundo.cor,
  };
}
