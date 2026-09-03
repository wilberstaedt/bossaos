/**
 * Chaves de cache, prefixos de ficheiro, nomes de evento e de tarefa.
 *
 * O CT-04 diz que "cache, arquivos, exportações, tarefas e eventos precisam do
 * mesmo isolamento". A base tem políticas de linha; um Redis e um balde de
 * objectos não têm nada — o que os separa é o nome. Por isso o nome não se
 * escreve à mão em lado nenhum: constrói-se aqui, sempre com o inquilino à
 * cabeça, e nunca se consegue construir sem ele.
 */

export interface EscopoDeChave {
  organizationId: string;
  locationId?: string;
}

const SEPARADOR = ':';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Escapa uma parte da chave.
 *
 * Isto não é higiene decorativa. Sem escape, uma parte que contenha o separador
 * forja um prefixo: `chaveDeCache({organizationId: A}, 'x:org:B:catalogo')`
 * produziria uma chave que **parece** do inquilino B, e quem lesse por prefixo
 * traria dados de B para um pedido de A. É o mesmo defeito que a travessia de
 * caminho no armazenamento, noutro alfabeto.
 */
function escapar(parte: string): string {
  if (parte.length === 0) throw new Error('parte de chave vazia');
  return parte.replace(/[\\:]/g, (c) => `\\${c}`);
}

function exigirOrganizacao(escopo: EscopoDeChave): string {
  if (!escopo.organizationId || !UUID.test(escopo.organizationId)) {
    // Falhar é a única resposta certa. Uma chave sem inquilino é uma chave
    // global, e uma cache global entre restaurantes é uma fuga com prazo.
    throw new Error('chave sem organização válida');
  }
  return escopo.organizationId;
}

/** `org:<uuid>:<parte>:<parte>` — e `…:loc:<uuid>:…` quando há unidade. */
export function chaveDeCache(escopo: EscopoDeChave, ...partes: readonly string[]): string {
  const raiz = ['org', exigirOrganizacao(escopo)];
  if (escopo.locationId) {
    if (!UUID.test(escopo.locationId)) throw new Error('locationId não é um UUID');
    raiz.push('loc', escopo.locationId);
  }
  if (partes.length === 0) throw new Error('chave sem partes');
  return [...raiz, ...partes.map(escapar)].join(SEPARADOR);
}

/**
 * Prefixo de ficheiro. Termina em `/` para poder ser concatenado sem pensar.
 *
 * Usa `/` e não `:` porque é isto que vai para um caminho de disco e para uma
 * chave de objecto remoto — e nesses, `..` é o que faz estragos. O UUID é
 * validado, logo não pode conter travessia.
 */
export function prefixoDeMedia(escopo: EscopoDeChave): string {
  const org = exigirOrganizacao(escopo);
  if (escopo.locationId) {
    if (!UUID.test(escopo.locationId)) throw new Error('locationId não é um UUID');
    return `org/${org}/loc/${escopo.locationId}/`;
  }
  return `org/${org}/`;
}

/** Nome de evento para a outbox. O inquilino é parte do nome, não um campo. */
export function nomeDeEvento(escopo: EscopoDeChave, evento: string): string {
  return chaveDeCache(escopo, 'evt', evento);
}

/**
 * Chave de tarefa, para deduplicação.
 *
 * Duas organizações a agendar "fechar-caixa" no mesmo minuto têm de produzir
 * chaves diferentes — senão a segunda é descartada como repetida e a caixa de um
 * restaurante nunca fecha.
 */
export function chaveDeTarefa(
  escopo: EscopoDeChave,
  tarefa: string,
  ...partes: readonly string[]
): string {
  return chaveDeCache(escopo, 'job', tarefa, ...partes);
}
