import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPOS_DE_PAGINA, CAMPOS_DE_POST, CAMPOS_DE_SITE,
  ligacaoSocialValida, novidadeDoSite, paginaDoSite, projectarSite,
  type RascunhoDeSite,
} from './site.ts';

/**
 * A projecção do site. Mede-se o que SAI, não o que se pretendia que saísse.
 */

function rascunho(sobre: Partial<RascunhoDeSite> = {}): RascunhoDeSite {
  return {
    seoTitulo: 'La Societat 1927',
    seoDescricao: 'Cocina de mercado en Oropesa',
    redes: [{ rede: 'instagram', url: 'https://instagram.com/lasocietat' }],
    paginas: [
      { tipo: 'INICIO', visivel: true, titulo: 'Bienvenidos', corpo: 'Texto', contacto: null },
      { tipo: 'SOBRE', visivel: false, titulo: 'SEGREDO EM RASCUNHO', corpo: 'x', contacto: null },
      {
        tipo: 'CONTACTO', visivel: true, titulo: 'Contacto', corpo: null,
        contacto: { morada: 'Calle Mayor 1', telefone: '+34 900 000 000', email: 'ola@x.example' },
      },
    ],
    posts: [
      {
        slug: 'noite-de-vinhos', titulo: 'Noche de vinos', resumo: 'r', corpo: 'c',
        publicadoEm: new Date('2026-08-01T20:00:00Z'), visivel: true,
      },
      {
        slug: 'rascunho-secreto', titulo: 'NAO PUBLICADO', resumo: null, corpo: null,
        publicadoEm: null, visivel: false,
      },
    ],
    ...sobre,
  };
}

describe('a projecção do site é uma lista de PERMISSÃO', () => {
  it('só saem os campos escritos, e nenhum a mais', () => {
    const p = projectarSite(rascunho());
    assert.deepEqual(
      Object.keys(p).sort(),
      ['novidades', 'paginas', 'redes', 'seo'].sort(),
    );
    for (const pagina of p.paginas) {
      for (const chave of Object.keys(pagina)) {
        assert.ok(
          (CAMPOS_DE_PAGINA as readonly string[]).includes(chave),
          `a página trouxe um campo não permitido: ${chave}`,
        );
      }
    }
    for (const n of p.novidades) {
      for (const chave of Object.keys(n)) {
        assert.ok(
          (CAMPOS_DE_POST as readonly string[]).includes(chave),
          `a novidade trouxe um campo não permitido: ${chave}`,
        );
      }
    }
  });

  it('um campo NOVO no rascunho não sai sozinho', () => {
    // É a diferença entre lista de permissão e lista de exclusão, e é o defeito
    // que o E22 e o E24 trariam: um campo de custo acrescentado ao rascunho sai
    // para a internet no mesmo dia se a projecção espalhar o objecto.
    const r = rascunho();
    (r.paginas[0] as unknown as Record<string, unknown>).custoInterno = 9999;
    (r.posts[0] as unknown as Record<string, unknown>).notaInterna = 'não mostrar';
    const corpo = JSON.stringify(projectarSite(r));
    assert.ok(!corpo.includes('custoInterno'));
    assert.ok(!corpo.includes('9999'));
    assert.ok(!corpo.includes('notaInterna'));
  });
});

describe('o que está escondido não entra — não entra escondido, não entra de todo', () => {
  it('a página invisível não vai na revisão', () => {
    const p = projectarSite(rascunho());
    assert.equal(paginaDoSite(p, 'SOBRE'), null);
    assert.ok(!JSON.stringify(p).includes('SEGREDO EM RASCUNHO'));
  });

  it('a novidade invisível também não', () => {
    const p = projectarSite(rascunho());
    assert.equal(novidadeDoSite(p, 'rascunho-secreto'), null);
    assert.ok(!JSON.stringify(p).includes('NAO PUBLICADO'));
  });

  it('e o PAR: o que está visível ESTÁ lá', () => {
    // Sem isto, uma projecção que devolvesse tudo vazio passava nos dois casos
    // de cima e o site não servia nada a ninguém.
    const p = projectarSite(rascunho());
    const inicio = paginaDoSite(p, 'INICIO');
    assert.ok(inicio);
    assert.equal(inicio.titulo, 'Bienvenidos');
    const noite = novidadeDoSite(p, 'noite-de-vinhos');
    assert.ok(noite);
    assert.equal(noite.titulo, 'Noche de vinos');
    assert.equal(noite.publicadoEm, '2026-08-01T20:00:00.000Z');
    assert.equal(paginaDoSite(p, 'CONTACTO')?.contacto?.morada, 'Calle Mayor 1');
  });
});

