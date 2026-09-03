import { randomUUID } from 'node:crypto';
import type { ClienteComEscopo, ClienteComIdentidade } from './escopo.ts';
import { estadoComercial } from './planos.ts';
import { lerHorario } from './horarios.ts';
import { listaDeArranque, type FactosDoArranque, type ItemDeArranque } from '@bossaos/domain';

/**
 * Onboarding: criar a organização, a marca e a unidade — sem duplicar.
 *
 * ── O aceite 1, e porque é que ele não se resolve em TypeScript ─────────────
 *
 * > *"Repetir criação após timeout não duplica organização/unidade."*
 *
 * Um cliente que expira não sabe distinguir "não chegou" de "chegou e a resposta
 * perdeu-se". Repetir é a coisa certa a fazer. O que não pode acontecer é ficar
 * com duas.
 *
 * A tentação é ler a chave, ver que não existe, e criar. Isso resolve o caso
 * lento e **não resolve o simultâneo**: duas repetições ao mesmo tempo lêem as
 * duas "não existe" e criam as duas. Aqui quem decide a corrida é a restrição
 * única de `idempotency_keys` — e o identificador do que se vai criar é
 * escolhido **antes**, para caber na linha que ganhar.
 */

export interface Idempotencia {
  chave: string;
  actorId: string;
}

export interface ResultadoIdempotente {
  id: string;
  /** `false` quando esta chamada encontrou o trabalho já feito. */
  criado: boolean;
}

/**
 * Corre `criar` uma vez só, por chave.
 *
 * O `INSERT ... ON CONFLICT DO NOTHING` do perdedor **bloqueia** até o vencedor
 * confirmar ou desfazer, porque disputam a mesma linha do índice único. Por isso
 * a leitura a seguir vê sempre o resultado do vencedor, e nunca um vazio.
 */
export async function comIdempotencia(
  db: ClienteComEscopo,
  organizationId: string,
  accao: string,
  chave: Idempotencia,
  criar: (id: string) => Promise<unknown>,
): Promise<ResultadoIdempotente> {
  if (!chave.chave.trim()) {
    // Sem chave não há idempotência. Aceitar em silêncio dava a quem repete uma
    // segunda organização e a sensação de que o sistema é que se enganou.
    throw new Error('chave de idempotência em falta');
  }
  const id = randomUUID();
  const inseridas = await db.$executeRaw`
    INSERT INTO idempotency_keys (id, chave, actor_id, accao, organization_id, resultado_tipo, resultado_id)
    VALUES (gen_random_uuid(), ${chave.chave}, ${chave.actorId}::uuid, ${accao}, ${organizationId}::uuid, ${accao}, ${id}::uuid)
    ON CONFLICT (chave, actor_id, accao) DO NOTHING
  `;

  if (inseridas === 0) {
    const anterior = await db.$queryRaw<Array<{ resultado_id: string }>>`
      SELECT resultado_id FROM idempotency_keys
       WHERE chave = ${chave.chave} AND actor_id = ${chave.actorId}::uuid AND accao = ${accao}
    `;
    const id0 = anterior[0]?.resultado_id;
    if (!id0) throw new Error('chave em conflito sem resultado guardado');
    return { id: id0, criado: false };
  }

  await criar(id);
  return { id, criado: true };
}

/**
 * Cria a organização e põe quem a criou lá dentro como dono.
 *
 * Passa pela função `criar_organizacao_com_dono`, e não por um `INSERT`, porque
 * a política do E03 em `organizations` torna a criação impossível a partir do
 * runtime — de propósito. A função cria as quatro linhas ou nenhuma, e garante o
 * invariante que nenhum `INSERT` garante: **não se cria uma organização a que
 * não se pertence.**
 */
export async function criarOrganizacaoComDono(
  db: ClienteComIdentidade,
  dados: { chave: string; slug: string; nome: string },
): Promise<{ organizationId: string; criada: boolean }> {
  const linhas = await db.$queryRaw<Array<{ organization_id: string; criada: boolean }>>`
    SELECT * FROM criar_organizacao_com_dono(${dados.chave}, ${dados.slug}, ${dados.nome})
  `;
  const l = linhas[0];
  if (!l) throw new Error('a criação da organização não devolveu nada');
  return { organizationId: l.organization_id, criada: l.criada };
}

