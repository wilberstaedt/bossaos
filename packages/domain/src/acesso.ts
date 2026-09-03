import { podeFazer, type Accao, type Concessao, type EscopoDoRecurso } from './permissoes.ts';

/**
 * As duas respostas de "não", e porque não podem ser trocadas.
 *
 * | Situação                                | Resposta            |
 * | --------------------------------------- | ------------------- |
 * | recurso privado de **outro inquilino**  | **ausência**        |
 * | recurso **próprio**, acção não permitida | falta de permissão  |
 *
 * A distinção não é de experiência de utilizador — é de **divulgação de
 * informação**. Trocá-las transforma o produto num oráculo de existência: quem
 * tiver um identificador consegue distinguir "não existe" de "existe e não é
 * teu", e com isso enumerar clientes, unidades e pedidos de quem nunca conheceu.
 *
 * E é por isso que a prova disto é um **par**, nunca um caso sozinho:
 *
 *   1. o identificador de B, com sessão de A → ausência
 *   2. o **mesmo** identificador, com sessão de B → 200
 *
 * Só (1) passaria num sistema em que *tudo* devolve ausência. A prova é a
 * diferença entre os dois.
 */
export type Resultado<T> =
  | { tipo: 'ok'; valor: T }
  /**
   * Ninguém autenticado. É diferente das outras duas: não é "não existe" nem
   * "não podes" — é "ainda não sei quem és". Achatá-la em 403 mandaria alguém
   * pedir permissões quando o que falta é entrar.
   */
  | { tipo: 'sem_sessao' }
  /** Não existe, ou existe noutro inquilino. Indistinguíveis de propósito. */
  | { tipo: 'ausente' }
  | { tipo: 'sem_permissao'; accao: Accao }
  | { tipo: 'sem_plano'; capacidade: string }
  | { tipo: 'desligado'; flag: string };

/** Código HTTP de cada resultado. Num sítio só, para não divergirem por rota. */
export function estadoHttp(r: Resultado<unknown>): number {
  switch (r.tipo) {
    case 'ok':
      return 200;
    case 'sem_sessao':
      return 401;
    case 'ausente':
      return 404;
    case 'sem_permissao':
      return 403;
    case 'sem_plano':
      return 402;
    case 'desligado':
      return 404;
  }
}

/**
 * Acção que não depende do recurso: decide-se **antes** de consultar.
 *
 * Um `host` a pedir o financeiro nem chega à base. Não é optimização — é o que
 * o CT-04 quer dizer com "nunca devolver dados de recurso antes de verificar
 * escopo", e o que impede o tempo de resposta de dizer se a linha existe.
 */
export function exigirAccao(
  concessoes: readonly Concessao[],
  accao: Accao,
  recurso: EscopoDoRecurso = {},
): { tipo: 'sem_permissao'; accao: Accao } | null {
  return podeFazer(concessoes, accao, recurso) ? null : { tipo: 'sem_permissao', accao };
}

/**
 * Decide a leitura de um recurso concreto.
 *
 * `encontrado` vem de uma consulta que **já correu com escopo de inquilino** —
 * dentro de `comEscopo`, com a política de linha activa. Por isso `null` aqui
 * significa as duas coisas ao mesmo tempo, e é essa ambiguidade que protege:
 * "não existe" e "é de outro restaurante" saem iguais.
 *
 * A ordem é: ausência primeiro, permissão depois. Ao contrário — permissão
 * primeiro — um actor sem direito receberia `sem_permissao` para um recurso de
 * outro inquilino, e isso confirmaria que ele existe.
 */
export function decidirLeitura<T>(entrada: {
  encontrado: T | null | undefined;
  concessoes: readonly Concessao[];
  accao: Accao;
  /** Escopo do recurso carregado, para concessões de marca ou unidade. */
  escopoDoRecurso?: (valor: T) => EscopoDoRecurso;
}): Resultado<T> {
  const { encontrado, concessoes, accao, escopoDoRecurso } = entrada;

  if (encontrado === null || encontrado === undefined) return { tipo: 'ausente' };

  const recurso = escopoDoRecurso ? escopoDoRecurso(encontrado) : {};
  if (!podeFazer(concessoes, accao, recurso)) return { tipo: 'sem_permissao', accao };

  return { tipo: 'ok', valor: encontrado };
}

/**
 * O corpo da resposta. Nunca diz mais do que o estado já diz.
 *
 * A ausência não leva nome de recurso nem identificador: um 404 que diga
 * "marca 3f2a… não encontrada" confirma o formato do identificador e convida a
 * tentar o seguinte.
 */
export function corpoDaResposta(r: Resultado<unknown>): Record<string, unknown> {
  switch (r.tipo) {
    case 'ok':
      return { ok: true };
    case 'sem_sessao':
      return { erro: 'sem_sessao' };
    case 'ausente':
      return { erro: 'nao_encontrado' };
    case 'sem_permissao':
      return { erro: 'sem_permissao', accao: r.accao };
    case 'sem_plano':
      return { erro: 'sem_plano', capacidade: r.capacidade };
    case 'desligado':
      return { erro: 'nao_encontrado' };
  }
}
