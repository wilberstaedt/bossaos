import type { PrismaClient } from '@prisma/client';
import { comEscopo } from './escopo.ts';
import {
  confirmarReserva, disponibilidade, lerDefinicoes,
  type ResultadoDaConfirmacao,
} from './reservas.ts';
import { entrarNaEspera, esperaEstimada, posicaoNaEspera } from './espera.ts';

/**
 * A reserva pública: quem chega pela internet aberta, sem sessão nenhuma.
 *
 * ── Porque é que isto é um ficheiro à parte ────────────────────────────────
 *
 * Todo o resto do motor recebe um `ClienteComEscopo` — só existe depois de haver
 * inquilino. Aqui não há: o que existe é um endereço público. O inquilino sai da
 * porta estreita `unidade_publica`, e só depois se abre escopo.
 *
 * É a mesma forma do `abrirVisitante` do E17, e está aqui pela mesma razão: a
 * superfície pública não pode presumir um inquilino que ainda não resolveu.
 */

/** O limite da porta pública. Por unidade, por janela. */
export const JANELA_PUBLICA_SEGUNDOS = 3600;
export const MAXIMO_PUBLICO_POR_JANELA = 20;

export interface UnidadePublica {
  organizationId: string;
  locationId: string;
  nome: string;
  fuso: string | null;
  moeda: string | null;
  reservasActivas: boolean;
}

export async function unidadePublica(
  prisma: PrismaClient, slug: string,
): Promise<UnidadePublica | null> {
  const linhas = await prisma.$queryRaw<{
    organization_id: string; location_id: string; nome: string;
    fuso: string | null; moeda: string | null; reservas_activas: boolean;
  }[]>`SELECT * FROM unidade_publica(${slug})`;
  const l = linhas[0];
  if (!l) return null;
  return {
    organizationId: l.organization_id, locationId: l.location_id, nome: l.nome,
    fuso: l.fuso, moeda: l.moeda, reservasActivas: l.reservas_activas,
  };
}

export interface HorarioOferecido {
  quando: Date;
  cabe: boolean;
}

/**
 * As horas que a consulta oferece.
 *
 * ── É informativa, e a palavra tem consequências ───────────────────────────
 *
 * «Disponibilidade da tela nunca substitui verificação de servidor.» O que sai
 * daqui pode estar errado no instante em que é lido — a confirmação verifica
 * tudo outra vez, dentro da transacção, e pode recusar o que este ecrã ofereceu.
 *
 * É por isso que a função devolve `cabe`, e não `garantido`.
 */
export async function horariosPublicos(
  prisma: PrismaClient, unidade: UnidadePublica, dia: Date, pessoas: number,
): Promise<HorarioOferecido[]> {
  return comEscopo(prisma, { organizationId: unidade.organizationId }, async (db) => {
    const definicoes = await lerDefinicoes(db, unidade.locationId);
    if (!definicoes.activo) return [];
    const saida: HorarioOferecido[] = [];
    // De meia em meia hora, das 12h às 23h locais da unidade. É uma grelha de
    // piloto e está declarada como tal: os turnos do RES-B-014 mandam mais do
    // que isto, e ligá-los é a fatia seguinte.
    for (let h = 12; h <= 23; h += 1) {
      for (const m of [0, 30]) {
        const quando = new Date(Date.UTC(
          dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate(), h, m, 0));
        const d = await disponibilidade(
          db, unidade.locationId, quando, definicoes.duracaoPadraoMin, definicoes);
        saida.push({ quando, cabe: d.livres.some((mesa) => mesa.capacidade >= pessoas) });
      }
    }
    return saida;
  });
}

export type RecusaPublica =
  | { ok: false; motivo: 'DESCONHECIDA' }
  | { ok: false; motivo: 'DESLIGADO' }
  | { ok: false; motivo: 'MUITOS_PEDIDOS' }
  | { ok: false; motivo: 'SEM_MESA'; alternativas: Date[] };

export type ResultadoPublico =
  | { ok: true; reservaId: string; segredoDeGestao: string | undefined; repetida: boolean }
  | RecusaPublica;

/**
 * Confirma uma reserva vinda da rua.
 *
 * ── O caso feio, que é o que acontece a um sábado às 21h ───────────────────
 *
 * O ecrã ofereceu as 21h e, entre a oferta e o toque no botão, alguém ficou com
 * a última mesa. A confirmação **recusa**, e devolve alternativas — porque
 * «recusado» sozinho manda a pessoa recomeçar, e recomeçar é onde ela desiste.
 */
