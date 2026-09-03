import type { PrismaClient } from '@prisma/client';
import type { ClienteComEscopo } from './escopo.ts';
import { estadoComercial, type EstadoComercial } from './planos.ts';
import { previaDeDescida, reverterAoPadrao } from './tema.ts';
import type { Capacidade } from '@bossaos/domain';

/**
 * Descer de plano: agendar, prever e efectivar.
 *
 * O `planos-e-limites.md` do E00 diz o que uma descida tem de fazer, e a parte
 * que se esquece não é a que tira direitos:
 *
 * > *"Preservar dados. Bloquear operações novas. Reverter o tema público ao
 * > padrão. Avisar com data. **E não efectivar enquanto houver sessões, caixas
 * > ou operações incompatíveis abertas** — apresenta-se a pendência à gestão em
 * > vez de fechar à força o que está a meio."*
 *
 * Uma descida que fecha uma caixa a meio de um serviço para poder ser aplicada
 * resolve o plano e estraga a noite.
 */

export interface Pendencia {
  /** Estável, para a interface e para o registo. */
  tipo: string;
  /** Legível, para quem tem de a resolver. */
  detalhe: string;
}

export type DetectorDePendencia = (
  db: ClienteComEscopo,
  organizationId: string,
) => Promise<readonly Pendencia[]>;

/**
 * O registo dos detectores, e porque é que hoje está VAZIO.
 *
 * Caixas, sessões de serviço e operações abertas são de etapas que ainda não
 * chegaram (E13, E19). Escrever aqui um detector de caixas hoje seria escrever
 * contra uma tabela que não existe.
 *
 * O que se constrói agora é o **mecanismo**, e ele não é decorativo: a descida
 * consulta este registo e recusa-se a efectivar se ele devolver alguma coisa. A
 * prova injecta um detector para haver população, porque um mecanismo provado
 * contra uma lista vazia é a mesma coisa que não estar provado — foi essa a
 * lição do E03.
 *
 * Quem construir a caixa no E13 regista aqui e não tem de tocar na descida.
 */
const DETECTORES: DetectorDePendencia[] = [];

export function registarDetectorDePendencia(d: DetectorDePendencia): () => void {
  DETECTORES.push(d);
  // Devolve como se remove. Um registo global sem forma de o desfazer torna
  // qualquer teste que o use dependente da ordem em que os testes correm.
  return () => {
    const i = DETECTORES.indexOf(d);
    if (i >= 0) DETECTORES.splice(i, 1);
  };
}

export function detectoresRegistados(): number {
  return DETECTORES.length;
}

export async function pendenciasQueBloqueiamDescida(
  db: ClienteComEscopo,
  organizationId: string,
): Promise<readonly Pendencia[]> {
  const listas = await Promise.all(DETECTORES.map((d) => d(db, organizationId)));
  return listas.flat();
}

/**
 * O estado comercial que a organização TERIA com outro plano.
 *
 * É esta função que faz a prévia bater com a efectivação — as duas chamam-na, e
 * é a única forma de a prévia não ser "outra via a dar o mesmo resultado por
 * acaso". O aceite 3 pede exactamente isso: *"preview de downgrade corresponde
 * ao tema e aos direitos aplicados na data de teste"*.
 *
 * As concessões explícitas e as flags **não mudam** com o plano: um adicional
 * comprado à parte continua comprado depois de descer, e é isso que impede uma
 * descida de apagar o que foi pago em separado.
 */
export async function estadoComercialSeFosse(
  db: ClienteComEscopo,
  organizationId: string,
  planoCodigo: string | null,
): Promise<EstadoComercial> {
  const agora = await estadoComercial(db, organizationId);
  if (planoCodigo === null) {
    return { ...agora, planoCodigo: null, planoNome: null, concessoes: concessoesExplicitas(agora) };
  }

  const destino = await db.planDefinition.findUnique({
    where: { codigo: planoCodigo },
    select: { codigo: true, nome: true, capacidades: { select: { capacidade: true, quota: true } } },
  });
  if (!destino) throw new Error(`plano desconhecido: ${planoCodigo}`);

  return {
    ...agora,
    planoCodigo: destino.codigo,
    planoNome: destino.nome,
    concessoes: [
      ...destino.capacidades.map((c) => ({
        capacidade: c.capacidade as Capacidade,
        quota: c.quota,
        ...(agora.validoAte ? { validoAte: agora.validoAte } : {}),
      })),
      ...concessoesExplicitas(agora),
    ],
  };
}

/**
 * As concessões que NÃO vêm do plano.
 *
 * Separam-se por não terem vindo das capacidades do plano actual. É frágil se
 * alguém conceder explicitamente exactamente a mesma capacidade que o plano já
 * dá — e nesse caso a explícita sobrevive à descida, que é o lado seguro: um
 * adicional pago não desaparece porque coincidia com o plano antigo.
 */
function concessoesExplicitas(estado: EstadoComercial) {
  return estado.concessoes.filter((c) => c.locationId !== undefined || c.validoAte !== undefined || c.quota !== null);
}

