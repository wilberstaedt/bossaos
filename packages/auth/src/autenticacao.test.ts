import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAutenticacao } from './autenticacao.ts';
import { correioDeMemoria } from './correio.ts';

/**
 * A configuração da autenticação, medida.
 *
 * Nada aqui exercita a biblioteca — isso é a prova por HTTP. O que estas
 * asserções guardam são as **decisões de segurança que hoje só existem em
 * comentários**. Um comentário a explicar porque é que a cache de sessão não
 * está ligada não impede ninguém de a ligar; o `revogacao.ts` diz isso mesmo,
 * por extenso: *"o dia em que alguém activar a cache para melhorar a latência é
 * o dia em que isto deixa de ser verdade sem nada ficar vermelho"*.
 *
 * Isto é esse vermelho.
 */
function montar(extra: Partial<Parameters<typeof criarAutenticacao>[0]> = {}) {
  // Uma URL sintáctica basta: o cliente do Prisma não liga na construção, e
  // nenhuma destas asserções toca na base.
  return criarAutenticacao({
    authDatabaseUrl: 'postgresql://ninguem:nada@127.0.0.1:1/inexistente',
    segredo: 'a'.repeat(32),
    urlBase: 'http://127.0.0.1:3000',
    correio: correioDeMemoria(),
    ...extra,
  });
}

test('a cache de sessão em cookie NÃO está ligada — é o que faz a revogação valer', () => {
  const s = montar().options.session as Record<string, unknown> | undefined;
  const cache = s?.cookieCache as { enabled?: boolean } | undefined;
  assert.ok(
    cache === undefined || cache.enabled !== true,
    'cookieCache ligada: a sessão sobrevive à revogação durante o tempo da cache, ' +
      'e é nesse intervalo que quem foi despedido ainda fecha a caixa',
  );
});

test('recuperar a senha encerra as sessões que já existiam', () => {
  // O aceite 3 do E04 diz "e encerram sessões conforme a política registada".
  // A política está escrita no `revogacao.ts` desde o primeiro dia; esteve uma
  // etapa inteira sem estar ligada, e ninguém ficou vermelho por isso.
  const e = montar().options.emailAndPassword as Record<string, unknown>;
  assert.equal(e.revokeSessionsOnPasswordReset, true);
});

test('a sessão dura sete dias e renova-se a um dia do fim', () => {
  const s = montar().options.session as { expiresIn?: number; updateAge?: number };
  assert.equal(s.expiresIn, 60 * 60 * 24 * 7);
  assert.equal(s.updateAge, 60 * 60 * 24);
  // E é configuração, não constante: quem opera muda sem tocar em código.
  assert.equal(montar({ duracaoDaSessaoSegundos: 3600 }).options.session?.expiresIn, 3600);
});

test('o segundo factor está montado, e para toda a gente', () => {
  // Decisão registada: MFA não é uma capacidade que se venda por escalão. Se
  // alguém a mover para o motor de planos do E05, esta asserção cai.
  assert.ok(montar().options.plugins?.some((p) => p.id === 'two-factor'));
});

test('a coluna de nome é a do E03 — não há uma segunda tabela de pessoas', () => {
  assert.equal((montar().options.user?.fields as Record<string, string>)?.name, 'nome');
});

test('os identificadores vêm da base, que é quem tem as colunas `uuid`', () => {
  assert.equal(montar().options.advanced?.database?.generateId, false);
});

test('o email de recuperação leva a ligação no corpo e NUNCA no assunto', async () => {
  const correio = correioDeMemoria();
  const auth = montar({ correio });
  const enviar = auth.options.emailAndPassword?.sendResetPassword;
  assert.ok(enviar, 'sem `sendResetPassword` não há recuperação nenhuma');

  const url = 'http://127.0.0.1:3000/api/auth/reset-password/TOKEN-SECRETO-123';
  await enviar({ user: { email: 'ana@exemplo.test' }, url, token: 'TOKEN-SECRETO-123' } as never);

  assert.equal(correio.enviadas.length, 1);
  const m = correio.enviadas[0];
  assert.ok(m, 'a mensagem foi contada e não existe');
  assert.equal(m.para, 'ana@exemplo.test');
  assert.ok(m.texto.includes(url), 'sem a ligação no corpo, o email não recupera nada');
  // O assunto viaja em sítios onde o corpo não viaja: listas de notificação,
  // pré-visualizações no telemóvel, registos de servidores de correio.
  assert.ok(!m.assunto.includes('TOKEN-SECRETO-123'), 'o token não pode ir no assunto');
});
