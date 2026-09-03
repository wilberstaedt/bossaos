import type { PrismaClient } from '@prisma/client';
import {
  chaveDaCartaPublica, estaAberto, projectarCarta,
  type Abertura, type CartaPublica, type DiaDaSemana, type Horario, type IdiomaDeConteudo,
  type Intervalo,
} from '@bossaos/domain';
import type { Canal } from './catalogo.ts';

/**
 * A carta pública — a quarta porta do CT-04.
 *
 * ── Porque é que isto não passa pelo `comEscopo` ───────────────────────────
 *
 * Um pedido da carta pública **não tem sessão**, logo não tem
 * `app.organization_id`, logo a política de linha nega tudo — e nega bem. A
 * alternativa fácil seria uma política `USING (true)` nas tabelas de publicação,
 * que abriria a tabela inteira a quem tivesse a credencial do runtime.
 *
 * O que existe em vez disso são duas funções `SECURITY DEFINER` que abrem **uma
 * pergunta cada**: "o que está publicado neste endereço público, neste canal" e
 * "quais são os horários desta unidade". Não devolvem rascunhos, não aceitam um
 * identificador de organização, e não há por onde pedir outra coisa. É o mesmo
 * padrão das portas do E05, pela mesma razão: alargar privilégios resolve o
 * pedido de hoje e deixa a porta aberta.
 *
 * O `slug` público é global e o `slug` interno continua por organização — duas
 * cadeias podem ambas ter uma unidade `centro`, e nenhuma delas disputa um URL.
 */

interface LinhaDaCarta {
  organization_id: string;
  location_id: string;
  location_nome: string;
  marca_nome: string;
  fuso: string | null;
  moeda: string | null;
  revision_id: string;
  revision_numero: number;
  conteudo: unknown;
  publicada_em: Date;
}

export interface CartaServida {
  carta: CartaPublica;
  organizationId: string;
  locationId: string;
  revisionId: string;
  fuso: string;
  publicadaEm: Date;
  /** A chave de cache, já construída com as quatro partes que a régua exige. */
  chaveDeCache: string;
}

/**
 * A carta publicada num endereço público.
 *
 * `null` quando não há: endereço que não existe, unidade arquivada, ou nada
 * publicado naquele canal. **Os três dão a mesma resposta** — dizer "existe mas
 * não publicou" a um estranho é contar que o restaurante existe.
 */
export async function cartaPublica(
  prisma: PrismaClient,
  slug: string,
  canal: Canal,
  idioma: IdiomaDeConteudo,
): Promise<CartaServida | null> {
  const linhas = await prisma.$queryRaw<LinhaDaCarta[]>`
    SELECT * FROM publico_carta(${slug}, ${canal}::"Canal")`;
  const l = linhas[0];
  if (!l) return null;

  return {
    carta: projectarCarta({
      conteudo: l.conteudo,
      unidade: l.location_nome,
      marca: l.marca_nome,
      revisao: l.revision_numero,
      idioma,
      canal,
    }),
    organizationId: l.organization_id,
    locationId: l.location_id,
    revisionId: l.revision_id,
    // Sem fuso configurado não se inventa nenhum: UTC é o que não mente sobre
    // ser o fuso do restaurante. O ecrã diz que os horários estão por configurar.
    fuso: l.fuso ?? 'UTC',
    publicadaEm: l.publicada_em,
    chaveDeCache: chaveDaCartaPublica(
      { organizationId: l.organization_id, locationId: l.location_id },
      l.revision_id, idioma, canal,
    ),
  };
}

interface LinhaDeHorario {
  /** `null` quando a unidade existe e não tem um único dia configurado. */
  dia: number | null;
  fechado: boolean | null;
  inicio_min: number | null;
  fim_min: number | null;
  fuso: string | null;
}

export interface HorarioPublico {
  horario: Horario;
  fuso: string;
  /** `true` quando não há um único dia configurado. Não é "fechado". */
  porConfigurar: boolean;
}

