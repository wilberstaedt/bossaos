import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { abrirVisitante, chamarASala, pedirDoVisitante, visitanteFalou } from '@bossaos/db';
import { texto, voltarPara } from '../../../../../src/formulario.ts';
import {
  BOLACHA_DO_VISITANTE, opcoesDaBolacha, visitanteDaRequisicao,
} from '../../../../../src/visitante/sessao-do-visitante.ts';
import {
  BOLACHA_DO_CARRINHO, acrescentar, escreverCarrinho, lerCarrinho,
} from '../../../../../src/visitante/carrinho.ts';
import { obterBase } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do visitante da mesa.
 *
 * ── Vive DENTRO do endereço do restaurante, e isso não é arrumação ────────
 *
 * Estava em `/api/publico/mesa`, e **nada funcionava**. A bolacha do visitante
 * tem `path=/r/<slug>` — de propósito, para não viajar para os outros
 * restaurantes servidos pelo mesmo domínio — e o navegador simplesmente não a
 * envia para um endereço fora desse caminho. O formulário chegava cá sem
 * credencial, a porta respondia «a sessão terminou», e quem estava sentado via a
 * carta outra vez sem perceber porquê.
 *
 * Não dava erro em lado nenhum: a rota respondia 303, a página carregava, e o
 * pedido desaparecia. Encontrou-o a prova de navegador ao carregar num botão —
 * nenhuma prova de base o podia ver, porque do lado do servidor a bolacha estava
 * sempre lá.
 *
 * A saída barata era `path: '/'`. Isso mandava a credencial da mesa 5 do
 * restaurante A para o restaurante B no mesmo domínio, que é o oposto do que o
 * `autenticacao-e-convites.md` decide sobre escopo. A porta é que muda de sítio.
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

  // A credencial em bruto: é o que as portas recebem. O `visitante` acima serve
  // para recusar cedo — as portas voltam a validá-la, porque entre uma coisa e
  // outra a equipa pode ter fechado a conta.
  const bolachaDoVisitante = (await cookies()).get(BOLACHA_DO_VISITANTE)?.value ?? '';
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

    // ── A escrita passa pela porta, e a porta recebe o TOKEN ─────────
    //
    // `enviarPedido` recebe um `organizationId`, e numa rota pública essa é a
    // forma errada mesmo quando o valor está certo: quem lê o ficheiro não sabe
    // de onde ele veio. `pedirDoVisitante` resolve o inquilino a partir da
    // credencial, e não há por onde outro valor entrar.
    const r = await pedirDoVisitante(prisma, {
      token: bolachaDoVisitante,
      commandId: texto(dados, 'commandId') ?? crypto.randomUUID(),
      linhas: carrinho,
    });
    await visitanteFalou(prisma, bolachaDoVisitante);
    if (!r.ok) return voltarPara(`${base}/mesa/pedido`, { erro: r.motivo });

    // O carrinho esvazia-se **depois** de o pedido existir. Ao contrário, uma
    // falha deixava a pessoa sem carrinho e sem pedido.
    (await cookies()).set(BOLACHA_DO_CARRINHO, '', { ...opcoesDaBolacha(publicSlug), maxAge: 0 });

    return voltarPara(
      r.rejeitadas > 0 ? `${base}/mesa/esgotado` : `${base}/mesa/recebido`,
      { pedido: r.orderId,
        ...(r.rejeitadas > 0 ? { esgotado: String(r.rejeitadas) } : {}) });
  }

  if (accao === 'chamar' || accao === 'conta') {
    // ── Um aviso à sala, com limite e deduplicação ──────────────────────
    //
    // Ponto 4 do enunciado. Sem isto, quem tem o QR — e basta uma fotografia —
    // carrega sem parar, e quem serve recebe avisos que não distingue de
    // chamadas reais numa sala cheia.
    //
    // A janela vive na porta da base, e não aqui: uma verificação deste lado é
    // a mesma corrida do E13 com outro nome — dois toques ao mesmo tempo lêem
    // ambos «não há chamada aberta» e escrevem duas.
    const chamada = await chamarASala(prisma, {
      token: bolachaDoVisitante, tipo: accao === 'conta' ? 'CONTA' : 'AJUDA',
    });
    await visitanteFalou(prisma, bolachaDoVisitante);
    const destino = `${base}/mesa/${accao === 'conta' ? 'conta' : 'ajuda'}`;
    if (!chamada) return voltarPara(`${base}/menu`, { sessao: 'terminou' });
    // O ecrã distingue as três respostas, e a distinção é o que faz alguém parar
    // de carregar: «avisámos agora», «já tínhamos avisado», «alguém já foi».
    return voltarPara(destino, {
      avisado: chamada.atendidaEm ? 'atendida' : chamada.deduplicada ? 'ja' : '1',
    });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
