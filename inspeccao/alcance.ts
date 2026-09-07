import { readFileSync } from 'node:fs';
import { TOKEN_DE_CONVITE, type Alvos } from './alvos.ts';

/**
 * Como se chega a cada uma das 396 composições — e o que falta às que não se alcançam.
 *
 * ── Porque é que isto não são as capturas ─────────────────────────────────
 *
 * O §8 da RV100 propaga o redesenho a todas as telas **depois** da aprovação
 * humana. Capturar agora é fotografar um desenho que vai mudar. O mapa e o
 * arnês sobrevivem ao redesenho; as imagens não. Isto é o mapa.
 *
 * ── O achado que muda o trabalho ──────────────────────────────────────────
 *
 * O URL não chega. Os 396 IDs são **166 endereços distintos** (160 se se
 * normalizar o prefixo de língua, que 5 rotas escrevem das duas maneiras):
 * `/staff/[locationId]` sozinho carrega 23 IDs, o `/pos/[locationId]` 22.
 * Chegar ao endereço não é chegar à tela.
 *
 * ── A partição, e ela FECHA ───────────────────────────────────────────────
 *
 *   135  só-URL             endereço que é só deste ID
 *   245  estado-partilhado  o endereço serve mais IDs; falta o passo lá dentro
 *    16  provocar           o atlas não lhes dá endereço nenhum
 *   ───
 *   396
 *
 * Recebi 120/276/16, que soma 412 para 396 IDs. A diferença não é de opinião:
 * uma partição ou fecha ou não é uma partição.
 *
 * ── E os 16 sem endereço não dizem todos a mesma coisa ────────────────────
 *
 * Treze dizem «(na rota que executa a ação)». Os outros três **nomeiam o
 * componente**: `BloqueioDePlano` e `UnidadeArquivada`. Quem os for provocar
 * não precisa de os procurar.
 */

export type Como = 'so-url' | 'estado-partilhado' | 'provocar';

export interface Composicao {
  id: string;
  etapa: string;
  /** A coluna `composicao` do atlas: diz a natureza (aba, diálogo, estado…). */
  natureza: string;
  rotaBruta: string;
  /** Endereço normalizado (sem o prefixo de língua). `null` quando não há rota. */
  endereco: string | null;
  como: Como;
  /** Os outros IDs que vivem no mesmo endereço. */
  irmaos: string[];
  /** Parâmetros que o arnês não sabe preencher hoje. */
  falta: string[];
  /** Quando não há rota: o que o atlas escreveu, verbatim. */
  provocarComo: string | null;
}

// ── O que o arnês sabe preencher, e como o soube ───────────────────────────
//
// Seis constantes, todas MEDIDAS e não presumidas:
//   `orgSlug`/`locationSlug`  `marina-oropesa`/`puerto`, os que cinco ficheiros
//                             do arnês já usam.
//   `brandSlug`               `marina` — consultado na base. Existe com o mesmo
//                             slug nas DUAS organizações, o que não estorva
//                             porque o endereço traz a organização à frente.
//   `locale`/`idioma`         as três línguas do `IDIOMAS`.
//   `token`                   o convite do arnês, que o `divida-movel-auth`
//                             já usa para chegar ao AUTH-006.
const CONSTANTES: Record<string, string> = {
  orgSlug: 'marina-oropesa',
  locationSlug: 'puerto',
  brandSlug: 'marina',
  token: TOKEN_DE_CONVITE,
  // Uma consulta de pesquisa não é uma entidade: qualquer texto serve, e é isso
  // que a tela mostra. Fica constante para não inflar o que falta.
  query: 'a',
};

// Sinónimos: o parâmetro da rota e o campo do arnês têm nomes diferentes e são
// a mesma coisa. Sem isto, três parâmetros resolvidos apareciam como em falta.
const SINONIMOS: Record<string, keyof Alvos> = {
  locationId: 'unidadeDoStaff',
  stationId: 'estacaoDeProducao',
  reservaId: 'reservaDeHoje',
};

/**
 * Os quatro que o arnês NÃO sabe preencher — e são um problema só.
 *
 * `publicLocationSlug`, `publicOrderId`, `postSlug` e `recibo` vivem todos
 * debaixo de `/r/[publicLocationSlug]/…`, o sítio público. Foram-me entregues
 * como «três rotas que precisam de entidade nova»; são **36 IDs com uma raiz
 * só**: `SELECT public_slug FROM locations` devolve NULO nas três unidades da
 * semente. Nenhuma unidade está publicada, e por isso o sítio público inteiro
 * não tem porta — não é que falte um identificador aqui e ali.
 *
 * E não é impossível: a `provar-jornada.sh` publica unidades com slug
 * `jornada-%` e limpa-as no fim. O caminho existe; falta trazê-lo para cá.
 */
/**
 * O PISO de portas abertas. Descer é vermelho; subir é à mão e fica no diff.
 *
 * Sem isto esta guarda nunca podia ficar vermelha: um enumerador que só conta
 * não reprova nada, e um instrumento que não sabe reprovar não é uma guarda —
 * é um relatório. O número foi medido, não estipulado.
 *
 * Subiu de 163 para **165** a 07/09, e a subida é a prova de que o piso serve:
 * as duas portas que faltavam eram linhas erradas do atlas, não telas em falta.
 * O produto usa inglês nas rotas públicas de marketing e **português nas
 * internas** — `catalogo/duplicar`, `ajuda` — e o atlas assumiu inglês em tudo.
 * Corrigidas as cinco linhas, as duas portas abriram e cinco composições
 * entraram. Um piso que nunca sobe é um piso que ninguém está a olhar.
 */
export const PISO_DE_PORTAS_ABERTAS = 165;

