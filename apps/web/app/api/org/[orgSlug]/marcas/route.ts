import { NextResponse } from 'next/server';
import { comIdempotencia, estadoComercial, listarMarcas, podeCapacidade, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, estadoHttpDeCapacidade, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_p: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  return NextResponse.json({ marcas: await comEscopoDoPedido(sessao, (db) => listarMarcas(db)) });
}

/**
 * ONB-002 / ORG-002 · criar uma marca, sem duplicar.
 *
 * A mesma protecção da organização, pelo mesmo motivo: quem carrega duas vezes
 * porque a primeira pareceu não responder não pode ficar com duas marcas.
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
  const nome = texto(dados, 'nome');
  const slug = texto(dados, 'slug');
  const chave = texto(dados, 'chave');
  if (!nome || !slug || !chave) return voltarPara(`/${idioma}/onboarding/marca`, { erro: 'campos' });

  const r = await comEscopoDoPedido(sessao, async (db) => {
    // As três verificações do CT-02, na ordem do E05: autorização acima (é a
    // mais barata), plano aqui, e contar ANTES de criar — passar zero por
    // omissão faria a quota nunca esgotar, que é a forma silenciosa de o portão
    // não existir.
    const estado = await estadoComercial(db, sessao.contexto.organizationId);
    const uso = await db.brand.count({ where: { archivedAt: null } });
    const plano = podeCapacidade(estado, { capacidade: 'marcas', intencao: 'criar', usoActual: uso });
    if (!plano.permitido) return { tipo: 'plano' as const, plano };

    const resultado = await comIdempotencia(
      db, sessao.contexto.organizationId, 'marca.criar', { chave, actorId: sessao.actor.id },
      (id) => db.brand.create({
        data: {
          id, organizationId: sessao.contexto.organizationId, nome, slug,
          // Opcionais, e sem omissão. Um idioma principal escolhido por nós
          // publicaria a carta de um restaurante brasileiro em espanhol.
          ...(texto(dados, 'descricao') ? { descricao: texto(dados, 'descricao')! } : {}),
          ...(texto(dados, 'idiomaPrincipal') ? { idiomaPrincipal: texto(dados, 'idiomaPrincipal')! } : {}),
        },
      }),
    );
    if (resultado.criado) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'marca.criada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'brand', alvoId: resultado.id, detalhe: { slug },
      });
    }
    return { tipo: 'ok' as const, resultado };
  });

  if (r.tipo === 'plano') {
    const motivo = r.plano.permitido ? 'ok' : r.plano.motivo;
    return voltarPara(`/${idioma}/onboarding/marca`, { erro: motivo, http: String(estadoHttpDeCapacidade(r.plano)) });
  }
  return voltarPara(`/${idioma}/onboarding/unidade`, { marca: r.resultado.id, criada: String(r.resultado.criado) });
}
