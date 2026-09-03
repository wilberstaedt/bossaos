/**
 * Para onde é que o NOSSO servidor pode ir buscar um ficheiro.
 *
 * ── A armadilha, escrita no E00 ────────────────────────────────────────────
 *
 * > **Buscar imagem por URL é um pedido que o nosso servidor faz.** Sem
 * > restrição de destino, oferecemos um proxy para a rede interna: o cliente
 * > escreve um endereço interno e o nosso servidor vai lá buscar e devolve.
 *
 * O que a torna difícil não é a regra — é a quantidade de formas de escrever
 * `127.0.0.1` sem escrever `127.0.0.1`. Cada uma das que estão aqui está no
 * teste, e cada uma passou por um sistema real:
 *
 *   http://2130706433/          decimal
 *   http://0177.0.0.1/          octal
 *   http://0x7f.0x0.0x0.0x1/    hexadecimal
 *   http://127.1/               forma curta
 *   http://[::1]/               IPv6
 *   http://[::ffff:10.0.0.1]/   IPv4 embrulhado em IPv6
 *   http://169.254.169.254/     metadados da nuvem — o alvo clássico
 *
 * Isto decide sobre o que consegue ver: **a forma do endereço**. Quem resolve o
 * nome tem de voltar a perguntar por cada endereço resolvido, e é por isso que
 * `classificarIp` é exportada à parte.
 */

export type ClasseDeEndereco =
  | 'publico'
  | 'loopback'
  | 'privado'
  | 'ligacao_local'
  | 'partilhado'
  | 'multicast'
  | 'reservado';

/** Um octeto escrito em decimal, octal ou hexadecimal — todas legais para o SO. */
function octeto(texto: string): number | null {
  if (/^0[xX][0-9a-fA-F]+$/.test(texto)) return parseInt(texto, 16);
  if (/^0[0-7]+$/.test(texto)) return parseInt(texto, 8);
  if (/^\d+$/.test(texto)) return parseInt(texto, 10);
  return null;
}

/**
 * Lê um IPv4 nas formas que o `connect()` aceita — não só a que as pessoas
 * escrevem. `2130706433` e `127.1` chegam os dois a 127.0.0.1.
 */
export function lerIpv4(texto: string): number | null {
  const partes = texto.split('.');
  if (partes.length === 0 || partes.length > 4) return null;
  const numeros: number[] = [];
  for (const p of partes) {
    const n = octeto(p);
    if (n === null || n < 0) return null;
    numeros.push(n);
  }
  // Com menos de quatro partes, a última ocupa o resto: `127.1` é 127.0.0.1.
  const ultima = numeros.pop()!;
  const limite = 256 ** (4 - numeros.length);
  if (ultima >= limite) return null;
  if (numeros.some((n) => n > 255)) return null;
  let valor = 0;
  for (const n of numeros) valor = valor * 256 + n;
  return valor * limite + ultima;
}

function classificarIpv4(valor: number): ClasseDeEndereco {
  const a = (valor >>> 24) & 0xff;
  const b = (valor >>> 16) & 0xff;
  if (a === 127) return 'loopback';
  if (a === 10) return 'privado';
  if (a === 172 && b >= 16 && b <= 31) return 'privado';
  if (a === 192 && b === 168) return 'privado';
  // 169.254.0.0/16 — aqui vive 169.254.169.254, o serviço de metadados de
  // praticamente todas as nuvens. É o alvo que transforma um proxy interno em
  // credenciais de produção.
  if (a === 169 && b === 254) return 'ligacao_local';
  if (a === 100 && b >= 64 && b <= 127) return 'partilhado';   // CGNAT
  if (a === 0) return 'reservado';
  if (a >= 224 && a <= 239) return 'multicast';
  if (a >= 240) return 'reservado';
  return 'publico';
}

/** Expande um IPv6 para os seus dezasseis octetos. `null` se não for IPv6. */
function lerIpv6(texto: string): number[] | null {
  const limpo = texto.replace(/^\[|\]$/g, '').split('%')[0]!;
  if (!limpo.includes(':')) return null;

  // Cauda em forma de IPv4: `::ffff:10.0.0.1` — o embrulho clássico.
  let cabeca = limpo;
  let cauda: number[] = [];
  const ultimo = limpo.slice(limpo.lastIndexOf(':') + 1);
  if (ultimo.includes('.')) {
    const v4 = lerIpv4(ultimo);
    if (v4 === null) return null;
    cauda = [(v4 >>> 24) & 0xff, (v4 >>> 16) & 0xff, (v4 >>> 8) & 0xff, v4 & 0xff];
    cabeca = limpo.slice(0, limpo.lastIndexOf(':'));
  }

  const lados = cabeca.split('::');
  if (lados.length > 2) return null;
  const grupo = (g: string): number[] | null => {
    if (g === '') return [];
    const saida: number[] = [];
    for (const parte of g.split(':')) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(parte)) return null;
      const n = parseInt(parte, 16);
      saida.push((n >>> 8) & 0xff, n & 0xff);
    }
    return saida;
  };
  const esquerda = grupo(lados[0]!);
  const direita = lados.length === 2 ? grupo(lados[1]!) : [];
  if (esquerda === null || direita === null) return null;

  const conhecidos = esquerda.length + direita.length + cauda.length;
  if (conhecidos > 16) return null;
  if (lados.length === 1 && conhecidos !== 16) return null;
  const enchimento = new Array<number>(16 - conhecidos).fill(0);
  return [...esquerda, ...enchimento, ...direita, ...cauda];
}

