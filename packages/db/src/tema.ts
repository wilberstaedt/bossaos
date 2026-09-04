// `@bossaos/ui/regras` e nao `@bossaos/ui`: a camada de dados nao importa
// componentes. Ver o cabecalho de `packages/ui/src/regras.ts`.
import {
  TEMA_BOSSAOS, normalizarCor, tokensNaoPermitidos, validarTema,
  type ResultadoDeTema, type TemaPublico,
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
  publicadaPor: string,
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

  // ── Normalizado ANTES de gravar, e não só ao mostrar ──────────────────
  //
  // Sem isto, esta porta guardava `#1B3A2F` e o rascunho guardava `#1b3a2f` — a
  // mesma cor em duas formas. O sintoma não era estético: `rascunhoDoTema`
  // compara as duas cadeias para dizer se há alterações por publicar, e passava a
  // dizer que sim para sempre, com o botão de publicar a criar revisões
  // idênticas até alguém reparar.
  const completo: TemaPublico = {
    primaria: normalizarCor(tema.primaria) ?? TEMA_BOSSAOS.primaria,
    acento: normalizarCor(tema.acento) ?? TEMA_BOSSAOS.acento,
    fundo: normalizarCor(tema.fundo) ?? TEMA_BOSSAOS.fundo,
  };

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
    data: {
      organizationId, ...completo, padrao: false, activa: true, publicadaPor,
      // Os destinos são CONTADOS, não escritos. Um par de constantes aqui dizia
      // "carta e site" a uma organização que não publicou nenhum dos dois — e a
      // linha de registo passava a descrever o produto em geral em vez de
      // descrever o que aconteceu a esta organização neste dia.
      destinos: await destinosPublicos(db, organizationId),
    },
    select: { id: true },
  });

  return { ok: true, revisaoId: revisao.id };
}

/**
 * As superfícies públicas que um tema desta organização alcança HOJE.
 *
 * *«Só permita uma publicação por revisão e registre responsável e destinos»*
 * (E12, entregar 3). O responsável é quem carregou no botão; os destinos são
 * isto — e são medidos, porque uma organização sem endereço público não tem
 * destino nenhum, e escrever-lhe `['CARTA','SITE']` seria escrever ficção na
 * única linha que alguém vai ler daqui a um ano para perceber o que mudou.
 *
 * A ordem é fixa para a linha ser comparável entre revisões.
 */
export async function destinosPublicos(
  db: ClienteComEscopo,
  organizationId: string,
): Promise<string[]> {
  const unidades = await db.location.findMany({
    where: { organizationId, publicSlug: { not: null }, archivedAt: null },
    select: { id: true },
  });
  if (unidades.length === 0) return [];
  const ids = unidades.map((u) => u.id);

  const [comCarta, comSite] = await Promise.all([
    db.menuPublication.count({ where: { organizationId, menu: { locationId: { in: ids } } } }),
    db.sitePublication.count({ where: { organizationId, site: { locationId: { in: ids } } } }),
  ]);

  const destinos: string[] = [];
  if (comCarta > 0) destinos.push('CARTA');
  if (comSite > 0) destinos.push('SITE');
  return destinos;
}

/** O tema por omissão, quando ainda não há rascunho nem revisão. */
export interface RascunhoDoTema extends TemaPublico {
  /** De onde vieram estas cores: rascunho por publicar, revisão no ar, ou a paleta de origem. */
  origem: 'RASCUNHO' | 'PUBLICADO' | 'PADRAO';
  /** Difere do que está no ar? É o que faz a tela de publicar ter ou não o que dizer. */
  porPublicar: boolean;
  actualizadoPor: string | null;
}

/**
 * O que a tela de edição mostra (THEME-002) — e de onde vem.
 *
 * Sem rascunho, arranca do tema **no ar**, não da paleta de origem: quem entra
 * para mudar uma cor não quer encontrar as outras duas apagadas. E a `origem`
 * vai para o ecrã, porque «estas são as cores do teu site» e «estas são as cores
 * que ainda não publicaste» são duas frases diferentes e a segunda é a que evita
 * alguém julgar que já mudou.
 */
