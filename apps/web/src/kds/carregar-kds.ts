import { notFound, redirect } from 'next/navigation';
import { listarUnidades, listarEstacoes } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido, actorDoPedido, organizacoesDoActor } from '../sessao.ts';

/**
 * O que a casca do KDS precisa, e precisa igual em todas as telas.
 *
 * ── A unidade vem por IDENTIFICADOR, como no Staff ────────────────────────
 *
 * O atlas põe o KDS em `/kds/[locationId]/[stationId]`, e é a escolha certa pela
 * mesma razão do E15: o endereço fica fixo no tablet da cozinha, muitas vezes em
 * modo quiosque, e um `slug` que mude porque o dono renomeou a unidade deixava o
 * ecrã da cozinha a apontar para nada — a meio de um serviço.
 */
export async function carregarKds(idioma: string, locationId: string) {
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const organizacoes = await organizacoesDoActor(actor.id);
  for (const org of organizacoes) {
    const sessao = await resolverPedido(org.slug);
    if (!sessao.ok) continue;
    const achado = await comEscopoDoPedido(sessao, async (db) => {
      const unidades = await listarUnidades(db);
      return unidades.find((u: { id: string }) => u.id === locationId) ?? null;
    });
    if (achado) {
      const estacoes = await comEscopoDoPedido(sessao, (db) => listarEstacoes(db, achado.id));
      return { sessao, actor, orgSlug: org.slug, unidade: achado, estacoes };
    }
  }
  // Ausência, e não «proibido». A diferença entre 404 e 403 é um oráculo de
  // existência — é a regra do E04 e vale igual aqui.
  notFound();
}

/**
 * A estação pedida no endereço, dentro desta unidade.
 *
 * Devolve `null` quando não existe **ou não é desta unidade**. A segunda metade
 * importa: um `stationId` de outra unidade da mesma organização passa a política
 * de linha, e sem esta verificação o ecrã da cozinha de um restaurante mostrava
 * os bilhetes de outro.
 */
export function estacaoDaUnidade<T extends { id: string }>(
  estacoes: readonly T[], stationId: string,
): T | null {
  return estacoes.find((e) => e.id === stationId) ?? null;
}

/**
 * O «agora» com que os temporizadores contam. **Do relógio da BASE.**
 *
 * ── Porque é que não é `new Date()` ───────────────────────────────────────
 *
 * O contrato diz «carimbo do servidor», e o carimbo de criação de uma tarefa é
 * escrito pelo `now()` do PostgreSQL. Se o «agora» viesse do relógio do processo
 * Node, a subtracção juntava **dois relógios diferentes** — e num contentor com
 * o relógio a derivar, o tempo de todos os bilhetes ficava errado sem ninguém
 * ver erro nenhum.
 *
 * Dois carimbos da mesma fonte, ou a conta não quer dizer nada. É a mesma razão
 * pela qual o `minutosDecorridos` recebe os dois em vez de ir buscar um.
 */
export async function agoraNoServidor(
  sessao: Awaited<ReturnType<typeof carregarKds>>['sessao'],
): Promise<number> {
  const linhas = await comEscopoDoPedido(sessao,
    (db) => db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`);
  return (linhas[0]?.agora ?? new Date()).getTime();
}
