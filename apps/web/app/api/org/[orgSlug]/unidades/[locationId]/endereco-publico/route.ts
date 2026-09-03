import { NextResponse } from 'next/server';
import { largarEnderecoPublico, registar, reservarEnderecoPublico } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';
import { obterBase } from '../../../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORMA = /^[a-z0-9]([a-z0-9-]{1,60}[a-z0-9])?$/;

/**
 * CHAN-001 · definir o endereço público.
 *
 * ── O único identificador do produto que é global ─────────────────────────
 *
 * Tudo o resto é único DENTRO da organização, e é isso que deixa duas cadeias
 * ter ambas uma unidade `centro`. Este vai para um URL na internet aberta: dois
 * inquilinos a disputar `/r/la-societat/` é a carta de um servida ao cliente do
 * outro.
 *
 * A colisão é apanhada pelo índice único da base e traduzida aqui — não por uma
 * consulta prévia. Duas pessoas a escolher o mesmo endereço no mesmo segundo
 * leem ambas "está livre" e escrevem ambas; quem decide é a restrição.
 *
 * E a forma é verificada aqui **e** na base. Sem isso, alguém escreve `../admin`
 * e o endereço deixa de apontar para onde diz.
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
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const destino = `/${idioma}/app/${orgSlug}/${locationSlug}/channels`;
  const escrito = texto(dados, 'publicSlug');

  if (escrito !== undefined && !FORMA.test(escrito)) {
    return voltarPara(destino, { erro: 'invalido' });
  }

  const prisma = obterBase();

  if (escrito === undefined) {
    // Vazio LARGA o endereço: o link morre, e isso é uma operação real — quem
    // fecha uma unidade quer o link morto, não uma carta velha.
    //
    // **Mas largar não devolve o endereço ao mundo.** A reserva fica, porque os
    // QR de quem o teve estão impressos em mesas e o papel não se actualiza.
    await largarEnderecoPublico(prisma, sessao.contexto.organizationId, locationId);
    await comEscopoDoPedido(sessao, (db) => registar(db, sessao.contexto.organizationId, {
      accao: 'unidade.endereco-publico.largado',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'location', alvoId: locationId, detalhe: {},
    }));
    return voltarPara(destino, { guardado: '1' });
  }

  // A decisão é da porta da base: a pergunta "este endereço já foi de alguém?"
  // atravessa inquilinos, e uma consulta feita aqui não veria as linhas dos
  // outros — responderia sempre "livre".
  const r = await reservarEnderecoPublico(
    prisma, sessao.contexto.organizationId, locationId, escrito,
  );

  await comEscopoDoPedido(sessao, (db) => registar(db, sessao.contexto.organizationId, {
    accao: r === 'ok' ? 'unidade.endereco-publico.guardado' : 'unidade.endereco-publico.recusado',
    actorId: sessao.actor.id, actorEmail: sessao.actor.email,
    alvoTipo: 'location', alvoId: locationId,
    detalhe: { publicSlug: escrito, resultado: r },
  }));

  // Motivos distintos e não um "ocupado" genérico: quem tenta um endereço
  // reservado por outra organização não está à espera de nada — ele não se
  // liberta —, e mandá-lo esperar era a resposta errada.
  if (r !== 'ok') return voltarPara(destino, { erro: r });
  return voltarPara(destino, { guardado: '1' });
}
