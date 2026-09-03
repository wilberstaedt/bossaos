// `@bossaos/ui/regras` e nao `@bossaos/ui`: a camada de dados nao importa
// componentes. Ver o cabecalho de `packages/ui/src/regras.ts`.
import {
  TEMA_BOSSAOS, validarTema, type ResultadoDeTema, type TemaPublico,
} from '@bossaos/ui/regras';
import type { ResultadoDeCapacidade } from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';
import { podeCapacidade, type EstadoComercial } from './planos.ts';

/**
 * Tema público por plano (THEME-001).
 *
 * O Starter usa a paleta BossaOS e **não a pode editar** — pode mudar nome,
 * logo, fotos e conteúdo. Restaurant e Pro escolhem cores próprias e têm o
 * **mesmo** direito: o editor completo é do E12.
 *
 * O critério de aceite 1 do E05 diz "tentativa direta de alterar tema Starter
 * (…) retorna negação coerente **e não altera dados**". As duas metades
 * importam: recusar e gravar à mesma seria pior do que não recusar, porque
 * ninguém iria procurar o defeito.
 */

export const CAPACIDADE_DO_TEMA = 'tema.coresProprias' as const;

export type ResultadoDeGravacao =
  | { ok: true; revisaoId: string }
  /** O plano não inclui cores próprias. 402, e não 403. */
  | { ok: false; motivo: 'plano'; capacidade: ResultadoDeCapacidade }
  /** As cores escolhidas não são legíveis. Bloquear é o comportamento certo. */
  | { ok: false; motivo: 'contraste'; validacao: ResultadoDeTema };

/** O tema em vigor. Sem revisão activa, é a paleta BossaOS. */
export async function temaActivo(
  db: ClienteComEscopo,
  organizationId: string,
): Promise<TemaPublico & { padrao: boolean }> {
  const revisao = await db.themeRevision.findFirst({
    where: { organizationId, activa: true },
    select: { primaria: true, acento: true, fundo: true, padrao: true },
  });
  if (!revisao) return { ...TEMA_BOSSAOS, padrao: true };
  return {
    primaria: revisao.primaria,
    acento: revisao.acento,
    fundo: revisao.fundo,
    padrao: revisao.padrao,
  };
}

/**
 * Grava um tema. **A verificação de plano é a primeira coisa que acontece.**
 *
 * Está aqui, no serviço, e não só na rota. Uma rota que se esqueça continua a
 * bater neste portão; se a verificação vivesse só na rota, a próxima rota que
 * alguém escrevesse nasceria aberta.
 */
export async function guardarTema(
  db: ClienteComEscopo,
  organizationId: string,
  estado: EstadoComercial,
  tema: Partial<TemaPublico>,
): Promise<ResultadoDeGravacao> {
  const capacidade = podeCapacidade(estado, {
    capacidade: CAPACIDADE_DO_TEMA,
    intencao: 'usar',
  });
  // Recusa ANTES de tocar na base. "Não altera dados" é metade do aceite.
  if (!capacidade.permitido) return { ok: false, motivo: 'plano', capacidade };

  // Só depois o contraste. É a validação do E02, que corre no servidor e
  // **bloqueia** pares ilegíveis em vez de publicar com aviso.
  const validacao = validarTema(tema);
  if (!validacao.aprovado) return { ok: false, motivo: 'contraste', validacao };

  const completo: TemaPublico = { ...TEMA_BOSSAOS, ...tema };

  // Sem `$transaction` aqui: `comEscopo` já abriu uma, e estas duas operações
  // correm lá dentro. O tipo `ClienteComEscopo` nem sequer expõe `$transaction`
  // — foi a guarda do E03 que apanhou a tentativa de aninhar.
  //
  // A revisão anterior fica. Não se apaga: é ela que uma descida de plano repõe
  // se o cliente voltar a subir.
  await db.themeRevision.updateMany({
    where: { organizationId, activa: true },
    data: { activa: false },
  });
  const revisao = await db.themeRevision.create({
    data: { organizationId, ...completo, padrao: false, activa: true },
    select: { id: true },
  });

  return { ok: true, revisaoId: revisao.id };
}

/**
 * Repõe a paleta BossaOS. É o que uma descida de plano faz ao tema.
 *
 * **Não apaga a revisão anterior.** "Downgrade preserva dados e tema anterior"
 * — se o cliente voltar a subir, as cores dele estão lá. Apagar tornaria a
 * subida uma reconfiguração do zero, e ninguém volta a escolher a mesma cor.
 */
export async function reverterAoPadrao(
  db: ClienteComEscopo,
  organizationId: string,
): Promise<{ revertido: boolean; revisaoGuardada: string | null }> {
  const anterior = await db.themeRevision.findFirst({
    where: { organizationId, activa: true, padrao: false },
    select: { id: true },
  });

  await db.themeRevision.updateMany({
    where: { organizationId, activa: true },
    data: { activa: false },
  });
  await db.themeRevision.create({
    data: { organizationId, ...TEMA_BOSSAOS, padrao: true, activa: true },
  });

  return { revertido: anterior !== null, revisaoGuardada: anterior?.id ?? null };
}

/**
 * O tema que estaria em vigor se a descida fosse efectivada hoje.
 *
 * Critério de aceite 3: *"preview de downgrade corresponde ao tema e aos
 * direitos aplicados na data de teste"*. Uma prévia que não seja calculada pela
 * mesma regra que a efectivação é uma prévia que mente.
 */
export async function previaDeDescida(
  db: ClienteComEscopo,
  organizationId: string,
  concessoesDepois: EstadoComercial,
): Promise<{ tema: TemaPublico & { padrao: boolean }; perdeCoresProprias: boolean }> {
  const podeDepois = podeCapacidade(concessoesDepois, {
    capacidade: CAPACIDADE_DO_TEMA,
    intencao: 'usar',
  });
  if (podeDepois.permitido) {
    return { tema: await temaActivo(db, organizationId), perdeCoresProprias: false };
  }
  return { tema: { ...TEMA_BOSSAOS, padrao: true }, perdeCoresProprias: true };
}
