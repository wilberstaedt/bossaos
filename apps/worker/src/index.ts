import { randomUUID } from 'node:crypto';
import { criarLogger, loadEnv, EnvError } from '@bossaos/config';
import { obterPrisma, verificarBase } from '@bossaos/db';

/**
 * Processo de fundo do BossaOS.
 *
 * Nesta etapa não processa nada: não há fila nem trabalho de domínio definido, e
 * inventá-los aqui seria escrever para deitar fora. O que ele faz é o que a base
 * executável precisa de ter provado antes de haver trabalho — arrancar com a
 * configuração validada, ligar-se à base com a credencial de EXECUÇÃO, e
 * dizer em voz alta, com `request_id`, se está apto.
 *
 * Se a configuração faltar, sai com código diferente de zero. Um processo de
 * fundo que arranca sem base de dados e fica em silêncio é pior que um que não
 * arranca: parece vivo no supervisor.
 */
const CICLO_MS = 30_000;

async function principal(): Promise<void> {
  let env;
  try {
    env = loadEnv();
  } catch (e) {
    if (e instanceof EnvError) {
      // A mensagem nomeia as variáveis e nunca imprime valores (E01, aceite 3).
      process.stderr.write(e.message + '\n');
      process.exit(78); // EX_CONFIG
    }
    throw e;
  }

  const log = criarLogger({ nivel: env.LOG_LEVEL });
  const prisma = obterPrisma(env.DATABASE_URL);
  log.info('worker: arrancou', { ciclo_ms: CICLO_MS });

  let parar = false;
  const encerrar = (sinal: string) => {
    log.info('worker: a encerrar', { sinal });
    parar = true;
  };
  process.on('SIGINT', () => encerrar('SIGINT'));
  process.on('SIGTERM', () => encerrar('SIGTERM'));

  while (!parar) {
    const ciclo = log.comRequestId(randomUUID());
    const estado = await verificarBase(prisma);

    if (!estado.ok) {
      ciclo.error('worker: base indisponivel', { erro: estado.erro });
    } else if (!estado.migrado) {
      ciclo.warn('worker: schema por migrar');
    } else {
      ciclo.debug('worker: apto', { schema_version: estado.schemaVersion });
    }

    await new Promise((r) => setTimeout(r, CICLO_MS));
  }

  await prisma.$disconnect();
  log.info('worker: terminou');
}

principal().catch((e: unknown) => {
  process.stderr.write(`worker: falha fatal: ${e instanceof Error ? e.name : 'desconhecida'}\n`);
  process.exit(1);
});