// ── Perfil ──────────────────────────────────────────────────────────────────

export interface PerfilDaOrganizacao {
  nome: string;
  nomeLegal: string | null;
  pais: string | null;
  fuso: string | null;
  moedaPadrao: string | null;
  responsavel: string | null;
}

export function lerPerfil(db: ClienteComEscopo, organizationId: string) {
  return db.organization.findFirst({
    where: { id: organizationId },
    select: {
      nome: true, nomeLegal: true, pais: true, fuso: true,
      moedaPadrao: true, responsavel: true, slug: true,
    },
  });
}

/**
 * Grava o perfil.
 *
 * `undefined` significa "não mexer" e `null` significa "apagar". São coisas
 * diferentes, e colapsá-las faria um formulário que só mostra dois campos
 * apagar os outros quatro — que é a mesma armadilha do `guardarSemana`.
 */
export async function guardarPerfil(
  db: ClienteComEscopo,
  organizationId: string,
  campos: Partial<PerfilDaOrganizacao>,
): Promise<void> {
  await db.organization.update({
    where: { id: organizationId },
    data: {
      ...(campos.nome !== undefined ? { nome: campos.nome } : {}),
      ...(campos.nomeLegal !== undefined ? { nomeLegal: campos.nomeLegal } : {}),
      ...(campos.pais !== undefined ? { pais: campos.pais } : {}),
      ...(campos.fuso !== undefined ? { fuso: campos.fuso } : {}),
      ...(campos.moedaPadrao !== undefined ? { moedaPadrao: campos.moedaPadrao } : {}),
      ...(campos.responsavel !== undefined ? { responsavel: campos.responsavel } : {}),
    },
  });
}

/** O perfil está completo? É o que a lista de arranque mede no item 1. */
export function perfilCompleto(p: PerfilDaOrganizacao | null): boolean {
  // O nome legal fica de fora de propósito: um restaurante pode operar antes de
  // ter a certidão à mão, e exigi-lo bloquearia o arranque por causa de um
  // papel. País e fuso não — sem eles não se sabe que horas são nem que regras
  // se aplicam.
  return Boolean(p && p.pais && p.fuso);
}

// ── Progresso ───────────────────────────────────────────────────────────────

export async function progressoDoArranque(db: ClienteComEscopo, organizationId: string) {
  return db.onboardingProgress.findFirst({
    where: { organizationId },
    select: { passo: true, concluidoEm: true },
  });
}

/**
 * Guarda em que passo alguém ficou, para poder voltar.
 *
 * **O passo não é a verdade sobre o que está feito** — a verdade é o que existe
 * na base, e é isso que a lista de arranque mede. Isto é só a última posição de
 * quem estava a preencher, para não ter de percorrer tudo outra vez.
 *
 * E só avança: quem volta ao passo 2 para corrigir a marca não perde o 7.
 */
export async function marcarPasso(
  db: ClienteComEscopo,
  organizationId: string,
  passo: number,
): Promise<void> {
  if (passo < 1 || passo > 10) throw new Error(`passo fora de 1..10: ${passo}`);
  // Uma escrita só, com o `GREATEST` DENTRO do `UPDATE`.
  //
  // A primeira versão fazia um `upsert` a pôr o passo e um `UPDATE ... GREATEST`
  // a seguir — e não funcionava: o `upsert` já tinha baixado o valor, e o
  // `GREATEST(2, 2)` não recupera o 7 que estava lá antes. Quem voltasse ao
  // passo 2 para corrigir a marca perdia o 7. Apanhado a reler, e é a razão de
  // isto ser uma instrução em vez de duas.
  await db.$executeRaw`
    INSERT INTO onboarding_progress (organization_id, passo, updated_at)
    VALUES (${organizationId}::uuid, ${passo}, now())
    ON CONFLICT (organization_id)
      DO UPDATE SET passo = GREATEST(onboarding_progress.passo, EXCLUDED.passo), updated_at = now()
  `;
}

// ── A lista de arranque, com os factos medidos ──────────────────────────────

