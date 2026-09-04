import { cookies } from 'next/headers';
import { visitanteActivo, type VisitanteActivo } from '@bossaos/db';
import { obterBase } from '../servidor.ts';

/**
 * A credencial do visitante da mesa, no navegador.
 *
 * ── Uma bolacha, e não o segredo do QR ────────────────────────────────────
 *
 * O QR **abre** a sessão; não **é** a sessão. O que fica no telemóvel de quem
 * está sentado é um token próprio, emitido ao entrar — e é por isso que trocar o
 * autocolante da mesa não lhe toca.
 *
 * Guardar o segredo do QR aqui teria sido mais simples e teria colapsado o par:
 * qualquer verificação passaria a comparar com o segredo actual da mesa, e rodar
 * expulsava toda a gente. A separação não é higiene — é a regra.
 */
export const BOLACHA_DO_VISITANTE = 'bo_visita';

/**
 * ── `httpOnly`, e o caminho limitado à unidade ───────────────────────────
 *
 * `httpOnly` porque nada no navegador precisa de a ler: as telas do visitante
 * rendem no servidor. E o `path` limitado ao endereço público daquele
 * restaurante — uma bolacha à raiz viajava para os outros restaurantes servidos
 * pelo mesmo domínio, e o convidado da mesa 5 não tem nada que ver com a casa ao
 * lado.
 */
export function opcoesDaBolacha(publicSlug: string) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: `/r/${publicSlug}`,
    // `secure` só fora de desenvolvimento: em `localhost` a bolacha segura não é
    // guardada, e a prova de navegador media um visitante que nunca entra.
    secure: process.env.NODE_ENV === 'production',
  };
}

/**
 * O visitante desta requisição, se ainda vale. `null` quando não vale.
 *
 * **Vai sempre à base.** Uma bolacha válida não prova nada por si: a mesa pode
 * ter fechado a conta há um minuto, e a equipa pode ter revogado o acesso. A
 * porta `visitante_activo` responde às duas perguntas de uma vez, e é por isso
 * que não há aqui uma cópia da regra.
 */
export async function visitanteDaRequisicao(): Promise<VisitanteActivo | null> {
  const bolacha = (await cookies()).get(BOLACHA_DO_VISITANTE)?.value;
  if (!bolacha) return null;
  return visitanteActivo(obterBase(), bolacha);
}
