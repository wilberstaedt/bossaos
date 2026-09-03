import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  coberturaPorIdioma, estadoDaTraducao, impressaoDoTexto, resolverTexto,
  type Traducao,
} from './traducoes.ts';

const ORIGEM = { nome: 'Croquetas caseras', descricao: 'de jamón ibérico' };
const IMPRESSAO = impressaoDoTexto([ORIGEM.nome, ORIGEM.descricao]);

const traducao = (extra: Partial<Traducao> = {}): Traducao => ({
  idioma: 'en',
  nome: 'Homemade croquettes',
  descricao: 'with Iberian ham',
  impressaoDaOrigem: IMPRESSAO,
  revistaPor: 'dona@exemplo.example',
  revistaEm: new Date('2026-09-01T10:00:00Z'),
  ...extra,
});

describe('1. Texto de origem alterado torna a tradução obsoleta', () => {
  it('mudar a descrição em espanhol marca a inglesa', () => {
    const t = traducao();
    assert.equal(estadoDaTraducao(t, IMPRESSAO), 'revisada');

    // O dono muda a descrição. A página inglesa continua a existir, continua a
    // parecer completa, e passa a afirmar o antigo.
    const depois = impressaoDoTexto([ORIGEM.nome, 'de jamón serrano']);
    assert.equal(estadoDaTraducao(t, depois), 'obsoleta');
  });

  it('PENDENTE e OBSOLETA não são o mesmo estado', () => {
    // Pendente é "foi escrita e ninguém confirmou". Obsoleta é "foi confirmada e
    // depois o original mudou" — e essa é a perigosa, porque tem assinatura e
    // data, e por isso parece verificada.
    assert.equal(estadoDaTraducao(traducao({ revistaPor: null }), IMPRESSAO), 'pendente');
    assert.equal(estadoDaTraducao(traducao(), impressaoDoTexto(['outra coisa'])), 'obsoleta');
  });

  it('espaço a mais e forma Unicode diferente NÃO são uma mudança', () => {
    // Marcar cinquenta traduções como obsoletas porque alguém colou de um Word é
    // a forma mais rápida de ensinar toda a gente a ignorar o aviso.
    assert.equal(
      impressaoDoTexto(['Croquetas  caseras', ' de jamón ibérico ']),
      impressaoDoTexto(['Croquetas caseras', 'de jamón ibérico']),
    );
    // `\u00F3` composto (U+00F3) e decomposto (o + U+0301) são o mesmo texto para
    // quem lê, e chegam os dois de teclados e de colagens diferentes. Escritos
    // com os escapes de propósito: com os caracteres literais no ficheiro, esta
    // asserção comparava a cadeia consigo própria e ficava verde sem medir nada.
    const composto = 'jam\u00F3n';
    const decomposto = 'jamo\u0301n';
    assert.notEqual(composto, decomposto, 'as duas formas têm de ser bytes diferentes');
    assert.equal(impressaoDoTexto([composto]), impressaoDoTexto([decomposto]));
  });

  it('mas uma mudança a sério muda a impressão — é o par', () => {
    // Sem isto, uma implementação que devolvesse sempre a mesma cadeia passava
    // em tudo o que está acima e nunca marcava nada como obsoleto.
    assert.notEqual(impressaoDoTexto(['Croquetas']), impressaoDoTexto(['Croqueta']));
    assert.notEqual(impressaoDoTexto(['a', 'b']), impressaoDoTexto(['b', 'a']));
    assert.notEqual(impressaoDoTexto(['']), impressaoDoTexto(['x']));
  });
});

