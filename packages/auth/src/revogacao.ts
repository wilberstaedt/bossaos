import { obterPrismaDeAutenticacao } from '@bossaos/db';

/**
 * Revogar acesso.
 *
 * **Tirar o acesso a alguém não é apagar a pertença: é fazer com que as sessões
 * que já existem parem de funcionar.** Uma senha mudada com quem já entrou a
 * continuar lá dentro parece resolvido e não está.
 *
 * ── A decisão que faz isto funcionar ─────────────────────────────────────────
 *
 * A configuração da autenticação **não activa a cache de sessão em cookie**
 * (`session.cookieCache`). É tentador: poupa uma consulta por pedido. Mas uma
 * sessão em cache sobrevive à revogação exactamente durante o tempo da cache —
 * e é nesse intervalo que a pessoa que acabou de ser despedida ainda fecha a
 * caixa. Sem cache, cada pedido lê a linha; apagada a linha, o pedido seguinte
 * já não entra.
 *
 * Está escrito aqui, e não só na configuração, porque o dia em que alguém
 * activar a cache para "melhorar a latência" é o dia em que isto deixa de ser
 * verdade sem nada ficar vermelho.
 */
export interface Revogacao {
  /** Quantas sessões foram fechadas. Dizer o número importa: zero é suspeito. */
  sessoesFechadas: number;
}

export async function revogarSessoesDoUtilizador(
  authDatabaseUrl: string,
  userId: string,
  opcoes: { excepto?: string } = {},
): Promise<Revogacao> {
  const prisma = obterPrismaDeAutenticacao(authDatabaseUrl);
  const r = await prisma.session.deleteMany({
    where: {
      userId,
      ...(opcoes.excepto ? { NOT: { token: opcoes.excepto } } : {}),
    },
  });
  return { sessoesFechadas: r.count };
}

/** Quantas sessões vivas tem esta pessoa. Para o ecrã poder dizer o número. */
export async function sessoesVivas(
  authDatabaseUrl: string,
  userId: string,
): Promise<number> {
  const prisma = obterPrismaDeAutenticacao(authDatabaseUrl);
  return prisma.session.count({ where: { userId, expiresAt: { gt: new Date() } } });
}
