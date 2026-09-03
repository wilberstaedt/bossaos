import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aceitarFicheiro, tipoPorConteudo } from './ficheiros.ts';

const bytes = (...n: number[]) => new Uint8Array(n);
const deTexto = (s: string) => new TextEncoder().encode(s);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
const MB = 1024 * 1024;

describe('1. O SVG, que é um documento e não uma imagem', () => {
  it('as formas de começar um SVG', () => {
    // Um SVG não tem assinatura — é texto. Qualquer verificação por bytes
    // mágicos o deixa em "desconhecido", e "desconhecido" tratado como
    // "provavelmente uma imagem" é como o XSS armazenado entra.
    for (const forma of [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<?xml version="1.0"?><svg onload="alert(1)"/>',
      '  \n<svg/>',
      '<!-- um comentário --><svg/>',
      '\uFEFF<svg/>',
    ]) {
      assert.equal(tipoPorConteudo(deTexto(forma)), 'svg', JSON.stringify(forma.slice(0, 30)));
    }
  });

  it('um SVG renomeado para .png continua a ser um SVG', () => {
    // A extensão vem do cliente. É a única razão por que nada aqui olha para ela.
    const r = aceitarFicheiro({
      conteudo: deTexto('<svg onload="alert(1)"/>'),
      nome: 'logo.png', tipoDeclarado: 'image/png', limiteBytes: 5 * MB,
    });
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.erro, 'tipo_nao_permitido');
    // O detalhe diz SVG, e não um "tipo não permitido" genérico: quem carrega um
    // logótipo SVG fê-lo de boa fé e merece saber que o problema é o formato.
    assert.equal(!r.ok && r.detalhe, 'svg');
  });

  it('HTML também não é imagem', () => {
    assert.equal(tipoPorConteudo(deTexto('<!DOCTYPE html><html>')), 'html');
    assert.equal(tipoPorConteudo(deTexto('<script>alert(1)</script>')), 'html');
  });
});

describe('2. O tipo vem dos bytes', () => {
  it('as quatro imagens que a carta pode mostrar', () => {
    assert.equal(tipoPorConteudo(PNG), 'png');
    assert.equal(tipoPorConteudo(JPEG), 'jpeg');
    assert.equal(tipoPorConteudo(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)), 'gif');
    assert.equal(tipoPorConteudo(new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ])), 'webp');
  });

  it('o PDF é reconhecido — e não passa como imagem', () => {
    assert.equal(tipoPorConteudo(deTexto('%PDF-1.7')), 'pdf');
    const r = aceitarFicheiro({ conteudo: deTexto('%PDF-1.7'), limiteBytes: MB });
    assert.equal(!r.ok && r.detalhe, 'pdf');
  });

  it('um PNG a fingir-se de outra coisa é recusado — o inverso da mentira', () => {
    // Este ramo não protege ninguém sozinho; é sinal de que alguém está a
    // experimentar, e vale mais recusar do que aceitar em silêncio.
    const r = aceitarFicheiro({ conteudo: PNG, tipoDeclarado: 'image/jpeg', limiteBytes: MB });
    assert.equal(!r.ok && r.erro, 'conteudo_nao_corresponde');
  });

  it('um PNG a sério passa — é o par de tudo o que está acima', () => {
    // Sem isto, uma implementação que recusasse tudo passava em todos os casos
    // de cima e a biblioteca de média ficava vazia.
    const r = aceitarFicheiro({ conteudo: PNG, tipoDeclarado: 'image/png', limiteBytes: MB });
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.aceite.tipoMime, 'image/png');
    assert.equal(r.ok && r.aceite.comoAnexo, false);
  });
});

describe('3. Tamanho e texto alternativo', () => {
  it('acima do limite recusa, com os números', () => {
    const r = aceitarFicheiro({ conteudo: PNG, limiteBytes: 4 });
    assert.equal(!r.ok && r.erro, 'grande_demais');
    assert.match((!r.ok && r.detalhe) || '', /11 > 4/);
  });

  it('vazio é vazio, não "desconhecido"', () => {
    assert.equal(aceitarFicheiro({ conteudo: new Uint8Array(), limiteBytes: MB }).ok, false);
  });

  it('uma imagem de carta exige texto alternativo; um anexo não', () => {
    const semTexto = { conteudo: PNG, limiteBytes: MB };
    assert.equal(aceitarFicheiro({ ...semTexto, exigirTextoAlternativo: true }).ok, false);
    assert.equal(aceitarFicheiro({ ...semTexto, exigirTextoAlternativo: true, textoAlternativo: '   ' }).ok, false);
    assert.equal(aceitarFicheiro({ ...semTexto, exigirTextoAlternativo: true, textoAlternativo: 'Croquetas' }).ok, true);
    assert.equal(aceitarFicheiro(semTexto).ok, true);
  });
});
