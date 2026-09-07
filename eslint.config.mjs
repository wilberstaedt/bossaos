import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from 'eslint-config-next';

/**
 * Lint do workspace.
 *
 * Corre SEPARADO da verificação de tipos (E01, aceite 1): são perguntas
 * diferentes e falham por motivos diferentes. `pnpm lint` não substitui
 * `pnpm typecheck`, e o contrário também não — juntá-los num comando só faz com
 * que a primeira falha esconda a segunda.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      // A pasta de build de quem mede em paralelo (`NEXT_DIST_DIR`, em
      // apps/web/next.config.ts). Sem esta linha o `pnpm lint` entra no build e
      // devolve 32 762 erros de código gerado — que não são do repositório e
      // afogam os que são. Medido a 07/09: com a pasta presente, 100% dos erros
      // vinham de lá.
      '**/.next-*/**',
      '**/dist/**',
      '**/.storage/**',
      'packages/db/prisma/migrations/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next.flatConfig ? [next.flatConfig.coreWebVitals] : [],
  {
    // Utilitários de linha de comandos: correm no Node, não no browser. Sem isto
    // o lint acusa `process` e `console` de não existirem — que é verdade num
    // browser e falso aqui, e uma regra que dá o veredicto certo pelo motivo
    // errado ensina a ignorá-la.
    files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      // Variável começada por _ é intencionalmente não usada.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
