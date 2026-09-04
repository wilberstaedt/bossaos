import { NextResponse } from 'next/server';
import { criarPareamento, definirPin, registar, revogarDispositivo, usarPareamento } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';
import { unidadeDoPedido } from '../../../../../src/site-do-pedido.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Dispositivos: parear, aprovar, revogar e definir PIN (DEV-002, DEV-004).
 *
 * ── O token aparece UMA vez, e é no redireccionamento ─────────────────────
 *
 * O código de pareamento volta no endereço porque é a única forma de o mostrar
 * sem o guardar em lado nenhum: a base tem o resumo, não o token. Quem fechar a
 * página sem o copiar gera outro — e é isso que se quer, em vez de um token
 * recuperável que fica a valer para sempre.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  // Parear e revogar são actos de GERÊNCIA, não de sala. É o que a régua chama
  // «aprovação de gerente», e é por isso que a acção exigida é a da organização
  // e não a de operar uma mesa.
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/devices`;

  const unidade = await unidadeDoPedido(sessao, locationSlug);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const organizationId = sessao.contexto.organizationId;

  if (accao === 'parear') {
    const nome = texto(dados, 'nome') ?? '';
    const estacao = (texto(dados, 'estacao') ?? 'SALA') as 'SALA' | 'COZINHA' | 'BALCAO' | 'GERENCIA';
    if (!nome) return voltarPara(`${base}/parear`, { erro: 'sem_nome' });
    const criado = await comEscopoDoPedido(sessao, async (db) => {
      const r = await criarPareamento(db, organizationId, {
        locationId: unidade.id, nome, estacao, criadoPorId: sessao.actor.id,
      });
      await registar(db, organizationId, {
        accao: 'dispositivo.pareamento.criado', actorId: sessao.actor.id,
        actorEmail: sessao.actor.email, alvoTipo: 'device', alvoId: r.deviceId,
        // O token NÃO entra no diário. Um diário com o token dentro é o token
        // guardado, e o resumo passava a ser encenação.
        detalhe: { nome, estacao },
      });
      return r;
    });
    return voltarPara(`${base}/parear`, { codigo: criado.token, dispositivo: criado.deviceId });
  }

  if (accao === 'aprovar') {
    const token = texto(dados, 'token') ?? '';
    const r = await comEscopoDoPedido(sessao, (db) =>
      usarPareamento(db, organizationId, token, sessao.actor.id));
    if (!r.ok) return voltarPara(`${base}/parear`, { erro: r.motivo });
    return voltarPara(`${base}/${r.deviceId}`, { aprovado: '1' });
  }

  if (accao === 'revogar') {
    const deviceId = texto(dados, 'deviceId') ?? '';
    const motivo = texto(dados, 'motivo') ?? '';
    const r = await comEscopoDoPedido(sessao, async (db) => {
      const feito = await revogarDispositivo(db, organizationId, {
        deviceId, motivo, revogadoPorId: sessao.actor.id,
      });
      if (feito.ok) {
        await registar(db, organizationId, {
          accao: 'dispositivo.revogado', actorId: sessao.actor.id,
          actorEmail: sessao.actor.email, alvoTipo: 'device', alvoId: deviceId,
          // Quantos rascunhos se descartaram fica no diário — é a decisão da
          // regra 3-bis, e o que ela custou tem de ser revisível depois.
          detalhe: { motivo, rascunhosDescartados: feito.rascunhosDescartados },
        });
      }
      return feito;
    });
    if (!r.ok) return voltarPara(`${base}/${deviceId}/revogar`, { erro: r.motivo });
    return voltarPara(`${base}/${deviceId}`, { revogado: '1' });
  }

  if (accao === 'definir_pin') {
    const membershipId = texto(dados, 'membershipId') ?? '';
    const pin = texto(dados, 'pin') ?? '';
    const r = await comEscopoDoPedido(sessao, (db) => definirPin(db, organizationId, {
      locationId: unidade.id, membershipId, pin,
    }));
    if (!r.ok) return voltarPara(`${base}`, { erro: r.motivo });
    return voltarPara(`${base}`, { pin: '1' });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
