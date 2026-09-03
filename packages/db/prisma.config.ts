import { defineConfig } from 'prisma/config';

/**
 * Configuração das MIGRAÇÕES (Prisma 7).
 *
 * Este ficheiro é a casa da credencial que pode alterar o schema, e é o único
 * sítio onde ela aparece. O runtime nunca passa por aqui: recebe a `DATABASE_URL`
 * pelo adaptador em `src/index.ts`, e essa credencial não tem DDL.
 *
 * Se `MIGRATION_DATABASE_URL` faltar, os comandos de migração falham a dizer o
 * nome da variável — nunca o seu valor.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.MIGRATION_DATABASE_URL ?? '',
  },
});