export async function rascunhoDoTema(
  db: ClienteComEscopo,
  organizationId: string,
): Promise<RascunhoDoTema> {
  const [rascunho, activo] = await Promise.all([
    db.themeDraft.findUnique({
      where: { organizationId },
      select: { primaria: true, acento: true, fundo: true, actualizadoPor: true },
    }),
    temaActivo(db, organizationId),
  ]);

  if (!rascunho) {
    return {
      primaria: activo.primaria, acento: activo.acento, fundo: activo.fundo,
      origem: activo.padrao ? 'PADRAO' : 'PUBLICADO',
      porPublicar: false, actualizadoPor: null,
    };
  }

  const igual =
    rascunho.primaria === activo.primaria &&
    rascunho.acento === activo.acento &&
    rascunho.fundo === activo.fundo;

  return {
    primaria: rascunho.primaria, acento: rascunho.acento, fundo: rascunho.fundo,
    origem: 'RASCUNHO', porPublicar: !igual, actualizadoPor: rascunho.actualizadoPor,
  };
}

export type ResultadoDoRascunho =
  | { ok: true; porPublicar: boolean }
  | { ok: false; motivo: 'plano'; capacidade: ResultadoDeCapacidade }
  | { ok: false; motivo: 'contraste'; validacao: ResultadoDeTema }
  | { ok: false; motivo: 'token'; tokens: string[] };

/**
 * Guarda o rascunho. **Guardar não publica** — e o portão do plano é o mesmo.
 *
 * ── Porque é que o rascunho também verifica o plano ────────────────────────
 *
 * Podia argumentar-se que um rascunho não vai à rua e portanto não faz mal. Faz:
 * um Starter que consegue guardar cores fica com um ecrã que lhe promete uma
 * capacidade que ele não tem, e a recusa aparece-lhe só no fim, depois de
 * escolher. Recusar cedo é a diferença entre "não podes" e "escolhe primeiro,
 * depois digo-te que não podes".
 *
 * ── E o contraste bloqueia AQUI, não só ao publicar ───────────────────────
 *
 * *«calcule pares de contraste e bloqueie combinações inválidas antes de
 * salvar/publicar»*. As duas. É esta recusa que a tela THEME-004 mostra — e ela
 * vem do SERVIDOR, que é o que a régua exige: *«Validação de contraste só no
 * cliente»* reprova à cabeça.
 */
export async function guardarRascunho(
  db: ClienteComEscopo,
  organizationId: string,
  estado: EstadoComercial,
  entrada: Record<string, unknown>,
  autor: string,
): Promise<ResultadoDoRascunho> {
  const capacidade = podeCapacidade(estado, { capacidade: CAPACIDADE_DO_TEMA, intencao: 'usar' });
  if (!capacidade.permitido) return { ok: false, motivo: 'plano', capacidade };

  // Chaves que não são temáveis saem antes de tudo. Tipografia, componentes e
  // cores de estado NÃO são do restaurante — a `PRECIFICACAO.md` diz-o e a régua
  // do E12 repete-o: quem repinte um estado de erro quebra a leitura de um ecrã
  // de operação. Aqui a recusa é explícita em vez de silenciosa, para quem tentar
  // saber que a resposta é não e não que o campo se perdeu.
  const intrusos = tokensNaoPermitidos(entrada);
  if (intrusos.length > 0) return { ok: false, motivo: 'token', tokens: intrusos };

  const validacao = validarTema(entrada as Partial<TemaPublico>);
  if (!validacao.aprovado) return { ok: false, motivo: 'contraste', validacao };

  const actual = await rascunhoDoTema(db, organizationId);
  const completo: TemaPublico = {
    primaria: normalizarCor(entrada.primaria) ?? actual.primaria,
    acento: normalizarCor(entrada.acento) ?? actual.acento,
    fundo: normalizarCor(entrada.fundo) ?? actual.fundo,
  };

  await db.themeDraft.upsert({
    where: { organizationId },
    update: { ...completo, actualizadoPor: autor },
    create: { organizationId, ...completo, actualizadoPor: autor },
  });

  const activo = await temaActivo(db, organizationId);
  return {
    ok: true,
    porPublicar:
      completo.primaria !== activo.primaria ||
      completo.acento !== activo.acento ||
      completo.fundo !== activo.fundo,
  };
}

