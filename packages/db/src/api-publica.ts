import type { PrismaClient } from '@prisma/client';
import { redigir, type Escopo } from '@bossaos/domain';
import { comEscopo } from './escopo.ts';
import { RecusaDaIntegracao, resumirChave, verificarChave } from './integracoes.ts';

/**
 * A API pública — **antes de haver inquilino**.
 *
 * ── Porque é um ficheiro à parte, como a reserva e o kiosk ────────────────
 *
 * Quem chega traz uma chave e mais nada. A que organização ela pertence é
 * justamente o que a chave responde — e por isso a camada web não pode abrir
 * escopo: ela ainda não sabe qual.
 *
 * A primeira versão disto vivia em `apps/web/src/api-publica.ts` e chamava
 * `comEscopo` lá. A `rotas-com-porta.test.ts` reprovou, e pela mesma razão que
 * reprovou o kiosk no E31: numa superfície sem sessão, a camada web passa por
 * portas estreitas **e por mais nada**. É a segunda vez que esta guarda me
 * corrige na mesma coisa, o que diz que a lição é minha e não da guarda.
 */

/** Quem chamou, depois de a chave ser aceite **para uma operação**. */
export interface Autorizado {
  readonly organizationId: string;
  readonly chaveId: string;
  readonly nome: string;
}

/**
 * Resolve uma chave apresentada e autoriza-a **para esta operação**.
 *
 * O `precisa` é obrigatório. Não há como chamar isto sem dizer para quê, e é
 * essa a diferença entre verificar por operação e verificar à entrada: um
 * portão único no início é um portão que a próxima rota esquece.
 */
export async function autorizarChave(
  prisma: PrismaClient, valor: string, precisa: Escopo,
): Promise<Autorizado> {
  // ── A ordem que isto resolve, e porque precisa de uma PORTA ────────────
  //
  // A `api_keys` tem RLS por organização, e a organização é justamente o que
  // ainda não se sabe. Uma leitura directa aqui não devolve nada: sem
  // `app.organization_id`, a política não deixa ver linha nenhuma.
  //
  // A primeira versão fazia essa leitura directa. Passava nas provas de base —
  // onde o cliente é o dono da tabela e passa por cima da política — e dava 401
  // no navegador, com a credencial de runtime a sério.
  //
  // A `organizacao_da_chave` é `SECURITY DEFINER` e devolve **só o
  // identificador da organização**: nem o resumo, nem os âmbitos, nem o prazo.
  // Quem chama ainda não provou nada. A verificação a sério é a seguir, dentro
  // do escopo.
  //
  // E o resumo calcula-se em Node, não com `digest()` do `pgcrypto`: fazer a
  // autenticação depender de uma extensão instalada é uma dependência que
  // ninguém vê até ao dia em que a base de destino não a tem.
  const linhas = await prisma.$queryRaw<{ organizacao_da_chave: string | null }[]>`
    SELECT organizacao_da_chave(${resumirChave(valor)})`;
  const org = linhas[0]?.organizacao_da_chave;
  if (!org) throw new RecusaDaIntegracao('CHAVE_DESCONHECIDA');

  return comEscopo(prisma, { organizationId: org }, async (db) => {
    const chave = await verificarChave(db, valor, precisa);
    await db.apiKey.update({ where: { id: chave.id }, data: { ultimoUsoEm: new Date() } });
    return { organizationId: chave.organizationId, chaveId: chave.id, nome: chave.nome };
  });
}

/**
 * O rasto de uma chamada. **Sem segredos, e com QUEM chamou.**
 *
 * A redacção corre aqui, antes de o corpo chegar à base — não na leitura. Um
 * registo que guarda o segredo e o esconde ao mostrar é um registo que tem o
 * segredo.
 */
export async function registarChamadaPublica(
  prisma: PrismaClient,
  autorizado: Autorizado,
  accao: string,
  resultado: string,
  detalhe: unknown,
) {
  await comEscopo(prisma, { organizationId: autorizado.organizationId }, (db) =>
    db.integrationLog.create({
      data: {
        organizationId: autorizado.organizationId,
        apiKeyId: autorizado.chaveId,
        accao, resultado,
        detalhe: redigir(detalhe) as object,
      },
    }));
}

/** A carta e os pedidos, já dentro do escopo que a chave resolveu. */
export function comOEscopoDaChave<T>(
  prisma: PrismaClient, autorizado: Autorizado,
  fn: Parameters<typeof comEscopo<T>>[2],
): Promise<T> {
  return comEscopo(prisma, { organizationId: autorizado.organizationId }, fn);
}