describe('as ligações sociais', () => {
  it('recusam tudo o que não é https, e `javascript:` é o caso que importa', () => {
    // `javascript:alert(1)` é um URL VÁLIDO para o `URL` do Node e para o
    // atributo `href` do navegador. Uma verificação só de forma deixava-o passar,
    // e quem lesse o código a seguir concluía que estava verificado.
    assert.equal(ligacaoSocialValida('instagram', 'javascript:alert(1)'), false);
    assert.equal(ligacaoSocialValida('instagram', 'http://instagram.com/x'), false);
    assert.equal(ligacaoSocialValida('instagram', 'data:text/html,<script>'), false);
    assert.equal(ligacaoSocialValida('instagram', 'nao-e-um-url'), false);
    assert.equal(ligacaoSocialValida('rede-inventada', 'https://x.example'), false);
    // O par: uma ligação legítima passa.
    assert.equal(ligacaoSocialValida('instagram', 'https://instagram.com/x'), true);
  });

  it('e a projecção volta a verificar, porque a base já tem linhas antigas', () => {
    const p = projectarSite(rascunho({
      redes: [
        { rede: 'instagram', url: 'javascript:alert(1)' },
        { rede: 'facebook', url: 'https://facebook.com/x' },
      ],
    }));
    assert.deepEqual(p.redes, [{ rede: 'facebook', url: 'https://facebook.com/x' }]);
  });

  it('e uma lista com lixo lá dentro não rebenta a publicação', () => {
    const p = projectarSite(rascunho({ redes: ['texto solto', null, 42, { rede: 'x' }] }));
    assert.deepEqual(p.redes, []);
  });
});

describe('a ordem das novidades é decidida aqui', () => {
  it('a mais recente primeiro, sempre a mesma para toda a gente', () => {
    // Depender da ordem de chegada da consulta faz duas visitas à mesma página
    // renderem coisas diferentes, e isso não se apanha a olho.
    const p = projectarSite(rascunho({
      posts: [
        { slug: 'a', titulo: 'A', resumo: null, corpo: null, publicadoEm: new Date('2026-01-01T00:00:00Z'), visivel: true },
        { slug: 'c', titulo: 'C', resumo: null, corpo: null, publicadoEm: new Date('2026-06-01T00:00:00Z'), visivel: true },
        { slug: 'b', titulo: 'B', resumo: null, corpo: null, publicadoEm: new Date('2026-03-01T00:00:00Z'), visivel: true },
      ],
    }));
    assert.deepEqual(p.novidades.map((n) => n.slug), ['c', 'b', 'a']);
  });

  it('sem data é `null`, e não a de hoje', () => {
    const p = projectarSite(rascunho({
      posts: [{ slug: 'x', titulo: 'X', resumo: null, corpo: null, publicadoEm: null, visivel: true }],
    }));
    assert.equal(p.novidades[0]?.publicadoEm, null);
  });
});

describe('o contacto vazio é null e não um objecto de nadas', () => {
  it('três campos vazios não fazem um contacto', () => {
    // Um objecto com três `null` faz o ecrã desenhar uma caixa de contacto vazia,
    // que se lê como "este restaurante não tem telefone" em vez de "ninguém
    // preencheu".
    const p = projectarSite(rascunho({
      paginas: [{
        tipo: 'CONTACTO', visivel: true, titulo: 'C', corpo: null,
        contacto: { morada: '', telefone: '   ', email: null },
      }],
    }));
    assert.equal(paginaDoSite(p, 'CONTACTO')?.contacto, null);
  });
});

describe('os campos declarados batem com o que existe', () => {
  it('CAMPOS_DE_SITE não promete campos que a projecção não dá', () => {
    // A constante existe para ser medida. Uma lista que envelhece em silêncio é
    // uma guarda que diz vigiar o que já não vigia.
    const p = projectarSite(rascunho());
    for (const chave of Object.keys(p)) {
      assert.ok(
        (CAMPOS_DE_SITE as readonly string[]).includes(chave),
        `${chave} sai da projecção e não está em CAMPOS_DE_SITE`,
      );
    }
  });
});
