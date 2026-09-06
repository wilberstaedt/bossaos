import { NextResponse } from 'next/server';
import { RecusaDoKiosk, comecarNoKiosk } from '@bossaos/db';
import { obterBase } from '../../../../../src/servidor.ts';

/**
 * Começar: o acto que declara «sou outra pessoa».
 *
 * ── Porque é um POST e não a própria tela ─────────────────────────────────
 *
 * Abrir a sessão fecha a anterior. Fazer isso na renderização de uma página
 * significava que qualquer visita ao ecrã — um refresh, um pré-carregamento do
 * navegador, um robot — deitava fora a sessão de quem está a meio do pedido.
 *
 * É a mesma razão pela qual apagar não é um GET: um efeito que não se pode
 * desfazer não pode acontecer por alguém ter olhado para a página.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await ctx.params;

  const dados = await pedido.formData().catch(() => null);
  const idioma = typeof dados?.get('idioma') === 'string' ? String(dados.get('idioma')) : 'es-ES';

  try {
    // A porta resolve o inquilino e abre o escopo lá dentro. Esta rota não sabe
    // — nem pode saber — a que organização o aparelho pertence.
    const aberta = await comecarNoKiosk(obterBase(), deviceId, idioma);
    if (!aberta) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
  } catch (erro) {
    if (erro instanceof RecusaDoKiosk) {
      // Aparelho por parear ou revogado: o ecrã pausado diz o que se passa, e
      // não um 500 que a pessoa no corredor não sabe ler.
      return NextResponse.redirect(
        new URL(`/${idioma}/kiosk/${deviceId}/pausado`, pedido.url), 303);
    }
    throw erro;
  }

  return NextResponse.redirect(new URL(`/${idioma}/kiosk/${deviceId}/menu`, pedido.url), 303);
}
