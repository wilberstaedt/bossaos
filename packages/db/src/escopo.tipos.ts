import type { PrismaClient } from '@prisma/client';
import type { ClienteComEscopo, ClienteComIdentidade } from './escopo.ts';
import { listarMarcas, organizacoesDoUtilizador } from './repositorios.ts';

/**
 * Guarda de TIPOS — corre no compilador, não em tempo de execução.
 *
 * `@ts-expect-error` obriga o erro a existir: se alguém enfraquecer
 * `ClienteComEscopo` e o `PrismaClient` solto passar a compilar, o TypeScript
 * reclama que o `@ts-expect-error` está por usar e o `pnpm typecheck` fica
 * vermelho. É o único controlo negativo que um teste em tempo de execução não
 * consegue dar: a garantia aqui é que o código errado **não compila**.
 *
 * Isto importa porque o modo de falha do E03 é silencioso — uma consulta fora do
 * contexto devolve vazio, não estoira. Apanhá-la no compilador é apanhá-la antes
 * de existir.
 */

export function passarClienteSemEscopoNaoCompila(prisma: PrismaClient): void {
  // @ts-expect-error — um PrismaClient solto não tem contexto de inquilino.
  listarMarcas(prisma);
}

export function passarClienteDeIdentidadeOndeSePedeEscopoNaoCompila(
  db: ClienteComIdentidade,
): void {
  // @ts-expect-error — identidade não é escopo de organização: são portas distintas.
  listarMarcas(db);
}

export function passarClienteComEscopoOndeSePedeIdentidadeNaoCompila(
  db: ClienteComEscopo,
): void {
  // @ts-expect-error — e o contrário também não.
  organizacoesDoUtilizador(db);
}

/** O uso correcto compila. Sem isto, os três acima passariam com tudo partido. */
export function oUsoCorrectoCompila(db: ClienteComEscopo, id: ClienteComIdentidade): void {
  void listarMarcas(db);
  void organizacoesDoUtilizador(id);
}
