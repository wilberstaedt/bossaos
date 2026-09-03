/**
 * Porta de média.
 *
 * O domínio diz o que precisa — guardar um ficheiro, devolver um endereço para
 * o ler, apagá-lo — e não sabe onde isso acontece. Em desenvolvimento a
 * implementação é o disco local (`@bossaos/storage`); a de objecto remoto entra
 * na etapa que a desenhar, sem tocar em nada que dependa desta interface.
 *
 * A porta vive aqui, e não junto da implementação, precisamente para que trocar
 * de fornecedor não seja um refactor do domínio.
 */
export interface FicheiroGuardado {
  /** Identificador estável, atribuído por quem guarda. */
  chave: string;
  bytes: number;
  tipoMime: string;
}

export interface PortaDeMedia {
  guardar(entrada: {
    nome: string;
    tipoMime: string;
    conteudo: Uint8Array;
  }): Promise<FicheiroGuardado>;

  ler(chave: string): Promise<Uint8Array>;

  apagar(chave: string): Promise<void>;

  /** Endereço para servir o ficheiro. Local ou assinado, conforme o condutor. */
  endereco(chave: string): Promise<string>;
}
