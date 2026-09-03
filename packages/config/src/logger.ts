/**
 * Log com `request_id` e dados sensíveis redigidos (E01, entrega 4).
 *
 * Porque é escrito à mão e não é uma biblioteca: a redacção tem de ser a regra
 * do transporte, não uma opção que alguém se lembra de ligar. Uma biblioteca
 * com `redact` configurável falha silenciosamente no dia em que um campo novo
 * aparece com outro nome. Aqui a decisão é: **é sensível pelo NOME da chave**, e
 * a lista está num sítio só.
 */

const CHAVES_SENSIVEIS = [
  'password', 'senha', 'pass', 'secret', 'token', 'authorization', 'cookie',
  'apikey', 'api_key', 'accesstoken', 'refreshtoken', 'clientsecret',
  'database_url', 'migration_database_url', 'connectionstring', 'dsn',
  'creditcard', 'cardnumber', 'cvv', 'ssn', 'taxid',
];

const REDIGIDO = '[REDIGIDO]';

function chaveEhSensivel(chave: string): boolean {
  const c = chave.toLowerCase().replace(/[-_\s]/g, '');
  return CHAVES_SENSIVEIS.some((s) => c.includes(s.replace(/[-_]/g, '')));
}

/**
 * Uma URL com credencial embutida é sensível mesmo quando a chave não parece.
 * `{ upstream: "postgres://u:senha@host/db" }` passaria pela lista de nomes.
 */
function redigirUrlComCredencial(valor: string): string {
  return valor.replace(/(\w+:\/\/)[^:/@\s]+:[^@\s]+@/g, `$1${REDIGIDO}@`);
}

export function redigir(valor: unknown, profundidade = 0): unknown {
  if (profundidade > 8) return '[PROFUNDO DEMAIS]';
  if (valor === null || valor === undefined) return valor;
  if (typeof valor === 'string') return redigirUrlComCredencial(valor);
  if (typeof valor !== 'object') return valor;
  if (Array.isArray(valor)) return valor.map((v) => redigir(v, profundidade + 1));
  if (valor instanceof Error) {
    return { name: valor.name, message: redigirUrlComCredencial(valor.message) };
  }

  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    saida[k] = chaveEhSensivel(k) ? REDIGIDO : redigir(v, profundidade + 1);
  }
  return saida;
}

export type Nivel = 'debug' | 'info' | 'warn' | 'error';
const ORDEM: Record<Nivel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(msg: string, dados?: Record<string, unknown>): void;
  info(msg: string, dados?: Record<string, unknown>): void;
  warn(msg: string, dados?: Record<string, unknown>): void;
  error(msg: string, dados?: Record<string, unknown>): void;
  /** Deriva um logger que carimba o mesmo `request_id` em cada linha. */
  comRequestId(requestId: string): Logger;
}

export interface OpcoesLogger {
  nivel?: Nivel;
  requestId?: string;
  escrever?: (linha: string) => void;
}

export function criarLogger(opcoes: OpcoesLogger = {}): Logger {
  const nivel = opcoes.nivel ?? 'info';
  const escrever = opcoes.escrever ?? ((linha: string) => process.stdout.write(linha + '\n'));

  const emitir = (n: Nivel, msg: string, dados?: Record<string, unknown>) => {
    if (ORDEM[n] < ORDEM[nivel]) return;
    const linha = {
      ts: new Date().toISOString(),
      nivel: n,
      msg,
      ...(opcoes.requestId ? { request_id: opcoes.requestId } : {}),
      ...(dados ? (redigir(dados) as Record<string, unknown>) : {}),
    };
    escrever(JSON.stringify(linha));
  };

  return {
    debug: (m, d) => emitir('debug', m, d),
    info: (m, d) => emitir('info', m, d),
    warn: (m, d) => emitir('warn', m, d),
    error: (m, d) => emitir('error', m, d),
    comRequestId: (requestId) => criarLogger({ ...opcoes, requestId }),
  };
}