export async function reservarDaRua(
  prisma: PrismaClient, slug: string,
  pedido: {
    pessoas: number; inicio: Date; nome: string; contacto: string;
    notas?: string | null; aceitaMarketing?: boolean; chaveIdempotente: string;
  },
): Promise<ResultadoPublico> {
  const unidade = await unidadePublica(prisma, slug);
  // ── Não confirma existência ───────────────────────────────────────────
  //
  // Uma unidade que não existe e uma que não aceita reservas dão respostas
  // diferentes de propósito: a primeira é «não sei do que falas», e é a única
  // que o lado de fora consegue distinguir. O resto seria um catálogo.
  if (!unidade) return { ok: false, motivo: 'DESCONHECIDA' };
  if (!unidade.reservasActivas) return { ok: false, motivo: 'DESLIGADO' };

  const [cabe] = await prisma.$queryRaw<{ cabe_no_limite_publico: boolean }[]>`
    SELECT cabe_no_limite_publico(
      ${unidade.locationId}::uuid, ${JANELA_PUBLICA_SEGUNDOS}, ${MAXIMO_PUBLICO_POR_JANELA})
  `;
  if (!cabe?.cabe_no_limite_publico) return { ok: false, motivo: 'MUITOS_PEDIDOS' };

  const r: ResultadoDaConfirmacao = await confirmarReserva(
    prisma, { organizationId: unidade.organizationId },
    {
      locationId: unidade.locationId,
      pessoas: pedido.pessoas,
      inicio: pedido.inicio,
      nome: pedido.nome,
      contacto: pedido.contacto,
      notas: pedido.notas ?? null,
      aceitaMarketing: pedido.aceitaMarketing ?? false,
      origem: 'PUBLICO',
      chaveIdempotente: pedido.chaveIdempotente,
      criadaPor: 'publico',
    });

  if (!r.ok) return { ok: false, motivo: 'SEM_MESA', alternativas: r.alternativas };
  return { ok: true, reservaId: r.reservaId, segredoDeGestao: r.segredoDeGestao, repetida: r.repetida };
}

/** Entrar na lista de espera a partir da rua. */
export async function esperarDaRua(
  prisma: PrismaClient, slug: string,
  dados: { nome: string; contacto: string; pessoas: number },
): Promise<{ ok: true; esperaId: string } | RecusaPublica> {
  const unidade = await unidadePublica(prisma, slug);
  if (!unidade) return { ok: false, motivo: 'DESCONHECIDA' };
  if (!unidade.reservasActivas) return { ok: false, motivo: 'DESLIGADO' };

  const [cabe] = await prisma.$queryRaw<{ cabe_no_limite_publico: boolean }[]>`
    SELECT cabe_no_limite_publico(
      ${unidade.locationId}::uuid, ${JANELA_PUBLICA_SEGUNDOS}, ${MAXIMO_PUBLICO_POR_JANELA})
  `;
  if (!cabe?.cabe_no_limite_publico) return { ok: false, motivo: 'MUITOS_PEDIDOS' };

  const esperaId = await comEscopo(
    prisma, { organizationId: unidade.organizationId },
    (db) => entrarNaEspera(db, unidade.organizationId, unidade.locationId, dados));
  return { ok: true, esperaId };
}

/**
 * O que se diz a quem está na espera, visto da rua.
 *
 * Devolve a posição derivada e a estimativa **com a marca**. Quem mostrar isto
 * tem o `estimativa: true` na mão e não pode fingir que não sabe o que é.
 */
export async function estadoDaEsperaPublica(
  prisma: PrismaClient, slug: string, esperaId: string,
): Promise<{
  posicao: { posicao: number; de: number } | null;
  estimativa: { minutos: number; estimativa: true } | null;
} | null> {
  const unidade = await unidadePublica(prisma, slug);
  if (!unidade) return null;
  return comEscopo(prisma, { organizationId: unidade.organizationId }, async (db) => ({
    posicao: await posicaoNaEspera(db, unidade.locationId, esperaId),
    estimativa: await esperaEstimada(db, unidade.locationId, esperaId),
  }));
}


/**
 * A reserva de quem tem o link de gestão.
 *
 * ── Isto vive AQUI, e não na página ────────────────────────────────────────
 *
 * Escrevi esta consulta primeiro dentro do `RES-C-007`, com `comEscopo` na
 * própria página. O guardião do E09 acendeu, e tinha razão: uma tela pública com
 * escopo de inquilino no corpo é a forma mais curta de alguém copiar o padrão
 * para uma tela onde o inquilino não devia caber.
 *
 * A resolução do inquilino é a mesma de sempre — porta estreita primeiro, escopo
 * depois — e passa a estar num sítio só, onde se revê.
 */
export async function reservaPorSegredo(
  prisma: PrismaClient, slug: string, segredo: string,
): Promise<{ id: string; estado: string; pessoas: number; inicio: Date; nome: string } | null> {
  if (segredo === '') return null;
  const unidade = await unidadePublica(prisma, slug);
  if (!unidade) return null;
  const { createHash } = await import('node:crypto');
  return comEscopo(prisma, { organizationId: unidade.organizationId }, (db) =>
    db.reservation.findFirst({
      where: {
        locationId: unidade.locationId,
        gestaoTokenHash: createHash('sha256').update(segredo).digest('hex'),
      },
      select: { id: true, estado: true, pessoas: true, inicio: true, nome: true },
    }));
}
