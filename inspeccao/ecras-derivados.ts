import { readFileSync } from 'node:fs';
import type { Alvos } from './alvos.ts';

/**
 * De que ecrã é esta cadeia? — derivado, e não adivinhado.
 *
 * ── A correcção que deu origem a este ficheiro ─────────────────────────────
 *
 * A primeira versão da guarda de expansão media **três** ecrãs, escolhidos à
 * mão, e eu escrevi que a alternativa era «mapear chave para ecrã por
 * adivinhação». Estava errado, e o sénior mediu-o: os namespaces do i18n trazem
 * o código da etapa no próprio nome (`kdsE16`, `integracoesE32`, `fiscalE24`) e
 * o atlas tem a etapa por ID. O mapa **deriva-se**.
 *
 * ── O que eu medi ao verificar ────────────────────────────────────────────
 *
 * 59 namespaces de topo. **29 trazem código**, e esses colapsam em **25 códigos
 * distintos** — não 29. O atlas tem **29 etapas distintas**, e é uma coincidência
 * de número, não a mesma contagem: são dois conjuntos diferentes com o mesmo
 * cardinal, que é precisamente a forma como uma confirmação falsa se disfarça
 * de confirmação. O que aguenta é a direcção em que isto é usado: **nenhum dos
 * 25 códigos falha o atlas**. Ao contrário, **E02, E04, E05 e E06 não têm
 * namespace nenhum** e por isso nunca seriam alcançados por derivação.
 *
 * ── A derivação não elimina a lista; corta-a e mostra o resto ──────────────
 *
 * 30 namespaces não trazem código (`estado`, `tema`, `entrar`, `mfa`,
 * `plataforma`). Esses continuam a precisar de mão. A diferença é que agora a
 * metade que falta está **escrita e contada**, com tecto que só sobe à mão — a
 * mesma forma do `EM_DIVIDA` da `validar-suites-com-guiao.sh`, e pela mesma
 * razão: uma dívida que ninguém conta desaparece do radar sem ser paga.
 */

export interface EcraCandidato {
  id: string;
  etapa: string;
  /** A rota do atlas, ainda com os `[parametros]` por substituir. */
  molde: string;
  /** Como este ecrã entrou no conjunto: derivado do código, ou posto à mão. */
  origem: 'derivado' | 'lista';
}

export interface Universo {
  /** Os que se podem visitar: rota começa em `/` e todos os parâmetros resolvem. */
  visitaveis: EcraCandidato[];
  /** O atlas diz «(na rota que executa a ação)» — não é endereço, é um estado. */
  semEndereco: EcraCandidato[];
  /** Rota real, mas com um parâmetro que esta prova não sabe preencher. */
  porResolver: Array<EcraCandidato & { falta: string[] }>;
  /** Namespaces com cadeias que crescem, sem código e sem entrada na lista. */
  divida: string[];
}

// ── A lista à mão, que é o que a derivação NÃO alcança ─────────────────────
//
// Só namespaces sem código. Cada linha diz a que ecrã do atlas o namespace
// pertence — verificado contra o `titulo_atlas` e a rota, não suposto. As
// etapas E02/E04/E05/E06 são exactamente as quatro que não têm namespace, o que
// é a confirmação cruzada de que esta lista é a metade que falta e não uma
// segunda opinião sobre a primeira.
const LISTA_A_MAO: Record<string, string> = {
  entrar: 'AUTH-001',
  recuperar: 'AUTH-003',
  novaSenha: 'AUTH-004',
  mfa: 'AUTH-005',
  organizacoes: 'AUTH-007',
  unidades: 'AUTH-008',
  sessaoPausada: 'AUTH-009',
  arranque: 'ONB-001',
  planos: 'ONB-004',
  uso: 'ORG-013',
  mudarPlano: 'ORG-014',
  plataforma: 'PLAT-002',
};

/**
 * O tecto da dívida. Subir isto é um acto deliberado que fica no diff.
 *
 * São os namespaces sem código que albergam cadeias em crescimento e para os
 * quais ainda não escrevi a que ecrã pertencem. **São oito**, e o número saiu da
 * medição e não da minha cabeça: escrevi 7 por subtracção mental (19 sem código
 * menos 12 entradas na lista) e o tecto reprovou-me — a lista tem 12 entradas
 * mas só 11 albergam cadeias em crescimento, porque o `organizacoes` não tem
 * nenhuma. Um tecto que apanha quem o escreveu está a fazer o trabalho.
 *
 * Os oito, e porque continuam por pagar:
 *   `estado`         as seis telas do E02 são estados («a carregar», «sem
 *                    acesso», «alterações por guardar») e o atlas diz-lhes «(na
 *                    rota que executa a ação)». Não há endereço a que ir:
 *                    medi-las exige provocá-las, que é outra prova.
 *   `comum`          aparece em toda a parte, e por isso já está medido nos 281
 *                    ecrãs — só não está DECLARADO num, que é o que falta aqui.
 *   `catalogo` `pessoas` `horarios` `arquivada` `bloqueioPlano` `tema`
 *                    têm ecrã, e falta ir buscar-lhe o ID ao atlas. É trabalho
 *                    de mão, pequeno, e não o faço a adivinhar.
 */
export const TECTO_DA_DIVIDA = 8;

