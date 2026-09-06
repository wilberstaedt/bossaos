/**
 * As regras puras das integrações — o E32.
 *
 * ── O que decide esta etapa, numa frase ────────────────────────────────────
 *
 * > **A assinatura autentica a ORIGEM; não autoriza o ALVO.**
 *
 * Um webhook assinado prova que veio do provedor. Não prova de quem é. O «quem»
 * do nosso lado é uma coisa que o provedor não conhece — e por isso o
 * identificador que vem no corpo não é uma autorização: é, no máximo, uma
 * sugestão a confirmar contra o que já sabemos.
 */

/** Os âmbitos de uma chave de API. Espelha o enum da base. */
export const ESCOPOS = [
  'CATALOGO_LER', 'CATALOGO_ESCREVER',
  'PEDIDOS_LER', 'PEDIDOS_ESCREVER',
  'RELATORIOS_LER',
] as const;
export type Escopo = (typeof ESCOPOS)[number];

/**
 * A chave tem este âmbito?
 *
 * ── Por OPERAÇÃO, e nunca à entrada ───────────────────────────────────────
 *
 * Esta função existe para ser chamada **em cada rota**, e não uma vez no
 * encaminhador. Um portão único no início é um portão que a próxima rota
 * esquece — e a rota nova é sempre a que ninguém reviu.
 *
 * É por isso que ela é minúscula e não guarda estado: o custo de a chamar outra
 * vez tem de ser menor do que o de pensar se já foi chamada.
 */
export function temEscopo(escopos: readonly Escopo[], preciso: Escopo): boolean {
  return escopos.includes(preciso);
}

/**
 * A chave está utilizável **agora**?
 *
 * ── Revogar corta JÁ ──────────────────────────────────────────────────────
 *
 * Sem cache, sem próximo ciclo. É a mesma exigência da retirada de
 * consentimento do E27, e pela mesma razão: quem disse que não, não recebe — e
 * uma revogação que só faz efeito daqui a cinco minutos é uma revogação que não
 * serve para o caso em que se revoga, que é alguém ter levado a chave.
 */
export type EstadoDaChave = 'valida' | 'revogada' | 'expirada';

export function estadoDaChave(
  chave: { readonly revogadaEm: Date | null; readonly expiraEm: Date },
  agora: Date,
): EstadoDaChave {
  // Revogada primeiro: uma chave revogada E expirada é revogada, porque foi
  // isso que alguém fez. A ordem importa para quem lê o registo depois.
  if (chave.revogadaEm !== null && chave.revogadaEm <= agora) return 'revogada';
  if (chave.expiraEm <= agora) return 'expirada';
  return 'valida';
}

/**
 * O destino de um webhook nosso é seguro?
 *
 * ── Um campo onde o cliente escreve um URL ────────────────────────────────
 *
 * …é um campo onde o cliente pode pedir ao nosso servidor que vá ler o que só
 * ele vê. Serviços de metadados na nuvem, painéis internos, bases sem
 * autenticação porque «só se chega de dentro».
 *
 * O que esta função recusa, e porquê cada um:
 *
 * | recusa | porquê |
 * | --- | --- |
 * | não-`https` | o corpo assinado vai em claro pela rede de quem estiver no caminho |
 * | `localhost`, `127.*`, `::1` | o nosso próprio servidor |
 * | `10.*`, `172.16-31.*`, `192.168.*` | rede privada |
 * | `169.254.*` | link-local — é aqui que vivem os metadados da nuvem |
 * | `*.internal`, `*.local` | nomes que só resolvem de dentro |
 *
 * **E não basta chamá-la uma vez.** O redireccionamento é a outra metade: um
 * destino público que responde `302` para `169.254.169.254` faz o pedido chegar
 * lá na mesma. Quem segue redireccionamentos volta a chamar isto em cada salto —
 * ver `seguroParaSeguir` no motor.
 */
