/**
 * Traduções: quando é que uma deixa de valer.
 *
 * ── A regra, do `catalogo-e-publicacao.md` (E00) ───────────────────────────
 *
 * > **Texto de origem alterado torna a tradução pendente de revisão.** Sem isso,
 * > mudar o preço ou a descrição em espanhol deixa a versão inglesa a afirmar o
 * > antigo, e ninguém repara porque a página inglesa continua a existir e a
 * > parecer completa.
 *
 * É a mesma família dos alérgenos do E07: o defeito não é uma página em falta, é
 * uma página que **parece completa e está errada**. Ninguém procura o que não
 * parece faltar.
 */

/** Idiomas de conteúdo. Separados do idioma da interface, de propósito. */
export const IDIOMAS_DE_CONTEUDO = ['es-ES', 'pt-BR', 'en'] as const;
export type IdiomaDeConteudo = (typeof IDIOMAS_DE_CONTEUDO)[number];

export type EstadoDaTraducao = 'pendente' | 'revisada' | 'obsoleta';

/**
 * Impressão digital do texto de origem.
 *
 * FNV-1a em duas pistas de 32 bits — 64 bits no total, sem dependências e sem
 * `node:crypto`, o que mantém este pacote a correr em qualquer sítio.
 *
 * **Não é criptográfico, e não precisa de ser.** Isto responde a "o texto mudou
 * desde que alguém reviu esta tradução", e quem conseguisse escolher dois textos
 * com a mesma impressão já teria direitos de edição sobre o produto — com os
 * quais faz coisas piores e mais simples. O que interessa aqui é a probabilidade
 * de colisão ACIDENTAL entre duas descrições de pratos, que a 64 bits é
 * indistinguível de zero.
 *
 * Normaliza antes: espaço a mais e forma Unicode diferente não são uma mudança
 * de texto, e marcar cinquenta traduções como obsoletas porque alguém colou de
 * um Word é a forma mais rápida de ensinar toda a gente a ignorar o aviso.
 */
export function impressaoDoTexto(partes: readonly (string | null | undefined)[]): string {
  const normalizado = partes
    .map((p) => (p ?? '').normalize('NFC').replace(/\s+/g, ' ').trim())
    .join(' ');

  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < normalizado.length; i++) {
    const c = normalizado.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

export interface Traducao {
  idioma: IdiomaDeConteudo;
  nome: string;
  descricao?: string | null;
  /** A impressão do ORIGINAL no momento em que esta tradução foi feita/revista. */
  impressaoDaOrigem: string;
  revistaPor?: string | null;
  revistaEm?: Date | null;
}

/**
 * O estado desta tradução, dada a impressão actual da origem.
 *
 * Três estados e não dois: **`pendente` e `obsoleta` não são a mesma coisa**.
 * Pendente é "foi escrita e ninguém confirmou"; obsoleta é "foi confirmada e
 * depois o original mudou". A segunda é mais perigosa, porque tem assinatura e
 * data — parece verificada.
 */
export function estadoDaTraducao(t: Traducao, impressaoActual: string): EstadoDaTraducao {
  if (t.impressaoDaOrigem !== impressaoActual) return 'obsoleta';
  return t.revistaPor ? 'revisada' : 'pendente';
}

export type OrigemDoTexto =
  | { origem: 'traducao'; idioma: IdiomaDeConteudo; estado: EstadoDaTraducao }
  | {
      origem: 'idioma_principal';
      idioma: IdiomaDeConteudo;
      razao: 'sem_traducao' | 'obsoleta' | 'por_rever';
    };

export interface TextoResolvido {
  nome: string;
  descricao: string | null;
  /** **Sempre presente.** O ecrã tem de poder dizer de onde veio o que mostra. */
  proveniencia: OrigemDoTexto;
}

export interface PedidoDeTexto {
  idiomaPedido: IdiomaDeConteudo;
  idiomaPrincipal: IdiomaDeConteudo;
  origem: { nome: string; descricao?: string | null };
  traducoes: readonly Traducao[];
  impressaoActual: string;
  /**
   * Aceitar traduções por rever.
   *
   * O painel de edição quer vê-las (é lá que se revêem). A **carta publicada
   * não**: mostrar texto que ninguém confirmou como se fosse definitivo é a
   * mesma promessa vazia dos alérgenos.
   */
  aceitarPorRever?: boolean;
}

/**
 * A ordem de recuo do E00: *"idioma pedido e revisado → idioma principal da
 * unidade/marca → indicação clara da origem"*.
 *
 * **Uma tradução obsoleta NÃO é servida.** Podia parecer melhor mostrar alguma
 * coisa do que recuar para outro idioma — mas o que ela mostra é a versão
 * antiga, e é exactamente isso que o E00 diz para não fazer. Recuar diz a
 * verdade num idioma que não é o preferido; servir o obsoleto diz uma mentira no
 * idioma preferido.
 */
export function resolverTexto(pedido: PedidoDeTexto): TextoResolvido {
  const doIdioma = pedido.traducoes.find((t) => t.idioma === pedido.idiomaPedido);
  const recuo = (razao: 'sem_traducao' | 'obsoleta' | 'por_rever'): TextoResolvido => ({
    nome: pedido.origem.nome,
    descricao: pedido.origem.descricao ?? null,
    proveniencia: { origem: 'idioma_principal', idioma: pedido.idiomaPrincipal, razao },
  });

  if (!doIdioma) return recuo('sem_traducao');
  const estado = estadoDaTraducao(doIdioma, pedido.impressaoActual);
  if (estado === 'obsoleta') return recuo('obsoleta');
  if (estado === 'pendente' && !pedido.aceitarPorRever) return recuo('por_rever');

  return {
    nome: doIdioma.nome,
    descricao: doIdioma.descricao ?? null,
    proveniencia: { origem: 'traducao', idioma: doIdioma.idioma, estado },
  };
}

export interface CoberturaDeIdioma {
  idioma: IdiomaDeConteudo;
  revisadas: number;
  pendentes: number;
  obsoletas: number;
  semTraducao: number;
}

/**
 * O que o CAT-024 (tradução em lote) mostra.
 *
 * Conta **as obsoletas à parte das que faltam**, porque as duas dão trabalho
 * diferente: uma falta escrever, a outra falta comparar com o que mudou.
 * Somá-las num "por traduzir" único faz parecer que há mais trabalho novo do que
 * há, e esconde o que é urgente — o obsoleto já está publicado e errado.
 */
export function coberturaPorIdioma(
  produtos: ReadonlyArray<{ impressao: string; traducoes: readonly Traducao[] }>,
  idiomas: readonly IdiomaDeConteudo[] = IDIOMAS_DE_CONTEUDO,
): readonly CoberturaDeIdioma[] {
  return idiomas.map((idioma) => {
    const c: CoberturaDeIdioma = {
      idioma, revisadas: 0, pendentes: 0, obsoletas: 0, semTraducao: 0,
    };
    for (const p of produtos) {
      const t = p.traducoes.find((x) => x.idioma === idioma);
      if (!t) { c.semTraducao++; continue; }
      const estado = estadoDaTraducao(t, p.impressao);
      if (estado === 'revisada') c.revisadas++;
      else if (estado === 'pendente') c.pendentes++;
      else c.obsoletas++;
    }
    return c;
  });
}
