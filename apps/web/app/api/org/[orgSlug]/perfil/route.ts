import { NextResponse } from 'next/server';
import { guardarPerfil, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, textoOuNulo, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ORG-001 · gravar o perfil da organização.
 *
 * **Um campo em branco apaga; um campo ausente não mexe.** São coisas
 * diferentes, e é o que permite a este endpoint servir tanto o formulário
 * inteiro como um formulário parcial sem apagar o que não mostra.
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
  // `undefined` tem de ficar FORA do objecto, não dentro com valor undefined:
  // com `exactOptionalPropertyTypes`, "a chave não existe" e "a chave existe e
  // vale undefined" são tipos diferentes — e é a distinção que faz "não mexer"
  // ser diferente de "apagar".
  const campos: Record<string, string | null> = {};
  const nome = texto(dados, 'nome');
  if (nome !== undefined) campos.nome = nome;
  for (const campo of ['nomeLegal', 'pais', 'fuso', 'moedaPadrao', 'responsavel'] as const) {
    const v = textoOuNulo(dados, campo);
    if (v !== undefined) campos[campo] = v;
  }

  await comEscopoDoPedido(sessao, async (db) => {
    await guardarPerfil(db, sessao.contexto.organizationId, campos);
    await registar(db, sessao.contexto.organizationId, {
      accao: 'organizacao.perfil.guardado',
      actorId: sessao.actor.id,
      actorEmail: sessao.actor.email,
      alvoTipo: 'organization',
      alvoId: sessao.contexto.organizationId,
      // Os VALORES não vão para a auditoria: os nomes dos campos chegam para
      // saber o que mudou, e o conteúdo é dado do cliente.
      detalhe: { campos: Object.keys(campos) },
    });
  });

  return voltarPara(`/${idioma}/app/${orgSlug}/organization/perfil`, { guardado: '1' });
}
