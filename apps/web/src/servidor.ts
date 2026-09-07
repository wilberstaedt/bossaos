import 'server-only';
import { criarLogger, loadEnv, type Env, type Logger } from '@bossaos/config';
import { notFound } from 'next/navigation';
import {
  ehIdentificadorMalFormado, obterPrisma, verificarBase, type EstadoBase, type PrismaClient,
} from '@bossaos/db';
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

/**
 * A base para quem desenha um ECRÃ sem sessão — kiosk e carta pública.
 *
 * ── RV100-024, a metade que o invólucro do pedido não alcança ─────────────
 *
 * As páginas com sessão passam pelo `comEscopoDoPedido`, e é lá que um
 * `IdentificadorMalFormado` vira 404. O kiosk e a carta pública não têm sessão
 * por desenho — não podem usar esse invólucro — e ficavam com o defeito todo:
 * um `[deviceId]` ou um `[produtoId]` mal formado no URL dava 500.
 *
 * Isto é o mesmo mecanismo para essa família: uma base que traduz. Não é o
 * `obterBase` porque esse também serve rotas de `api/`, e lá um 404 do Next
 * seria uma resposta errada a uma chamada que espera JSON — converter tudo era
 * trocar um defeito por outro mais calado.
 */
export function obterBaseDeEcra(): PrismaClient {
  return obterPrisma(obterEnv().DATABASE_URL).$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          try {
            return await query(args);
          } catch (erro) {
            if (ehIdentificadorMalFormado(erro)) notFound();
            throw erro;
          }
        },
      },
    },
  }) as unknown as PrismaClient;
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
