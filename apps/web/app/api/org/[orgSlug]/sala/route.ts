import { NextResponse } from 'next/server';
import {
  abrirSessao, arquivarMesa, comEscopo, fecharSessao, iniciarEncerramento,
  registar, transferirSessao,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';
import { unidadeDoPedido } from '../../../../../src/site-do-pedido.ts';
import { obterBase } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * As acções da sala: abrir, pedir a conta, fechar, transferir, arquivar.
 *
 * ── Duas delas NÃO passam pelo `comEscopoDoPedido` ────────────────────────
 *
 * `abrirSessao` e `transferirSessao` recebem o `PrismaClient` e abrem a sua
 * própria transacção. Não é inconsistência: uma violação de restrição **aborta a
 * transacção** no PostgreSQL, e apanhar o erro dentro da transacção de outra
 * pessoa deixava-a inutilizável a partir daí. Está explicado por extenso no
 * cabeçalho do `abrirSessao`.
 *
 * O efeito visível é o que se quer: uma abertura recusada não escreve **nada** —
 * nem sequer a linha de histórico.
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
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/floor`;

  const unidade = await unidadeDoPedido(sessao, locationSlug);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const organizationId = sessao.contexto.organizationId;
  const actor = { email: sessao.actor.email };
  const prisma = obterBase();

  if (accao === 'abrir') {
    const tableId = texto(dados, 'tableId') ?? '';
    const comensais = Number(texto(dados, 'comensais') ?? '1');
    const r = await abrirSessao(prisma, organizationId, {
      locationId: unidade.id, tableId,
      comensais: Number.isFinite(comensais) && comensais > 0 ? Math.trunc(comensais) : 1,
      actor,
    });
    if (!r.ok) return voltarPara(`${base}/abrir`, { erro: r.motivo });
    await comEscopo(prisma, { organizationId }, (db) => registar(db, organizationId, {
      accao: 'sala.sessao.aberta', actorId: sessao.actor.id, actorEmail: actor.email,
      alvoTipo: 'table_session', alvoId: r.sessaoId, detalhe: { tableId },
    }));
    return voltarPara(`${base}/sessoes/${r.sessaoId}`, { aberta: '1' });
  }

  if (accao === 'transferir') {
    const sessaoId = texto(dados, 'sessaoId') ?? '';
    const destinoId = texto(dados, 'destinoId') ?? '';
    const r = await transferirSessao(prisma, organizationId, sessaoId, destinoId, actor);
    if (!r.ok) return voltarPara(`${base}/sessoes/${sessaoId}/transferir`, { erro: r.motivo });
    await comEscopo(prisma, { organizationId }, (db) => registar(db, organizationId, {
      accao: 'sala.sessao.transferida', actorId: sessao.actor.id, actorEmail: actor.email,
      alvoTipo: 'table_session', alvoId: sessaoId, detalhe: { de: r.de, para: r.para },
    }));
    return voltarPara(`${base}/sessoes/${sessaoId}`, { transferida: '1' });
  }

  // ── Configuração da sala: zonas, mesas, combinações, tipos de serviço ───
  //
  // Estas não têm corrida nenhuma para gerir — são actos de configuração, um de
  // cada vez, e correm dentro da transacção do pedido como todas as outras do
  // produto. A excepção são as duas de cima, e está explicada no cabeçalho.
  if (accao === 'criar_zona' || accao === 'criar_mesa' || accao === 'guardar_mesa'
      || accao === 'criar_combinacao' || accao === 'guardar_tipo') {
    const erro = await comEscopoDoPedido(sessao, async (db): Promise<string | null> => {
      if (accao === 'criar_zona') {
        const nome = texto(dados, 'nome');
        if (!nome) return 'sem_nome';
        await db.serviceArea.create({
          data: {
            organizationId, locationId: unidade.id, nome,
            tipo: (texto(dados, 'tipo') ?? 'SALA') as 'SALA',
            ordem: Number(texto(dados, 'ordem') ?? '0') || 0,
          },
        });
        return null;
      }
      if (accao === 'criar_mesa') {
        const codigo = texto(dados, 'codigo');
        const areaId = texto(dados, 'areaId');
        if (!codigo || !areaId) return 'faltam_campos';
        await db.serviceTable.create({
          data: {
            organizationId, locationId: unidade.id, areaId, codigo,
            capacidade: Number(texto(dados, 'capacidade') ?? '2') || 2,
          },
        });
        return null;
      }
      if (accao === 'guardar_mesa') {
        const tableId = texto(dados, 'tableId');
        if (!tableId) return 'faltam_campos';
        // A posição é opcional e continua opcional: um campo vazio deixa a mesa
        // POR COLOCAR, e não no canto superior esquerdo. `0,0` seria uma posição
        // inventada, e o desenho da sala passava a mentir.
        const px = texto(dados, 'posX');
        const py = texto(dados, 'posY');
        await db.serviceTable.updateMany({
          where: { id: tableId, locationId: unidade.id },
          data: {
            ...(texto(dados, 'codigo') ? { codigo: texto(dados, 'codigo')! } : {}),
            ...(texto(dados, 'capacidade') ? { capacidade: Number(texto(dados, 'capacidade')) || 2 } : {}),
            ...(texto(dados, 'areaId') ? { areaId: texto(dados, 'areaId')! } : {}),
            posX: px ? Number(px) : null,
            posY: py ? Number(py) : null,
          },
        });
        return null;
      }
      if (accao === 'criar_combinacao') {
        const nome = texto(dados, 'nome');
        const mesas = dados.getAll('mesas').filter((m): m is string => typeof m === 'string');
        // Uma combinação de uma mesa só não é uma combinação. Recusar é melhor do
        // que guardar uma linha que não quer dizer nada.
        if (!nome || mesas.length < 2) return 'combinacao_curta';
        const capacidades = await db.serviceTable.findMany({
          where: { id: { in: mesas }, locationId: unidade.id }, select: { id: true, capacidade: true },
        });
        if (capacidades.length !== mesas.length) return 'mesa_desconhecida';
        const combinacao = await db.tableCombination.create({
          data: {
            organizationId, locationId: unidade.id, nome,
            // A capacidade é SOMADA e não escrita à mão: um número escrito à mão
            // diverge das mesas no dia em que uma delas mudar de tamanho.
            capacidade: capacidades.reduce((t, m) => t + m.capacidade, 0),
          },
          select: { id: true },
        });
        await db.tableCombinationMember.createMany({
          data: mesas.map((tableId) => ({ organizationId, combinationId: combinacao.id, tableId })),
        });
        return null;
      }
      // guardar_tipo
      const nome = texto(dados, 'nome');
      const inicio = texto(dados, 'inicio');
      const fim = texto(dados, 'fim');
      if (!nome || !inicio || !fim) return 'faltam_campos';
      const emMinutos = (hhmm: string) => {
        const [h, m] = hhmm.split(':').map(Number);
        return (h ?? 0) * 60 + (m ?? 0);
      };
      await db.serviceType.upsert({
        where: { tipo_de_servico_por_unidade: { locationId: unidade.id, nome } },
        update: { inicioMinutos: emMinutos(inicio), fimMinutos: emMinutos(fim) },
        create: {
          organizationId, locationId: unidade.id, nome,
          inicioMinutos: emMinutos(inicio), fimMinutos: emMinutos(fim),
        },
      });
      return null;
    });

    const destino = accao === 'criar_zona' ? `${base}/zonas`
      : accao === 'criar_combinacao' ? `${base}/combinacoes`
      : accao === 'guardar_tipo' ? `/${idioma}/app/${orgSlug}/${locationSlug}/settings/servicos`
      : accao === 'guardar_mesa' ? `${base}/mesas/${texto(dados, 'tableId') ?? ''}`
      : `${base}/mesas`;
    return voltarPara(destino, erro ? { erro } : { guardado: '1' });
  }

  const resultado = await comEscopoDoPedido(sessao, async (db) => {
    if (accao === 'pedir_conta') {
      const sessaoId = texto(dados, 'sessaoId') ?? '';
      return { tipo: 'sessao' as const, sessaoId, r: await iniciarEncerramento(db, organizationId, sessaoId, actor) };
    }
    if (accao === 'fechar') {
      const sessaoId = texto(dados, 'sessaoId') ?? '';
      return { tipo: 'sessao' as const, sessaoId, r: await fecharSessao(db, organizationId, sessaoId, actor) };
    }
    if (accao === 'arquivar_mesa') {
      const tableId = texto(dados, 'tableId') ?? '';
      return { tipo: 'mesa' as const, tableId, r: await arquivarMesa(db, organizationId, tableId) };
    }
    return { tipo: 'nenhuma' as const };
  });

  if (resultado.tipo === 'sessao') {
    if (!resultado.r.ok) return voltarPara(`${base}/sessoes/${resultado.sessaoId}`, { erro: resultado.r.motivo });
    return voltarPara(accao === 'fechar' ? base : `${base}/sessoes/${resultado.sessaoId}`, { feito: '1' });
  }
  if (resultado.tipo === 'mesa') {
    if (!resultado.r.ok) return voltarPara(`${base}/mesas/${resultado.tableId}`, { erro: resultado.r.motivo });
    return voltarPara(`${base}/mesas`, { arquivada: '1' });
  }
  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
