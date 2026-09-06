import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  arvoreLimpa, conferirImportacao, degrauPodeSubir, etapasPorValidar, lerDegraus, podeDeclararRpo, podeSubir, versaoQueResponde,
} from './implantacao.ts';

/**
 * A última etapa do Codex, e a única cujo contrato não foi escrito por dedução:
 * foi escrito **depois de uma publicação com nove paragens**.
 *
 * Cada grupo abaixo corresponde a uma delas — e cada um leva a sonda que **tem
 * de passar** ao lado das que devem falhar. Sem ela, uma implementação que
 * recusasse tudo passava por cima de metade destes casos.
 */

describe('1. Portão: não se publica o que não foi assinado', () => {
  it('com tudo validado, não há nada a impedir', () => {
    assert.deepEqual(etapasPorValidar([
      { etapa: 'E31', estado: 'validado' },
      { etapa: 'E32', estado: 'validado' },
    ]), []);
  });

  it('e uma etapa por validar PARA a publicação', () => {
    // «Se houver etapa por validar, o que vai para o ar inclui código que
    // ninguém reviu.»
    assert.deepEqual(etapasPorValidar([
      { etapa: 'E31', estado: 'validado' },
      { etapa: 'E35', estado: 'implementado aguardando validação' },
    ]), ['E35']);
  });

  it('o E00 fica de fora — é o contrato, não é código', () => {
    assert.deepEqual(etapasPorValidar([{ etapa: 'E00', estado: 'planejado' }]), []);
  });

  it('e o estado lê-se sem se importar com maiúsculas ou espaços', () => {
    // Um portão que dependesse da grafia da matriz mediria a formatação.
    assert.deepEqual(etapasPorValidar([{ etapa: 'E31', estado: '  VALIDADO  ' }]), []);
  });
});

describe('2. Portão: publica-se um COMMIT, não a árvore', () => {
  it('árvore limpa passa', () => {
    assert.equal(arvoreLimpa(''), true);
    assert.equal(arvoreLimpa('   \n  '), true);
  });

  it('e um ficheiro por commitar PARA', () => {
    // Enviar o disco é uma promessa de que o disco e o commit coincidem — e
    // ninguém a verifica.
    assert.equal(arvoreLimpa(' M packages/db/src/x.ts'), false);
  });

  it('o que nunca sobe: os segredos e o que é gerado', () => {
    assert.equal(podeSubir('.env'), false);
    assert.equal(podeSubir('.env.prod'), false);
    assert.equal(podeSubir('node_modules/x/y.js'), false);
    // No MEIO do caminho, que e onde a primeira versao os deixava passar.
    assert.equal(podeSubir('apps/web/.next/build.json'), false);
    assert.equal(podeSubir('apps/web/node_modules/x/y.js'), false);
    assert.equal(podeSubir('outra/inspeccao/.resultados/x.png'), false);
  });

  it('E A SONDA QUE TEM DE PASSAR: o código normal sobe', () => {
    // Sem este caso, uma implementação que recusasse tudo passava os quatro
    // acima — e o pacote publicado ia vazio.
    assert.equal(podeSubir('packages/db/src/index.ts'), true);
    assert.equal(podeSubir('docs/releases/pilot.md'), true);
    // E um nome que só CONTÉM `.env` não é o `.env`.
    assert.equal(podeSubir('docs/.env-exemplo.md'), true);
  });
});

describe('3. Portão: a versão que responde é a que foi construída', () => {
  it('a etiqueta bate certo', () => {
    const r = versaoQueResponde('abc1234', 'abc1234');
    assert.equal(r.sabe && r.coincide, true);
  });

  it('e uma etiqueta antiga PARA — o build não pegou', () => {
    // «Um `up` sem erro não é uma publicação: um build que não pegou serve o
    // bundle antigo com ar de sucesso.»
    const r = versaoQueResponde('velha99', 'abc1234');
    assert.equal(r.sabe, true);
    assert.equal(r.sabe && r.coincide, false);
    assert.equal(r.sabe && r.noAr, 'velha99');
  });

  it('NÃO CONSEGUIR LER a etiqueta é «não sei», e não «errado»', () => {
    // As duas mandam fazer coisas diferentes: uma manda reconstruir, a outra
    // manda ir ver porque é que o Docker não responde. Colapsá-las faz alguém
    // reconstruir durante uma hora um build que estava certo.
    assert.deepEqual(versaoQueResponde(null, 'abc1234'), { sabe: false });
    assert.deepEqual(versaoQueResponde('  ', 'abc1234'), { sabe: false });
  });
});

