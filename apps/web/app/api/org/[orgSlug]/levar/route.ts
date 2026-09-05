import { NextResponse } from 'next/server';
import {
  agendarPedido, guardarArea, guardarConectorDeEntrega, guardarMapaExterno,
  listarUnidades, marcarSaida,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Um inteiro vindo de um formulário, ou o que lá estava. */
function inteiro(dados: FormData, campo: string, actual: number): number {
  const bruto = texto(dados, campo);
  if (bruto === undefined || bruto.trim() === '') return actual;
  const n = Number(bruto);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : actual;
}

/**
 * A porta do takeaway e da entrega.
 *
 * ── A hora vai como LOCAL, e resolve-se onde a unidade é conhecida ────────
 *
 * Não há aqui nenhum `new Date(...Z)`. O `dia` e a `hora` viajam como o que são
 * — o que a pessoa escreveu — e `agendarPedido` resolve-os pelo fuso da unidade.
 *
 * Aqui a hora não avisa ninguém: arranca a cozinha.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationId = texto(dados, 'locationId') ?? '';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const organizationId = sessao.contexto.organizationId;

  // A unidade é resolvida DENTRO do escopo: um identificador vindo do formulário
  // e usado sem esta leitura deixava mexer na unidade de outra organização.
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  const unidade = unidades.find((u: { id: string }) => u.id === locationId);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const paraTakeaway = () => `/${idioma}/app/${orgSlug}/${locationSlug}/takeaway`;
  const paraDelivery = () => `/${idioma}/app/${orgSlug}/${locationSlug}/delivery`;

  if (accao === 'novo_takeaway') {
    const dia = texto(dados, 'dia') ?? '';
    const hora = texto(dados, 'hora') ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) {
      return voltarPara(`${paraTakeaway()}/novo`, { erro: 'quando' });
    }
    const r = await comEscopoDoPedido(sessao, async (db) => {
      const [contagem] = await db.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM orders WHERE location_id = ${unidade.id}::uuid
      `;
      const criado = await db.order.create({
        data: {
          organizationId, locationId: unidade.id, canal: 'TAKEAWAY',
          numero: `T${String(Number(contagem?.n ?? 0) + 1).padStart(5, '0')}`,
          estado: 'ACEITE', abertoPor: sessao.actor.email,
        },
        select: { id: true },
      });
      // A hora resolve-se AQUI, com a unidade conhecida — nunca no navegador.
      return { criado, agendado: await agendarPedido(db, unidade.id, criado.id, dia, hora) };
    });
    if (!r.agendado.ok) return voltarPara(`${paraTakeaway()}/novo`, { erro: r.agendado.motivo });
    return voltarPara(`${paraTakeaway()}/${r.criado.id}`, {
      guardado: '1',
      ...(r.agendado.estado !== 'NORMAL' ? { hora: r.agendado.estado } : {}),
    });
  }

  if (accao === 'marcar_saida') {
    const canal = texto(dados, 'canal') === 'DELIVERY' ? 'DELIVERY' as const : 'TAKEAWAY' as const;
    await comEscopoDoPedido(sessao, (db) =>
      marcarSaida(db, texto(dados, 'orderId') ?? '', canal));
    return voltarPara(canal === 'DELIVERY' ? `${paraDelivery()}/fila` : paraTakeaway(),
      { guardado: '1' });
  }

  if (accao === 'guardar_area') {
    await comEscopoDoPedido(sessao, (db) => guardarArea(db, organizationId, unidade.id, {
      nome: texto(dados, 'nome') ?? '',
      codigoPostal: texto(dados, 'codigoPostal') ?? '',
      // A taxa vem do formulário e não tem valor por omissão escondido: o campo
      // vazio dá zero explícito, que é uma taxa de zero — não «por configurar».
      taxaMenor: inteiro(dados, 'taxaMenor', 0),
      moeda: unidade.moeda ?? 'EUR',
    }));
    return voltarPara(paraDelivery(), { guardado: '1' });
  }

  if (accao === 'guardar_conector') {
    const provedor = texto(dados, 'provedor') ?? '';
    const r = await comEscopoDoPedido(sessao, (db) => guardarConectorDeEntrega(
      db, organizationId, unidade.id, {
        provedor: provedor === '' ? null : provedor,
        activo: dados.get('activo') === '1',
      }));
    if (!r.ok) return voltarPara(paraDelivery(), { erro: r.motivo });
    return voltarPara(paraDelivery(), { guardado: '1' });
  }

  if (accao === 'guardar_mapa') {
    await comEscopoDoPedido(sessao, (db) => guardarMapaExterno(db, organizationId, unidade.id, {
      canalExterno: texto(dados, 'canalExterno') ?? '',
      idExterno: texto(dados, 'idExterno') ?? '',
      productId: texto(dados, 'productId') ?? '',
    }));
    return voltarPara(`${paraDelivery()}/mapeamento`, { guardado: '1' });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
