import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolverContexto, type Filiacao } from './tenant.ts';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const ACTOR = 'cccc1111-1111-4111-8111-111111111111';

const FILIACOES: readonly Filiacao[] = [
  { organizationId: ORG_A, organizationSlug: 'marina-oropesa', estado: 'ACTIVO' },
];

describe('resolução de contexto — a URL selecciona, não autentica', () => {
  it('com filiação activa, resolve', () => {
    const r = resolverContexto({ organizationSlug: 'marina-oropesa' }, ACTOR, FILIACOES);
    assert.ok(r.ok);
    assert.equal(r.contexto.organizationId, ORG_A);
    assert.equal(r.contexto.actorId, ACTOR);
  });

  it('sem filiação, recusa por AUSÊNCIA e não por proibição', () => {
    // CT-04: para recurso privado de outro inquilino, ausência sem revelar
    // existência. Dizer "não tens permissão nesta organização" já confirma que
    // ela existe — e isso é informação que não é nossa para dar.
    const r = resolverContexto({ organizationSlug: 'marina-barcelona' }, ACTOR, FILIACOES);
    assert.ok(!r.ok);
    assert.equal(r.recusa.tipo, 'sem_filiacao');
  });

  it('a mesma recusa para uma organização que nem existe', () => {
    // Indistinguível da anterior, de propósito: quem sonda endereços não pode
    // usar a diferença entre "não existe" e "existe mas não é tua".
    const inexistente = resolverContexto({ organizationSlug: 'nao-existe' }, ACTOR, FILIACOES);
    const alheia = resolverContexto({ organizationSlug: 'marina-barcelona' }, ACTOR, FILIACOES);
    assert.deepEqual(inexistente, alheia);
  });

  it('filiação suspensa não resolve, e diz que é outra coisa', () => {
    const suspensa: Filiacao[] = [{ ...FILIACOES[0]!, estado: 'SUSPENSO' }];
    const r = resolverContexto({ organizationSlug: 'marina-oropesa' }, ACTOR, suspensa);
    assert.ok(!r.ok);
    assert.equal(r.recusa.tipo, 'filiacao_inactiva');
    // Aqui pode dizer-se: quem foi suspenso já sabe que a organização existe.
  });

  it('o identificador vem da FILIAÇÃO, nunca do endereço', () => {
    // O teste que dá nome ao ficheiro. Se alguém "optimizar" isto para usar o
    // que veio na URL, o contexto passa a ser escolhido por quem faz o pedido.
    const forjada: Filiacao[] = [
      { organizationId: ORG_A, organizationSlug: 'marina-oropesa', estado: 'ACTIVO' },
    ];
    const r = resolverContexto(
      { organizationSlug: 'marina-oropesa', brandId: 'seja-o-que-for' },
      ACTOR,
      forjada,
    );
    assert.ok(r.ok);
    assert.equal(r.contexto.organizationId, ORG_A);
    assert.notEqual(r.contexto.organizationId, ORG_B);
    // A marca pedida entra como ALVO. Pertencer à organização é a política que
    // garante; poder tocá-la é a porta de autorização, no E04.
    assert.equal(r.contexto.brandId, 'seja-o-que-for');
  });

  it('sem filiações nenhumas, nada resolve', () => {
    const r = resolverContexto({ organizationSlug: 'marina-oropesa' }, ACTOR, []);
    assert.ok(!r.ok);
  });
});