export function destinoPermitido(url: string): { ok: true } | { ok: false; razao: string } {
  let alvo: URL;
  try {
    alvo = new URL(url);
  } catch {
    return { ok: false, razao: 'endereco_invalido' };
  }

  if (alvo.protocol !== 'https:') return { ok: false, razao: 'so_https' };

  const anfitriao = alvo.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (anfitriao === 'localhost' || anfitriao === '::1' || anfitriao.endsWith('.localhost')) {
    return { ok: false, razao: 'rede_interna' };
  }
  if (anfitriao.endsWith('.internal') || anfitriao.endsWith('.local')) {
    return { ok: false, razao: 'rede_interna' };
  }

  const octetos = anfitriao.split('.');
  if (octetos.length === 4 && octetos.every((o) => /^\d{1,3}$/.test(o))) {
    const [a, b] = octetos.map(Number) as [number, number, number, number];
    const privado =
      a === 127 || a === 0 || a === 10
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 169 && b === 254);
    if (privado) return { ok: false, razao: 'rede_interna' };
  }

  // ── IPv6, e o mapeamento que quase me passou ao lado ──────────────────
  //
  // `https://[::ffff:127.0.0.1]/` é `127.0.0.1` escrito de outra maneira, e
  // passa por cima de qualquer verificação feita sobre pontos. A primeira
  // versão desta função procurava a cadeia `::ffff:127.` — e **não funcionava**,
  // porque o `URL` do Node normaliza o anfitrião para hexadecimal antes de
  // no-lo dar: sai `[::ffff:7f00:1]`.
  //
  // Medido, e o teste apanhou-o à primeira corrida. É a mesma família das três
  // aspas do `validar-alergenios.sh`: cobrir UMA forma de escrever o valor e
  // chamar-lhe cobertura. Agora desdobra-se o mapeamento de volta em quatro
  // octetos e mede-se a propriedade, não a grafia.
  if (anfitriao.includes(':')) {
    if (anfitriao === '::1' || anfitriao.startsWith('fc') || anfitriao.startsWith('fd')
        || anfitriao.startsWith('fe80')) {
      return { ok: false, razao: 'rede_interna' };
    }
    const mapeado = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(anfitriao);
    if (mapeado) {
      const alto = parseInt(mapeado[1] as string, 16);
      const baixo = parseInt(mapeado[2] as string, 16);
      const a = alto >> 8;
      const b = alto & 0xff;
      const privado =
        a === 127 || a === 0 || a === 10
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168)
        || (a === 169 && b === 254);
      void baixo;
      if (privado) return { ok: false, razao: 'rede_interna' };
    }
  }

  return { ok: true };
}

/**
 * Os dois dinheiros, lado a lado e **nunca somados**.
 *
 * ── Porque é que isto é um tipo e não dois números ────────────────────────
 *
 * Cobrar a assinatura ao restaurante não é cobrar o jantar ao cliente: contas
 * diferentes, provedores possivelmente diferentes, conciliações separadas.
 *
 * Se fossem dois números soltos, mais cedo ou mais tarde alguém escrevia
 * `a + b` — e o total responde a uma pergunta que ninguém faz enquanto esconde
 * as duas que se fazem: «quanto facturou a casa» e «quanto é que ela me paga».
 *
 * Aqui não há `total`. Não é que ninguém o calcule: é que não existe.
 */
export interface DoisDinheiros {
  /** O que a casa facturou aos clientes dela. */
  readonly daCasaMenor: number;
  /** O que a casa nos paga de assinatura. */
  readonly doSaasMenor: number;
  readonly moeda: string;
}

export function doisDinheiros(
  daCasaMenor: number, doSaasMenor: number, moeda: string,
): DoisDinheiros {
  return { daCasaMenor, doSaasMenor, moeda };
}

/**
 * A redacção de um corpo antes de ele chegar ao registo (INT-010).
 *
 * Um registo de integração é a primeira coisa que alguém abre quando algo falha,
 * e é onde as credenciais aparecem sem ninguém as ter posto lá: no cabeçalho de
 * autorização que se copiou «para o caso de ser útil».
 *
 * A lista é de CHAVES a esconder, e não de valores a procurar. Procurar valores
 * exigiria conhecê-los, e o que se procura é justamente o que não se conhece.
 */
const CHAVES_SENSIVEIS = [
  'authorization', 'password', 'senha', 'secret', 'segredo', 'token',
  'apikey', 'api_key', 'chave', 'assinatura', 'signature',
];

export function redigir(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(redigir);
  if (valor !== null && typeof valor === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      saida[k] = CHAVES_SENSIVEIS.includes(k.toLowerCase()) ? '[redigido]' : redigir(v);
    }
    return saida;
  }
  return valor;
}
