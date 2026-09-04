import { NextResponse } from 'next/server';
import {
  descartarRascunho, estadoComercial, guardarRascunho, publicarRascunho,
  registar, restaurarTemaAnterior,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, estadoHttpDeCapacidade, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../src/formulario.ts';
import { unidadeDoPedido } from '../../../../../../src/site-do-pedido.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * As quatro acções do editor de tema: guardar, publicar, descartar, restaurar.
 *
 * ── Uma rota e não quatro, e a razão não é preguiça ───────────────────────
 *
 * As quatro partilham a coisa que interessa: o portão do plano. `guardarRascunho`,
 * `publicarRascunho` e `restaurarTemaAnterior` verificam-no **cada uma dentro do
 * serviço**, e não aqui — é a decisão do E05, escrita no cabeçalho do
 * `guardarTema`: se a verificação vivesse na rota, a próxima rota que alguém
 * escrevesse nascia aberta. O que esta camada faz é traduzir a recusa em HTTP e
 * levar a pessoa de volta ao ecrã.
 *
 * ── Formulário, e não JSON ────────────────────────────────────────────────
 *
 * O `PUT` irmão (JSON) continua onde estava porque é ele que a prova do E05
 * exerce — «tentativa direta de alterar tema Starter». Esta é a porta da
 * PESSOA: um `<form method="post">` que funciona sem JavaScript, como todas as
 * outras do produto desde o E06. E foi por nenhuma prova submeter formulário que
 * as 37 rotas do produto devolveram 500 durante uma etapa inteira.
 *
 * ── A cor NÃO é lida como cor aqui ────────────────────────────────────────
 *
 * Chega como texto e vai como texto para `guardarRascunho`, que a normaliza e a
 * recusa se não for `#rrggbb`. Esta rota não sabe o que é uma cor de propósito:
 * um segundo sítio a decidir o que é uma cor válida é um segundo sítio para
 * divergir do primeiro.
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
  const accao = texto(dados, 'accao') ?? 'guardar';
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/website/theme`;

  // A unidade é resolvida DENTRO do escopo, como nas rotas do site e pela mesma
  // razão: um `locationSlug` de outra organização tem de dar ausência, e não uma
  // página de outra pessoa com o cabeçalho desta.
  const unidade = await unidadeDoPedido(sessao, locationSlug);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const organizationId = sessao.contexto.organizationId;
  const autor = sessao.actor.email;

  if (accao === 'descartar') {
    const havia = await comEscopoDoPedido(sessao, (db) => descartarRascunho(db, organizationId));
    return voltarPara(`${base}/editar`, havia ? { descartado: '1' } : {});
  }

  if (accao === 'publicar') {
    const r = await comEscopoDoPedido(sessao, async (db) => {
      const estado = await estadoComercial(db, organizationId);
      const publicado = await publicarRascunho(db, organizationId, estado, autor);
      if (publicado.ok) {
        await registar(db, organizationId, {
          accao: 'tema.publicado',
          actorId: sessao.actor.id, actorEmail: autor,
          alvoTipo: 'theme_revision', alvoId: publicado.revisaoId,
          detalhe: { destinos: publicado.destinos },
        });
      }
      return publicado;
    });
    if (r.ok) return voltarPara(base, { publicado: r.revisaoId });
    if (r.motivo === 'plano') {
      return NextResponse.json(
        { erro: r.capacidade.permitido ? 'ok' : r.capacidade.motivo, capacidade: 'tema.coresProprias' },
        { status: estadoHttpDeCapacidade(r.capacidade) },
      );
    }
    if (r.motivo === 'nada_por_publicar') return voltarPara(base, { igual: '1' });
    return voltarPara(`${base}/editar`, { erro: 'contraste' });
  }

  if (accao === 'restaurar') {
    const r = await comEscopoDoPedido(sessao, async (db) => {
      const estado = await estadoComercial(db, organizationId);
      const restaurado = await restaurarTemaAnterior(db, organizationId, estado);
      if (restaurado.ok) {
        await registar(db, organizationId, {
          accao: 'tema.restaurado',
          actorId: sessao.actor.id, actorEmail: autor,
          alvoTipo: 'theme_revision', alvoId: restaurado.revisaoId,
          detalhe: { motivo: 'o direito ao tema próprio voltou' },
        });
      }
      return restaurado;
    });
    if (r.ok) return voltarPara(`${base}/plano`, { restaurado: r.revisaoId });
    if (r.motivo === 'plano') {
      return NextResponse.json(
        { erro: r.capacidade.permitido ? 'ok' : r.capacidade.motivo, capacidade: 'tema.coresProprias' },
        { status: estadoHttpDeCapacidade(r.capacidade) },
      );
    }
    return voltarPara(`${base}/plano`, { erro: 'nada_para_restaurar' });
  }

  // ── guardar ──────────────────────────────────────────────────────────────
  const entrada: Record<string, unknown> = {};
  for (const token of ['primaria', 'acento', 'fundo'] as const) {
    const v = texto(dados, token);
    if (v !== undefined) entrada[token] = v;
  }
  // Campos que o formulário do produto nunca manda, mas que alguém pode mandar.
  // Passam para o serviço tal e qual e são recusados lá — a recusa por token não
  // temável tem de existir no servidor, não no HTML que a esconde.
  for (const [k, v] of dados.entries()) {
    if (['idioma', 'locationSlug', 'accao', 'primaria', 'acento', 'fundo'].includes(k)) continue;
    entrada[k] = v;
  }

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const estado = await estadoComercial(db, organizationId);
    return guardarRascunho(db, organizationId, estado, entrada, autor);
  });

  if (r.ok) return voltarPara(`${base}/editar`, r.porPublicar ? { guardado: '1' } : { igual: '1' });

  if (r.motivo === 'plano') {
    return NextResponse.json(
      { erro: r.capacidade.permitido ? 'ok' : r.capacidade.motivo, capacidade: 'tema.coresProprias' },
      { status: estadoHttpDeCapacidade(r.capacidade) },
    );
  }
  if (r.motivo === 'token') {
    return NextResponse.json({ erro: 'token_nao_temavel', tokens: r.tokens }, { status: 422 });
  }
  // THEME-004 · o ecrã da cor que precisa de ajuste. As cores recusadas voltam
  // no endereço para a página as poder MEDIR outra vez do lado do servidor —
  // e não para as mostrar como se tivessem sido aceites.
  return voltarPara(`${base}/editar`, {
    erro: 'contraste',
    ...(typeof entrada.primaria === 'string' ? { primaria: entrada.primaria } : {}),
    ...(typeof entrada.acento === 'string' ? { acento: entrada.acento } : {}),
    ...(typeof entrada.fundo === 'string' ? { fundo: entrada.fundo } : {}),
  });
}
