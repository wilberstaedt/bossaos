import 'server-only';
import { criarLogger, loadEnv, type Env, type Logger } from '@bossaos/config';
import { obterPrisma, verificarBase, type EstadoBase, type PrismaClient } from '@bossaos/db';
import { ArmazenamentoLocal } from '@bossaos/storage';
import type { PortaDeMedia } from '@bossaos/domain';

/**
 * Composição do lado do servidor.
 *
 * `loadEnv()` corre à primeira utilização e ATIRA se faltar configuração
 * obrigatória (E01, aceite 3). Não há valor por omissão a fingir de base de
 * dados: um processo que arranca sem `DATABASE_URL` e responde "saudável" é
 * exactamente a mentira que o CT-03 proíbe.
 *
 * `import 'server-only'` faz o build FALHAR se algum componente de cliente
 * importar este ficheiro — é o que impede a configuração de escorregar para o
 * pacote que vai para o browser.
 */
let env: Env | undefined;
export function obterEnv(): Env {
  env ??= loadEnv();
  return env;
}

let logger: Logger | undefined;
export function obterLogger(): Logger {
  logger ??= criarLogger({ nivel: obterEnv().LOG_LEVEL });
  return logger;
}

export function obterBase(): PrismaClient {
  return obterPrisma(obterEnv().DATABASE_URL);
}

let media: PortaDeMedia | undefined;
export function obterMedia(): PortaDeMedia {
  const e = obterEnv();
  if (e.STORAGE_DRIVER !== 'local') {
    // Pendência declarada, e não um duplo silencioso: o condutor remoto entra na
    // etapa que o desenha. Falhar aqui é preferível a servir um armazenamento
    // local a pensar que é o remoto.
    throw new Error(`condutor de armazenamento "${e.STORAGE_DRIVER}" ainda não implementado`);
  }
  media ??= new ArmazenamentoLocal(e.STORAGE_LOCAL_DIR);
  return media;
}

export { verificarBase, type EstadoBase };
