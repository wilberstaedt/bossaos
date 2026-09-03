/**
 * O fecho da semeadura do arnês. Corre depois da passagem do navegador.
 *
 * **Verifica-se a si próprio.** Uma limpeza que corre e não limpa é pior do que
 * não haver limpeza nenhuma: a passagem seguinte encontra a base suja e culpa o
 * código que está a medir. Por isso conta os restos e sai a não-zero se ficou
 * alguma coisa — falhar alto, como o resto do projecto.
 */

import { abrirPrisma, limpar, restos } from './inspeccao-comum.ts';

const prisma = abrirPrisma();
try {
  await limpar(prisma);
  const ficaram = await restos(prisma);
  if (ficaram !== 0) {
    console.error(`limpeza da inspecção: ficaram ${ficaram} linhas por apagar`);
    process.exitCode = 1;
  } else {
    console.log('limpeza da inspecção: nada ficou para trás');
  }
} finally {
  await prisma.$disconnect();
}