/**
 * Os horários da unidade, para o MENU-019.
 *
 * **A carta continua consultável fora de horas** — o que muda é o aviso. Um
 * restaurante fechado que esconde a carta perde a pessoa que está a decidir onde
 * vai jantar amanhã.
 *
 * O fuso vem com o horário e não à parte: a régua nomeia o caso do E06 em que 19
 * asserções estavam verdes sobre um motor que ignorava o fuso, e devolver horas
 * sem o fuso convidava ao mesmo erro.
 */
export async function horarioPublico(
  prisma: PrismaClient,
  slug: string,
): Promise<HorarioPublico | null> {
  const linhas = await prisma.$queryRaw<LinhaDeHorario[]>`
    SELECT * FROM publico_horario(${slug})`;
  // Zero linhas quer dizer **não há unidade neste endereço**, e mais nada. Uma
  // unidade que existe e não configurou nada devolve uma linha com `dia` nulo —
  // é a distinção do E06, e sem ela o ecrã público não consegue dizer se o
  // restaurante não existe ou se ninguém preencheu os horários.
  if (linhas.length === 0) return null;

  const porDia = new Map<DiaDaSemana, Intervalo[] | 'fechado'>();
  for (const l of linhas) {
    if (l.dia === null) continue;
    const dia = l.dia as DiaDaSemana;
    if (l.fechado === true) { porDia.set(dia, 'fechado'); continue; }
    if (l.inicio_min === null || l.fim_min === null) continue;
    const actual = porDia.get(dia);
    const intervalo: Intervalo = { inicioMin: l.inicio_min, fimMin: l.fim_min };
    if (Array.isArray(actual)) actual.push(intervalo);
    else porDia.set(dia, [intervalo]);
  }
  const semana: Horario['semana'] = {};
  for (const [dia, v] of porDia) {
    semana[dia] = v === 'fechado' ? { tipo: 'fechado' } : { tipo: 'aberto', intervalos: v };
  }

  // O fuso vive DENTRO do horário, e não ao lado: foi a decisão do E06, e é o
  // que impede alguém de chamar o motor sem ele.
  const fuso = linhas[0]!.fuso ?? 'UTC';
  return {
    horario: { fuso, semana, excepcoes: [] },
    fuso,
    // Nenhum dia configurado não é "fechado". É a distinção do E06, e vale igual
    // à frente de um cliente: "não sabemos" é uma resposta, "fechado" é outra.
    porConfigurar: Object.keys(semana).length === 0,
  };
}

/** Está aberto agora? O fuso vai dentro do horário, e o motor é o do E06. */
export function abertoAgora(h: HorarioPublico, agora = new Date()): Abertura {
  return estaAberto(h.horario, agora);
}

export type OrigemDeConsulta = 'qr' | 'link' | 'directo' | 'motor-de-busca';

/**
 * Regista uma consulta (REP-001).
 *
 * ── O que esta função NÃO recebe ───────────────────────────────────────────
 *
 * Não recebe endereço IP, nem agente do navegador, nem identificador de sessão,
 * nem o `Referer` completo. **Não é uma omissão: é a assinatura.** O que não
 * entra por parâmetro não pode ser guardado por distracção, e a base tem um
 * `CHECK` que só aceita quatro categorias de origem.
 *
 * Uma linha destas responde a "quantos vêem a carta em inglês ao domingo" e não
 * responde a "o que é que aquela pessoa viu" — e a segunda pergunta não é para
 * ter resposta.
 *
 * ── E porque é que corre numa TRANSACÇÃO ──────────────────────────────────
 *
 * O `set_config(..., true)` é **local à transacção**. Escrito como duas chamadas
 * soltas, a segunda corre noutra ligação do pool e não vê o contexto — a
 * política de linha nega, o `INSERT` falha, e o `catch` engole. O resultado
 * seria uma contagem que nunca conta e um relatório sempre a zeros, sem um único
 * erro em lado nenhum.
 *
 * Escrevi-o assim à primeira. É a mesma família do "verde sobre nada": um
 * caminho que falha sempre e não se queixa.
 *
 * **Devolve se conseguiu**, em vez de engolir: contar é secundário e não pode
 * impedir a carta de ser servida, mas quem chama tem de poder registar que não
 * contou — senão a falha volta a ser invisível.
 */
