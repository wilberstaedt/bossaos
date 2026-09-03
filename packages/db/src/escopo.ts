import type { PrismaClient } from '@prisma/client';

/**
 * Contexto transaccional de inquilino.
 *
 * Tudo o que lê ou escreve dados de um restaurante passa por aqui. A razão está
 * escrita no `domain-model.md` e vale a pena repeti-la, porque é o modo de falha
 * mais silencioso do produto:
 *
 * > Uma consulta com escopo que corra **fora** desta transacção não rebenta. A
 * > política não encontra contexto, nega, e o Prisma devolve **lista vazia**.
 * > Vazio lê-se como "não há nada" — e o ecrã diz "sem produtos" a um
 * > restaurante que tem cem.
 *
 * Por isso o contexto não é uma convenção: é um tipo. `comEscopo` é o único
 * sítio do código que fabrica um `ClienteComEscopo`, e os repositórios só
 * aceitam esse. Passar o `PrismaClient` solto a um repositório **não compila**.
 */

declare const marcaDeEscopo: unique symbol;

/**
 * Cliente dentro de uma transacção com `app.organization_id` definido.
 *
 * A marca é fantasma — não existe em tempo de execução. Existe para que o
 * compilador saiba a diferença entre "um cliente" e "um cliente com contexto",
 * que é uma diferença que nenhum teste de integração apanha de graça.
 */
export type ClienteComEscopo = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
> & {
  readonly [marcaDeEscopo]: 'escopo';
};

/** O mesmo, para o caminho de identidade: `app.user_id`, sem organização. */
declare const marcaDeIdentidade: unique symbol;
export type ClienteComIdentidade = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
> & {
  readonly [marcaDeIdentidade]: 'identidade';
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function exigirUuid(nome: string, valor: string): void {
  if (!UUID.test(valor)) {
    // Falha alto e cedo. Um identificador com forma errada dentro do contexto
    // faria o `::uuid` da política rebentar a meio de uma consulta, e o erro
    // apareceria num sítio que não tem nada a ver com a causa.
    throw new Error(`${nome} não é um UUID`);
  }
}

export interface Escopo {
  organizationId: string;
  /** Opcional: quando presente, o caminho de identidade também fica disponível. */
  userId?: string;
}

/**
 * Corre `fn` dentro de uma transacção com o contexto de inquilino definido.
 *
 * O terceiro argumento `true` do `set_config` torna-o **local à transacção**:
 * não sobrevive ao commit nem ao rollback, e por isso não contamina a ligação
 * seguinte do pool. Sem ele, uma ligação reciclada levava o inquilino anterior —
 * a maneira mais silenciosa de mostrar a facturação de um restaurante a outro.
 */
export async function comEscopo<T>(
  prisma: PrismaClient,
  escopo: Escopo,
  fn: (db: ClienteComEscopo) => Promise<T>,
): Promise<T> {
  exigirUuid('organizationId', escopo.organizationId);
  if (escopo.userId !== undefined) exigirUuid('userId', escopo.userId);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.organization_id', ${escopo.organizationId}, true)`;
    if (escopo.userId !== undefined) {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${escopo.userId}, true)`;
    }
    return fn(tx as unknown as ClienteComEscopo);
  });
}

/**
 * Caminho de IDENTIDADE: `app.user_id` sem organização.
 *
 * Serve para a única pergunta que se faz antes de haver inquilino — "em que
 * organizações é que esta pessoa é membro?". As políticas de leitura por
 * identidade cobrem `users`, `memberships` e `organizations`, e mais nada:
 * marcas, unidades e papéis continuam a exigir contexto de organização.
 */
export async function comIdentidade<T>(
  prisma: PrismaClient,
  userId: string,
  fn: (db: ClienteComIdentidade) => Promise<T>,
): Promise<T> {
  exigirUuid('userId', userId);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx as unknown as ClienteComIdentidade);
  });
}

/**
 * Resolve um email numa identidade, antes de haver sessão.
 *
 * Passa pela função `identidade_por_email`, que é a interface mínima do CT-04 e
 * devolve **só o id**. Não há aqui um `findUnique` em `users` de propósito: sem
 * `app.user_id` a política nega, e é suposto negar — a tabela não é uma porta.
 */
export async function identidadePorEmail(
  prisma: PrismaClient,
  email: string,
): Promise<string | null> {
  const linhas = await prisma.$queryRaw<Array<{ id: string | null }>>`
    SELECT identidade_por_email(${email.trim().toLowerCase()}) AS id
  `;
  return linhas[0]?.id ?? null;
}
