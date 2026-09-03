import es from './mensagens/es-ES.json' with { type: 'json' };
import pt from './mensagens/pt-BR.json' with { type: 'json' };
import en from './mensagens/en.json' with { type: 'json' };
import { IDIOMA_PADRAO, type Idioma } from './idiomas.ts';

/**
 * Texto de INTERFACE.
 *
 * Esta é metade da separação que o E02 pede. A outra metade — o nome e a
 * descrição de um prato, que também têm de existir em três línguas — **não vem
 * daqui**. Isso é conteúdo do restaurante, vive na base de dados, muda sem
 * deploy e é traduzido por quem é dono dele. Ver `textoDeProduto` no fim.
 *
 * Misturar os dois é o erro que obriga a um deploy para corrigir a acentuação de
 * uma croquete.
 */
const CATALOGOS = {
  'es-ES': es,
  'pt-BR': pt,
  en,
} as const satisfies Record<Idioma, unknown>;

/** O espanhol é a fonte da verdade: define as chaves que têm de existir. */
export type Mensagens = typeof es;

type Folhas<T, Prefixo extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefixo}${K}`
    : Folhas<T[K], `${Prefixo}${K}.`>;
}[keyof T & string];

export type ChaveDeMensagem = Folhas<Mensagens>;

function procurar(objecto: unknown, caminho: string): string | undefined {
  let actual: unknown = objecto;
  for (const parte of caminho.split('.')) {
    if (typeof actual !== 'object' || actual === null) return undefined;
    actual = (actual as Record<string, unknown>)[parte];
  }
  return typeof actual === 'string' ? actual : undefined;
}

export type Tradutor = (chave: ChaveDeMensagem, variaveis?: Record<string, string | number>) => string;

/**
 * Devolve o tradutor de um idioma.
 *
 * Uma chave em falta cai para o espanhol e **não** devolve a chave crua nem
 * vazio: um ecrã com `estado.carga.titulo` escrito no meio é pior do que um
 * ecrã em espanhol para quem pediu inglês.
 */
export function tradutor(idioma: Idioma): Tradutor {
  const catalogo = CATALOGOS[idioma];
  return (chave, variaveis) => {
    const bruto = procurar(catalogo, chave) ?? procurar(CATALOGOS[IDIOMA_PADRAO], chave) ?? chave;
    if (!variaveis) return bruto;
    return bruto.replace(/\{(\w+)\}/g, (inteiro, nome: string) =>
      nome in variaveis ? String(variaveis[nome]) : inteiro,
    );
  };
}

export function mensagensDe(idioma: Idioma): Mensagens {
  return CATALOGOS[idioma] as Mensagens;
}

/**
 * Texto de PRODUTO — o outro lado da separação.
 *
 * O conteúdo do restaurante chega como um mapa por idioma, vindo dos dados. Sem
 * tradução para o idioma pedido, cai no idioma em que o restaurante escreveu, e
 * **diz qual foi**: mostrar "Croquetas caseras" a um inglês é honesto; fingir
 * que aquilo é inglês não é, e um "[sem tradução]" seria pior que ambos.
 */
export interface TextoTraduzido {
  texto: string;
  /** Idioma efectivamente usado. Difere do pedido quando houve recurso. */
  idiomaUsado: string;
  /** Verdadeiro quando não havia tradução para o idioma pedido. */
  emRecurso: boolean;
}

export function textoDeProduto(
  traducoes: Readonly<Record<string, string>>,
  idiomaPedido: Idioma,
  idiomaDeOrigem: string,
): TextoTraduzido | null {
  const pedido = traducoes[idiomaPedido];
  if (pedido) return { texto: pedido, idiomaUsado: idiomaPedido, emRecurso: false };

  const origem = traducoes[idiomaDeOrigem];
  if (origem) return { texto: origem, idiomaUsado: idiomaDeOrigem, emRecurso: true };

  const primeira = Object.entries(traducoes)[0];
  if (primeira) return { texto: primeira[1], idiomaUsado: primeira[0], emRecurso: true };

  // Sem nenhuma tradução não há texto nenhum. Devolver "" faria a interface
  // desenhar um cartão de produto sem nome e ninguém notaria.
  return null;
}