function classificarIpv6(o: number[]): ClasseDeEndereco {
  const zeros = o.slice(0, 15).every((x) => x === 0);
  if (zeros && o[15] === 1) return 'loopback';
  if (o.every((x) => x === 0)) return 'reservado';
  // ::ffff:a.b.c.d — o mesmo endereço IPv4, e tem de ser julgado como IPv4.
  if (o.slice(0, 10).every((x) => x === 0) && o[10] === 0xff && o[11] === 0xff) {
    return classificarIpv4(((o[12]! << 24) >>> 0) + (o[13]! << 16) + (o[14]! << 8) + o[15]!);
  }
  if ((o[0]! & 0xfe) === 0xfc) return 'privado';        // fc00::/7, único local
  if (o[0] === 0xfe && (o[1]! & 0xc0) === 0x80) return 'ligacao_local'; // fe80::/10
  if (o[0] === 0xff) return 'multicast';
  return 'publico';
}

/** A classe de um endereço literal. `null` quando o texto não é um endereço. */
export function classificarIp(texto: string): ClasseDeEndereco | null {
  const v6 = lerIpv6(texto);
  if (v6) return classificarIpv6(v6);
  const v4 = lerIpv4(texto);
  if (v4 !== null) return classificarIpv4(v4);
  return null;
}

export type RecusaDeEndereco =
  | 'url_invalido'
  | 'esquema_nao_permitido'
  | 'credenciais_no_url'
  | 'destino_interno'
  | 'nome_local';

export type DecisaoDeEndereco =
  | { ok: true; url: URL; /** Ainda é preciso resolver o nome e reclassificar. */ porResolver: boolean }
  | { ok: false; erro: RecusaDeEndereco; detalhe?: string };

/** Nomes que resolvem para dentro sem passarem por DNS público. */
const NOMES_LOCAIS = ['localhost', 'localhost.localdomain', 'ip6-localhost', 'metadata',
  'metadata.google.internal', 'instance-data'];

/**
 * Este endereço pode ser buscado pelo nosso servidor?
 *
 * **`porResolver: true` não é um sim.** Quer dizer "a forma passa; agora resolve
 * o nome e volta a perguntar por cada endereço que vier". Um nome público pode
 * resolver para 127.0.0.1 — é o ataque, e não há forma de o ver aqui.
 */
export function validarUrlDeBusca(texto: string): DecisaoDeEndereco {
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return { ok: false, erro: 'url_invalido' };
  }

  // `file:`, `gopher:`, `data:`, `ftp:` — cada um já foi caminho de leitura de
  // ficheiros locais numa biblioteca de busca.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, erro: 'esquema_nao_permitido', detalhe: url.protocol };
  }
  // `http://interno@publico/` engana quem lê o URL a olho.
  if (url.username !== '' || url.password !== '') {
    return { ok: false, erro: 'credenciais_no_url' };
  }

  const anfitriao = url.hostname.toLowerCase().replace(/\.$/, '');
  if (NOMES_LOCAIS.includes(anfitriao)) {
    return { ok: false, erro: 'nome_local', detalhe: anfitriao };
  }
  // `.local` e `.internal` não existem no DNS público, por definição.
  if (/\.(local|internal|localdomain|home\.arpa)$/.test(anfitriao)) {
    return { ok: false, erro: 'nome_local', detalhe: anfitriao };
  }

  const classe = classificarIp(url.hostname);
  if (classe === null) return { ok: true, url, porResolver: true };
  if (classe !== 'publico') {
    return { ok: false, erro: 'destino_interno', detalhe: classe };
  }
  // Um IP literal público não precisa de DNS: já se sabe para onde vai.
  return { ok: true, url, porResolver: false };
}

/**
 * Depois de resolver: algum dos endereços é interno?
 *
 * Devolve o primeiro que reprove. **Basta um** — se um nome resolve para dois
 * endereços e um deles é interno, o sistema operativo pode escolher qualquer um,
 * e um proxy que funciona metade das vezes é um proxy.
 */
export function algumEnderecoInterno(
  resolvidos: readonly string[],
): { interno: true; endereco: string; classe: ClasseDeEndereco } | { interno: false } {
  for (const e of resolvidos) {
    const classe = classificarIp(e);
    // Um endereço que não se consegue classificar é tratado como interno. O lado
    // seguro de "não sei" aqui é recusar: aceitar o desconhecido é o hábito que
    // esta função existe para não ter.
    if (classe === null) return { interno: true, endereco: e, classe: 'reservado' };
    if (classe !== 'publico') return { interno: true, endereco: e, classe };
  }
  return { interno: false };
}
