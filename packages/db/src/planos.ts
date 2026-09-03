import {
  decidirCapacidade,
  type Capacidade,
  type ConcessaoDeCapacidade,
  type Flag,
  type Intencao,
  type ResultadoDeCapacidade,
} from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * Resolução de plano, concessões e flags.
 *
 * O CT-02 pede uma **política única**: plano, adicionais, overrides, validade e
 * escopo da unidade resolvidos num sítio só. Espalhá-los por cada rota é como
 * três sítios acabam a responder coisas diferentes à mesma pergunta.
 */

export interface EstadoComercial {
  planoCodigo: string | null;
  planoNome: string | null;
  estadoSubscricao: string | null;
  validoAte: Date | null;
  descerParaPlano: string | null;
  descerEm: Date | null;
  concessoes: readonly ConcessaoDeCapacidade[];
  flags: ReadonlyMap<string, boolean>;
}

/**
 * Lê tudo o que decide o que esta organização pode.
 *
 * As concessões vêm de duas origens e somam-se como LISTA, não como número:
 * as do plano contratado e as linhas explícitas de `EntitlementGrant`
 * (adicionais e piloto). Quem decide o que fazer com elas é
 * `decidirCapacidade`, no domínio — aqui só se lê.
 */
export async function estadoComercial(
  db: ClienteComEscopo,
  organizationId: string,
): Promise<EstadoComercial> {
  const [subscricao, concessoesExplicitas, flags] = await Promise.all([
    db.subscription.findFirst({
      where: { organizationId },
      select: {
        estado: true,
        validoAte: true,
        descerEm: true,
        plan: { select: { codigo: true, nome: true, capacidades: { select: { capacidade: true, quota: true } } } },
      },
    }),
    db.entitlementGrant.findMany({
      select: { capacidade: true, quota: true, locationId: true, validoAte: true },
    }),
    db.featureFlag.findMany({ select: { nome: true, ligada: true, organizationId: true } }),
  ]);

  const doPlano: ConcessaoDeCapacidade[] =
    // Uma subscrição SUSPENSA ou CANCELADA não concede nada. Não se apagam as
    // linhas — perde-se o direito, não o histórico.
    subscricao && subscricao.estado === 'ACTIVA'
      ? subscricao.plan.capacidades.map((c) => ({
          capacidade: c.capacidade as Capacidade,
          quota: c.quota,
          ...(subscricao.validoAte ? { validoAte: subscricao.validoAte } : {}),
        }))
      : [];

  const explicitas: ConcessaoDeCapacidade[] = concessoesExplicitas.map((c) => ({
    capacidade: c.capacidade as Capacidade,
    quota: c.quota,
    ...(c.locationId ? { locationId: c.locationId } : {}),
    ...(c.validoAte ? { validoAte: c.validoAte } : {}),
  }));

  // Uma flag da organização vence a global: é assim que se liberta um módulo a
  // um cliente antes de todos.
  const mapa = new Map<string, boolean>();
  for (const f of flags.filter((f) => f.organizationId === null)) mapa.set(f.nome, f.ligada);
  for (const f of flags.filter((f) => f.organizationId !== null)) mapa.set(f.nome, f.ligada);

  return {
    planoCodigo: subscricao?.plan.codigo ?? null,
    planoNome: subscricao?.plan.nome ?? null,
    estadoSubscricao: subscricao?.estado ?? null,
    validoAte: subscricao?.validoAte ?? null,
    descerParaPlano: null,
    descerEm: subscricao?.descerEm ?? null,
    concessoes: [...doPlano, ...explicitas],
    flags: mapa,
  };
}

/**
 * Pergunta se a organização pode. É este o portão do E05.
 *
 * `usoActual` só é preciso em `criar` sobre uma capacidade quantitativa, e quem
 * chama tem de o contar — passar zero por omissão faria a quota nunca esgotar.
 */
export function podeCapacidade(
  estado: EstadoComercial,
  pedido: {
    capacidade: Capacidade;
    intencao: Intencao;
    usoActual?: number;
    locationId?: string;
    flag?: string;
  },
): ResultadoDeCapacidade {
  const flag: Flag | undefined = pedido.flag
    ? { nome: pedido.flag, ligada: estado.flags.get(pedido.flag) ?? false }
    : undefined;

  return decidirCapacidade({
    capacidade: pedido.capacidade,
    intencao: pedido.intencao,
    concessoes: estado.concessoes,
    ...(pedido.usoActual !== undefined ? { usoActual: pedido.usoActual } : {}),
    ...(pedido.locationId ? { locationId: pedido.locationId } : {}),
    ...(flag ? { flag } : {}),
  });
}

/** Quantas unidades esta organização já tem. Para a quota de `unidades`. */
export function contarUnidades(db: ClienteComEscopo): Promise<number> {
  return db.location.count({ where: { archivedAt: null } });
}

export function contarPessoas(db: ClienteComEscopo): Promise<number> {
  return db.membership.count({ where: { estado: 'ACTIVO' } });
}

/** O catálogo de planos, para o selector. Leitura global, sem inquilino. */
export function catalogoDePlanos(db: ClienteComEscopo) {
  return db.planDefinition.findMany({
    where: { publico: true },
    orderBy: { ordem: 'asc' },
    select: {
      codigo: true, nome: true, promessa: true,
      capacidades: { select: { capacidade: true, quota: true } },
    },
  });
}
