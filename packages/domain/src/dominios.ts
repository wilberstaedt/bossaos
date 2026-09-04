/**
 * A máquina de estados do domínio próprio.
 *
 * Escrita a partir de `docs/architecture/dominios-e-enderecos.md`, que existe
 * desde antes desta etapa. As quatro regras, e onde cada uma vive:
 *
 * - **1 · vincular exige prova, não afirmação** — a porta `publico_site_por_dominio`
 *   só serve `VERIFICADO`, e a verificação está na porta e não em quem a chama;
 * - **2 · verificado uma vez não é para sempre** — `avaliarVerificacao`, aqui;
 * - **3 · o nome não volta ao mundo** — `custom_domain_owners`, na base;
 * - **4 · a unicidade não é a defesa que parece** — `vincular_dominio`, na base.
 *
 * ── Porque é que há QUATRO estados e não um booleano ──────────────────────
 *
 * É a mesma decisão dos horários no E06 e dos alérgenos no E07, e pela mesma
 * razão: um booleano obriga quem chama a escolher entre duas mentiras.
 *
 * Um DNS que não responde **não é** um domínio que mudou de dono. Perder a posse
 * é uma conclusão que exige ver OUTRO dono — não deixar de ver o nosso. Com dois
 * estados, uma falha de rede de dez segundos desligava o site de um cliente que
 * não fez nada.
 */

export const ESTADOS_DE_DOMINIO = [
  'PENDENTE', 'VERIFICADO', 'INDETERMINADO', 'CONTESTADO',
] as const;
export type EstadoDeDominio = (typeof ESTADOS_DE_DOMINIO)[number];

/** O prefixo da nossa prova. É por ele que se reconhece a prova de OUTRO dono. */
export const PREFIXO_DA_PROVA = 'bossaos-site-verification=';

/**
 * O que o DNS respondeu. **`nao_respondeu` não é uma lista vazia** — são coisas
 * diferentes e o tipo obriga a distingui-las: uma lista vazia é "respondeu, e não
 * há lá nada", que é informação; não responder não é informação nenhuma.
 */
export type RespostaDeDns =
  | { tipo: 'registos'; valores: string[] }
  | { tipo: 'nao_respondeu'; erro: string };

export interface Veredicto {
  estado: EstadoDeDominio;
  motivo: string;
}

/**
 * Decide o estado a partir do que o DNS disse e do que nós esperávamos.
 *
 * `estadoActual` entra porque a decisão **não é a mesma** consoante de onde se
 * vem: um domínio que nunca esteve verificado e cujo DNS não responde continua
 * `PENDENTE` — dizer `INDETERMINADO` sugeria que já esteve bom. Um que estava
 * `VERIFICADO` e deixa de responder cai para `INDETERMINADO`, que é "não sei", e
 * **continua a servir**, porque tirar o site do ar por um tempo-limite de rede é
 * o dano que a regra 2 existe para impedir.
 */
export function avaliarVerificacao(
  estadoActual: EstadoDeDominio,
  esperado: string,
  resposta: RespostaDeDns,
): Veredicto {
  if (resposta.tipo === 'nao_respondeu') {
    if (estadoActual === 'VERIFICADO' || estadoActual === 'INDETERMINADO') {
      return {
        estado: 'INDETERMINADO',
        motivo: `o DNS não respondeu (${resposta.erro}); a posse anterior mantém-se`,
      };
    }
    return { estado: estadoActual, motivo: `o DNS não respondeu (${resposta.erro})` };
  }

  if (resposta.valores.includes(esperado)) {
    return { estado: 'VERIFICADO', motivo: 'o registo de prova está publicado' };
  }

  // ── Respondeu, e o nosso valor não está lá ─────────────────────────────
  //
  // Aqui há duas situações e só uma delas é grave:
  //
  // - **nada**: o cliente ainda não publicou o registo, ou apagou-o. Não há
  //   prova de outro dono, e por isso não se declara perdido;
  // - **o registo de outra pessoa**: aí sim, vê-se OUTRO dono. É a única forma
  //   de concluir que se perdeu a posse, e o contrato diz isso por escrito.
  const doOutro = resposta.valores.some((v) => v.startsWith(PREFIXO_DA_PROVA));
  if (doOutro) {
    return {
      estado: 'CONTESTADO',
      motivo: 'o DNS publica uma prova de verificação que não é a nossa',
    };
  }

  if (estadoActual === 'VERIFICADO') {
    return {
      estado: 'INDETERMINADO',
      motivo: 'o registo de prova deixou de estar publicado; ninguém o substituiu',
    };
  }
  return { estado: 'PENDENTE', motivo: 'o registo de prova ainda não está publicado' };
}

/**
 * O domínio serve conteúdo?
 *
 * Uma função, e não um `if` espalhado por cada rota. `INDETERMINADO` serve — é o
 * ponto da regra 2, e escrevê-lo aqui uma vez impede que alguém, a olhar para o
 * nome do estado, decida por conta própria que "não sei" quer dizer "não".
 */
export function serveConteudo(estado: EstadoDeDominio): boolean {
  return estado === 'VERIFICADO' || estado === 'INDETERMINADO';
}

/** O nome do registo `TXT` que o cliente tem de publicar. */
export function nomeDoRegistoDeProva(dominio: string): string {
  return `_bossaos.${dominio.trim().toLowerCase()}`;
}

/** O valor da prova. Gerado por nós, ligado ao inquilino e ao domínio. */
export function valorDoRegistoDeProva(token: string): string {
  return `${PREFIXO_DA_PROVA}${token}`;
}
