import { execFileSync } from 'node:child_process';

/**
 * Semeia a base antes da passagem do navegador.
 *
 * Corre a semeadura num processo à parte de propósito: ela usa a credencial de
 * MIGRAÇÃO, e o arnês do navegador não tem — nem deve ter — razão para a
 * carregar no seu próprio processo. A separação de credenciais do E01 vale
 * também para as ferramentas.
 *
 * **Falha alto.** Uma inspecção que corre sobre uma base por semear mede a
 * página de "não encontrado" e diz verde — que é exactamente a classe de erro
 * que este projecto passa o tempo a fechar.
 */
export default function semear(): void {
  execFileSync(
    'node',
    ['--experimental-strip-types', 'packages/db/prisma/fixtures.ts'],
    { stdio: 'inherit' },
  );
  execFileSync(
    'node',
    ['--experimental-strip-types', 'packages/db/prisma/semente-inspeccao.ts'],
    { stdio: 'inherit' },
  );
}
