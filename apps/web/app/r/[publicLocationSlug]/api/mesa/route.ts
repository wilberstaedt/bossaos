import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { abrirVisitante, enviarPedido, visitanteFalou } from '@bossaos/db';
import { texto, voltarPara } from '../../../../src/formulario.ts';
import {
  BOLACHA_DO_VISITANTE, opcoesDaBolacha, visitanteDaRequisicao,
} from '../../../../src/visitante/sessao-do-visitante.ts';
import {
  BOLACHA_DO_CARRINHO, acrescentar, escreverCarrinho, lerCarrinho,
} from '../../../../src/visitante/carrinho.ts';
import { obterBase } from '../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do visitante da mesa.
 *
 * ── Abrir a sessão é um POST, e não uma leitura ───────────────────────────
 *
 * Ler o QR é um GET: cai na carta, com a mesa identificada, e mais nada
 * acontece. Abrir a sessão exige carregar num botão.
 *
 * Não é formalismo. Um GET que cria sessão é criado por um leitor de códigos que
 * pré-carrega o endereço, por um crawler, por a pessoa abrir o link duas vezes —
 * e cada um deles deixava uma sessão de visitante aberta que ninguém pediu, numa
 * mesa real, contada no ecrã de quem revoga.
 *
 * ── E o endereço de regresso é RECONSTRUÍDO ───────────────────────────────
 *
 * A partir do `publicSlug` e do idioma, nunca de um campo com o caminho: um
 * caminho vindo do formulário é uma redirecção controlada pelo cliente. Mesma
 * decisão das portas do Staff e do KDS.
 */
export async function POST(pedido: Request) {
  const dados = await pedido.formData();
  const publicSlug = texto(dados, 'slug') ?? '';
  const locale = texto(dados, 'locale') ?? 'es-ES';
  const accao = texto(dados, 'accao') ?? '';
  const base = `/r/${publicSlug}/${locale}`;

  if (accao === 'entrar') {
    const segredo = texto(dados, 'qr') ?? '';
    const aberto = await abrirVisitante(obterBase(), { publicSlug, segredo });
    // `null` cobre os dois casos que o contrato separa — QR trocado e mesa
    // fechada — e a resposta é a mesma de propósito: distingui-las diria a quem
    // tem o autocolante se ele ainda serve.
    if (!aberto) return voltarPara(`${base}/menu`, { qr: 'inactivo' });

    (await cookies()).set(BOLACHA_DO_VISITANTE, aberto.token, opcoesDaBolacha(publicSlug));
    return voltarPara(`${base}/mesa`, { entrou: '1' });
  }

  // ── Daqui para baixo é preciso uma sessão VIVA ─────────────────────────
  //
  // E é verificada a cada pedido, não uma vez ao entrar. É a regra do E13 para
  // os dispositivos, pela mesma razão: revogar **durante** uma sessão aberta tem
  // de parar o pedido seguinte, e uma verificação só à entrada dava licença
  // vitalícia a quem já tinha entrado.
  const visitante = await visitanteDaRequisicao();
  if (!visitante) return voltarPara(`${base}/menu`, { sessao: 'terminou' });

  const prisma = obterBase();

  if (accao === 'acrescentar') {
    const productId = texto(dados, 'productId') ?? '';
    const quantidade = Number(texto(dados, 'quantidade') ?? '1') || 1;
    if (!productId) return voltarPara(`${base}/menu`, { erro: 'sem_produto' });
    const carrinho = acrescentar(await lerCarrinho(), productId, quantidade);
    (await cookies()).set(
      BOLACHA_DO_CARRINHO, escreverCarrinho(carrinho), opcoesDaBolacha(publicSlug));
    return voltarPara(`${base}/mesa/pedido`, { juntou: '1' });
  }

  if (accao === 'pedir') {
    // ── O carrinho inteiro numa RONDA só ────────────────────────────────
    //
    // «Acrescentar depois do envio cria uma rodada nova, não altera a anterior»
    // (`kds-e-tempo-real.md`). Enviar item a item dava três bilhetes para uma
    // mesa que pediu três pratos de uma vez, e a cozinha perdia a noção do que
    // sai junto.
    const carrinho = await lerCarrinho();
    if (carrinho.length === 0) return voltarPara(`${base}/mesa/pedido`, { erro: 'sem_linhas' });

    // O `organizationId` vem da PORTA (`visitante_activo`), e nunca de nada que
    // o cliente tenha enviado. É a diferença entre o runtime agir em nome de um
    // inquilino que a credencial provou, e agir em nome do que alguém escreveu
    // num campo escondido.
    const r = await enviarPedido(prisma, visitante.organizationId, {
      commandId: texto(dados, 'commandId') ?? crypto.randomUUID(),
      locationId: visitante.locationId,
      // ── A origem é CARTA, sempre ────────────────────────────────────────
      //
      // Um pedido de visitante nunca é de sala. O E15 já provou que a origem tem
      // de ser visível e distinguível a quem serve — dois pratos iguais pedidos
      // ao mesmo tempo pelo cliente e pela sala são DOIS, e é a origem que o
      // explica a quem olha e acha que é engano.
      canal: 'CARTA',
      linhas: carrinho,
      tableSessionId: visitante.tableSessionId,
      actor: { email: `visitante:${visitante.guestId}` },
    });
    await visitanteFalou(prisma, visitante.guestId);
    if (!r.ok) return voltarPara(`${base}/mesa/pedido`, { erro: r.motivo });

    // O carrinho esvazia-se **depois** de o pedido existir. Ao contrário, uma
    // falha deixava a pessoa sem carrinho e sem pedido.
    (await cookies()).set(BOLACHA_DO_CARRINHO, '', { ...opcoesDaBolacha(publicSlug), maxAge: 0 });

    return voltarPara(
      r.rejeitadas.length > 0 ? `${base}/mesa/esgotado` : `${base}/mesa/recebido`,
      { pedido: r.orderId,
        ...(r.rejeitadas.length > 0 ? { esgotado: String(r.rejeitadas.length) } : {}) });
  }

  if (accao === 'chamar' || accao === 'conta') {
    // Um aviso à sala. Não muda o estado da mesa: pedir a conta é uma pessoa a
    // trazê-la, e este ecrã não cobra — está escrito na tela.
    await visitanteFalou(prisma, visitante.guestId);
    return voltarPara(`${base}/mesa/${accao === 'conta' ? 'conta' : 'ajuda'}`, { avisado: '1' });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
