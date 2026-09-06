import { notFound } from 'next/navigation';
import { comEscopo, estadoDoKiosk, kioskDoAparelho, sessaoViva } from '@bossaos/db';
import { obterBase } from '../servidor.ts';

/**
 * O que a casca do kiosk precisa, e precisa igual em todas as telas.
 *
 * ── Não há sessão de utilizador, e é o ponto ───────────────────────────────
 *
 * O KDS chama `actorDoPedido()` e manda para o login: há uma pessoa no tablet
 * da cozinha. **Aqui não há ninguém.** O inquilino sai da porta estreita
 * `kiosk_do_aparelho` e só depois se abre escopo — a mesma forma da reserva
 * pública do E17.
 *
 * ── Ausência, e nunca «proibido» ───────────────────────────────────────────
 *
 * Um aparelho que não existe, um que ainda não foi pareado e um que foi
 * revogado dão os TRÊS a mesma resposta: 404. Dizer «existe mas não podes» a
 * quem experimenta identificadores é um oráculo de existência — regra do E04, e
 * vale igual aqui.
 */
export async function carregarKiosk(deviceId: string) {
  const prisma = obterBase();
  const kiosk = await kioskDoAparelho(prisma, deviceId);
  if (!kiosk) notFound();

  // Sem `userId`: não há pessoa nenhuma. O escopo leva o inquilino e mais nada,
  // e o caminho de identidade fica por abrir — que é o certo num ecrã de
  // corredor. Pôr aqui um utilizador de serviço era inventar um actor para a
  // auditoria culpar.
  const escopo = { organizationId: kiosk.organizationId };
  const [sessao, disponibilidade] = await Promise.all([
    comEscopo(prisma, escopo, (db) => sessaoViva(db, deviceId)),
    comEscopo(prisma, escopo, (db) => estadoDoKiosk(db, deviceId)),
  ]);

  return { kiosk, escopo, sessao, disponibilidade, prisma };
}
