import { execFileSync } from 'node:child_process';

/**
 * Apaga a semeadura depois da passagem do navegador.
 *
 * ── Porque é que isto existe ───────────────────────────────────────────────
 *
 * A semeadura limpava só a passagem **anterior**, ao arrancar. Ficava um segundo
 * cenário publicado na base, e `provar-publico.sh` corria por cima dele. Era o
 * único sítio do projecto onde quem faz a sujidade não a apanhava.
 *
 * Num processo à parte pela mesma razão que a semeadura: usa a credencial de
 * MIGRAÇÃO, e o arnês do navegador não tem — nem deve ter — razão para a
 * carregar no seu próprio processo.
 */
export default function limpar(): void {
  execFileSync(
    'node',
    ['--experimental-strip-types', 'packages/db/prisma/limpar-inspeccao.ts'],
    { stdio: 'inherit' },
  );
}
