import { NextResponse } from 'next/server';
import { entrarComPin } from '@bossaos/db';
import { corpoDaResposta, estadoHttp } from '@bossaos/domain';
import { resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';
import { obterBase } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A troca de operador por PIN (AUTH-002).
 *
 * ── Não exige `organizacao.gerir`, e é de propósito ──────────────────────
 *
 * Trocar de turno é o que a pessoa da sala faz dez vezes por serviço. Exigir a
 * acção de gerência aqui fechava o produto a quem o usa. O que **limita** é
 * outra coisa: o dispositivo e a estação (E13, respeitar 1), e o PIN não concede
 * privilégio de owner — quem entra por PIN fica com o que a pertença dele já
 * tinha, nem mais um.
 *
 * ── A recusa por revogação sai daqui como 403, e não como PIN errado ─────
 *
 * O aceite 2 é «inclusive com PIN correto». O motivo viaja no endereço para o
 * ecrã poder dizer o que aconteceu — «este dispositivo já não tem acesso» — em
 * vez de mandar a pessoa tentar outra vez um PIN que estava certo.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const deviceId = texto(dados, 'deviceId') ?? '';
  const membershipId = texto(dados, 'membershipId') ?? '';
  const pin = texto(dados, 'pin') ?? '';
  const destino = `/${idioma}/auth/operator-pin`;

  const r = await entrarComPin(obterBase(), sessao.contexto.organizationId, {
    deviceId, membershipId, pin,
  });

  if (r.ok) return voltarPara(destino, { dispositivo: deviceId, turno: r.turnoId });
  if (r.motivo === 'pin_errado') {
    return voltarPara(destino, {
      dispositivo: deviceId, erro: r.motivo, restantes: String(r.tentativasRestantes),
    });
  }
  return voltarPara(destino, { dispositivo: deviceId, erro: r.motivo });
}