/**
 * A prévia, para o ecrã — e a MESMA chamada que a efectivação usa.
 *
 * O aceite 3 pede que a prévia corresponda ao que fica aplicado. Duas funções a
 * calcular o mesmo dão o mesmo resultado até ao dia em que uma delas muda, e
 * nesse dia o ecrã promete uma coisa e o trabalho de fundo faz outra. Por isso
 * não há duas: há esta, e o job chama-a.
 */
export async function previaDeDescidaParaPlano(
  db: ClienteComEscopo,
  organizationId: string,
  planoCodigo: string | null,
) {
  const depois = await estadoComercialSeFosse(db, organizationId, planoCodigo);
  const previa = await previaDeDescida(db, organizationId, depois);
  return { ...previa, depois };
}

export type ResultadoDaDescida =
  | { aplicada: true; de: string | null; para: string; temaRevertido: boolean }
  | { aplicada: false; motivo: 'nada_agendado' | 'ainda_nao' | 'sem_subscricao' }
  | { aplicada: false; motivo: 'pendencias'; pendencias: readonly Pendencia[] };

/**
 * Efectiva a descida agendada desta organização, se for hora.
 *
 * **Isto corre num trabalho de fundo, não numa rota.** O aceite 2 do E05 é
 * explícito em que entitlement expirado e flag desligada têm de dar a resposta
 * certa *"inclusive em job e rota direta"* — e a razão é que um job costuma ser
 * o sítio onde alguém "sabe" que o pedido já foi validado antes e salta a
 * verificação. Aqui não há antes: o job lê o mesmo `estadoComercial` e chama a
 * mesma `podeCapacidade` que a rota.
 *
 * ── A ordem, e porque é que ela não importa ────────────────────────────────
 *
 * Reverter o tema antes de mudar o plano deixaria, se a mudança falhasse, um
 * tema revertido por uma descida que não aconteceu. Mudar o plano primeiro
 * deixaria, se a reversão falhasse, cores próprias publicadas por quem já não
 * as paga. As duas ordens têm um lado mau — e nenhuma acontece, porque
 * `comEscopo` já abriu uma transacção e as duas escritas caem ou passam juntas.
 * Está escrito porque o dia em que alguém tirar a transacção daqui, isto passa a
 * ser uma escolha entre dois defeitos.
 */
export async function aplicarDescidaAgendada(
  db: ClienteComEscopo,
  organizationId: string,
): Promise<ResultadoDaDescida> {
  const estado = await estadoComercial(db, organizationId);
  if (estado.estadoSubscricao === null) return { aplicada: false, motivo: 'sem_subscricao' };
  if (!estado.descerParaPlano || !estado.descerEm) return { aplicada: false, motivo: 'nada_agendado' };
  // A hora vem da BASE, não do processo. Foi o desvio de duas horas do E04 que
  // ensinou a não perguntar as horas ao sítio errado.
  const relogio = await db.$queryRaw<Array<{ passou: boolean }>>`
    SELECT (descer_em <= now()) AS passou FROM subscriptions WHERE organization_id = ${organizationId}::uuid
  `;
  if (!relogio[0]?.passou) return { aplicada: false, motivo: 'ainda_nao' };

  const pendencias = await pendenciasQueBloqueiamDescida(db, organizationId);
  if (pendencias.length > 0) return { aplicada: false, motivo: 'pendencias', pendencias };

  // A MESMA chamada que o ecrã de mudar de plano faz. Não é uma segunda via a
  // dar o mesmo resultado: é a via.
  const { perdeCoresProprias } = await previaDeDescidaParaPlano(db, organizationId, estado.descerParaPlano);

  let temaRevertido = false;
  if (perdeCoresProprias) {
    // `reverterAoPadrao` GUARDA a revisão anterior. "Descida preserva dados e
    // tema anterior" — quem voltar a subir encontra as cores onde as deixou.
    await reverterAoPadrao(db, organizationId);
    temaRevertido = true;
  }

  const saida = await db.$queryRaw<Array<{ aplicar_descida_agendada: string }>>`
    SELECT aplicar_descida_agendada(${organizationId}::uuid)
  `;
  const veredicto = saida[0]?.aplicar_descida_agendada;

  if (veredicto !== 'aplicada') {
    // A função é a fonte da verdade sobre se houve mudança. Se ela disser que
    // não, o que este código julgava saber estava errado — e a transacção leva
    // consigo a reversão do tema.
    throw new Error(`a descida não foi aplicada pela base: ${veredicto}`);
  }

  return { aplicada: true, de: estado.planoCodigo, para: estado.descerParaPlano, temaRevertido };
}

/**
 * O varrimento: quem tem descida devida.
 *
 * Recebe o `PrismaClient` **sem escopo**, e é de propósito — a função na base
 * recusa-se a responder de dentro de um inquilino. Quem quiser chamar isto de
 * uma rota tem de sair do `comEscopo` primeiro, e nesse momento a intenção fica
 * visível a quem ler o código, em vez de escondida numa consulta que por acaso
 * atravessava inquilinos.
 */
export async function descidasDevidas(prisma: PrismaClient): Promise<string[]> {
  const linhas = await prisma.$queryRaw<Array<{ descidas_devidas: string }>>`
    SELECT descidas_devidas()
  `;
  return linhas.map((l: { descidas_devidas: string }) => l.descidas_devidas);
}
