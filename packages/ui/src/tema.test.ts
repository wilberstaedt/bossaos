import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMA_BOSSAOS, coresMalFormadas, normalizarCor, tokensNaoPermitidos, validarTema, variaveisDoTema,
} from './tema.ts';
import { TOKENS_TEMAVEIS, estado, foco, tipografia } from './fichas.ts';

describe('tema público', () => {
  it('o tema de origem da BossaOS aprova-se a si próprio', () => {
    const r = validarTema(TEMA_BOSSAOS);
    assert.ok(r.aprovado, r.reprovacoes.join(' | '));
    assert.equal(r.reprovacoes.length, 0);
  });

  it('gera a cor do texto em vez de a aceitar de fora', () => {
    const claro = validarTema({ fundo: '#FFFFFF' });
    const escuro = validarTema({ fundo: '#0B1B1F' });
    const vClaro = claro.veredictos.find((v) => v.token === 'fundo');
    const vEscuro = escuro.veredictos.find((v) => v.token === 'fundo');

    assert.equal(vClaro?.textoGerado, '#102E35', 'fundo claro pede texto escuro');
    assert.equal(vEscuro?.textoGerado, '#FFFFFF', 'fundo escuro pede texto claro');
  });

  it('BLOQUEIA um par ilegível em vez de publicar com aviso', () => {
    // Tem de ser um tom MÉDIO. A minha primeira tentativa foi um amarelo claro
    // e passou: texto escuro sobre amarelo claro dá 11:1. O par ilegível é o do
    // meio, onde nem o texto escuro nem o branco chegam a 4,5 — medido em
    // #858585: 3,89 com o escuro, 3,69 com o branco.
    const r = validarTema({ fundo: '#858585', primaria: '#858585' });
    assert.ok(!r.aprovado, 'devia reprovar');
    assert.ok(
      r.reprovacoes.some((m) => m.startsWith('primaria')),
      `esperava reprovação na primária, veio: ${r.reprovacoes.join(' | ')}`,
    );
    assert.ok(
      r.reprovacoes.some((m) => m.startsWith('fundo')),
      'o fundo médio também é ilegível e tem de ser dito',
    );
    // A mensagem tem de dizer o número e o mínimo, senão não ensina nada.
    assert.match(r.reprovacoes[0] ?? '', /\d+(\.\d+)?:1/);
    assert.match(r.reprovacoes.join(' '), /mínimo/);
  });

  it('o acento da marca AVISA sem bloquear — e o número é o do manual', () => {
    const r = validarTema(TEMA_BOSSAOS);
    assert.ok(r.aprovado, 'o tema de origem não pode ser reprovado por si próprio');

    const v = r.veredictos.find((x) => x.token === 'acento');
    assert.equal(v?.razao, 2.77, 'é o valor publicado no manual, p. 16');
    assert.ok(!v?.cumpre, 'não chega aos 3:1 de elemento gráfico');
    assert.equal(r.avisos.length, 1);
    assert.match(r.avisos[0] ?? '', /decoração editorial/);
    assert.match(r.avisos[0] ?? '', /não pode desenhar um controlo/);
  });

  it('mede o acento como GRÁFICO e não como texto', () => {
    // O coral da marca sobre a areia dá 2,77 — reprovaria como texto (4,5) e
    // reprova também como gráfico (3). Uso um acento que passa gráfico e não
    // passaria texto, para provar que o limiar aplicado é mesmo o de gráfico.
    const r = validarTema({ acento: '#B85C00' });
    const v = r.veredictos.find((x) => x.token === 'acento');
    assert.equal(v?.tamanho, 'grande');
    assert.equal(v?.limiar, 3);
    assert.ok(v!.razao >= 3 && v!.razao < 4.5, `razão ${v!.razao} devia estar entre 3 e 4,5`);
    assert.ok(v?.cumpre, 'passa como gráfico');
  });

  it('recusa cor inválida em vez de a tratar como preto — e sem ATIRAR', () => {
    // ── Porque é que isto deixou de ser um `throws` (E12, 04/09) ──────────
    //
    // Atirar dava a resposta certa ao sítio errado: a rota que grava temas
    // devolvia **500** a um pedido que só estava errado, e uma recusa que se lê
    // como avaria manda quem a recebeu procurar no sítio errado. Medido contra a
    // rota que existia desde o E05: `{"primaria":"red"}` → 500.
    //
    // A intenção do teste não muda — uma cor inválida não vira preto — mas a
    // forma sim: reprovação com motivo, e a exceção fica para o que é mesmo
    // impossível.
    const r = validarTema({ fundo: 'azul-marinho' });
    assert.equal(r.aprovado, false);
    assert.match(r.reprovacoes.join(' '), /hexadecimal/);
    // E não mediu contraste nenhum: não havia cor para medir.
    assert.deepEqual(r.veredictos, []);
  });

  it('normaliza a forma da cor: #ABC, abc e #aabbcc são a mesma', () => {
    // Guardar `#1B3A2F` numa porta e `#1b3a2f` noutra fazia a comparação «há
    // alterações por publicar?» dizer que sim para sempre.
    assert.equal(normalizarCor('#ABC'), '#aabbcc');
    assert.equal(normalizarCor('aabbcc'), '#aabbcc');
    assert.equal(normalizarCor('#AABBCC'), '#aabbcc');
    assert.equal(normalizarCor('red'), null);
    assert.equal(normalizarCor('red;--bo-foco:transparent'), null);
    assert.equal(normalizarCor(undefined), null);
    assert.deepEqual(coresMalFormadas({ primaria: '#fff', fundo: 'rgb(0,0,0)' }), ['fundo']);
  });

  it('a lista de tokens temáveis é curta e é a lista inteira', () => {
    assert.deepEqual([...TOKENS_TEMAVEIS], ['primaria', 'acento', 'fundo']);
    assert.deepEqual(
      tokensNaoPermitidos({ primaria: '#000', perigo: '#0f0', foco: '#00f' }),
      ['perigo', 'foco'],
    );
    assert.deepEqual(tokensNaoPermitidos({ primaria: '#000', acento: '#111', fundo: '#222' }), []);
  });

  it('as variáveis do tema NÃO incluem estado, foco, grade nem tipografia', () => {
    const vars = variaveisDoTema(TEMA_BOSSAOS);
    const texto = JSON.stringify(vars);

    for (const [nome, cor] of Object.entries(estado)) {
      assert.ok(!texto.includes(cor), `o estado "${nome}" (${cor}) não pode ser temável`);
    }
    // Nada de procurar `foco.espessura` (que é 2) dentro de "#102E35": isso
    // acusava-se a si próprio. A guarda é a FORMA das chaves.
    for (const chave of Object.keys(vars)) {
      assert.doesNotMatch(
        chave,
        /foco|estado|sucesso|aviso|perigo|info|fonte|tipografia|grade|raio|espaco/i,
        `a chave "${chave}" nomeia sistema fixo e não devia ser temável`,
      );
    }
    assert.ok(!texto.toLowerCase().includes('rubik'), 'a tipografia não é temável');
    assert.ok(!texto.toLowerCase().includes('noto'), 'a tipografia não é temável');
    assert.equal(foco.espessura, 2, 'o foco continua a existir, fora do tema');

    // E o que ESTÁ lá é só o que devia estar.
    assert.deepEqual(Object.keys(vars).sort(), [
      '--bo-publico-acento',
      '--bo-publico-fundo',
      '--bo-publico-primaria',
      '--bo-publico-primaria-texto',
      '--bo-publico-texto',
    ]);
  });

  it('CONTROLO NEGATIVO: o teste acima falharia se um estado fosse temável', () => {
    // Sem isto, a asserção "não inclui estado" passaria também numa versão em
    // que `variaveisDoTema` devolvesse um objecto vazio, ou em que os estados
    // tivessem cores diferentes das de `fichas`. Aqui provo que a comparação
    // tem substância: as cores de estado existem e são strings que apareceriam.
    const falso = { ...variaveisDoTema(TEMA_BOSSAOS), '--bo-perigo': estado.perigo };
    assert.ok(
      JSON.stringify(falso).includes(estado.perigo),
      'se um estado entrasse no tema, a verificação tinha de o ver',
    );
    assert.equal(tipografia.tamanhoMinimo, 14);
  });
});
