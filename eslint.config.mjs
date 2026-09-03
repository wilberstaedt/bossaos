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
      '**/dist/**',
      '**/.storage/**',
      'packages/db/prisma/migrations/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next.flatConfig ? [next.flatConfig.coreWebVitals] : [],
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
