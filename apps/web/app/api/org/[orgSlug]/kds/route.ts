import { NextResponse } from 'next/server';
import {
  listarUnidades, transitarTarefa, priorizarTarefa,
  guardarEstacao, guardarRegra, apagarRegra, type EstadoDaProducao,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';
import { SECCOES_DO_KDS } from '../../../../../src/kds/NavegacaoDoKds.tsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do KDS.
 *
 * ── O endereço de regresso é RECONSTRUÍDO, nunca aceite ───────────────────
 *
 * O formulário manda uma **chave** de secção, e esta rota valida-a contra a
 * lista fechada da navegação antes de montar o caminho. Um campo com o caminho
 * completo era uma redirecção controlada pelo cliente — que é como se abrem
 * redirecções abertas — e validá-la depois dava a mesma segurança com mais uma
 * coisa para manter certa.
 *
 * É a mesma decisão da porta do Staff, e está aqui pela mesma razão.
 */
const SECCOES_VALIDAS = new Set<string>(SECCOES_DO_KDS.map((x) => x.rota));

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
  const accao = texto(dados, 'accao') ?? '';
  const organizationId = sessao.contexto.organizationId;
  const actor = { email: sessao.actor.email };

  // A unidade é resolvida DENTRO do escopo. Um identificador vindo do formulário
  // e usado sem esta leitura deixava mexer na unidade de outra organização — e a
  // política de linha só apanharia isso entre organizações, nunca dentro da
  // mesma.
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  const unidade = unidades.find((u: { id: string }) => u.id === locationId);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  /** O regresso, montado aqui a partir de uma chave da lista fechada. */
  const regresso = () => {
    const stationId = texto(dados, 'stationId') ?? '';
    const seccao = dados.get('seccao');
    const chave = typeof seccao === 'string' && SECCOES_VALIDAS.has(seccao) ? seccao : '';
    // Sem estação conhecida, volta-se à lista de estações. Nunca a um caminho
    // que tenha vindo de fora.
    const estacoes = stationId === '' ? null : stationId;
    return estacoes === null
      ? `/${idioma}/kds/${locationId}`
      : `/${idioma}/kds/${locationId}/${estacoes}${chave}`;
  };

  if (accao === 'transitar') {
    const r = await comEscopoDoPedido(sessao, (db) => transitarTarefa(db, organizationId, {
      taskId: texto(dados, 'taskId') ?? '',
      para: (texto(dados, 'para') ?? '') as EstadoDaProducao,
      actor,
      ...(texto(dados, 'motivo') ? { motivo: texto(dados, 'motivo')! } : {}),
    }));
    if (!r.ok) return voltarPara(regresso(), { erro: r.motivo });
    return voltarPara(regresso(), { feito: r.estado });
  }

  if (accao === 'priorizar') {
    const r = await comEscopoDoPedido(sessao, (db) => priorizarTarefa(db, organizationId, {
      taskId: texto(dados, 'taskId') ?? '',
      prioridade: Number(texto(dados, 'prioridade') ?? '1') || 1,
      motivo: texto(dados, 'motivo') ?? '',
      actor,
    }));
    if (!r.ok) return voltarPara(regresso(), { erro: r.motivo });
    return voltarPara(regresso(), { feito: 'priorizada' });
  }

  if (accao === 'guardar_estacao') {
    const r = await comEscopoDoPedido(sessao, (db) => guardarEstacao(db, organizationId, {
      ...(texto(dados, 'stationId') ? { id: texto(dados, 'stationId')! } : {}),
      locationId: unidade.id,
      nome: texto(dados, 'nome') ?? '',
      tipo: (texto(dados, 'tipo') ?? 'PREPARACAO') as 'PREPARACAO' | 'EXPO',
      limiteVisivel: Number(texto(dados, 'limiteVisivel') ?? '12'),
    }));
    const destino = `/${idioma}/app/${orgSlug}/${texto(dados, 'locationSlug') ?? ''}/settings/ecras`;
    const voltarAoPainel = texto(dados, 'locationSlug') !== undefined;
    if (!r.ok) {
      return voltarPara(voltarAoPainel ? destino : `/${idioma}/kds/${locationId}`, { erro: r.motivo });
    }
    return voltarPara(voltarAoPainel ? destino : `/${idioma}/kds/${locationId}`, { guardado: '1' });
  }

  if (accao === 'guardar_regra' || accao === 'apagar_regra') {
    const destino = `/${idioma}/app/${orgSlug}/${texto(dados, 'locationSlug') ?? ''}/settings/estacoes`;
    if (accao === 'apagar_regra') {
      await comEscopoDoPedido(sessao, (db) => apagarRegra(db, texto(dados, 'regraId') ?? ''));
      return voltarPara(destino, { apagada: '1' });
    }
    const alvo = texto(dados, 'alvo') ?? '';
    // O alvo vem como `produto:<id>` ou `categoria:<id>`. Um só, e é a base que
    // recusa os dois — isto é a resposta com motivo em vez da excepção.
    const [tipo, id] = alvo.split(':');
    const r = await comEscopoDoPedido(sessao, (db) => guardarRegra(db, organizationId, {
      locationId: unidade.id,
      stationId: texto(dados, 'stationId') ?? '',
      ...(tipo === 'produto' && id ? { productId: id } : {}),
      ...(tipo === 'categoria' && id ? { categoryId: id } : {}),
    }));
    if (!r.ok) return voltarPara(destino, { erro: r.motivo });
    return voltarPara(destino, { guardada: '1' });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}

/**
 * A retoma por CURSOR — e o que ela devolve quando há um buraco.
 *
 * *«SSE com cursor e eventos duráveis; ao detectar um intervalo desconhecido,
 * vai ao estado autoritativo em vez de adivinhar.»* Esta é a porta dos dois: dá
 * os eventos desde um cursor, e quem detectar um salto vem buscar o estado
 * completo (`?snapshot=1`), que é o *fallback* que o contrato nomeia.
 */
export async function GET(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const url = new URL(pedido.url);
  const locationId = url.searchParams.get('locationId') ?? '';
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  if (!unidades.some((u: { id: string }) => u.id === locationId)) {
    return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
  }

  const { eventosDesde, cursorActual, tarefasDaEstacao } = await import('@bossaos/db');

  if (url.searchParams.get('snapshot') === '1') {
    // O estado AUTORITATIVO. É o que se pede quando a retoma não é possível — e
    // devolve o cursor a que corresponde, senão o cliente ficava sem saber de
    // onde continuar e voltava a pedir tudo, para sempre.
    const stationId = url.searchParams.get('stationId');
    const [tarefas, cursor] = await comEscopoDoPedido(sessao, async (db) => [
      await tarefasDaEstacao(db, locationId, stationId, { incluirResolvidas: true }),
      await cursorActual(db, locationId),
    ] as const);
    return NextResponse.json({
      cursor: cursor.toString(),
      tarefas: tarefas.map((t: { id: string; estado: string; versao: number }) =>
        ({ taskId: t.id, estado: t.estado, versao: t.versao })),
    });
  }

  const desdeBruto = url.searchParams.get('desde') ?? '0';
  let desde: bigint;
  try { desde = BigInt(desdeBruto); } catch { return NextResponse.json({ erro: 'cursor' }, { status: 400 }); }

  const eventos = await comEscopoDoPedido(sessao, (db) => eventosDesde(db, locationId, desde));
  return NextResponse.json({
    // `BigInt` não é serializável em JSON. Vai como texto e o cliente converte —
    // um `Number` perdia precisão a partir de 2^53, e um cursor que perde
    // precisão salta eventos sem dizer nada.
    eventos: eventos.map((e: { cursor: bigint; taskId: string | null; accao: string; versao: number }) => ({
      cursor: e.cursor.toString(), taskId: e.taskId, accao: e.accao, versao: e.versao,
    })),
  });
}
