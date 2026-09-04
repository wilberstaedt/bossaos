import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  MINUTOS_DE_BLOQUEIO, MINUTOS_DE_PAREAMENTO, TENTATIVAS_ATE_BLOQUEAR,
} from '@bossaos/domain';
import { comEscopo, type ClienteComEscopo } from './escopo.ts';

/**
 * Dispositivos de sala, pareamento e PIN de operador (E13).
 *
 * ── A palavra que carrega o aceite 2 é «inclusive» ────────────────────────
 *
 * *«Revogar dispositivo encerra acesso e impede novos comandos, **inclusive com
 * PIN correto**.»* O «inclusive» nomeia o defeito: se a verificação for só do
 * PIN, um PIN certo num aparelho revogado entra — e o aparelho revogado é
 * tipicamente o que foi roubado.
 *
 * Por isso **o estado do dispositivo é a primeira coisa que se lê**, antes de
 * haver PIN nenhum para comparar. A recusa que sai daqui é `dispositivo_revogado`
 * e não `pin_errado`, e a diferença não é cosmética: com a segunda, quem tem o
 * aparelho continua a tentar; com a primeira, sabe que o caminho está fechado.
 */

const CUSTO_SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const TAMANHO_DO_RESUMO = 32;

/**
 * Resumo do PIN, com sal por pessoa.
 *
 * `scrypt` e não `sha256`: quatro dígitos são dez mil possibilidades, e um
 * resumo rápido percorre-as todas em menos de um segundo. O custo é o que torna
 * a lista inteira cara de percorrer mesmo com a base na mão.
 */
function resumirPin(pin: string, sal: string): Buffer {
  return scryptSync(pin, sal, TAMANHO_DO_RESUMO, CUSTO_SCRYPT);
}

/**
 * Compara em tempo constante.
 *
 * A régua reprova «PIN comparado sem tempo constante». Comparar cadeias com
 * `===` devolve mais depressa quando o primeiro dígito está errado — e isso
 * transforma dez mil tentativas em quatro vezes dez.
 */
