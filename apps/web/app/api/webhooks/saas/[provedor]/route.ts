import { NextResponse } from 'next/server';
import {
  aplicarEventoDeCobrancaPublico, receberEventoDeCobrancaPublico,
} from '@bossaos/db';
import { obterBase } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do webhook de COBRANÇA DO SAAS.
 *
 * ── A fronteira mais perigosa do produto, e vale dizer porquê em voz alta ──
 *
 * Um webhook que altera concessões comerciais é, do outro lado, **um pedido
 * para mudar quanto alguém paga**. Se esta rota aceitasse o `organization_id`
 * que vem no corpo, qualquer pessoa que descobrisse o endereço dava a si própria
 * o plano que quisesse — e o sistema registava tudo como legítimo, porque foi.
 *
 * ── O que esta rota NÃO faz, e é o desenho inteiro ────────────────────────
 *
 * Não escolhe organização. Não pode: não há argumento por onde lha passar. Ela
 * grava o que chegou e manda aplicar pelo identificador do EVENTO — e a função
 * privilegiada resolve a organização pela `saas_customers`, uma ligação criada
 * do nosso lado por alguém autenticado.
 *
 * O `organization_id` do corpo viaja para a base com o nome `alegado`, e serve
 * para uma coisa só: ficar escrito quando não bate certo, para quem for ver
 * daqui a um ano encontrar a tentativa.
 *
 * ── E o corpo lê-se CRU ───────────────────────────────────────────────────
 *
 * `await pedido.text()`, nunca `.json()`. Como o E24 fixou e o E23 aplicou: uma
 * assinatura verificada sobre a nossa reconstrução do JSON não verifica nada.
 * A excepção não dispensa a exigência — troca-a.
 *
 * ── E responde-se 200 depois de gravar ────────────────────────────────────
 *
 * Um provedor que recebe erro **reenvia**. A identidade é a do acontecimento e a
 * gravação deduplica, portanto reenviar é inofensivo — mas devolver erro por uma
 * falha nossa a jusante faria o provedor martelar a porta durante horas.
 */
export async function POST(
  pedido: Request, ctx: { params: Promise<{ provedor: string }> },
) {
  const { provedor } = await ctx.params;

  // O segredo vive no AMBIENTE. Não há coluna para ele na base e não entra em
  // registo nenhum — decisão do E23, e mantém-se.
  const segredo = process.env[`SAAS_WEBHOOK_SEGREDO_${provedor.toUpperCase()}`] ?? '';
  if (!segredo) {
    // Sem provedor configurado, ninguém entra. **E é 404 e não 401:** dizer
    // «existe mas não estás autorizado» conta a quem sonda que este provedor
    // está ligado aqui.
    return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
  }

  const corpoCru = await pedido.text();
  const assinatura = pedido.headers.get('x-bossaos-assinatura');

  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(corpoCru) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erro: 'corpo_invalido' }, { status: 400 });
  }

  const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null);
  const provedorEventoId = texto(corpo['id']);
  const provedorClienteId = texto(corpo['customer']);
  const tipo = texto(corpo['type']) ?? 'desconhecido';
  if (!provedorEventoId || !provedorClienteId) {
    return NextResponse.json({ erro: 'corpo_invalido' }, { status: 400 });
  }

  // ── A alegação, com o nome que ela merece ───────────────────────────────
  //
  // Lê-se, guarda-se, e **não decide nada**. O `uuid` é validado só para não
  // rebentar a coluna: um valor mal formado não é mais perigoso do que um bem
  // formado, porque nenhum dos dois autoriza.
  const alegado = texto(corpo['organization_id']);
  const organizationIdAlegado =
    alegado && /^[0-9a-f-]{36}$/i.test(alegado) ? alegado : null;

  const prisma = obterBase();

  // ── Sem escopo de inquilino, e isso é a garantia ───────────────────────
  //
  // Estas funções não têm por onde receber uma organização. A rota não pode
  // escolher uma nem que queira — e a alegação fica onde deve estar: dentro do
  // registo, com o nome que a denuncia.
  const evento = await receberEventoDeCobrancaPublico(prisma, {
    provedor, provedorEventoId, tipo, provedorClienteId,
    planoCodigo: texto(corpo['plan']),
    organizationIdAlegado,
    corpoCru, assinatura, segredo,
  });

  const estado = await aplicarEventoDeCobrancaPublico(prisma, evento.id);

  // O estado vai na resposta para quem opera poder ver, mas o corpo não diz a
  // que organização foi aplicado: quem bate à porta não tem de saber quem somos
  // por dentro.
  return NextResponse.json({ recebido: true, estado }, { status: 200 });
}
