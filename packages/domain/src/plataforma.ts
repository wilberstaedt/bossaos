/**
 * As regras puras da plataforma e do suporte — o E33.
 *
 * ── A frase que decide o módulo ────────────────────────────────────────────
 *
 * > **Até aqui protegemos o restaurante de enganos e de estranhos; aqui
 * > protegemo-lo de nós.**
 *
 * É a única etapa em que o atacante do modelo de ameaça somos nós próprios a
 * agir de boa fé e com pressa — e por isso quase tudo aqui é uma restrição
 * contra quem escreve o código, não contra quem usa o produto.
 */

export const AMBITOS = ['LEITURA', 'CONFIGURACAO', 'DADOS_OPERACIONAIS'] as const;
export type AmbitoDeSuporte = (typeof AMBITOS)[number];

/**
 * A sessão de suporte está viva **agora**?
 *
 * ── Derivada, e nunca uma coluna ──────────────────────────────────────────
 *
 * Não há `activa` em lado nenhum. Estar viva é não ter fim **e** não ter
 * expirado — e as duas metades contam.
 *
 * A segunda é a que decide a etapa: uma sessão que só termina quando alguém se
 * lembra é permanente na prática. Se isto olhasse só para `terminadaEm`, uma
 * sessão esquecida ficava aberta para sempre e o ecrã dizia que estava tudo bem.
 */
export function sessaoViva(
  sessao: { readonly terminadaEm: Date | null; readonly expiraEm: Date },
  agora: Date,
): boolean {
  if (sessao.terminadaEm !== null) return false;
  return sessao.expiraEm > agora;
}

/**
 * Porque é que a sessão já não vale — quando não vale.
 *
 * Distingue **terminada** de **expirada**, e a distinção não é cosmética: uma
 * sessão que alguém fechou e uma que caducou sozinha contam histórias
 * diferentes a quem lê o registo daqui a seis meses. Uma diz «acabámos»; a
 * outra diz «esquecemo-nos».
 */
export type EstadoDaSessao = 'viva' | 'terminada' | 'expirada';

export function estadoDaSessao(
  sessao: { readonly terminadaEm: Date | null; readonly expiraEm: Date },
  agora: Date,
): EstadoDaSessao {
  if (sessao.terminadaEm !== null) return 'terminada';
  return sessao.expiraEm > agora ? 'viva' : 'expirada';
}

/**
 * O âmbito chega para esta operação?
 *
 * Por operação, como as chaves do E32 — e pela mesma razão: um portão à entrada
 * é um portão que a próxima tela esquece.
 */
export function ambitoChega(
  ambito: readonly AmbitoDeSuporte[], preciso: AmbitoDeSuporte,
): boolean {
  return ambito.includes(preciso);
}

/**
 * As capacidades que **nunca** ficam atrás do plano.
 *
 * ── A única regra deste módulo que não é técnica ──────────────────────────
 *
 * Uma casa no plano mais barato tem direito a proteger os seus dados, a
 * exportá-los e a responder a um pedido de acesso de um cliente dela. O que pode
 * depender do plano é a **conveniência** — relatórios avançados, mais unidades,
 * integrações.
 *
 * A lista está aqui **e** num gatilho da base, e a duplicação é deliberada: esta
 * cópia serve para o produto poder explicar a regra por palavras num ecrã; a da
 * base é a que a garante. Se divergirem, a base ganha e a inserção falha — que é
 * o modo de falha certo, ruidoso e do lado seguro.
 *
 * A pressão para atravessar isto é comercial e chega devagar. Começa por «a
 * exportação em massa é uma funcionalidade Pro» e acaba com um cliente sem forma
 * de sair.
 */
export const NUNCA_ATRAS_DO_PLANO = [
  'dados.exportar', 'dados.apagar', 'dados.pedido_de_acesso',
  'privacidade.gerir', 'seguranca.gerir', 'auditoria.ler',
  'sessao.terminar', 'chave.revogar',
] as const;

