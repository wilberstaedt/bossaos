/**
 * Fichas de design da BossaOS.
 *
 * Os valores vêm do manual de marca (pp. 15-18) e do CT-13. **Não foram
 * escolhidos aqui** — e essa distinção é o motivo de este ficheiro existir em
 * vez de as cores andarem soltas pelos componentes.
 *
 * A divisão que estrutura tudo o resto (CT-13, manual p. 20):
 *
 *   FIXO      estados operacionais, foco, grade, tipografia, componentes e toda
 *             a administração. Igual em todos os planos, em todos os clientes.
 *   TEMÁVEL   apenas as superfícies PÚBLICAS do restaurante, e apenas os três
 *             tokens de `TOKENS_TEMAVEIS`, a partir do plano Restaurant.
 *
 * Um restaurante pode mudar a cor do seu site. Não pode mudar a cor de "falha",
 * nem o anel de foco, nem a grade — porque quem lê esses sinais é quem está a
 * trabalhar, muitas vezes em várias unidades, e um vermelho que muda de casa
 * para casa deixa de ser um sinal.
 */

// ── Cor ──────────────────────────────────────────────────────────────────────

/** Paleta da marca. Manual p. 15. */
export const marca = {
  /** Verde Atlântico — base, texto e acção primária. */
  primaria: '#102E35',
  /** Coral Bossa — energia e destaque editorial. Ver nota sobre a logo abaixo. */
  acento: '#F5664D',
  /** Cítrico — acento pontual e sinal editorial. */
  realce: '#DDEA91',
} as const;

/**
 * Coral da ARTE da logo, `#FB4C39`. Não é o token de interface.
 *
 * Os dois corais foram medidos no ADR 0001: o do manual passa texto sobre o
 * verde (4,71) e o da arte não (4,23); sobre a areia é ao contrário. Ficam os
 * dois, cada um no sítio onde ganha. Não use esta constante em interface.
 */
export const coralDaLogo = '#FB4C39';

/** Superfícies. Manual p. 15. */
export const superficie = {
  /** Areia Clara — fundo principal e respiro. */
  base: '#F7F4EC',
  /** Superfície de apoio, para blocos dentro do fundo. */
  suave: '#E9EFEC',
  /** Cartões e painéis sobre o fundo. */
  elevada: '#FFFFFF',
  /** Superfície escura — barra lateral da administração, KDS. */
  inversa: '#102E35',
} as const;

export const texto = {
  primario: '#102E35',
  secundario: '#51666A',
  /** Sobre superfície escura. */
  inverso: '#FFFFFF',
} as const;

export const linha = {
  borda: '#D7DEDA',
} as const;

/**
 * Estados operacionais. **Fixos, em todos os planos e todos os clientes**
 * (CT-13; manual p. 16: "estados operacionais não seguem o tema do cliente").
 *
 * Cor sozinha nunca informa: o manual exige combinar sempre com texto ou ícone,
 * e os componentes deste pacote fazem-no.
 */
export const estado = {
  sucesso: '#276442',
  aviso: '#8A5100',
  perigo: '#B32635',
  info: '#175A8A',
} as const;

/** Anel de foco. Fixo — é acessibilidade, não decoração. */
export const foco = {
  cor: '#102E35',
  espessura: 2,
  afastamento: 2,
} as const;

// ── Tipografia ───────────────────────────────────────────────────────────────

/**
 * Manual p. 17. Rubik dá personalidade, Noto Sans dá continuidade.
 *
 * As duas são variáveis: um ficheiro por família cobre o intervalo de peso.
 * Ver `scripts/obter-fontes.sh` e as licenças em `apps/web/src/fontes/`.
 */
export const tipografia = {
  familia: {
    titulo: 'Rubik',
    corpo: 'Noto Sans',
    /** O manual manda ter recurso; sem ele, um erro de rede tira os acentos. */
    recurso: 'Arial, sans-serif',
  },
  escala: {
    tituloPrincipal: { tamanho: 48, entrelinha: 52, peso: 700, familia: 'titulo' },
    tituloPrincipalMovel: { tamanho: 32, entrelinha: 36, peso: 700, familia: 'titulo' },
    tituloSeccao: { tamanho: 32, entrelinha: 38, peso: 700, familia: 'titulo' },
    tituloCartao: { tamanho: 20, entrelinha: 28, peso: 700, familia: 'titulo' },
    corpo: { tamanho: 16, entrelinha: 24, peso: 400, familia: 'corpo' },
    corpoForte: { tamanho: 16, entrelinha: 24, peso: 600, familia: 'corpo' },
    rotulo: { tamanho: 14, entrelinha: 20, peso: 600, familia: 'corpo' },
    apoio: { tamanho: 14, entrelinha: 20, peso: 400, familia: 'corpo' },
  },
  /** "Evitar corpo menor que 14 px no produto." Manual p. 17. */
  tamanhoMinimo: 14,
  /** Título principal em ecrã pequeno: no máximo três linhas. */
  maximoLinhasTitulo: 3,
} as const;

// ── Espaço, forma e movimento ────────────────────────────────────────────────

/** Grade de 4 px. Manual p. 18. */
export const espaco = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  gigante: 64,
} as const;

export const grade = {
  base: 4,
  /** Conteúdo web até 1200 px. */
  larguraMaxima: 1200,
  margem: { movel: 24, secretaria: 64 },
  /** Os cinco pontos que o aceite 1 do E02 manda inspeccionar. */
  pontosDeInspeccao: [360, 390, 768, 1280, 1440],
  /** Acima disto deixa de ser telemóvel e a composição reordena. */
  limiarTablet: 768,
  limiarSecretaria: 1280,
} as const;

export const raio = {
  cartao: 16,
  controlo: 10,
  capsula: 999,
} as const;

/** Manual p. 18: transições discretas de 160 a 240 ms. */
export const movimento = {
  rapido: 160,
  base: 200,
  lento: 240,
  /** Respeitar `prefers-reduced-motion` não é opcional (CT-13). */
  consultaMovimentoReduzido: '(prefers-reduced-motion: reduce)',
} as const;

/**
 * Alvo de toque. Padrão INTERNO, mais exigente que o mínimo da WCAG 2.2 (24 px).
 *
 * São dois porque as mãos são diferentes: quem toca no telemóvel a escolher um
 * prato tem tempo; quem toca no TPV a meio de um serviço tem as mãos ocupadas e
 * o ecrã sujo.
 */
export const alvoDeToque = {
  publico: 44,
  operacao: 48,
} as const;

// ── A fronteira do tema ──────────────────────────────────────────────────────

/**
 * Os únicos tokens que um restaurante pode alterar, e só nas suas superfícies
 * públicas (manual p. 20; atlas p. 3).
 *
 * A lista é curta de propósito, e é a lista inteira: tudo o que não está aqui é
 * sistema BossaOS. `packages/ui/tema.ts` valida contra ela.
 */
export const TOKENS_TEMAVEIS = ['primaria', 'acento', 'fundo'] as const;
export type TokenTemavel = (typeof TOKENS_TEMAVEIS)[number];

export const fichas = {
  marca,
  superficie,
  texto,
  linha,
  estado,
  foco,
  tipografia,
  espaco,
  grade,
  raio,
  movimento,
  alvoDeToque,
} as const;
