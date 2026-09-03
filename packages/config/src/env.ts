import { z } from 'zod';

/**
 * Validação da configuração obrigatória (E01, critério de aceite 3).
 *
 * Duas regras que moldam este ficheiro:
 *
 *  1. **Falta configuração → falha com mensagem útil.** Não se arranca com um
 *     valor por omissão inventado: um serviço que arranca sem base de dados
 *     mente sobre a sua própria saúde, e é isso que o CT-03 chama de
 *     indisponibilidade real.
 *  2. **A mensagem NUNCA mostra o valor.** Dizer `DATABASE_URL inválida:
 *     postgresql://user:senha@host/db` põe a credencial no log, no CI e em
 *     qualquer captura de ecrã. Diz-se o NOME da variável e o que se esperava,
 *     nunca o conteúdo.
 */

const urlPostgres = z
  .string()
  .min(1)
  .refine((v) => v.startsWith('postgresql://') || v.startsWith('postgres://'), {
    message: 'tem de ser uma ligação PostgreSQL (postgresql://…)',
  });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Credencial de EXECUÇÃO: só DML. Não pode alterar o schema (E01, aceite 2). */
  DATABASE_URL: urlPostgres,
  /**
   * Credencial de MIGRAÇÃO: só usada pelos comandos de migração, nunca pelo
   * runtime. Separada de propósito — CT-04. Opcional no processo de execução
   * precisamente porque este não deve tê-la.
   */
  MIGRATION_DATABASE_URL: urlPostgres.optional(),
  /**
   * Credencial da AUTENTICAÇÃO GLOBAL (E04). O terceiro acesso do CT-04: vê
   * identidades e sessões, e não vê uma linha de inquilino. Separada da de
   * runtime de propósito — o processo que serve o catálogo de um restaurante
   * não precisa de conseguir ler a sessão de ninguém.
   */
  AUTH_DATABASE_URL: urlPostgres,

  /** Segredo da biblioteca de autenticação. Nunca aparece em log nem em erro. */
  BETTER_AUTH_SECRET: z.string().min(32, 'tem de ter pelo menos 32 caracteres'),
  BETTER_AUTH_URL: z.string().url(),
  /** Validade de um convite, em horas. Configuração, não constante no código. */
  CONVITE_VALIDADE_HORAS: z.coerce.number().int().positive().default(72),

  /** Serviço de e-mail de teste em desenvolvimento (Mailpit). */
  SMTP_HOST: z.string().min(1).default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_FROM: z.string().min(3).default('bossaos-dev@localhost'),

  /** Porta de média: em desenvolvimento é o disco local. */
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().min(1).default('.storage'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type Env = z.infer<typeof schema>;

export class EnvError extends Error {
  // Campo declarado e atribuído à mão, e não com `constructor(public readonly
  // problems)`: propriedade-de-parâmetro é das poucas construções TypeScript
  // que não se resolvem apagando tipos, e o Node em `--experimental-strip-types`
  // só apaga. Com o açúcar, este ficheiro nem sequer importava.
  readonly problems: string[];

  constructor(problems: string[]) {
    super(
      [
        'Configuração inválida. Corrija as variáveis abaixo e volte a arrancar.',
        ...problems.map((p) => `  · ${p}`),
        '',
        'Consulte .env.example. Os valores não são mostrados aqui de propósito:',
        'uma mensagem de erro que imprime a credencial é uma fuga de credencial.',
      ].join('\n'),
    );
    this.name = 'EnvError';
    this.problems = problems;
  }
}

/**
 * Lê e valida. `source` existe para os testes poderem correr sem tocar no
 * `process.env` do processo — e para provar que a mensagem não vaza valores.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.safeParse(source);
  if (parsed.success) return parsed.data;

  const problems = parsed.error.issues.map((issue) => {
    const nome = issue.path.join('.') || '(raiz)';
    return `${nome}: ${issue.message}`;
  });
  throw new EnvError(problems);
}
