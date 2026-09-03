import { NextResponse } from 'next/server';
import { comEscopo, obterPrisma, organizacaoDoConvite, resumoDoToken } from '@bossaos/db';
import { obterEnv } from '../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * O que este convite diz — **sem sessão**.
 *
 * Tem de ser assim: quem foi convidado pode ainda não ter conta, e a tela
 * AUTH-006 mostra a organização, a função e a unidade antes de aceitar. Sem
 * isto, a pessoa aceitaria às cegas.
 *
 * A credencial aqui é o **token**, e é ele que autoriza a leitura. São 32 bytes
 * aleatórios: adivinhar um é inviável, e quem o tem recebeu-o no seu email.
 *
 * O que se devolve é o mínimo para a tela existir. Não devolve o email
 * convidado por extenso — devolve se ele bate certo com o de quem pergunta,
 * quando há sessão. Devolvê-lo daria a qualquer portador do link o endereço de
 * outra pessoa.
 */
export async function GET(_p: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const prisma = obterPrisma(obterEnv().DATABASE_URL);

  const organizationId = await organizacaoDoConvite(prisma, token);
  if (!organizationId) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const dados = await comEscopo(prisma, { organizationId }, async (db) => {
    const convite = await db.invitation.findFirst({
      where: { tokenHash: resumoDoToken(token) },
      select: {
        papel: true, estado: true, expiresAt: true,
        organization: { select: { nome: true, slug: true } },
        location: { select: { nome: true } },
      },
    });
    return convite;
  });
  if (!dados) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  return NextResponse.json({
    organizacao: dados.organization.nome,
    organizacaoSlug: dados.organization.slug,
    papel: dados.papel,
    unidade: dados.location?.nome ?? null,
    estado: dados.estado,
    expirado: dados.expiresAt.getTime() <= Date.now(),
  });
}
