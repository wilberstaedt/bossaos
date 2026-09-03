import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArmazenamentoLocal } from './local.ts';

describe('ArmazenamentoLocal', () => {
  let raiz: string;
  let fora: string;

  before(async () => {
    fora = await mkdtemp(join(tmpdir(), 'bossaos-fora-'));
    raiz = await mkdtemp(join(tmpdir(), 'bossaos-media-'));
    // Um ficheiro sensível FORA da raiz, para a travessia ter alvo real.
    await writeFile(join(fora, 'segredo.txt'), 'nao devia sair daqui');
  });

  after(async () => {
    await rm(raiz, { recursive: true, force: true });
    await rm(fora, { recursive: true, force: true });
  });

  it('guarda e lê de volta os mesmos bytes', async () => {
    const s = new ArmazenamentoLocal(raiz);
    const conteudo = new TextEncoder().encode('olá');
    const guardado = await s.guardar({ nome: 'a.txt', tipoMime: 'text/plain', conteudo });

    assert.equal(guardado.bytes, conteudo.byteLength);
    assert.deepEqual(await s.ler(guardado.chave), conteudo);
  });

  it('não usa o nome recebido como caminho', async () => {
    const s = new ArmazenamentoLocal(raiz);
    const guardado = await s.guardar({
      nome: '../../../etc/passwd',
      tipoMime: 'text/plain',
      conteudo: new Uint8Array([1]),
    });
    assert.ok(!guardado.chave.includes('..'), 'a chave não pode herdar o nome recebido');
    assert.ok(!guardado.chave.includes('passwd'));
  });

  it('recusa uma chave que saia da raiz', async () => {
    const s = new ArmazenamentoLocal(raiz);
    const escapes = ['../segredo.txt', '../../etc/passwd', `${fora}/segredo.txt`];
    for (const chave of escapes) {
      await assert.rejects(() => s.ler(chave), /fora da raiz/, `devia recusar: ${chave}`);
      await assert.rejects(() => s.apagar(chave), /fora da raiz/);
    }
  });

  it('a mensagem de recusa não repete a chave hostil', async () => {
    const s = new ArmazenamentoLocal(raiz);
    await assert.rejects(
      () => s.ler('../../../etc/passwd'),
      (e: Error) => !e.message.includes('passwd'),
    );
  });

  it('CONTROLO NEGATIVO: o caminho que a guarda recusa aponta mesmo ao ficheiro de fora', async () => {
    // Sem isto, os testes acima seriam verdes vazios: uma chave que não
    // resolvesse para lado nenhum também seria "recusada", e a guarda podia
    // estar a não fazer nada. Aqui provo que o caminho hostil é REAL — que sem
    // a verificação, `resolve(raiz, chave)` entregaria o segredo.
    const { readFile } = await import('node:fs/promises');
    const { relative, resolve } = await import('node:path');

    const chaveHostil = relative(raiz, join(fora, 'segredo.txt'));
    assert.ok(chaveHostil.startsWith('..'), 'a chave de ataque tem de subir da raiz');

    // O que a classe FARIA se não verificasse: resolver e ler.
    const semGuarda = resolve(raiz, chaveHostil);
    assert.equal(await readFile(semGuarda, 'utf8'), 'nao devia sair daqui');

    // E o que ela faz de facto:
    const s = new ArmazenamentoLocal(raiz);
    await assert.rejects(() => s.ler(chaveHostil), /fora da raiz/);
  });
});
