import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import type { FicheiroGuardado, PortaDeMedia } from '@bossaos/domain';

/**
 * Condutor de disco local da porta de média (E01: "configuração de storage
 * local compatível com a porta de mídia").
 *
 * Serve para desenvolvimento, e o objectivo é que o código que o usa não note a
 * diferença quando o condutor remoto entrar. Duas decisões que não são
 * cosméticas:
 *
 *  - **a chave é gerada aqui, não recebida.** Nome de ficheiro vindo de fora é
 *    um vector de travessia de caminho (`../../.env`). Quem guarda escolhe a
 *    chave; o nome original fica como metadado, não como caminho.
 *  - **todo o caminho resolvido é verificado contra a raiz.** Mesmo com a chave
 *    gerada internamente, a leitura aceita uma chave vinda de uma base de dados
 *    — e essa pode ter sido escrita por outra versão do código.
 */
export class ArmazenamentoLocal implements PortaDeMedia {
  readonly raiz: string;

  constructor(raiz: string) {
    this.raiz = resolve(raiz);
  }

  private caminho(chave: string): string {
    const alvo = resolve(this.raiz, chave);
    if (alvo !== this.raiz && !alvo.startsWith(this.raiz + sep)) {
      // Não inclui a chave na mensagem: se for hostil, não a ecoamos para o log.
      throw new Error('chave de média fora da raiz de armazenamento');
    }
    return alvo;
  }

  async guardar(entrada: {
    nome: string;
    tipoMime: string;
    conteudo: Uint8Array;
  }): Promise<FicheiroGuardado> {
    // Prefixo por hash para não empilhar milhares de ficheiros numa só pasta.
    const id = randomUUID();
    const gaveta = createHash('sha256').update(id).digest('hex').slice(0, 2);
    const chave = join(gaveta, id);
    const destino = this.caminho(chave);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, entrada.conteudo);
    return { chave, bytes: entrada.conteudo.byteLength, tipoMime: entrada.tipoMime };
  }

  async ler(chave: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.caminho(chave)));
  }

  async apagar(chave: string): Promise<void> {
    await rm(this.caminho(chave), { force: true });
  }

  async endereco(chave: string): Promise<string> {
    return `file://${this.caminho(chave)}`;
  }
}
