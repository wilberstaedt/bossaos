/**
 * A fila local do Staff PWA (E15).
 *
 * ── Porque é que isto é um pacote com lógica pura ─────────────────────────
 *
 * O `offline-e-fila-local.md` diz o que a fila tem de fazer, e nomeia os seis
 * casos que o E15 tem de provar. Nenhum deles é sobre IndexedDB: são sobre
 * **regras** — o que se envia, o que fica suspenso, o que colide. Com a lógica
 * dentro do navegador, prová-los exigia um navegador para cada caso e uma rede a
 * portar-se mal de propósito.
 *
 * Aqui a lógica é pura e o armazenamento é uma porta. O navegador liga-lhe o
 * IndexedDB; a prova liga-lhe um mapa. E o que se mede é a regra.
 *
 * ── O que a fila local realmente é ───────────────────────────────────────
 *
 * O contrato abre com isto e vale repetir: um tablet de sala é **partilhado**. É
 * o mesmo aparelho onde entra o turno da tarde e o da noite, e onde o gerente
 * entra trinta segundos para autorizar um desconto. A fila não é um detalhe de
 * conforto offline — é **superfície de fuga de dados e de atribuição errada**.
 *
 * O cenário que decide o desenho: A compõe dois rascunhos, fica sem rede, sai. B
 * entra. A rede volta. **Se a fila esvaziar agora, os pedidos de A entram com a
 * sessão de B.**
 */

/** Os quatro estados que a interface mostra. */
export type EstadoDaEntrada =
  /** Sei que não saiu. */
  | 'NAO_ENVIADO'
  /** Saiu, e não sei o que aconteceu. */
  | 'PENDENTE_DE_CONFIRMACAO'
  | 'CONFIRMADO'
  | 'CONFLITO';

/**
 * A partição. **Faz parte da chave, e não é um filtro à leitura.**
 *
 * Regra 1 do contrato, e a distinção é tudo: um filtro esquece-se numa consulta
 * nova; uma chave não tem por onde ser esquecida. Um registo sem os três não é
 * sincronizável — é lixo a descartar, nunca um registo a enviar «com o contexto
 * actual».
 */
export interface Particao {
  organizationId: string;
  locationId: string;
  utilizadorId: string;
}

export interface EntradaDaFila {
  /** Nasce no cliente, antes do envio, e sobrevive ao recarregamento (regra 4). */
  commandId: string;
  particao: Particao;
  tipo: string;
  payload: unknown;
  estado: EstadoDaEntrada;
  /** Versão do agregado que o cliente tinha ao compor. Viaja com o comando. */
  versao?: number;
  criadaEm: number;
  /** Preenchido quando o servidor respondeu — ou quando disse que já conhecia. */
  resposta?: unknown;
  /** O que mudou, quando dá conflito. Sem isto, «conflito» não é recuperável. */
  conflito?: { versaoActual: number; mudou: string[] };
}

/** A porta de armazenamento. O navegador liga o IndexedDB; a prova liga um mapa. */
export interface ArmazemDaFila {
  ler(): Promise<EntradaDaFila[]>;
  escrever(entradas: EntradaDaFila[]): Promise<void>;
}

export function mesmaParticao(a: Particao, b: Particao): boolean {
  return a.organizationId === b.organizationId
    && a.locationId === b.locationId
    && a.utilizadorId === b.utilizadorId;
}

/** A chave de partição, escrita. Serve para o armazenamento e para o diagnóstico. */
export function chaveDaParticao(p: Particao): string {
  return `${p.organizationId}/${p.locationId}/${p.utilizadorId}`;
}

/**
 * Uma entrada é sincronizável quando a partição dela é **a actual**.
 *
 * ── Regra 2: trocar de contexto SUSPENDE, não descarrega ─────────────────
 *
 * Não apaga — apagar é perder o trabalho de alguém. E não segue — seguir é
 * mandar os pedidos de A com a sessão de B. Fica suspensa até o dono voltar.
 *
 * O parâmetro chama-se `actual` e não `sessao` de propósito: quem chama tem de
 * dizer qual é o contexto **agora**, e não passar o que tinha guardado.
 */
export function sincronizavel(entrada: EntradaDaFila, actual: Particao | null): boolean {
  if (!actual) return false;
  // Um registo sem partição completa é lixo, e não um registo a enviar com o
  // contexto actual. É o que a regra 1 diz por escrito.
  const p = entrada.particao;
  if (!p?.organizationId || !p.locationId || !p.utilizadorId) return false;
  if (!mesmaParticao(p, actual)) return false;
  return entrada.estado === 'NAO_ENVIADO' || entrada.estado === 'PENDENTE_DE_CONFIRMACAO';
}

/** O que sai para a rede quando ela volta. */
export function paraEnviar(
  entradas: readonly EntradaDaFila[], actual: Particao | null,
): EntradaDaFila[] {
  return entradas.filter((e) => sincronizavel(e, actual));
}

/**
 * O que fica **suspenso**: existe, não segue, e não se apaga.
 *
 * Devolvido à parte para a interface poder dizê-lo. Uma fila que suspende em
 * silêncio parece uma fila vazia — e o dono dos rascunhos conclui que os perdeu.
 */
export function suspensas(
  entradas: readonly EntradaDaFila[], actual: Particao | null,
): EntradaDaFila[] {
  return entradas.filter(
    (e) => (e.estado === 'NAO_ENVIADO' || e.estado === 'PENDENTE_DE_CONFIRMACAO')
      && !sincronizavel(e, actual),
  );
}

/**
 * O que o operador SEGUINTE pode ler.
 *
 * ── Regra 3: logout e revogação limpam o que é legível ───────────────────
 *
 * O próximo operador não vê nome de cliente, linhas de pedido nem totais do
 * anterior. O que sobrevive é o **mínimo para o dono recuperar** — o
 * identificador, o tipo e o estado — e o `payload` não vai junto.
 *
 * Não é uma vista: é o que se guarda depois de limpar. Uma vista esquece-se; o
 * conteúdo apagado não volta.
 */
export interface EntradaOpaca {
  commandId: string;
  particao: Particao;
  tipo: string;
  estado: EstadoDaEntrada;
  criadaEm: number;
}

export function opacar(entrada: EntradaDaFila): EntradaOpaca {
  return {
    commandId: entrada.commandId,
    particao: entrada.particao,
    tipo: entrada.tipo,
    estado: entrada.estado,
    criadaEm: entrada.criadaEm,
  };
}

/**
 * O que fica no aparelho quando alguém sai.
 *
 * As entradas de OUTRAS partições ficam **opacas**: existem, contam, e não se
 * leem. As da partição que sai também — quem sai é o dono, e ele já não está cá
 * para as ler.
 */
export function aoSair(entradas: readonly EntradaDaFila[]): EntradaDaFila[] {
  return entradas.map((e) => ({ ...opacar(e), payload: undefined } as EntradaDaFila));
}
