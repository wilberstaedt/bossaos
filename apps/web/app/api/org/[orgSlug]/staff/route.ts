import { NextResponse } from 'next/server';
import {
  abrirSessao, transferirSessao, iniciarEncerramento, iniciarLimpeza,
  cancelarLinha, guardarPedido, listarUnidades, declararRascunhos, listarDispositivos,
  atenderChamada,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';
import { obterBase } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do Staff PWA.
 *
 * ── Porque é que não é a rota do painel com um campo «voltar» ─────────────
 *
 * As rotas do painel devolvem sempre a `/app/<org>/<unidade>/…`, e o Staff vive
 * em `/staff/<locationId>`. A saída barata era um campo escondido com o destino —
 * e isso é uma **redirecção controlada pelo cliente**, que é como se abrem
 * redirecções abertas. Validar o campo dava a mesma segurança e mais uma coisa
 * para manter certa; uma porta própria não tem o problema.
 *
 * A segunda razão é de desenho: a unidade aqui vem por **identificador** e não
 * por `slug`. O endereço do Staff fica num atalho no telemóvel de quem trabalha
 * lá, e um `slug` renomeado deixava o atalho a apontar para nada.
 *
 * ── E nada aqui é uma acção financeira ───────────────────────────────────
 *
 * *Regra 5 do `offline-e-fila-local.md`.* Pedir a conta muda o **estado da
 * mesa** — não cobra. Cobrar exige o servidor a dizer que sim, e por isso não
 * tem porta que se possa chamar de um aparelho sem rede: a fila local recusa a
 * acção em vez de a enfileirar, e a recusa acontece antes de aqui se chegar.
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
  const accao = texto(dados, 'accao') ?? '';
  const base = `/${idioma}/staff/${locationId}`;

  // A unidade é resolvida DENTRO do escopo. Um identificador vindo do formulário
  // e usado sem esta leitura deixava mexer na unidade de outra organização — e a
  // política de linha só apanharia isso entre organizações, nunca dentro da
  // mesma. É a mesma razão do `unidadeDoPedido`, e vale igual aqui.
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  const unidade = unidades.find((u: { id: string }) => u.id === locationId);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const organizationId = sessao.contexto.organizationId;
  const actor = { email: sessao.actor.email };
  const prisma = obterBase();

  if (accao === 'abrir_mesa') {
    const r = await abrirSessao(prisma, organizationId, {
      locationId: unidade.id,
      tableId: texto(dados, 'tableId') ?? '',
      comensais: Number(texto(dados, 'comensais') ?? '1') || 1,
      actor,
    });
    if (!r.ok) return voltarPara(`${base}/mesas/nova`, { erro: r.motivo });
    return voltarPara(`${base}/mesas/${r.sessaoId}`, { aberta: '1' });
  }

  if (accao === 'mover') {
    const sessaoId = texto(dados, 'sessionId') ?? '';
    const r = await transferirSessao(
      prisma, organizationId, sessaoId, texto(dados, 'tableId') ?? '', actor);
    if (!r.ok) return voltarPara(`${base}/mover`, { erro: r.motivo });
    return voltarPara(`${base}/mesas/${r.sessaoId}`, { movida: '1' });
  }

  if (accao === 'pedir_conta' || accao === 'limpar') {
    const sessaoId = texto(dados, 'sessionId') ?? '';
    const r = await comEscopoDoPedido(sessao, (db) => (accao === 'pedir_conta'
      ? iniciarEncerramento(db, organizationId, sessaoId, actor)
      : iniciarLimpeza(db, organizationId, sessaoId, actor)));
    if (!r.ok) return voltarPara(`${base}/conta`, { erro: r.motivo });
    return voltarPara(`${base}/mesas/${sessaoId}`, { feito: '1' });
  }

  if (accao === 'cancelar_linha') {
    const r = await comEscopoDoPedido(sessao, (db) =>
      cancelarLinha(db, organizationId, texto(dados, 'linhaId') ?? '', actor));
    if (!r.ok) return voltarPara(`${base}/cancelar`, { erro: r.motivo });
    return voltarPara(`${base}/cancelar`, { cancelada: '1' });
  }

  if (accao === 'entregar') {
    const orderId = texto(dados, 'orderId') ?? '';
    const r = await comEscopoDoPedido(sessao, (db) => guardarPedido(db, organizationId, {
      orderId,
      versaoEsperada: Number(texto(dados, 'versao') ?? '0'),
      estado: 'ENTREGUE',
      actor,
    }));
    if (r.ok) return voltarPara(`${base}/entregar`, { entregue: '1' });
    // ── O conflito não é um erro seco: é o STATE-008 ───────────────────────
    //
    // Outra pessoa mexeu no pedido entretanto. Devolver 409 e nada mais
    // obrigava quem está na mesa a refazer tudo; o que vai no endereço é a
    // versão actual, e a tela mostra o que existe agora para se seguir daí.
    if (r.motivo === 'conflito') {
      return voltarPara(`${base}/andamento`, { conflito: String(r.versaoActual), pedido: orderId });
    }
    return voltarPara(`${base}/entregar`, { erro: r.motivo });
  }

  if (accao === 'atender_chamada') {
    // ── A confirmação de atendimento (E17, ponto 4) ────────────────────────
    //
    // «Sem ela, quem chamou não sabe se alguém vem, e volta a carregar.» É uma
    // escrita idempotente: atender duas vezes não reescreve quem foi lá
    // primeiro, e `atendidaEm: null` está na CONDIÇÃO — ler e depois escrever é
    // a mesma corrida com a janela mais estreita.
    const r = await comEscopoDoPedido(sessao, (db) => atenderChamada(db, {
      callId: texto(dados, 'callId') ?? '', actor,
    }));
    if (!r.ok) return voltarPara(`${base}/avisos`, { erro: r.motivo });
    return voltarPara(`${base}/avisos`, { atendida: '1' });
  }

  if (accao === 'declarar_rascunhos') {
    // ── O aparelho diz QUANTOS rascunhos tem por enviar (regra 3-bis) ─────
    //
    // Fecha a pendência que o E13 declarou: o ecrã de revogar já sabia mostrar o
    // número e dizer que não sabe quando não há — faltava alguém a escrever.
    //
    // **O que isto NÃO é: uma identidade de dispositivo.** Não há aqui nenhuma
    // credencial de aparelho, e não se inventou uma: quem chama é uma pessoa com
    // sessão nesta organização, e o identificador do aparelho é uma etiqueta que
    // ela escolheu no perfil. O pior que uma pessoa com sessão consegue fazer por
    // aqui é escrever um número errado sobre um aparelho da própria organização —
    // onde já podia escrever muito mais. Uma credencial de aparelho a sério
    // pertence ao pareamento, e o pareamento é do E13/E16.
    //
    // A unidade limita o alvo: um `deviceId` que não seja desta unidade não
    // escreve nada, e a resposta é a mesma de um desconhecido.
    const deviceId = texto(dados, 'deviceId') ?? '';
    const quantos = Number(texto(dados, 'quantos') ?? '');
    const daUnidade = await comEscopoDoPedido(sessao,
      (db) => listarDispositivos(db, unidade.id));
    if (!daUnidade.some((d: { id: string }) => d.id === deviceId)) {
      return NextResponse.json({ ok: false, motivo: 'dispositivo_desconhecido' }, { status: 404 });
    }
    const r = await comEscopoDoPedido(sessao, (db) => declararRascunhos(db, deviceId, quantos));
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
