import { NextResponse } from 'next/server';
import { CANAIS, registar, type Canal } from '@bossaos/db';
import {
  corpoDaResposta, deTextoParaMenor, estadoHttp, exigirAccao, moedaValida,
} from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-010 · gravar uma regra de preço.
 *
 * ── Dinheiro sem vírgula flutuante, aqui e não só no motor ─────────────────
 *
 * O que chega do formulário é **texto**, e é do texto para inteiro que o erro
 * clássico nasce: `parseFloat('0.29') * 100` dá `28.999...`, e `Math.trunc`
 * disso é **28**. Medido: de 20001 valores em euros entre 0,00 e 200,00, **1145
 * truncam para o cêntimo errado**, e o primeiro é `0,29`.
 *
 * Por isso a conversão é `deTextoParaMenor`, que junta dígitos e nunca
 * multiplica: `"0,29"` → `"029"` → `29`. E devolve `null` — não zero — quando a
 * entrada é ambígua (separador de milhares, casas a mais do que a moeda tem),
 * porque arredondar em silêncio decide um preço por quem o escreveu.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; productId: string }> },
) {
  const { orgSlug, productId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const destino = `/${idioma}/app/${orgSlug}/catalogo/produtos/${productId}/precos`;

  const escrito = texto(dados, 'montante');
  const moeda = texto(dados, 'moeda')?.toUpperCase();
  if (!escrito || !moeda) return voltarPara(destino, { erro: 'campos' });
  // ISO 4217 são três letras. Qualquer outra coisa é entrada errada, e recusa-se
  // aqui em vez de chegar à base — onde o CHECK a apanharia, mas com uma
  // mensagem que não ajuda quem está no ecrã.
  if (!moedaValida(moeda)) return voltarPara(destino, { erro: 'moeda' });

  const menor = deTextoParaMenor(escrito, moeda);
  if (menor === null) return voltarPara(destino, { erro: 'montante' });

  const locationId = texto(dados, 'locationId');
  // Estreitado contra a lista, sem `as`: um canal inventado no corpo vira
  // `undefined` (regra de base) em vez de entrar na base por um molde de tipo.
  const escritoCanal = texto(dados, 'canal');
  const canal: Canal | undefined =
    escritoCanal && (CANAIS as readonly string[]).includes(escritoCanal)
      ? (escritoCanal as Canal) : undefined;
  if (escritoCanal && !canal) return voltarPara(destino, { erro: 'canal' });

  await comEscopoDoPedido(sessao, async (db) => {
    // Substitui a regra do MESMO nível em vez de acrescentar outra. Acrescentar
    // criaria exactamente o empate que o motor recusa — e o ecrã ficaria a pedir
    // a quem gravou que resolvesse um conflito que a gravação acabou de criar.
    await db.priceRule.deleteMany({
      where: { productId, locationId: locationId ?? null, canal: canal ?? null },
    });
    await db.priceRule.create({
      data: {
        organizationId: sessao.contexto.organizationId, productId,
        montanteMenor: menor, moeda,
        ...(locationId ? { locationId } : {}),
        ...(canal ? { canal } : {}),
      },
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'produto.preco.guardado', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'product', alvoId: productId,
      // O montante fica no rasto em unidades mínimas, com a moeda ao lado. Uma
      // linha de auditoria que dissesse "12,50" sem moeda não responde a
      // "quanto custava isto em Março".
      detalhe: { montanteMenor: menor, moeda, locationId: locationId ?? null, canal: canal ?? null },
    });
  });

  return voltarPara(destino, { guardado: '1' });
}
