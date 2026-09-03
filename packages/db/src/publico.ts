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
  dia: number;
  fechado: boolean;
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
  if (linhas.length === 0) return null;

  const porDia = new Map<DiaDaSemana, Intervalo[] | 'fechado'>();
  for (const l of linhas) {
    const dia = l.dia as DiaDaSemana;
    if (l.fechado) { porDia.set(dia, 'fechado'); continue; }
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
