import { redirect } from 'next/navigation';
import {
  chamadasDaVisita, pedidosDoVisitante, producaoDoVisitante, reciboPublico,
  type PedidoDoVisitante,
} from '@bossaos/db';
import { cookies } from 'next/headers';
import { obterBase } from '../servidor.ts';
import { BOLACHA_DO_VISITANTE, visitanteDaRequisicao } from './sessao-do-visitante.ts';

/**
 * O que todas as telas da visita precisam.
 *
 * ── Tudo pela PORTA, e nunca com escopo de inquilino ──────────────────────
 *
 * A guarda `rotas-com-porta.test.ts` do E09 apanhou-me: quatro telas do visitante
 * chegavam à base **com escopo de inquilino** — consultas escritas numa página
 * servida a partir de um endereço que vai impresso num autocolante.
 *
 * (A função proibida não se nomeia aqui: a guarda lê o texto do ficheiro e leria
 * a menção como um uso. É o preço de ela conseguir apanhar qualquer forma de
 * escrita, e é barato.)
 *
 * A tentação era alargar a guarda para as deixar passar. Alargar uma guarda para
 * caber no que se escreveu é como se desligam guardas. As leituras passaram a
 * ter porta própria, e o ganho não é só a guarda ficar verde: «a mesa 5 não vê a
 * mesa 4» está agora escrito em SQL, e não num filtro que a próxima página pode
 * esquecer.
 *
 * ── E sem sessão viva, vai para o ESTADO que o explica ───────────────────
 *
 * Não para a carta em silêncio. Quem estava a pedir e viu a conta fechar merece
 * a frase, e não um ecrã que se comporta como se ele nunca tivesse estado ali.
 */
export async function carregarVisita(publicSlug: string, locale: string) {
  const visitante = await visitanteDaRequisicao();
  if (!visitante) redirect(`/r/${publicSlug}/${locale}/menu?sessao=terminou`);
  return visitante;
}

/** A credencial em bruto, para as portas que a recebem. */
export async function bolachaDaVisita(): Promise<string> {
  return (await cookies()).get(BOLACHA_DO_VISITANTE)?.value ?? '';
}

/** Os pedidos desta mesa. O filtro é a credencial, dentro da porta. */
export async function pedidosDaMesa(): Promise<PedidoDoVisitante[]> {
  const bolacha = await bolachaDaVisita();
  if (!bolacha) return [];
  return pedidosDoVisitante(obterBase(), bolacha);
}

/** Como vai a produção desta mesa — só os estados, por pedido. */
export async function producaoDaMesa(): Promise<Map<string, { estado: string }[]>> {
  const bolacha = await bolachaDaVisita();
  if (!bolacha) return new Map();
  return producaoDoVisitante(obterBase(), bolacha);
}

/** As chamadas desta visita. Lista vazia quando não há credencial. */
export async function chamadasDaVisitaActual() {
  const bolacha = await bolachaDaVisita();
  if (!bolacha) return [];
  return chamadasDaVisita(obterBase(), bolacha);
}

/**
 * O comprovativo do pagamento, pela porta estreita.
 *
 * Vive aqui e não em `src/pagamento/` porque é canalização de uma tela de `/r/`:
 * é neste módulo que vale a regra apertada — só portas, e nunca um cliente de
 * base com inquilino. Posto ao lado, caía na regra geral e pedir-lhe-ia
 * `resolverPedido`, que um visitante da mesa não tem e nunca vai ter.
 *
 * ── E o nome do que é proibido não se escreve aqui ───────────────────────
 *
 * A guarda das rotas lê o ficheiro em bruto e não distingue código de
 * comentário: escrever o nome proibido para explicar porque não se usa fazia-a
 * acender sobre a própria explicação. A `validar-dinheiro.sh` já tinha resolvido
 * isto com o `sem-comentarios.py`; esta ainda não. Fica declarado no E23.md.
 */
export async function comprovativoDaVisita(recibo: string) {
  return reciboPublico(obterBase(), recibo);
}