export type ResultadoDaPublicacaoDeTema =
  | { ok: true; revisaoId: string; destinos: string[] }
  | { ok: false; motivo: 'plano'; capacidade: ResultadoDeCapacidade }
  | { ok: false; motivo: 'contraste'; validacao: ResultadoDeTema }
  | { ok: false; motivo: 'nada_por_publicar' };

/**
 * Publica o rascunho (THEME-005).
 *
 * ── Uma publicação por revisão ────────────────────────────────────────────
 *
 * Publicar o que já está no ar **não** cria revisão nova. Sem esta verificação,
 * carregar duas vezes no botão deixava duas revisões idênticas no histórico, e o
 * histórico deixava de responder à única pergunta que lhe fazemos: quando é que
 * isto mudou.
 *
 * O rascunho é **consumido**. Deixá-lo lá faria o ecrã de edição continuar a
 * dizer "tens alterações por publicar" depois de as publicar.
 */
export async function publicarRascunho(
  db: ClienteComEscopo,
  organizationId: string,
  estado: EstadoComercial,
  autor: string,
): Promise<ResultadoDaPublicacaoDeTema> {
  // ── O plano PRIMEIRO, antes de olhar sequer para o rascunho ────────────
  //
  // A ordem inversa passava um teste e mentia: um Starter sem rascunho recebia
  // `nada_por_publicar`, que é verdade e não é a razão. Quem lesse a resposta
  // concluía que bastava ter rascunho — e a recusa por plano ficava por provar,
  // porque o caso nunca chegava lá.
  const capacidade = podeCapacidade(estado, { capacidade: CAPACIDADE_DO_TEMA, intencao: 'usar' });
  if (!capacidade.permitido) return { ok: false, motivo: 'plano', capacidade };

  const rascunho = await rascunhoDoTema(db, organizationId);
  if (rascunho.origem !== 'RASCUNHO' || !rascunho.porPublicar) {
    return { ok: false, motivo: 'nada_por_publicar' };
  }

  const gravado = await guardarTema(
    db, organizationId, estado,
    { primaria: rascunho.primaria, acento: rascunho.acento, fundo: rascunho.fundo },
    autor,
  );
  if (!gravado.ok) return gravado;

  await db.themeDraft.deleteMany({ where: { organizationId } });

  const revisao = await db.themeRevision.findFirst({
    where: { organizationId, id: gravado.revisaoId },
    select: { destinos: true },
  });
  return { ok: true, revisaoId: gravado.revisaoId, destinos: revisao?.destinos ?? [] };
}

/** Deita fora o rascunho. O que está no ar não se toca. */
export async function descartarRascunho(
  db: ClienteComEscopo,
  organizationId: string,
): Promise<boolean> {
  const { count } = await db.themeDraft.deleteMany({ where: { organizationId } });
  return count > 0;
}

/**
 * O histórico de revisões, para a tela dizer **de que revisão veio** o tema.
 *
 * A régua reprova à cabeça «tema aplicado sem dizer de que revisão veio». A
 * publicação tem revisões desde o E08; a aparência era a última coisa sem rasto.
 */
