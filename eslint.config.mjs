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