describe('4. Um backup que nunca foi restaurado é uma esperança', () => {
  it('com ensaio feito e medido, pode declarar-se o RPO', () => {
    assert.equal(podeDeclararRpo({
      feitoEm: new Date('2026-09-06'), duracaoSegundos: 412,
    }), true);
  });

  it('sem ensaio, NÃO — o número seria inventado', () => {
    assert.equal(podeDeclararRpo({ feitoEm: null, duracaoSegundos: null }), false);
  });

  it('e com ensaio sem TEMPO medido também não', () => {
    // «Fizemos um ensaio» sem duração é meia medida: o cliente decide quanto
    // tempo fica fechado com base nesse número.
    assert.equal(podeDeclararRpo({
      feitoEm: new Date('2026-09-06'), duracaoSegundos: null,
    }), false);
  });
});

describe('5. A importação a seco: os alergénios não se adivinham', () => {
  const OK = { nome: 'Café', preco: '1,50', idioma: 'es-ES', alergenios: 'leite' };

  it('E A SONDA QUE TEM DE PASSAR: uma linha boa não gera aviso nenhum', () => {
    assert.deepEqual(conferirImportacao([OK]), []);
  });

  it('alergénios vazios geram AVISO, e não um valor', () => {
    // «Campo vazio é DESCONHECIDO, nunca "não contém".» A folha do cliente tem
    // células vazias por todo o lado, e «vazio» parece «nada».
    const avisos = conferirImportacao([{ ...OK, alergenios: '' }]);
    assert.equal(avisos.length, 1);
    assert.equal(avisos[0]?.campo, 'alergenios');
    assert.match(String(avisos[0]?.problema), /DESCONHECIDO/);
  });

  it('um preço ilegível é aviso, e não um número aproximado', () => {
    // `Number('1.2.3')` dá `NaN`, mas `parseFloat` dá `1.2` — e é essa a que
    // alguém escreve com pressa. Lê-se como texto e valida-se como texto.
    for (const mau of ['1.2.3', 'grátis', '1,505', '']) {
      const avisos = conferirImportacao([{ ...OK, preco: mau }]);
      assert.ok(avisos.some((a) => a.campo === 'preco'), `"${mau}" passou como preço`);
    }
  });

  it('e a conferência diz a LINHA, senão não serve para conferir', () => {
    const avisos = conferirImportacao([OK, { ...OK, nome: '' }]);
    assert.equal(avisos[0]?.linha, 2);
  });

  it('CONTROLO NEGATIVO: com o vazio a virar «não contém», o aviso desaparece', () => {
    const comAdivinhacao = (l: { alergenios: string }) =>
      (l.alergenios.trim() === '' ? 'NAO_CONTEM' : l.alergenios);
    assert.equal(comAdivinhacao({ alergenios: '' }), 'NAO_CONTEM');
    // E a função real recusa-se a decidir.
    assert.equal(conferirImportacao([{ ...OK, alergenios: '' }]).length, 1);
  });
});