describe('2. O que se mostra, e de onde veio', () => {
  it('traduzida e revista: mostra-se, e diz-se que é tradução', () => {
    const r = resolverTexto({
      idiomaPedido: 'en', idiomaPrincipal: 'es-ES', origem: ORIGEM,
      traducoes: [traducao()], impressaoActual: IMPRESSAO,
    });
    assert.equal(r.nome, 'Homemade croquettes');
    assert.deepEqual(r.proveniencia, { origem: 'traducao', idioma: 'en', estado: 'revisada' });
  });

  it('UMA TRADUÇÃO OBSOLETA NÃO É SERVIDA — recua e diz porquê', () => {
    // Parecia melhor mostrar alguma coisa do que recuar. Mas o que ela mostra é
    // a versão antiga: recuar diz a verdade num idioma que não é o preferido;
    // servir o obsoleto diz uma mentira no idioma preferido.
    const r = resolverTexto({
      idiomaPedido: 'en', idiomaPrincipal: 'es-ES', origem: ORIGEM,
      traducoes: [traducao()], impressaoActual: impressaoDoTexto(['mudou']),
    });
    assert.equal(r.nome, 'Croquetas caseras');
    assert.deepEqual(r.proveniencia, {
      origem: 'idioma_principal', idioma: 'es-ES', razao: 'obsoleta',
    });
  });

  it('sem tradução nenhuma, recua com razão diferente', () => {
    // A razão distingue-se de propósito: "ninguém traduziu" e "traduziram e
    // ficou velho" mandam a pessoa a sítios diferentes do painel.
    const r = resolverTexto({
      idiomaPedido: 'pt-BR', idiomaPrincipal: 'es-ES', origem: ORIGEM,
      traducoes: [traducao()], impressaoActual: IMPRESSAO,
    });
    assert.equal(r.proveniencia.origem, 'idioma_principal');
    assert.equal(
      r.proveniencia.origem === 'idioma_principal' ? r.proveniencia.razao : '',
      'sem_traducao',
    );
  });

  it('por rever: a carta recua, o painel mostra', () => {
    const base = {
      idiomaPedido: 'en' as const, idiomaPrincipal: 'es-ES' as const, origem: ORIGEM,
      traducoes: [traducao({ revistaPor: null, revistaEm: null })],
      impressaoActual: IMPRESSAO,
    };
    // A carta publicada: texto que ninguém confirmou não se mostra como
    // definitivo — é a mesma promessa vazia dos alérgenos.
    assert.equal(resolverTexto(base).nome, 'Croquetas caseras');
    // O painel de edição: é lá que se revê, e por isso precisa de a ver.
    const noPainel = resolverTexto({ ...base, aceitarPorRever: true });
    assert.equal(noPainel.nome, 'Homemade croquettes');
    assert.deepEqual(noPainel.proveniencia, {
      origem: 'traducao', idioma: 'en', estado: 'pendente',
    });
  });

  it('a proveniência está SEMPRE lá', () => {
    // O E00 pede "indicação clara da origem". Um campo opcional acabaria por não
    // ser preenchido no ecrã que interessa.
    for (const traducoes of [[], [traducao()], [traducao({ revistaPor: null })]]) {
      const r = resolverTexto({
        idiomaPedido: 'en', idiomaPrincipal: 'es-ES', origem: ORIGEM,
        traducoes, impressaoActual: IMPRESSAO,
      });
      assert.ok(r.proveniencia, 'sem proveniência');
    }
  });
});

describe('3. A cobertura que o CAT-024 mostra', () => {
  it('conta as obsoletas À PARTE das que faltam', () => {
    // Somá-las num "por traduzir" único faz parecer que há mais trabalho novo do
    // que há, e esconde o urgente: o obsoleto já está publicado e errado.
    const produtos = [
      { impressao: IMPRESSAO, traducoes: [traducao()] },
      { impressao: IMPRESSAO, traducoes: [traducao({ revistaPor: null })] },
      { impressao: 'outra-coisa', traducoes: [traducao()] },
      { impressao: IMPRESSAO, traducoes: [] },
    ];
    const [ingles] = coberturaPorIdioma(produtos, ['en']);
    assert.deepEqual(ingles, {
      idioma: 'en', revisadas: 1, pendentes: 1, obsoletas: 1, semTraducao: 1,
    });
  });

  it('um idioma sem nada é todo "sem tradução", não zero em tudo', () => {
    const [pt] = coberturaPorIdioma([{ impressao: IMPRESSAO, traducoes: [traducao()] }], ['pt-BR']);
    assert.equal(pt?.semTraducao, 1);
    assert.equal(pt?.revisadas, 0);
  });
});
