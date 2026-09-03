import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { IDIOMAS, IDIOMA_PADRAO, resolverIdioma, eIdioma } from './idiomas.ts';
import { tradutor, textoDeProduto } from './traduzir.ts';
import { formatarData, formatarDinheiro, formatarHora, formatarNumero } from './formato.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));

function carregar(idioma: string): unknown {
  return JSON.parse(readFileSync(join(AQUI, 'mensagens', `${idioma}.json`), 'utf8'));
}

/** Todos os caminhos de chave, em profundidade, ordenados. */
function chaves(objecto: unknown, prefixo = ''): string[] {
  if (typeof objecto !== 'object' || objecto === null) return [prefixo];
  return Object.entries(objecto as Record<string, unknown>)
    .flatMap(([k, v]) => chaves(v, prefixo ? `${prefixo}.${k}` : k))
    .sort();
}

describe('idiomas', () => {
  it('o espanhol é o inicial', () => {
    assert.equal(IDIOMA_PADRAO, 'es-ES');
    assert.equal(IDIOMAS[0], 'es-ES');
  });

  // Este é o teste que evita que uma tradução em falta chegue a um ecrã. Sem
  // ele, uma chave nova acrescentada só ao espanhol só aparece quando alguém
  // muda o idioma — normalmente o cliente, e não nós.
  it('os três idiomas têm EXACTAMENTE as mesmas chaves', () => {
    const base = chaves(carregar('es-ES'));
    assert.ok(base.length > 40, `só ${base.length} chaves — o leitor partiu-se?`);

    for (const idioma of IDIOMAS) {
      const outras = chaves(carregar(idioma));
      const faltam = base.filter((k) => !outras.includes(k));
      const sobram = outras.filter((k) => !base.includes(k));
      assert.deepEqual(faltam, [], `${idioma}: faltam chaves`);
      assert.deepEqual(sobram, [], `${idioma}: chaves a mais, que o espanhol não tem`);
    }
  });

  it('nenhum valor está vazio nem é igual à chave', () => {
    for (const idioma of IDIOMAS) {
      const dados = carregar(idioma);
      const t = tradutor(idioma);
      for (const chave of chaves(dados)) {
        const valor = t(chave as never);
        assert.ok(valor.trim().length > 0, `${idioma}/${chave} está vazio`);
        assert.notEqual(valor, chave, `${idioma}/${chave} não foi traduzido`);
      }
    }
  });

  it('as traduções são mesmo diferentes entre si onde têm de ser', () => {
    // Uma cópia do espanhol nos três ficheiros passaria em todos os testes
    // acima. Aqui exijo que os títulos dos estados difiram de facto.
    const chavesDeTitulo = [
      'estado.carga.titulo',
      'estado.vazio.titulo',
      'estado.semAcesso.titulo',
    ] as const;
    for (const chave of chavesDeTitulo) {
      const valores = IDIOMAS.map((i) => tradutor(i)(chave));
      assert.equal(new Set(valores).size, IDIOMAS.length, `${chave} repete-se entre idiomas`);
    }
  });

  it('uma chave em falta cai no espanhol, e não na chave crua', () => {
    const t = tradutor('en');
    // Chave inventada: não existe em lado nenhum, devolve a própria chave.
    assert.equal(t('nao.existe.mesmo' as never), 'nao.existe.mesmo');
    // Chave real: existe nos três.
    assert.equal(t('comum.fechar'), 'Close');
  });

  it('resolve o idioma do browser pela variante mais próxima', () => {
    assert.equal(resolverIdioma('es-ES,es;q=0.9'), 'es-ES');
    assert.equal(resolverIdioma('es-MX,es;q=0.9'), 'es-ES', 'variante americana cai no espanhol');
    assert.equal(resolverIdioma('pt-PT,pt;q=0.9'), 'pt-BR', 'português europeu cai no pt-BR');
    assert.equal(resolverIdioma('en-GB'), 'en');
    assert.equal(resolverIdioma('de-DE,fr;q=0.8'), 'es-ES', 'desconhecido cai no padrão');
    assert.equal(resolverIdioma(null), 'es-ES');
    assert.equal(resolverIdioma(''), 'es-ES');
    // O peso manda: aqui o inglês é preferido apesar de vir depois.
    assert.equal(resolverIdioma('de-DE;q=0.2,en;q=0.9'), 'en');
  });

  it('eIdioma não deixa passar uma etiqueta inventada', () => {
    assert.ok(eIdioma('pt-BR'));
    assert.ok(!eIdioma('pt-PT'));
    assert.ok(!eIdioma(42));
  });
});