export async function historicoDoTema(
  db: ClienteComEscopo,
  organizationId: string,
  quantas = 10,
) {
  return db.themeRevision.findMany({
    where: { organizationId },
    select: {
      id: true, primaria: true, acento: true, fundo: true, padrao: true, activa: true,
      publicadaPor: true, destinos: true, restauraDeId: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: quantas,
  });
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
    // `publicadaPor` é o processo, e é a resposta honesta a "quem fez isto":
    // não foi uma pessoa, foi a descida de plano a chegar à data.
    data: {
      organizationId, ...TEMA_BOSSAOS, padrao: true, activa: true,
      publicadaPor: 'descida-de-plano', destinos: await destinosPublicos(db, organizationId),
    },
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

/**
 * O tema em vigor num endereço PÚBLICO, sem sessão.
 *
 * ── Porque é que isto não pode usar o `temaActivo` ────────────────────────
 *
 * `temaActivo` lê com o cliente com escopo. Um visitante da carta não tem sessão,
 * logo não tem `app.organization_id`, logo a política de linha nega — e nega bem.
 * A porta `publico_tema` abre **uma pergunta** e não um privilégio: recebe o
 * endereço que o visitante escreveu, e devolve as três cores em vigor.
 *
 * **Sem revisão activa devolve a paleta BossaOS**, que é o que o Starter usa. Não
 * devolve `null` para quem chama decidir: uma cor por omissão decidida em cada
 * página é como duas páginas do mesmo restaurante acabam diferentes.
 */
export async function temaPublico(
  prisma: import('@prisma/client').PrismaClient,
  slug: string,
): Promise<TemaPublico & { padrao: boolean; revisaoId: string | null }> {
  const linhas = await prisma.$queryRaw<
    { primaria: string; acento: string; fundo: string; padrao: boolean; revisao_id: string }[]
  >`SELECT * FROM publico_tema(${slug})`;
  const t = linhas[0];
  if (!t) return { ...TEMA_BOSSAOS, padrao: true, revisaoId: null };
  return {
    primaria: t.primaria, acento: t.acento, fundo: t.fundo,
    padrao: t.padrao, revisaoId: t.revisao_id,
  };
}

/**
 * Restaura o tema que a descida de plano guardou.
 *
 * ── A terceira promessa do aceite 3, e o par que separa reverter de apagar ──
 *
 * A régua é explícita: *«uma implementação que APAGASSE o tema no downgrade
 * passaria as duas primeiras promessas e falharia esta. Sem o terceiro caso,
 * "reverter" e "apagar" são indistinguíveis.»*
 *
 * `reverterAoPadrao` já não apagava — desactiva e cria uma revisão padrão. O que
 * faltava era o caminho de volta: sem ele, subir de plano obrigava o cliente a
 * reconfigurar do zero, e ninguém volta a escolher a mesma cor.
 *
 * **Restaura a última revisão PRÓPRIA**, e não a última revisão: a última é a
 * padrão que a descida criou, e restaurá-la seria restaurar o que se quer sair.
 */
export async function restaurarTemaAnterior(
  db: ClienteComEscopo,
  organizationId: string,
  estado: EstadoComercial,
): Promise<
  | { ok: true; revisaoId: string }
  | { ok: false; motivo: 'plano'; capacidade: ResultadoDeCapacidade }
  | { ok: false; motivo: 'nada_para_restaurar' }
> {
  // O plano primeiro, como em `guardarTema`: restaurar cores próprias é usar
  // cores próprias. Sem esta verificação, uma descida seguida de restauro
  // devolvia ao Starter um tema que ele não pode ter.
  const capacidade = podeCapacidade(estado, {
    capacidade: CAPACIDADE_DO_TEMA,
    intencao: 'usar',
  });
  if (!capacidade.permitido) return { ok: false, motivo: 'plano', capacidade };

  const anterior = await db.themeRevision.findFirst({
    where: { organizationId, padrao: false },
    select: { id: true, primaria: true, acento: true, fundo: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!anterior) return { ok: false, motivo: 'nada_para_restaurar' };

  // Cria uma revisão NOVA com as cores antigas, em vez de reactivar a antiga.
  // A régua reprova «tema aplicado sem dizer de que revisão veio»: reactivar
  // apagava o facto de ter havido uma descida pelo meio, e o histórico passava a
  // contar uma história que não aconteceu.
  await db.themeRevision.updateMany({
    where: { organizationId, activa: true },
    data: { activa: false },
  });
  const nova = await db.themeRevision.create({
    data: {
      organizationId,
      primaria: anterior.primaria, acento: anterior.acento, fundo: anterior.fundo,
      padrao: false, activa: true, restauraDeId: anterior.id,
      publicadaPor: 'restauro-apos-subida', destinos: await destinosPublicos(db, organizationId),
    },
    select: { id: true },
  });
  return { ok: true, revisaoId: nova.id };
}
