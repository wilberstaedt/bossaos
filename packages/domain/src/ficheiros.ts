/**
 * O que é este ficheiro, a sério — e o que se pode fazer com ele.
 *
 * ── A armadilha, escrita no E00 ────────────────────────────────────────────
 *
 * > **Não executar SVG nem HTML do cliente.** Um SVG é um documento com script
 * > lá dentro. Aceite como logótipo e servido na página do restaurante, é XSS
 * > armazenado que se instala sozinho.
 *
 * E a razão de nada aqui olhar para a extensão nem para o `Content-Type`: os
 * dois vêm do cliente. `veneno.svg` renomeado para `logo.png` continua a ser um
 * documento com script; e um `Content-Type: image/png` num pedido é uma
 * afirmação de quem envia, não um facto sobre os bytes.
 *
 * O defeito apresenta-se como sucesso: o carregamento corre, a imagem aparece na
 * página. Só aparece com um `<script>` dentro.
 */

export type TipoDeFicheiro = 'png' | 'jpeg' | 'webp' | 'gif' | 'svg' | 'html' | 'pdf' | 'desconhecido';

const ASSINATURAS: ReadonlyArray<{ tipo: TipoDeFicheiro; bytes: readonly number[]; desvio?: number }> = [
  { tipo: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { tipo: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { tipo: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { tipo: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

const texto = (b: Uint8Array, ate = 512) =>
  new TextDecoder('utf-8', { fatal: false }).decode(b.subarray(0, ate));

/**
 * O tipo pelos BYTES. Nunca pela extensão, nunca pelo cabeçalho declarado.
 *
 * O SVG e o HTML não têm assinatura — são texto — e é justamente por isso que
 * são o caso difícil: qualquer verificação por assinatura os deixa cair em
 * `desconhecido`, e "desconhecido" tratado como "provavelmente uma imagem" é
 * como o XSS armazenado entra.
 */
export function tipoPorConteudo(conteudo: Uint8Array): TipoDeFicheiro {
  for (const a of ASSINATURAS) {
    const d = a.desvio ?? 0;
    if (conteudo.length >= d + a.bytes.length
      && a.bytes.every((b, i) => conteudo[d + i] === b)) return a.tipo;
  }
  // WebP: "RIFF" .... "WEBP"
  if (conteudo.length >= 12
    && [0x52, 0x49, 0x46, 0x46].every((b, i) => conteudo[i] === b)
    && [0x57, 0x45, 0x42, 0x50].every((b, i) => conteudo[8 + i] === b)) return 'webp';

  const inicio = texto(conteudo).replace(/^\uFEFF/, '').trimStart().toLowerCase();
  // A ordem importa: um SVG pode começar por `<?xml`, por um comentário, ou
  // directamente por `<svg`. E um HTML pode não ter `<!doctype`.
  // `[\s>/]` e não `[\s>]`: `<svg/>` é um SVG válido e completo, e foi o que a
  // asserção apanhou — a etiqueta pode fechar-se a si própria sem atributos.
  if (/^(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype\s+svg|<svg[\s>/])/.test(inicio)) return 'svg';
  if (/^(<!doctype\s+html|<html[\s>/]|<head[\s>/]|<body[\s>/]|<script[\s>/])/.test(inicio)) return 'html';
  return 'desconhecido';
}

export type RecusaDeFicheiro =
  | 'tipo_nao_permitido'
  | 'conteudo_nao_corresponde'
  | 'grande_demais'
  | 'vazio'
  | 'sem_texto_alternativo';

export interface Aceitacao {
  tipo: TipoDeFicheiro;
  /** O MIME a servir — o nosso, calculado dos bytes, não o que veio no pedido. */
  tipoMime: string;
  /**
   * Servir como anexo em vez de em linha.
   *
   * `Content-Disposition: attachment` é o que impede o navegador de executar o
   * documento no nosso domínio. Nada nesta etapa serve SVG em linha; a coluna
   * existe para o dia em que alguém quiser servir um PDF, que também não deve
   * ser renderizado no domínio da aplicação.
   */
  comoAnexo: boolean;
}

export type ResultadoDeFicheiro =
  | { ok: true; aceite: Aceitacao }
  | { ok: false; erro: RecusaDeFicheiro; detalhe?: string };

const MIME: Partial<Record<TipoDeFicheiro, string>> = {
  png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
};

/** As imagens que a carta pode mostrar. **O SVG não está aqui, e é o ponto.** */
export const IMAGENS_PERMITIDAS: readonly TipoDeFicheiro[] = ['png', 'jpeg', 'webp', 'gif'];

export interface PedidoDeFicheiro {
  conteudo: Uint8Array;
  /** O que o cliente DIZ que é. Guarda-se para o rasto; não decide nada. */
  tipoDeclarado?: string;
  nome?: string;
  textoAlternativo?: string;
  limiteBytes: number;
  /** Uma imagem de carta exige texto alternativo; um anexo de importação não. */
  exigirTextoAlternativo?: boolean;
}

/**
 * Aceita — ou recusa, com o motivo.
 *
 * **`svg` não sai daqui como `tipo_nao_permitido` genérico**: sai com o detalhe
 * a dizer que é SVG, porque quem carrega um logótipo SVG fê-lo de boa fé e
 * merece saber que o problema não é o desenho, é o formato.
 */
export function aceitarFicheiro(pedido: PedidoDeFicheiro): ResultadoDeFicheiro {
  const { conteudo } = pedido;
  if (conteudo.length === 0) return { ok: false, erro: 'vazio' };
  if (conteudo.length > pedido.limiteBytes) {
    return { ok: false, erro: 'grande_demais', detalhe: `${conteudo.length} > ${pedido.limiteBytes}` };
  }

  const tipo = tipoPorConteudo(conteudo);
  if (!IMAGENS_PERMITIDAS.includes(tipo)) {
    return { ok: false, erro: 'tipo_nao_permitido', detalhe: tipo };
  }

  // O declarado só se usa para DETECTAR A MENTIRA. Um pedido que diz `image/png`
  // e traz um SVG já foi recusado acima; este ramo apanha o inverso — um PNG
  // declarado como outra coisa —, que é sinal de que alguém está a experimentar.
  if (pedido.tipoDeclarado && MIME[tipo] && pedido.tipoDeclarado !== MIME[tipo]) {
    return {
      ok: false, erro: 'conteudo_nao_corresponde',
      detalhe: `declarado ${pedido.tipoDeclarado}, é ${MIME[tipo]}`,
    };
  }

  if (pedido.exigirTextoAlternativo && !pedido.textoAlternativo?.trim()) {
    return { ok: false, erro: 'sem_texto_alternativo' };
  }

  return { ok: true, aceite: { tipo, tipoMime: MIME[tipo]!, comoAnexo: false } };
}
