import { NextResponse } from 'next/server';
import {
  comIdempotencia, contarUnidades, estadoComercial, listarUnidades, podeCapacidade, registar,
} from '@bossaos/db';
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
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  return NextResponse.json({ unidades });
}

/**
 * Criar uma unidade — onde a quota morde.
 *
 * **Três verificações, e são independentes** (CT-02). A ordem não é
 * intercambiável e cada uma responde a uma pergunta diferente:
 *
 *   1. autorização — esta PESSOA pode? (403)
 *   2. plano       — esta ORGANIZAÇÃO comprou? (402)
 *   3. contar e criar
 *
 * A autorização primeiro porque é a mais barata e não precisa de contar nada.
 * E os dois "não" saem com códigos diferentes de propósito: um 403 a quem paga
 * mandava-o pedir permissões a si próprio; um 402 a quem não tem o papel
 * mandava-o comprar o que já tem.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }

  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  // ── E06: aceita JSON e formulário, e moeda e fuso deixaram de ser exigidos ─
  //
  // A tela do arranque é um `<form>` que funciona sem JavaScript; a prova e as
  // integrações mandam JSON. As duas entram por aqui, e o único sítio que
  // conhece a diferença é esta leitura.
  //
  // **Moeda e fuso saíram dos obrigatórios.** Exigi-los aqui obrigava quem cria
  // uma unidade a arranjar um valor, e o valor que se arranja quando não se sabe
  // é o de outra unidade. Sem eles, a unidade nasce "por configurar" — que é um
  // estado que o produto sabe representar e o ecrã sabe mostrar.
  const tipo = pedido.headers.get('content-type') ?? '';
  const deFormulario = tipo.includes('form');
  const dados = deFormulario ? await pedido.formData() : null;
  const json = deFormulario ? null : ((await pedido.json().catch(() => null)) as Record<string, string> | null);
  const campo = (n: string): string | undefined => (dados ? texto(dados, n) : (json?.[n] || undefined));

  const idioma = campo('idioma') ?? 'es-ES';
  const corpo = {
    brandId: campo('brandId'), nome: campo('nome'), slug: campo('slug'),
    moeda: campo('moeda'), fuso: campo('fuso'), morada: campo('morada'),
    localidade: campo('localidade'), contactoEmail: campo('contactoEmail'),
  };
  const chave = campo('chave');
  const { brandId, nome, slug } = corpo;
  // Destructurado DEPOIS da guarda: o compilador não leva o estreitamento de
  // `corpo.brandId` para dentro do fecho mais abaixo, e sem isto o `undefined`
  // sobreviveria até ao `INSERT`.
  if (!brandId || !nome || !slug) {
    return deFormulario
      ? voltarPara(`/${idioma}/onboarding/unidade`, { erro: 'campos' })
      : NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const estado = await estadoComercial(db, sessao.contexto.organizationId);
    // Contar ANTES de criar. Passar zero por omissão faria a quota nunca
    // esgotar — que é a forma silenciosa de este portão não existir.
    const uso = await contarUnidades(db);

    const plano = podeCapacidade(estado, { capacidade: 'unidades', intencao: 'criar', usoActual: uso });
    if (!plano.permitido) return { tipo: 'plano' as const, plano };

    // A idempotência é do E06 e vem DEPOIS do portão do plano, de propósito: uma
    // repetição de um pedido que o plano recusa tem de continuar a ser recusada,
    // não de encontrar uma unidade criada por engano da primeira vez.
    // As chaves com `undefined` ficam FORA do objecto. Com
    // `exactOptionalPropertyTypes`, "a coluna não vem no INSERT" e "a coluna vem
    // com undefined" são tipos diferentes — e o primeiro é o que deixa a base
    // aplicar o `NULL` que significa "por configurar".
    const dadosDaUnidade = {
      organizationId: sessao.contexto.organizationId,
      brandId, nome, slug,
      ...(corpo.moeda ? { moeda: corpo.moeda } : {}),
      ...(corpo.fuso ? { fuso: corpo.fuso } : {}),
      ...(corpo.morada ? { morada: corpo.morada } : {}),
      ...(corpo.localidade ? { localidade: corpo.localidade } : {}),
      ...(corpo.contactoEmail ? { contactoEmail: corpo.contactoEmail } : {}),
    };

    const criacao = chave
      ? await comIdempotencia(
          db, sessao.contexto.organizationId, 'unidade.criar',
          { chave, actorId: sessao.actor.id },
          (id) => db.location.create({ data: { id, ...dadosDaUnidade } }),
        )
      : { id: (await db.location.create({ data: dadosDaUnidade, select: { id: true } })).id, criado: true };

    if (criacao.criado) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'unidade.criada',
        actorId: sessao.actor.id,
        actorEmail: sessao.actor.email,
        alvoTipo: 'location',
        alvoId: criacao.id,
        // O que ficou por configurar entra no rasto: é a resposta a "porque é
        // que esta unidade não abre" daqui a duas semanas.
        detalhe: {
          nome, quotaNoMomento: uso,
          semMoeda: !corpo.moeda, semFuso: !corpo.fuso,
        },
      });
    }
    return { tipo: 'ok' as const, unidade: criacao };
  });

  if (r.tipo === 'plano') {
    const motivo = r.plano.permitido ? 'ok' : r.plano.motivo;
    return deFormulario
      ? voltarPara(`/${idioma}/onboarding/unidade`, { erro: motivo })
      : NextResponse.json({ erro: motivo, capacidade: 'unidades' }, { status: estadoHttpDeCapacidade(r.plano) });
  }
  return deFormulario
    ? voltarPara(`/${idioma}/onboarding/pronto`, { org: orgSlug })
    : NextResponse.json({ id: r.unidade.id, criado: r.unidade.criado }, { status: r.unidade.criado ? 201 : 200 });
}
