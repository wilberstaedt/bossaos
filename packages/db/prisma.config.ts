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
 *
 * Isto era falso até 2026-09-03. Estava `?? ''`, e o Prisma respondia
 * "Connection url is empty", que não diz qual variável nem onde a pôr. Medido a
 * correr `prisma migrate status` com a variável apagada. Um comentário que promete
 * o que o código não faz guia mal quem vier a seguir, e este passou pela minha
 * revisão do E01.
 */
function urlDeMigracao(): string {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) {
    throw new Error(
      'MIGRATION_DATABASE_URL em falta. É a credencial que altera o schema, ' +
        'e é diferente da DATABASE_URL do runtime. Ver .env.example.',
    );
  }
  return url;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: urlDeMigracao(),
  },
});