describe('6. A entrada progressiva tem plano de saída', () => {
  it('E A SONDA QUE TEM DE PASSAR: um degrau completo sobe', () => {
    assert.deepEqual(degrauPodeSubir({
      nome: 'Starter', criterios: ['a carta publicada'],
      saida: 'despublicar a carta e voltar ao menu em papel',
    }), { ok: true });
  });

  it('sem plano de saída NÃO sobe', () => {
    // «Um plano de entrada sem plano de saída é uma aposta.»
    const r = degrauPodeSubir({ nome: 'Pro', criterios: ['x'], saida: null });
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.razao, 'sem plano de saída');
  });

  it('e sem critérios também não — subir «quando parecer» não é um degrau', () => {
    const r = degrauPodeSubir({ nome: 'Pro', criterios: [], saida: 'voltar ao Starter' });
    assert.equal(r.ok, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('lerDegraus — a ponte que faltava entre a regra e os dados', () => {
  // ── A retenção do sénior, e o caso EXACTO que ele plantou ───────────────
  //
  // O controlo contava `## Degrau ` contra `**Plano de saída` e dizia
  // `degraus=3 saidas=3` com o plano do último VAZIO. Contar títulos mede que
  // alguém escreveu o título.
  const DOCUMENTO = [
    '# Entrada progressiva',
    '',
    '## Degrau 1 — STARTER: a carta no QR',
    '',
    '**Critérios para subir ao degrau 2**',
    '1. Uma semana de serviço com a carta no ar.',
    '2. Alergénios revistos pela casa.',
    '',
    '**Plano de saída:** volta-se à carta de papel.',
    '',
    '---',
    '',
    '## Degrau 2 — RESTAURANT: a operação',
    '',
    '**Critérios para subir ao degrau 3**',
    '1. Duas semanas de serviço.',
    '',
    '**Plano de saída, por partes** — papel e caixa registadora.',
    '',
  ].join('\n');

  it('lê os degraus com nome, critérios e saída', () => {
    const d = lerDegraus(DOCUMENTO);
    assert.equal(d.length, 2);
    assert.match(d[0]!.nome, /Degrau 1/);
    assert.equal(d[0]!.criterios.length, 2);
    assert.match(d[0]!.saida ?? '', /carta de papel/);
  });

  it('o rótulo escrito de duas maneiras lê-se das duas', () => {
    // `**Plano de saída:**` e `**Plano de saída, por partes**` são a mesma
    // coisa dita de duas formas. Cobrir as formas de escrever é o defeito das
    // três aspas; o que se mede é onde o rótulo ACABA.
    const d = lerDegraus(DOCUMENTO);
    assert.match(d[1]!.saida ?? '', /papel e caixa registadora/);
    assert.doesNotMatch(d[1]!.saida ?? '', /Plano de saída/);
  });

  it('CONTROLO: cabeçalho intacto e plano vazio dá saída NULA, e a regra recusa', () => {
    // É o ficheiro adulterado do sénior, em miniatura: o título do plano fica,
    // o plano desaparece.
    const adulterado = DOCUMENTO.replace(
      '**Plano de saída, por partes** — papel e caixa registadora.',
      '**Plano de saída, por partes**',
    );
    const d = lerDegraus(adulterado);
    assert.equal(d.length, 2, 'continua a haver dois degraus — o cabeçalho está lá');
    assert.equal(d[1]!.saida, null, 'e a saída é NULA, não a presença do título');
    const veredicto = degrauPodeSubir(d[1]!);
    assert.equal(veredicto.ok, false);
    assert.equal(veredicto.ok === false ? veredicto.razao : '', 'sem plano de saída');
  });

  it('CONTROLO: um degrau SEM sequer o rótulo também não sobe', () => {
    const semRotulo = DOCUMENTO.replace(
      '**Plano de saída, por partes** — papel e caixa registadora.',
      'e pronto.',
    );
    const d = lerDegraus(semRotulo);
    assert.equal(d[1]!.saida, null);
    assert.equal(degrauPodeSubir(d[1]!).ok, false);
  });

  it('CONTROLO: pontuação sozinha não é um plano', () => {
    // `**Plano de saída:** —` tem texto depois do rótulo e continua a não
    // dizer nada. Sem isto, um travessão comprava o degrau.
    const so_traco = DOCUMENTO.replace(
      '**Plano de saída:** volta-se à carta de papel.',
      '**Plano de saída:** —',
    );
    const d = lerDegraus(so_traco);
    assert.equal(d[0]!.saida, null);
    assert.equal(degrauPodeSubir(d[0]!).ok, false);
  });

  it('E A SONDA QUE TEM DE PASSAR: os dois degraus inteiros sobem', () => {
    // Sem este par, um leitor que devolvesse `saida: null` para tudo passava
    // os quatro controlos acima.
    const d = lerDegraus(DOCUMENTO);
    for (const degrau of d) {
      assert.equal(degrauPodeSubir(degrau).ok, true, degrau.nome);
    }
  });
});
