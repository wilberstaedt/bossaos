import { NextResponse } from 'next/server';
import { registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { textoOuNulo, texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SET-001 · as preferências da unidade.
 *
 * ── Mudar a moeda e o fuso não reescreve o passado ─────────────────────────
 *
 * O prompt do E06 é explícito: *"Moeda não é alterada retroativamente em
 * transações; mudança de timezone não reinterpreta timestamps antigos."*
 *
 * Aqui isso é verdade **por construção**, e vale a pena dizer porquê em vez de
 * afirmar que sim: o dinheiro guarda-se com a sua própria moeda em cada linha, e
 * os instantes guardam-se em `timestamptz` — UTC absoluto. Mudar a coluna da
 * unidade muda o que se aplica **daqui para a frente**; não há nenhuma linha
 * antiga que vá buscar a moeda ou o fuso à unidade para se reinterpretar.
 *
 * O que muda é a leitura dos HORÁRIOS, e isso é o desejado: quem muda de fuso
 * mudou de sítio, e as portas abrem à hora do sítio novo.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; locationId: string }> },
) {
  const { orgSlug, locationId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const slug = texto(dados, 'locationSlug') ?? '';

  const campos: Record<string, string | null> = {};
  for (const campo of ['moeda', 'fuso', 'localidade', 'contactoEmail', 'morada'] as const) {
    const v = textoOuNulo(dados, campo);
    if (v !== undefined) campos[campo] = v;
  }

  const antes = await comEscopoDoPedido(sessao, async (db) => {
    const anterior = await db.location.findFirst({
      where: { id: locationId }, select: { moeda: true, fuso: true },
    });
    await db.location.updateMany({ where: { id: locationId }, data: campos });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'unidade.preferencias.guardadas',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'location', alvoId: locationId,
      // Moeda e fuso ANTES e depois ficam no rasto: são os dois campos cuja
      // mudança altera como tudo o resto se lê, e a pergunta "desde quando é que
      // esta unidade está em EUR" tem de ter resposta.
      detalhe: {
        campos: Object.keys(campos),
        moedaAntes: anterior?.moeda ?? null, fusoAntes: anterior?.fuso ?? null,
      },
    });
    return anterior;
  });
  void antes;

  return voltarPara(`/${idioma}/app/${orgSlug}/${slug}/settings`, { guardado: '1' });
}
