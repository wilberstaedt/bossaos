import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Cliente Prisma do RUNTIME.
 *
 * A separação de credenciais do aceite 2 do E01 não é aqui uma convenção que
 * alguém tem de lembrar: em Prisma 7 a URL saiu do schema, e por isso ela vive
 * em dois sítios diferentes e incomunicáveis do código —
 *
 *   - `prisma.config.ts` → `MIGRATION_DATABASE_URL`, a credencial que ALTERA o
 *     schema. Só os comandos `prisma migrate` passam por lá.
 *   - este ficheiro       → `DATABASE_URL`, a credencial do runtime, entregue
 *     explicitamente ao adaptador. Não tem DDL (ver `scripts/dev-db.sh`).
 *
 * Não há caminho pelo qual o runtime alcance a credencial de migração por
 * distração, porque não há sítio nenhum onde ele a leia.
 */
let cliente: PrismaClient | undefined;

export function obterPrisma(databaseUrl: string): PrismaClient {
  cliente ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  return cliente;
}

/** Só para testes: força a próxima chamada a construir um cliente novo. */
export function esquecerPrisma(): void {
  cliente = undefined;
}

export type EstadoBase =
  | { ok: true; migrado: boolean; schemaVersion: string | null }
  | { ok: false; erro: string };

/**
 * Prontidão real (CT-03: "uma falha de infraestrutura deve retornar
 * indisponibilidade real; não simular banco saudável").
 *
 * Faz DUAS perguntas, porque uma sozinha engana:
 *  1. a base responde? (`SELECT 1` responde numa base vazia — não basta);
 *  2. este schema chegou cá? (lê `app_meta`, que só existe depois da migração).
 */
export async function verificarBase(prisma: PrismaClient): Promise<EstadoBase> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.name : 'erro desconhecido' };
  }
  try {
    const linha = await prisma.appMeta.findUnique({ where: { key: 'schema_version' } });
    return { ok: true, migrado: linha !== null, schemaVersion: linha?.value ?? null };
  } catch {
    // A base responde mas a tabela não existe: schema por migrar. Isto é um
    // estado REAL e distinto de "base em baixo" — e é o que um deploy sem
    // migração produz.
    return { ok: true, migrado: false, schemaVersion: null };
  }
}

export {
  comEscopo, comIdentidade, identidadePorEmail,
  type ClienteComEscopo, type ClienteComIdentidade, type Escopo,
} from './escopo.ts';

export {
  listarMarcas, obterMarca, criarMarca,
  listarUnidades, obterUnidade, criarUnidade,
  papeisDaFiliacao, filiacoesDaOrganizacao,
  organizacoesDoUtilizador, filiacoesDoUtilizador, euProprio,
  type DadosDeMarca, type DadosDeUnidade,
} from './repositorios.ts';

export { PrismaClient };
