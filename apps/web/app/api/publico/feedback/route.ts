import { feedbackDaRua } from '@bossaos/db';
import { obterBase } from '../../../../src/servidor.ts';
import { texto, voltarPara } from '../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta pública do feedback.
 *
 * ── O consentimento é uma resposta, e não uma dedução ─────────────────────
 *
 * O `consenteCampanha` só é verdadeiro se a pessoa tiver escolhido «sim» no
 * ecrã. Não se infere da presença do email, não se infere de ter escrito um
 * comentário simpático, e não há caixa pré-marcada — porque uma caixa
 * pré-marcada não é consentimento.
 */
export async function POST(pedido: Request) {
  const dados = await pedido.formData();
  const slug = texto(dados, 'slug') ?? '';
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const destino = `/r/${slug}/${idioma}/menu/feedback`;

  const nota = Number(texto(dados, 'nota') ?? '');
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return voltarPara(destino, { erro: 'nota' });
  }

  const prisma = obterBase();
  const comentario = texto(dados, 'comentario') ?? '';
  const email = texto(dados, 'email') ?? '';
  const id = await feedbackDaRua(prisma, slug, {
    nota,
    ...(comentario ? { comentario } : {}),
    ...(email ? { email } : {}),
    // Comparação com a palavra exacta: qualquer outra coisa é «não».
    consenteCampanha: texto(dados, 'consenteCampanha') === 'SIM',
  });
  if (!id) return voltarPara(destino, { erro: 'desconhecida' });
  return voltarPara(destino, { ok: 'obrigado' });
}