export async function arranqueDaOrganizacao(
  db: ClienteComEscopo,
  organizationId: string,
): Promise<{ itens: readonly ItemDeArranque[]; factos: FactosDoArranque }> {
  const perfil = await lerPerfil(db, organizationId);
  const [marcas, unidades, pessoas, estado] = await Promise.all([
    db.brand.count({ where: { archivedAt: null } }),
    db.location.findMany({
      where: { archivedAt: null },
      select: { id: true, moeda: true, fuso: true },
    }),
    db.membership.count({ where: { estado: 'ACTIVO' } }),
    estadoComercial(db, organizationId),
  ]);

  // Uma unidade "configurada" é uma que tem moeda E fuso. Existir não chega:
  // uma unidade sem moeda não cobra e uma sem fuso não abre.
  const configuradas = unidades.filter((u) => u.moeda && u.fuso);
  let diasDeHorario = 0;
  if (configuradas[0]) {
    const h = await lerHorario(db, configuradas[0].id);
    if (!('semFuso' in h)) diasDeHorario = Object.keys(h.semana).length;
  }

  const factos: FactosDoArranque = {
    perfilCompleto: perfilCompleto(perfil),
    temMarca: marcas > 0,
    temUnidade: unidades.length > 0,
    unidadeConfigurada: configuradas.length > 0,
    diasDeHorario,
    pessoasActivas: pessoas,
  };

  return {
    itens: listaDeArranque(factos, new Set(estado.concessoes.map((c) => c.capacidade))),
    factos,
  };
}

// ── Arquivar ────────────────────────────────────────────────────────────────

export interface Dependencia {
  tipo: string;
  quantas: number;
}

/**
 * O que fica pendurado se esta unidade for arquivada.
 *
 * *"Arquivamento não apaga histórico e deve impedir novos serviços de forma
 * controlada."* Mostrar as dependências ANTES é o que faz o controlo ser
 * controlo: arquivar uma unidade com pessoas atribuídas e horários publicados
 * sem o dizer é uma surpresa amanhã de manhã.
 */
export async function dependenciasDaUnidade(
  db: ClienteComEscopo,
  locationId: string,
): Promise<readonly Dependencia[]> {
  const [papeis, dias, excepcoes, convites, concessoes] = await Promise.all([
    db.roleAssignment.count({ where: { locationId } }),
    db.scheduleDay.count({ where: { locationId } }),
    db.scheduleException.count({ where: { locationId } }),
    db.invitation.count({ where: { locationId, estado: 'PENDENTE' } }),
    db.entitlementGrant.count({ where: { locationId } }),
  ]);
  return [
    { tipo: 'papeis', quantas: papeis },
    { tipo: 'horarios', quantas: dias + excepcoes },
    { tipo: 'convitesPendentes', quantas: convites },
    { tipo: 'concessoes', quantas: concessoes },
  ].filter((d) => d.quantas > 0);
}

export type ResultadoDeArquivo =
  | { ok: true; dependencias: readonly Dependencia[] }
  | { ok: false; motivo: 'ultima_unidade' | 'ja_arquivada' };

/**
 * Arquiva uma unidade. **Não apaga nada.**
 *
 * O `archivedAt` é o que impede serviços novos; o que já aconteceu continua a
 * poder ser lido, e é isso que o STATE-013 diz por extenso: *"Historial:
 * disponible con permiso. Operación nueva: desactivada."*
 *
 * Recusa arquivar a última unidade activa: uma organização sem unidade nenhuma é
 * uma organização que não se pode operar nem desarquivar por um caminho normal —
 * e sair desse estado exigiria a credencial de migração.
 */
export async function arquivarUnidade(
  db: ClienteComEscopo,
  locationId: string,
): Promise<ResultadoDeArquivo> {
  const unidade = await db.location.findFirst({ where: { id: locationId }, select: { archivedAt: true } });
  if (!unidade) return { ok: false, motivo: 'ja_arquivada' };
  if (unidade.archivedAt) return { ok: false, motivo: 'ja_arquivada' };

  const activas = await db.location.count({ where: { archivedAt: null } });
  if (activas <= 1) return { ok: false, motivo: 'ultima_unidade' };

  const dependencias = await dependenciasDaUnidade(db, locationId);
  await db.location.update({ where: { id: locationId }, data: { archivedAt: new Date() } });
  return { ok: true, dependencias };
}

export async function desarquivarUnidade(db: ClienteComEscopo, locationId: string): Promise<void> {
  await db.location.updateMany({ where: { id: locationId }, data: { archivedAt: null } });
}