export const RAIZ_DO_PUBLICO = 'nenhuma unidade tem public_slug — o sítio público não tem porta';
const SEM_RESOLUCAO = new Set(['publicLocationSlug', 'publicOrderId', 'postSlug', 'recibo']);

interface Bruta { id: string; etapa: string; natureza: string; rota: string; sugerida: string; veioDaDetalhada: boolean }

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

export function lerAtlas(caminho = 'docs/progress/coverage.csv'): Bruta[] {
  const t = lerCsv(readFileSync(caminho, 'utf8'));
  const cab = (t[0] ?? []).map((s) => s.replace(/^\ufeff/, ''));
  const iId = cab.indexOf('id');
  const iEt = cab.indexOf('etapa_principal');
  const iNa = cab.indexOf('composicao');
  const iRt = cab.indexOf('rota_sugerida');
  const iRd = cab.indexOf('rota_detalhada');
  if (iId < 0 || iEt < 0 || iNa < 0 || iRt < 0 || iRd < 0) throw new Error('o coverage.csv mudou de colunas');

  // ── Duas colunas de rota, e a segunda é que manda ─────────────────────────
  //
  // O atlas tem `rota_sugerida` e `rota_detalhada`. Fui encaminhado para a
  // primeira («o mapa ID para rota existe e está completo em rota_sugerida») e
  // a primeira medição deu 28 portas fechadas, 27 delas do catálogo: a sugerida
  // diz `/app/[orgSlug]/brands/[brandSlug]/catalog` e essa rota NÃO EXISTE no
  // sistema de ficheiros — o produto tem `/app/[orgSlug]/catalogo`, sem marca
  // pelo meio. E é exactamente isso que a `rota_detalhada` desses 27 diz.
  //
  // A coluna chama-se «sugerida» e é mesmo isso: uma proposta. A detalhada, nas
  // ~87 linhas em que traz uma rota em vez de um marcador («sim», «família;
  // compor na E00», um código de etapa), é a que foi ao produto confirmar.
  // Quando ela traz rota, ganha.
  return t.slice(1)
    .filter((l) => l[iId])
    .map((l) => {
      const sugerida = l[iRt] ?? '';
      const detalhada = (l[iRd] ?? '').trim();
      const rota = detalhada.startsWith('/') ? detalhada : sugerida;
      return {
        id: l[iId] ?? '', etapa: l[iEt] ?? '', natureza: (l[iNa] ?? '').trim(),
        rota, sugerida, veioDaDetalhada: detalhada.startsWith('/'),
      };
    });
}

/** Sem o prefixo de língua: `/[idioma]/platform` e `/platform` são o mesmo sítio. */
export function normalizar(rota: string): string {
  return rota.replace(/^\/\[(locale|idioma)\]/, '') || '/';
}

export function resolucao(a: Alvos | null): Record<string, string> {
  const mapa: Record<string, string> = { ...CONSTANTES };
  if (a) {
    for (const [param, campo] of Object.entries(SINONIMOS)) mapa[param] = String(a[campo]);
    for (const campo of Object.keys(a)) mapa[campo] = String(a[campo as keyof Alvos]);
  }
  return mapa;
}

export function paramsDe(rota: string): string[] {
  return [...rota.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1] ?? '');
}

/**
 * O endereço concreto, ou `null` com a lista do que faltou.
 *
 * A língua entra sempre à frente, mesmo quando o atlas não a escreveu: 333 das
 * 380 rotas do atlas omitem-na, e pedi-las assim devolve **200 com desvio para
 * `/es-ES`** — verde a medir a língua errada. É a mesma armadilha que me
 * apanhou na guarda de expansão.
 */
export function endereçoDe(rota: string, a: Alvos | null, lingua: string): string | null {
  const mapa = resolucao(a);
  const semLingua = normalizar(rota);
  if (paramsDe(semLingua).some((p) => !mapa[p])) return null;
  const concreto = semLingua.replace(/\[([^\]]+)\]/g, (_, p: string) => mapa[p] ?? '');

  // Um ponto de API não vive debaixo da língua. O atlas tem um (`qr.svg`) e
  // prefixá-lo dava 404 — e o 404 era meu, não do produto. Vale a pena a linha:
  // uma porta fechada por culpa do medidor conta-se como defeito do medido.
  if (concreto.startsWith('/api/')) return concreto;
  return `/${lingua}${concreto}`;
}

export function classificar(a: Alvos | null, atlas = lerAtlas()): Composicao[] {
  const mapa = resolucao(a);
  const porEndereco = new Map<string, string[]>();
  for (const l of atlas) {
    if (!l.rota.startsWith('/')) continue;
    const e = normalizar(l.rota);
    porEndereco.set(e, [...(porEndereco.get(e) ?? []), l.id]);
  }

  return atlas.map((l) => {
    if (!l.rota.startsWith('/')) {
      return {
        id: l.id, etapa: l.etapa, natureza: l.natureza, rotaBruta: l.rota,
        endereco: null, como: 'provocar' as const, irmaos: [], falta: [],
        provocarComo: l.rota,
      };
    }
    const endereco = normalizar(l.rota);
    const juntos = porEndereco.get(endereco) ?? [];
    const falta = [...new Set(paramsDe(endereco).filter((p) => !mapa[p]))];
    return {
      id: l.id, etapa: l.etapa, natureza: l.natureza, rotaBruta: l.rota,
      endereco,
      como: (juntos.length > 1 ? 'estado-partilhado' : 'so-url') as Como,
      irmaos: juntos.filter((x) => x !== l.id),
      falta,
      provocarComo: null,
    };
  });
}

/** Os parâmetros sem resolução hoje, para quem quiser saber porquê. */
export const SEM_RESOLUCAO_HOJE = [...SEM_RESOLUCAO];
