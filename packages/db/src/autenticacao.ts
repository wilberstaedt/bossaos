import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Cliente da AUTENTICAÇÃO — o terceiro acesso do CT-04.
 *
 * Liga-se com `bossaos_auth`, que tem privilégios em `users`, `sessions`,
 * `accounts` e `verifications` e **em mais nada**. Verificado na base:
 * `SELECT count(*) FROM brands` com esta credencial devolve
 * `permission denied for table brands`.
 *
 * Existe separado de `obterPrisma` de propósito. Se fosse o mesmo cliente com
 * outra URL, um dia alguém passava o errado e nada ficava vermelho — os dois
 * funcionam, só que um vê coisas que não devia.
 */
let cliente: PrismaClient | undefined;

export function obterPrismaDeAutenticacao(authDatabaseUrl: string): PrismaClient {
  cliente ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: authDatabaseUrl, options: '-c timezone=UTC' }),
  });
  return cliente;
}
