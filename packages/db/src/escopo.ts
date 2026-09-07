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
/**
 * O identificador que vem de fora e não tem forma de identificador.
 *
 * ── RV100-024, e é uma CLASSE e não uma rota ──────────────────────────────
 *
 * Um segmento de URL que não seja UUID entra directo num `where` sobre uma
 * coluna `@db.Uuid`, o Postgres levanta `22P02`, o Prisma traduz para `P2023`,
 * e a página rebenta com 500 **antes** de chegar ao `notFound()` que ela já
 * tem escrito duas linhas abaixo. Medidas 128 páginas debaixo de um segmento
 * `[…Id]`; nenhuma valida a forma antes de consultar.
 *
 * A cura não é validar em 128 sítios — é reconhecer a falha no único sítio por
 * onde todas passam, e dar-lhe um NOME. Quem sabe traduzir um nome em resposta
 * HTTP é a camada web, e é lá que ele vira 404; aqui só se deixa de o confundir
 * com um erro de servidor.
 *
 * O `exigirUuid` acima faz o mesmo para os ids do ESCOPO, e há anos. O que
 * faltava era o mesmo cuidado para os ids que vêm da rota.
 */
export class IdentificadorMalFormado extends Error {
  // Campo declarado à mão, e não propriedade de parâmetro: o `--experimental-
  // strip-types` do Node não a suporta, e a casa corre as provas com ele.
  readonly causa: unknown;

  constructor(causa: unknown) {
    super('identificador com forma inválida');
    this.name = 'IdentificadorMalFormado';
    this.causa = causa;
  }
}

/**
 * `P2023` é o que o Prisma devolve para `InconsistentColumnData`, e é o que um
 * UUID mal formado produz. Verificado no runtime do cliente e não presumido:
 * `"InconsistentColumnData": return "P2023"`.
 */
export function ehIdentificadorMalFormado(erro: unknown): boolean {
  return typeof erro === 'object' && erro !== null
    && (erro as { code?: unknown }).code === 'P2023';
}

export async function comEscopo<T>(
  prisma: PrismaClient,
  escopo: Escopo,
  fn: (db: ClienteComEscopo) => Promise<T>,
): Promise<T> {
  exigirUuid('organizationId', escopo.organizationId);
  if (escopo.userId !== undefined) exigirUuid('userId', escopo.userId);

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.organization_id', ${escopo.organizationId}, true)`;
      if (escopo.userId !== undefined) {
        await tx.$executeRaw`SELECT set_config('app.user_id', ${escopo.userId}, true)`;
      }
      return fn(tx as unknown as ClienteComEscopo);
    });
  } catch (erro) {
    // Só o `P2023`. Um erro de base continua a ser um erro de base: converter
    // tudo em «não existe» esconderia uma falha real por trás de um 404, que é
    // o oposto do que isto serve.
    if (ehIdentificadorMalFormado(erro)) throw new IdentificadorMalFormado(erro);
    throw erro;
  }
}

/**
 * O mesmo, mas a **serializar as alterações de capacidade** de uma unidade.
 *
 * ── Duas coisas diferentes, e é por isso que são duas ──────────────────────
 *
 * O `serializable` faz o Postgres abortar transações cujo resultado não podia
 * sair de nenhuma ordem sequencial. O `pg_advisory_xact_lock` faz a segunda
 * ESPERAR pela primeira. A diferença aparece no que o cliente recebe:
 *
 *  - com o lock, quem chega em segundo lê o mundo já com a primeira reserva lá
 *    dentro, e recebe uma resposta de negócio — «não há capacidade»;
 *  - sem o lock, quem chega em segundo recebe um `40001`, que é uma resposta
 *    sobre a base de dados. É preciso repetir para a transformar numa resposta.
 *
 * O lock é por UNIDADE e não por mesa. É a granularidade grossa que o contrato
 * escolheu para o piloto — «optimizar granularidade somente após medir
 * contenção» — e é a certa: o que precisa de serializar é a CONTAGEM da zona,
 * que atravessa mesas.
 *
 * O `hashtext` é estável dentro de uma versão do Postgres, que é o que aqui
 * interessa: dois processos a falar com a MESMA base têm de calhar no mesmo
 * número. Não é para persistir.
 */
export async function comEscopoSerializavel<T>(
  prisma: PrismaClient,
  escopo: Escopo,
  chaveDeSerializacao: string,
  fn: (db: ClienteComEscopo) => Promise<T>,
  opcoes: { comLock?: boolean } = {},
): Promise<T> {
  exigirUuid('organizationId', escopo.organizationId);
  const comLock = opcoes.comLock !== false;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.organization_id', ${escopo.organizationId}, true)`;
    if (escopo.userId !== undefined) {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${escopo.userId}, true)`;
    }
    if (comLock) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${chaveDeSerializacao}))`;
    }
    return fn(tx as unknown as ClienteComEscopo);
  }, { isolationLevel: 'Serializable' });
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
  // O mesmo que no `comEscopo`, e pelo mesmo motivo: é o segundo funil por onde
  // ids de rota chegam à base, e uma rede com um buraco não é uma rede.
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
      return fn(tx as unknown as ClienteComIdentidade);
    });
  } catch (erro) {
    if (ehIdentificadorMalFormado(erro)) throw new IdentificadorMalFormado(erro);
    throw erro;
  }
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