export async function registarConsulta(
  prisma: PrismaClient,
  dados: {
    organizationId: string; locationId: string; revisionId: string;
    idioma: IdiomaDeConteudo; canal: Canal; origem: OrigemDeConsulta;
  },
): Promise<{ contou: boolean; erro?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT set_config('app.organization_id', ${dados.organizationId}, true)`;
      await tx.$executeRaw`
        INSERT INTO menu_views (id, organization_id, location_id, revision_id, idioma, canal, origem)
        VALUES (gen_random_uuid(), ${dados.organizationId}::uuid, ${dados.locationId}::uuid,
                ${dados.revisionId}::uuid, ${dados.idioma}, ${dados.canal}::"Canal", ${dados.origem})`;
    });
    return { contou: true };
  } catch (e) {
    return { contou: false, erro: e instanceof Error ? e.name : 'erro desconhecido' };
  }
}

export type ResultadoDaReserva =
  | 'ok'
  | 'invalido'
  | 'em_uso'
  | 'reservado_por_outra_organizacao';

/**
 * Reserva o endereço público de uma unidade.
 *
 * ── O `@unique` não chega, e é fácil pensar que chega ─────────────────────
 *
 * `locations.public_slug` é único: impede **dois ao mesmo tempo**. Não impede
 * **dois em sequência** — A publica com `marina-centro`, apaga-o, B reclama-o, e
 * a partir daí todos os QR impressos de A servem a carta de B. Sem erro, sem
 * aviso, e sem ninguém do lado de A poder dar por isso: o papel não se
 * actualiza.
 *
 * São ataques diferentes e confundem-se com facilidade, porque o primeiro falha
 * ruidosamente na base e o segundo passa por uma operação legítima.
 *
 * ── Porque é que a decisão está numa função da base ───────────────────────
 *
 * A pergunta — *"este endereço já foi de alguém?"* — atravessa inquilinos por
 * natureza, e nenhum inquilino pode ler a resposta. Uma consulta feita aqui em
 * TypeScript não veria as linhas de outra organização e responderia sempre
 * "livre". A porta é `SECURITY DEFINER`, e o runtime nem sequer tem `INSERT` na
 * tabela das reservas — se tivesse, uma rota podia apagar a reserva alheia.
 *
 * Devolve o MOTIVO e não um booleano: `em_uso` e
 * `reservado_por_outra_organizacao` mandam a pessoa a sítios diferentes. Dizer
 * "ocupado" ao segundo caso fá-la esperar que se liberte, e ele não se liberta.
 */
export async function reservarEnderecoPublico(
  prisma: PrismaClient,
  organizationId: string,
  locationId: string,
  slug: string,
): Promise<ResultadoDaReserva> {
  const linhas = await prisma.$queryRaw<{ reservar_endereco_publico: string }[]>`
    SELECT reservar_endereco_publico(
      ${organizationId}::uuid, ${locationId}::uuid, ${slug})`;
  return (linhas[0]?.reservar_endereco_publico ?? 'invalido') as ResultadoDaReserva;
}

/**
 * Larga o endereço: tira-o do ar e **não o devolve ao mundo**.
 *
 * A reserva fica. É a diferença entre "o link morre" — que é o que quem fecha
 * uma unidade quer — e "o endereço volta ao mercado", que nunca é o que alguém
 * quer ao limpar um campo.
 */
export async function largarEnderecoPublico(
  prisma: PrismaClient,
  organizationId: string,
  locationId: string,
): Promise<void> {
  // `$executeRaw` e não `$queryRaw`: o Prisma 7 não sabe desserializar uma coluna
  // de tipo `void`, e falha com "Failed to deserialize column of type 'void'".
  // A função não devolve nada — é uma execução, não uma consulta.
  await prisma.$executeRaw`
    SELECT largar_endereco_publico(${organizationId}::uuid, ${locationId}::uuid)`;
}