function iguais(a: Buffer, b: Buffer): boolean {
  // `timingSafeEqual` **atira** se os tamanhos diferirem, e o tamanho é público:
  // é o do resumo, não o do PIN. Comparar tamanhos antes não perde nada.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type ResultadoDoPin =
  | { ok: true; turnoId: string; membershipId: string }
  /** O dispositivo não pode comandar. A razão vem à frente do PIN, de propósito. */
  | { ok: false; motivo: 'dispositivo_revogado' | 'dispositivo_pendente' | 'dispositivo_desconhecido' }
  | { ok: false; motivo: 'sem_pin' }
  | { ok: false; motivo: 'pin_errado'; tentativasRestantes: number }
  | { ok: false; motivo: 'bloqueado'; ate: Date };

/**
 * O portão de TODOS os comandos vindos de um dispositivo.
 *
 * ── Lido a cada comando, e não uma vez ao entrar ─────────────────────────
 *
 * O ataque 2 da régua é revogar **durante** uma sessão aberta e exigir que os
 * comandos seguintes parem: *«um dispositivo que já entrou não fica com licença
 * vitalícia»*. Uma verificação feita só no momento da entrada dá exactamente
 * essa licença — e o aparelho continua a mandar comandos até alguém o desligar.
 */
export async function dispositivoPodeComandar(
  db: ClienteComEscopo,
  deviceId: string,
): Promise<
  | { pode: true; estacao: string; locationId: string }
  | { pode: false; motivo: 'dispositivo_revogado' | 'dispositivo_pendente' | 'dispositivo_desconhecido' }
> {
  const d = await db.device.findFirst({
    where: { id: deviceId },
    select: { id: true, estado: true, estacao: true, locationId: true },
  });
  if (!d) return { pode: false, motivo: 'dispositivo_desconhecido' };
  if (d.estado === 'REVOGADO') return { pode: false, motivo: 'dispositivo_revogado' };
  if (d.estado === 'PENDENTE') return { pode: false, motivo: 'dispositivo_pendente' };
  return { pode: true, estacao: d.estacao, locationId: d.locationId };
}

/** Define ou substitui o PIN de uma pessoa numa unidade (AUTH-002, SET-003). */
export async function definirPin(
  db: ClienteComEscopo,
  organizationId: string,
  dados: { locationId: string; membershipId: string; pin: string },
): Promise<{ ok: true } | { ok: false; motivo: 'pin_fraco' }> {
  // Quatro a oito dígitos. Não é segurança por si — é a troca rápida dentro de um
  // aparelho já confiável — mas um PIN de um dígito não é sequer isso.
  if (!/^\d{4,8}$/.test(dados.pin)) return { ok: false, motivo: 'pin_fraco' };

  const sal = randomBytes(16).toString('hex');
  const resumo = resumirPin(dados.pin, sal).toString('hex');
  await db.operatorPin.upsert({
    where: {
      pin_por_unidade_e_pessoa: {
        locationId: dados.locationId, membershipId: dados.membershipId,
      },
    },
    update: { resumo, sal, tentativas: 0, bloqueadoAte: null },
    create: {
      organizationId, locationId: dados.locationId, membershipId: dados.membershipId,
      resumo, sal,
    },
  });
  return { ok: true };
}

/**
 * Entrar num dispositivo com PIN (AUTH-002).
 *
 * ── A ordem é o aceite ───────────────────────────────────────────────────
 *
 *   1. o dispositivo pode comandar?   ← a revogação vive aqui
 *   2. há PIN definido?
 *   3. está bloqueado por tentativas?
 *   4. o PIN bate, em tempo constante?
 *
 * Trocar 1 com 4 faz o aceite 2 falhar em silêncio: o PIN certo passaria, e a
 * revogação só apareceria depois. E o ataque 3 da régua — o PIN correto de OUTRO
 * dispositivo, no revogado — cai também no passo 1, que é onde tem de cair: um
 * PIN partilhado pela equipa é o caso real, não o improvável.
 */
export async function entrarComPin(
  prisma: PrismaClient,
  organizationId: string,
  dados: { deviceId: string; membershipId: string; pin: string },
): Promise<ResultadoDoPin> {
  return comEscopo(prisma, { organizationId }, async (db) => {
    const porta = await dispositivoPodeComandar(db, dados.deviceId);
    if (!porta.pode) return { ok: false as const, motivo: porta.motivo };

    const registo = await db.operatorPin.findFirst({
      where: { membershipId: dados.membershipId, locationId: porta.locationId },
      select: { id: true, resumo: true, sal: true, tentativas: true, bloqueadoAte: true },
    });
    if (!registo) return { ok: false as const, motivo: 'sem_pin' as const };

    const agora = new Date();
    if (registo.bloqueadoAte && registo.bloqueadoAte > agora) {
      return { ok: false as const, motivo: 'bloqueado' as const, ate: registo.bloqueadoAte };
    }

    const bate = iguais(
      resumirPin(dados.pin, registo.sal),
      Buffer.from(registo.resumo, 'hex'),
    );

    if (!bate) {
      const tentativas = registo.tentativas + 1;
      const bloqueia = tentativas >= TENTATIVAS_ATE_BLOQUEAR;
      await db.operatorPin.update({
        where: { id: registo.id },
        data: {
          tentativas,
          bloqueadoAte: bloqueia
            ? new Date(agora.getTime() + MINUTOS_DE_BLOQUEIO * 60_000)
            : null,
        },
      });
      // O número que falta é dito. Um bloqueio que chega sem aviso lê-se como
      // avaria, e quem está ao balcão volta a tentar em vez de chamar o gerente.
      return {
        ok: false as const, motivo: 'pin_errado' as const,
        tentativasRestantes: Math.max(0, TENTATIVAS_ATE_BLOQUEAR - tentativas),
      };
    }

    await db.operatorPin.update({
      where: { id: registo.id }, data: { tentativas: 0, bloqueadoAte: null },
    });

    // Fecha o turno anterior antes de abrir o novo: o índice
    // `um_turno_aberto_por_dispositivo` só deixa haver um, e essa é a regra —
    // dois operadores no mesmo tablet ao mesmo tempo faz a atribuição dos
    // pedidos depender de quem carregou primeiro.
    await db.deviceShift.updateMany({
      where: { deviceId: dados.deviceId, terminadaEm: null },
      data: { terminadaEm: agora },
    });
    const turno = await db.deviceShift.create({
      data: {
        organizationId, locationId: porta.locationId,
        deviceId: dados.deviceId, membershipId: dados.membershipId,
      },
      select: { id: true },
    });

    return { ok: true as const, turnoId: turno.id, membershipId: dados.membershipId };
  });
}

// ── Pareamento (DEV-002) ───────────────────────────────────────────────────

/** O resumo do token. A base nunca guarda o token, como os convites do E04. */
export function resumirToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Cria um dispositivo PENDENTE e o token de uso único que o pareia.
 *
 * O token é devolvido **uma vez** — é o único momento em que existe em claro. A
 * base fica com o resumo: quem tiver a base não fica com os pareamentos em
 * aberto.
 */
export async function criarPareamento(
  db: ClienteComEscopo,
  organizationId: string,
  dados: { locationId: string; nome: string; estacao: 'SALA' | 'COZINHA' | 'BALCAO' | 'GERENCIA'; criadoPorId: string },
): Promise<{ deviceId: string; token: string; expiraEm: Date }> {
  const device = await db.device.create({
    data: {
      organizationId, locationId: dados.locationId,
      nome: dados.nome, estacao: dados.estacao, estado: 'PENDENTE',
    },
    select: { id: true },
  });

  const token = randomBytes(24).toString('base64url');
  const expiraEm = new Date(Date.now() + MINUTOS_DE_PAREAMENTO * 60_000);
  await db.devicePairing.create({
    data: {
      organizationId, deviceId: device.id, tokenHash: resumirToken(token),
      expiresAt: expiraEm, criadoPorId: dados.criadoPorId,
    },
  });

  return { deviceId: device.id, token, expiraEm };
}

export type ResultadoDoPareamento =
  | { ok: true; deviceId: string }
  | { ok: false; motivo: 'token_desconhecido' | 'token_expirado' | 'token_usado' };

/**
 * Consome o token e aprova o dispositivo (DEV-002).
 *
 * **Uso único, e verificado por escrita.** O `updateMany` com `usedAt: null` na
 * condição é o que impede dois aparelhos de usarem o mesmo token ao mesmo
 * tempo: quem escreve primeiro leva a linha, e o segundo vê `count = 0`. Uma
 * leitura seguida de escrita tinha a mesma corrida que a abertura de mesa.
 */
export async function usarPareamento(
  db: ClienteComEscopo,
  organizationId: string,
  token: string,
  aprovadoPorId: string,
): Promise<ResultadoDoPareamento> {
  void organizationId;
  const resumo = resumirToken(token);
  const pareamento = await db.devicePairing.findFirst({
    where: { tokenHash: resumo },
    select: { id: true, deviceId: true, expiresAt: true, usedAt: true },
  });
  if (!pareamento) return { ok: false, motivo: 'token_desconhecido' };
  if (pareamento.usedAt) return { ok: false, motivo: 'token_usado' };
  if (pareamento.expiresAt <= new Date()) return { ok: false, motivo: 'token_expirado' };

  const marcado = await db.devicePairing.updateMany({
    where: { id: pareamento.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (marcado.count === 0) return { ok: false, motivo: 'token_usado' };

  await db.device.update({
    where: { id: pareamento.deviceId },
    data: { estado: 'ACTIVO', aprovadoPorId, aprovadoEm: new Date() },
  });
  return { ok: true, deviceId: pareamento.deviceId };
}

export type ResultadoDaRevogacao =
  | { ok: true; deviceId: string; turnosTerminados: number; rascunhosDescartados: number | null }
  | { ok: false; motivo: 'dispositivo_desconhecido' | 'sem_motivo' };

/**
 * Retira o acesso a um dispositivo (DEV-004).
 *
 * ── E a decisão da regra 3-bis, que estava em aberto ─────────────────────
 *
 * O `offline-e-fila-local.md` deixou uma aresta por decidir: a regra 2 manda os
 * rascunhos ficarem suspensos *«até o dono se reautenticar e resolvê-los»*, e num
 * aparelho revogado o dono não volta. Das três saídas nomeadas — o dono resolve
 * noutro aparelho, um administrador resolve por ele, ou a revogação descarta —
 * **está escolhida a terceira**, e a razão é que as outras duas não são
 * implementáveis no caso que interessa:
 *
 * - «resolver noutro aparelho» exige que os rascunhos tenham saído do tablet. Se
 *   tivessem saído, não eram rascunhos por enviar. E o aparelho pode estar sem
 *   rede exactamente no momento em que é revogado — que é o caso típico de um
 *   tablet perdido.
 * - «um administrador resolve por ele» exige que alguém LEIA o trabalho de
 *   outra pessoa, e a regra 3 diz o contrário: o operador seguinte não vê nome
 *   de cliente nem totais do anterior. Quem revoga também não é o dono.
 *
 * Fica a terceira, **com a condição que a torna honesta**: diz-se ao revogar, e
 * não depois. `rascunhosPorEnviar` vem no resultado para o ecrã o poder mostrar
 * antes de confirmar — e vem `null` quando o dispositivo nunca reportou, porque
 * ausência não é zero.
 */
export async function revogarDispositivo(
  db: ClienteComEscopo,
  organizationId: string,
  dados: { deviceId: string; motivo: string; revogadoPorId: string },
): Promise<ResultadoDaRevogacao> {
  void organizationId;
  if (!dados.motivo.trim()) return { ok: false, motivo: 'sem_motivo' };

  const device = await db.device.findFirst({
    where: { id: dados.deviceId }, select: { id: true, rascunhosPorEnviar: true },
  });
  if (!device) return { ok: false, motivo: 'dispositivo_desconhecido' };

  await db.device.update({
    where: { id: device.id },
    data: {
      estado: 'REVOGADO', revogadoEm: new Date(),
      revogadoPorId: dados.revogadoPorId, revogadoMotivo: dados.motivo.trim(),
    },
  });

  // Os turnos abertos terminam. Não é o que impede os comandos — isso é o
  // `dispositivoPodeComandar`, lido a cada um — é o que faz o histórico dizer a
  // verdade sobre quando é que aquele operador deixou de estar no aparelho.
  const turnos = await db.deviceShift.updateMany({
    where: { deviceId: device.id, terminadaEm: null },
    data: { terminadaEm: new Date() },
  });

  return {
    ok: true, deviceId: device.id, turnosTerminados: turnos.count,
    rascunhosDescartados: device.rascunhosPorEnviar,
  };
}

export function listarDispositivos(db: ClienteComEscopo, locationId: string) {
  return db.device.findMany({
    where: { locationId }, orderBy: [{ estado: 'asc' }, { nome: 'asc' }],
  });
}

export function turnoAberto(db: ClienteComEscopo, deviceId: string) {
  return db.deviceShift.findFirst({
    where: { deviceId, terminadaEm: null }, orderBy: { abertaEm: 'desc' },
  });
}