export function podeFicarAtrasDoPlano(capacidade: string): boolean {
  return !(NUNCA_ATRAS_DO_PLANO as readonly string[]).includes(capacidade);
}

/**
 * Este email é de uma PESSOA ou de um papel?
 *
 * «Suporte» não responde à pergunta *quem fez isto*. E o sítio onde a tentação
 * de assinar com o papel é maior é exactamente este: quem age está a fazer «o
 * trabalho do suporte», e o nome do papel parece a resposta natural.
 *
 * Compara-se a parte antes do `@`, que é onde o papel aparece. O domínio não
 * diz nada: `ana@suporte.example` é uma pessoa numa equipa de suporte, e
 * `suporte@bossa.example` não é ninguém.
 */
const PAPEIS = [
  'suporte', 'support', 'plataforma', 'platform', 'sistema', 'system',
  'admin', 'administrador', 'operador', 'bot', 'automatico',
];

export function eUmaPessoa(email: string): boolean {
  const antes = email.split('@')[0]?.toLowerCase() ?? '';
  return antes !== '' && !PAPEIS.includes(antes);
}

/**
 * O que se mostra de um segredo. **Nunca o valor.**
 *
 * O produto já sabe fazer isto: a mensagem de erro de ambiente recusa imprimir
 * as variáveis em falta, e diz porquê — *uma mensagem de erro que imprime a
 * credencial é uma fuga de credencial*. A mesma regra, no sítio onde é mais
 * tentador quebrá-la, porque aqui quem olha é o operador e parece inofensivo.
 *
 * Repare-se no tipo de retorno: não há campo onde um valor caiba. Não é que
 * ninguém o ponha — é que não há onde.
 */
export interface SegredoVisivel {
  readonly nome: string;
  readonly configurado: boolean;
  readonly rodadoEm: Date | null;
  readonly rodadoPor: string | null;
}

export function mostrarSegredo(s: {
  readonly nome: string; readonly configurado: boolean;
  readonly rodadoEm: Date | null; readonly rodadoPor: string | null;
}): SegredoVisivel {
  return {
    nome: s.nome, configurado: s.configurado,
    rodadoEm: s.rodadoEm, rodadoPor: s.rodadoPor,
  };
}

/**
 * A identidade de um trabalho — a mesma que o gatilho da base deriva.
 *
 * Escrita nos dois sítios pela razão do E31: a base é quem GARANTE, e esta cópia
 * é para quem precisa de saber a identidade antes de escrever.
 *
 * ── E a ORGANIZAÇÃO entra na chave, ao contrário do E31 ───────────────────
 *
 * A primeira versão era `tipo:alvo:tentativa`, copiada da impressão do E31. Lá
 * a identidade é `tipo:documento_id:via` e funciona **porque o `documento_id` é
 * um UUID**: único no mundo por construção, com a organização já lá dentro sem
 * ninguém a ter de escrever.
 *
 * Aqui o `alvo` é texto livre — «relatorio-mensal», o nome de um ficheiro. A
 * propriedade que fazia o padrão do E31 estar certo não transfere, e duas casas
 * a pedir o mesmo trabalho colidiam: a segunda levava `duplicate key` e **nunca
 * enfileirava**. Medido antes de corrigir.
 *
 * ── `plataforma` é o espaço de nomes dos trabalhos de ninguém ─────────────
 *
 * `organizationId` é anulável de propósito: uma migração global não é de casa
 * nenhuma. Esses **devem** deduplicar entre si — é a razão de a fila existir — e
 * o que não devem é deduplicar contra os de uma casa.
 */
export function identidadeDeTrabalho(
  organizationId: string | null, tipo: string, alvo: string, tentativa: number,
): string {
  return `${organizationId ?? 'plataforma'}:${tipo}:${alvo}:${tentativa}`;
}