const SEM_CODIGO = /E\d\d$/;

interface Linha { id: string; etapa: string; rota: string }

/** CSV com aspas, sem dependência: o atlas tem vírgulas dentro dos campos. */
function lerCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = '';
  let celulas: string[] = [];
  let entreAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else entreAspas = false;
      } else campo += c;
    } else if (c === '"') entreAspas = true;
    else if (c === ',') { celulas.push(campo); campo = ''; }
    else if (c === '\n') { celulas.push(campo); linhas.push(celulas); celulas = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || celulas.length) { celulas.push(campo); linhas.push(celulas); }
  return linhas;
}

function atlas(): Linha[] {
  const t = lerCsv(readFileSync('docs/progress/coverage.csv', 'utf8'));
  const cab = (t[0] ?? []).map((s) => s.replace(/^\ufeff/, ''));
  const iId = cab.indexOf('id');
  const iEt = cab.indexOf('etapa_principal');
  const iRt = cab.indexOf('rota_sugerida');
  if (iId < 0 || iEt < 0 || iRt < 0) throw new Error('o coverage.csv mudou de colunas');
  return t.slice(1)
    .filter((l) => l[iId])
    .map((l) => ({ id: l[iId] ?? '', etapa: l[iEt] ?? '', rota: l[iRt] ?? '' }));
}

/**
 * Os parâmetros que esta prova sabe preencher.
 *
 * O que não está aqui não se inventa: uma rota com um parâmetro por resolver
 * mediria a página de «não encontrado», e um 404 não transborda — daria verde
 * por vazio, que é a falha que esta guarda inteira existe para não cometer.
 */
function substituicoes(a: Alvos, lingua: string): Record<string, string> {
  return {
    locale: lingua,
    idioma: lingua,
    orgSlug: 'marina-oropesa',
    locationSlug: 'puerto',
    locationId: a.unidadeDoStaff,
    stationId: a.estacaoDeProducao,
    productId: a.productId,
    menuId: a.menuId,
    categoryId: a.categoryId,
    groupId: a.groupId,
    brandId: a.brandId,
    membershipId: a.membershipId,
    orgId: a.orgId,
    deviceId: a.deviceId,
    orderId: a.orderId,
    tableId: a.tableId,
    sessionId: a.sessionId,
  };
}

export function parametrosEmFalta(molde: string, a: Alvos, lingua: string): string[] {
  const tenho = substituicoes(a, lingua);
  return [...molde.matchAll(/\[([^\]]+)\]/g)]
    .map((m) => m[1] ?? '')
    .filter((p) => !tenho[p]);
}

export function resolverRota(molde: string, a: Alvos, lingua: string): string | null {
  if (parametrosEmFalta(molde, a, lingua).length > 0) return null;
  const tenho = substituicoes(a, lingua);
  return molde.replace(/\[([^\]]+)\]/g, (_, p: string) => tenho[p] ?? '');
}

/**
 * O universo de ecrãs onde as cadeias que crescem podem estar.
 *
 * `chavesQueCrescem` são chaves completas (`kdsE16.estacao`). O namespace é o
 * primeiro segmento; o código de etapa é o sufixo do namespace.
 */
export function universo(chavesQueCrescem: string[], a: Alvos, lingua: string): Universo {
  const namespaces = [...new Set(chavesQueCrescem.map((k) => k.split('.')[0] ?? ''))].filter(Boolean);
  const comCodigo = namespaces.filter((n) => SEM_CODIGO.test(n));
  const semCodigo = namespaces.filter((n) => !SEM_CODIGO.test(n));

  const codigos = new Set(comCodigo.map((n) => n.match(SEM_CODIGO)?.[0] ?? ''));
  const linhas = atlas();

  const escolhidos = new Map<string, EcraCandidato>();
  for (const l of linhas) {
    if (codigos.has(l.etapa)) escolhidos.set(l.id, { id: l.id, etapa: l.etapa, molde: l.rota, origem: 'derivado' });
  }
  // A lista à mão entra depois e não sobrepõe: se a derivação já lá chegou, o
  // ecrã fica marcado como derivado, que é a verdade sobre como foi encontrado.
  const idsDaLista = new Set(semCodigo.map((n) => LISTA_A_MAO[n]).filter((v): v is string => Boolean(v)));
  for (const l of linhas) {
    if (idsDaLista.has(l.id) && !escolhidos.has(l.id)) {
      escolhidos.set(l.id, { id: l.id, etapa: l.etapa, molde: l.rota, origem: 'lista' });
    }
  }

  const visitaveis: EcraCandidato[] = [];
  const semEndereco: EcraCandidato[] = [];
  const porResolver: Array<EcraCandidato & { falta: string[] }> = [];
  for (const e of escolhidos.values()) {
    if (!e.molde.startsWith('/')) { semEndereco.push(e); continue; }
    const falta = parametrosEmFalta(e.molde, a, lingua);
    if (falta.length > 0) { porResolver.push({ ...e, falta }); continue; }
    visitaveis.push(e);
  }

  const divida = semCodigo.filter((n) => !LISTA_A_MAO[n]).sort();
  const ordem = (x: EcraCandidato) => x.id;
  visitaveis.sort((x, y) => ordem(x).localeCompare(ordem(y)));
  return { visitaveis, semEndereco, porResolver, divida };
}