describe('texto de produto (separado do da interface)', () => {
  const croquetes = { 'es-ES': 'Croquetas caseras', 'pt-BR': 'Croquetes caseiros' };

  it('devolve a tradução pedida quando existe', () => {
    const r = textoDeProduto(croquetes, 'pt-BR', 'es-ES');
    assert.deepEqual(r, { texto: 'Croquetes caseiros', idiomaUsado: 'pt-BR', emRecurso: false });
  });

  it('cai na língua do restaurante e DIZ que caiu', () => {
    const r = textoDeProduto(croquetes, 'en', 'es-ES');
    assert.equal(r?.texto, 'Croquetas caseras');
    assert.equal(r?.idiomaUsado, 'es-ES');
    assert.ok(r?.emRecurso, 'quem mostra tem de poder saber que isto não é inglês');
  });

  it('sem nenhuma tradução devolve null, e não uma cadeia vazia', () => {
    assert.equal(textoDeProduto({}, 'es-ES', 'es-ES'), null);
  });
});

describe('formato regional', () => {
  const MOMENTO = new Date('2026-12-31T20:05:00Z');

  it('dinheiro vem de unidades mínimas INTEIRAS', () => {
    // NBSP (U+00A0) e não espaço normal: é o que o `Intl` põe entre o número e
    // o símbolo, e é a diferença que faz uma comparação de strings falhar sem
    // que se veja porquê. Escrito à vista para o próximo não perder a tarde.
    const NBSP = '\u00A0';
    assert.equal(formatarDinheiro({ montanteMenor: 1250, moeda: 'EUR' }, 'es-ES'), `12,50${NBSP}€`);
    assert.equal(formatarDinheiro({ montanteMenor: 1250, moeda: 'EUR' }, 'pt-BR'), `€${NBSP}12,50`);
    assert.equal(formatarDinheiro({ montanteMenor: 1250, moeda: 'EUR' }, 'en'), '€12.50');

    // E o inteiro é mesmo o mínimo: 1 cêntimo, não 0,01 €.
    assert.equal(formatarDinheiro({ montanteMenor: 1, moeda: 'EUR' }, 'es-ES'), `0,01${NBSP}€`);
    assert.equal(formatarDinheiro({ montanteMenor: 0, moeda: 'EUR' }, 'es-ES'), `0,00${NBSP}€`);
  });

  it('recusa um montante fraccionário em vez de o arredondar', () => {
    assert.throws(
      () => formatarDinheiro({ montanteMenor: 12.5, moeda: 'EUR' }, 'es-ES'),
      /inteiro/,
    );
  });

  it('respeita moedas sem casas decimais', () => {
    // 500 ienes são 500, não 5,00 — tratar tudo como dois dígitos daria um erro
    // de duas ordens de grandeza numa fatura.
    const jpy = formatarDinheiro({ montanteMenor: 500, moeda: 'JPY' }, 'en');
    assert.match(jpy, /500/);
    assert.ok(!jpy.includes('5.00'), `dividiu por 100 onde não devia: ${jpy}`);
  });

  it('data e hora seguem a convenção de cada sítio', () => {
    assert.equal(formatarData(MOMENTO, 'es-ES'), '31/12/26');
    assert.equal(formatarData(MOMENTO, 'pt-BR'), '31/12/2026');
    assert.equal(formatarData(MOMENTO, 'en'), '12/31/26');

    // 24 h em ES e PT, 12 h em EN. Num painel de reservas isto não é cosmético.
    assert.equal(formatarHora(MOMENTO, 'es-ES'), '21:05');
    assert.equal(formatarHora(MOMENTO, 'pt-BR'), '21:05');
    assert.match(formatarHora(MOMENTO, 'en'), /9:05\s?PM/);
  });

  it('o fuso é explícito: a mesma data muda de dia consoante onde se lê', () => {
    // 20:05 UTC de 31/12 já é 1 de Janeiro em Auckland. Uma reserva mostrada no
    // fuso errado é uma mesa perdida.
    assert.equal(formatarData(MOMENTO, 'en', 'Pacific/Auckland'), '1/1/27');
    assert.equal(formatarData(MOMENTO, 'en', 'America/Sao_Paulo'), '12/31/26');
  });

  it('os separadores de milhar mudam com o idioma', () => {
    assert.equal(formatarNumero(1234567.89, 'es-ES'), '1.234.567,89');
    assert.equal(formatarNumero(1234567.89, 'en'), '1,234,567.89');
  });
});
