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

/**
 * O filtro do apagamento, isolado de propósito.
 *
 * Está fora da função que apaga para poder ser **medido sem uma base de dados**.
 * O defeito catastrófico de uma função de revogação não é apagar de menos: é
 * apagar de mais. Um `where` que perca o `userId` — numa refactorização, num
 * spread mal colocado — apaga as sessões de TODA a gente do produto, e por fora,
 * por HTTP, isso lê-se exactamente como uma revogação bem sucedida: a pessoa
 * certa deixou de entrar. O sinal só aparece nos outros restaurantes.
 */
export function filtroDeRevogacao(userId: string, opcoes: { excepto?: string } = {}) {
  return {
    userId,
    // `excepto` vazio não vira "excepto nada": cai para revogar tudo, incluindo
    // a sessão de quem pediu. Falhar para o lado fechado é o lado certo aqui.
    ...(opcoes.excepto ? { NOT: { token: opcoes.excepto } } : {}),
  };
}

export async function revogarSessoesDoUtilizador(
  authDatabaseUrl: string,
  userId: string,
  opcoes: { excepto?: string } = {},
): Promise<Revogacao> {
  const prisma = obterPrismaDeAutenticacao(authDatabaseUrl);
  const r = await prisma.session.deleteMany({ where: filtroDeRevogacao(userId, opcoes) });
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
