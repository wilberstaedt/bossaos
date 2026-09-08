import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { IDS } from '../packages/db/prisma/fixtures.ts';
import { autenticacaoDeProva, criarContaDeProva } from './conta-de-prova.ts';

/**
 * A prova do E04.
 *
 * O alvo está em `docs/architecture/autenticacao-e-convites.md`, escrito no E00
 * antes desta etapa. Corre contra a aplicação CONSTRUÍDA, por HTTP, com sessões
 * a sério — cookies emitidos pela biblioteca, não simulados.
 *
 * ── O que a decide ──────────────────────────────────────────────────────────
 *
 * O par. Nunca um caso sozinho:
 *
 *   1. o identificador de B, com sessão de A → **ausência**
 *   2. o **mesmo** identificador, com sessão de B → **200**
 *
 * Só (1) passaria num sistema em que tudo devolve ausência — a mesma armadilha
 * do caso 3 da prova de isolamento. A prova é a DIFERENÇA entre os dois.
 */

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3011';
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!MIG) throw new Error('MIGRATION_DATABASE_URL em falta');

const SENHA = 'uma-senha-bem-comprida-para-provas-123';
const auth = autenticacaoDeProva();
const marca = Date.now();

/**
 * Seis contas, e nem uma a mais.
 *
 * Cada registo custa uma janela do limitador de abuso — que está ligado de
 * propósito. A primeira versão desta prova criava dez pessoas e demorava mais
 * de dez minutos a arrancar. Seis dizem o mesmo.
 */
const CONTAS = {
  donaA: `dona-a-${marca}@exemplo.example`,
  donoB: `dono-b-${marca}@exemplo.example`,
  anfitria: `anfitria-a-${marca}@exemplo.example`,
  convidada: `convidada-${marca}@exemplo.example`,
  intrusa: `intrusa-${marca}@exemplo.example`,
  demitida: `demitida-${marca}@exemplo.example`,
};

let sql: Client;
const cookies = new Map<string, string>();
const ids = new Map<string, string>();

/**
 * Cabeçalhos de uma mutação.
 *
 * O `origin` é obrigatório e isso apareceu a correr: a biblioteca recusa
 * mutações sem ele com `MISSING_OR_NULL_ORIGIN`. É a validação de origem que o
 * contrato pede para as mutações autenticadas, e está a funcionar — o meu teste
 * é que não a enviava. Fica com um caso próprio, mais abaixo.
 */
function mutacao(extra: Record<string, string> = {}): HeadersInit {
  return { 'content-type': 'application/json', origin: BASE, ...extra };
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Regista uma conta, com paciência para a protecção contra abuso.
 *
 * O 429 apareceu a correr, ao quarto registo seguido: é a protecção contra abuso
 * na autenticação, e é suposto estar lá. **Não a desliguei para a prova passar**
 * — isso teria sido apagar um requisito para chegar ao verde. O arranque espera;
 * e a protecção tem um caso próprio que a mede, mais abaixo.
 */
async function registar(email: string): Promise<string> {
    // ── A conta nasce POR DENTRO; a sessão continua a vir da porta ──────
    //
    // Isto pedia a rota de registo, que fechou a 07/09 às 22h37. Como o
    // email é carimbado, nunca existia antes — logo nunca havia entrada
    // possível e a prova ia SEMPRE ao registo. Partiu-se inteira, e ninguém
    // deu por isso porque o portão só corre `validar-*.sh`.
    //
    // **O carimbo fica**: é ele que isola uma corrida da seguinte. O que sai
    // é o registo, que esta prova nem precisava — ela tem cliente `pg`.
    //
    // A entrada continua a ser a REAL: é isso que impede a cura de ser um
    // cookie forjado.
    await criarContaDeProva(auth, email, SENHA);
  let r: Response | undefined;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    r = await fetch(`${BASE}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: mutacao(),
      body: JSON.stringify({ email, password: SENHA }),
    });
    if (r.status !== 429) break;
    // Espera fixa, um pouco acima da janela do limitador. Escalonar tornava o
    // arranque imprevisível e foi o que fez esta prova exceder dez minutos.
    await dormir(11_000);
  }
  assert.ok(r?.ok, `entrada de ${email} falhou: ${r?.status} ${await r?.text()}`);
  const cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  cookies.set(email, cookie);

  const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [email]);
  ids.set(email, rows[0].id);
  return rows[0].id;
}

function como(email: string): HeadersInit {
  return { cookie: cookies.get(email) ?? '', 'content-type': 'application/json', origin: BASE };
}

/** Dá uma pertença e um papel, por SQL — o caminho de gestão é testado à parte. */
async function darPapel(email: string, organizationId: string, papel: string) {
  const userId = ids.get(email)!;
  const { rows } = await sql.query(
    `INSERT INTO memberships (id, organization_id, user_id, estado, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'ACTIVO', now())
     ON CONFLICT (organization_id, user_id) DO UPDATE SET estado='ACTIVO', updated_at=now()
     RETURNING id`,
    [organizationId, userId],
  );
  await sql.query(
    `INSERT INTO role_assignments (id, organization_id, membership_id, papel, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, now())`,
    [organizationId, rows[0].id, papel],
  );
  return rows[0].id as string;
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();

  for (const email of Object.values(CONTAS)) await registar(email);

  await darPapel(CONTAS.donaA, IDS.orgA, 'OWNER');
  await darPapel(CONTAS.donoB, IDS.orgB, 'OWNER');
  await darPapel(CONTAS.anfitria, IDS.orgA, 'HOST');
  // A intrusa não é membro de nada. É o que dá sentido a "ausência".
});

after(async () => {
  // Limpa só o que esta corrida criou. As fixtures ficam intactas.
  // Ordem importa: `invitations.convidado_por_id` aponta para `users`. Apagar a
  // pessoa antes dos convites dela viola a chave estrangeira — e a chave está
  // certa: quem convidou faz parte do rasto.
  await sql.query("DELETE FROM invitations WHERE email LIKE '%@exemplo.example'");
  for (const email of Object.values(CONTAS)) {
    const id = ids.get(email);
    if (!id) continue;
    await sql.query('DELETE FROM invitations WHERE convidado_por_id = $1', [id]);
    await sql.query('DELETE FROM role_assignments WHERE membership_id IN (SELECT id FROM memberships WHERE user_id = $1)', [id]);
    await sql.query('DELETE FROM memberships WHERE user_id = $1', [id]);
    await sql.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    await sql.query('DELETE FROM accounts WHERE user_id = $1', [id]);
    await sql.query('DELETE FROM users WHERE id = $1', [id]);
  }
  await sql.end();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('O PAR — ausência e presença, com o MESMO identificador', () => {
  it('1. a marca de B, com sessão de A → ausência (404)', async () => {
    const r = await fetch(`${BASE}/api/org/marina-oropesa/marcas/${IDS.marcaB}`, {
      headers: como(CONTAS.donaA),
    });
    assert.equal(r.status, 404);
    const corpo = await r.json();
    assert.equal(corpo.erro, 'nao_encontrado');
    // O corpo não nomeia o recurso: um 404 que diga "marca 3f2a… não
    // encontrada" confirma o formato do identificador e convida ao seguinte.
    assert.ok(!JSON.stringify(corpo).includes(IDS.marcaB));
  });

  it('2. a MESMA marca, com sessão de B → 200', async () => {
    // É este que dá sentido ao anterior. Sem ele, um sistema em que tudo
    // devolve ausência passava no primeiro e ninguém dava por isso.
    const r = await fetch(`${BASE}/api/org/marina-barcelona/marcas/${IDS.marcaB}`, {
      headers: como(CONTAS.donoB),
    });
    assert.equal(r.status, 200);
    const corpo = await r.json();
    assert.equal(corpo.id, IDS.marcaB);
  });

  it('e a diferença está medida, não assumida', async () => {
    const comoA = await fetch(`${BASE}/api/org/marina-oropesa/marcas/${IDS.marcaB}`, { headers: como(CONTAS.donaA) });
    const comoB = await fetch(`${BASE}/api/org/marina-barcelona/marcas/${IDS.marcaB}`, { headers: como(CONTAS.donoB) });
    assert.notEqual(comoA.status, comoB.status);
    assert.deepEqual([comoA.status, comoB.status], [404, 200]);
  });

  it('pedir a organização de outro dá a MESMA ausência que uma que não existe', async () => {
    // Indistinguíveis de propósito: quem sonda endereços não pode usar a
    // diferença entre "não existe" e "existe e não é tua".
    const alheia = await fetch(`${BASE}/api/org/marina-barcelona/marcas/${IDS.marcaB}`, { headers: como(CONTAS.donaA) });
    const inexistente = await fetch(`${BASE}/api/org/nao-existe-de-todo/marcas/${IDS.marcaB}`, { headers: como(CONTAS.donaA) });
    assert.equal(alheia.status, 404);
    assert.equal(inexistente.status, 404);
    assert.deepEqual(await alheia.json(), await inexistente.json());
  });

  it('sem sessão nenhuma é 401, e não 404 — são perguntas diferentes', async () => {
    const r = await fetch(`${BASE}/api/org/marina-oropesa/marcas/${IDS.marcaA}`);
    assert.equal(r.status, 401);
  });

  it('uma mutação sem Origin é recusada — protecção contra pedido forjado', async () => {
    // Descoberto a correr: a primeira versão desta prova não enviava `origin` e
    // todos os registos falharam com MISSING_OR_NULL_ORIGIN. Era a biblioteca a
    // fazer o que devia. Fica medido em vez de contornado.
    // A espera é a mesma do arranque, e a razão mudou hoje: as contas passaram a
    // nascer por dentro e a ENTRAR pela porta, portanto todo o tráfego de
    // autenticação desta prova concentrou-se numa rota que aceita **3 pedidos
    // por 10 segundos**. Este caso chegava com a janela saturada e recebia 429 —
    // que não é «recusado por falta de Origin», é outra pergunta.
    //
    // Espera-se a janela em vez de aceitar o 429: um teste que aceitasse os dois
    // códigos deixava de saber qual deles mediu.
    let r: Response | undefined;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      r = await fetch(`${BASE}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: CONTAS.donaA, password: SENHA }),
      });
      if (r.status !== 429) break;
      await dormir(11_000);
    }
    assert.equal(r?.status, 403);
    assert.match(await r!.text(), /ORIGIN/i);
  });

  it('a autenticação trava o abuso — vinte tentativas seguidas dão 429', async () => {
    // A protecção existe e é ela que obriga o arranque desta prova a ter
    // paciência. Fica medida, e não contornada: se alguém a desligar para
    // "acelerar os testes", este caso fica vermelho e diz porquê.
    const estados: number[] = [];
    for (let i = 0; i < 20; i++) {
      const r = await fetch(`${BASE}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: mutacao(),
        body: JSON.stringify({ email: `abuso-${marca}@exemplo.example`, password: 'errada' }),
      });
      estados.push(r.status);
      if (r.status === 429) break;
    }
    assert.ok(estados.includes(429), `nenhuma tentativa foi travada: ${estados.join(',')}`);
  });

  it('quem não é membro de lado nenhum vê ausência, não permissão', async () => {
    const r = await fetch(`${BASE}/api/org/marina-oropesa/marcas/${IDS.marcaA}`, {
      headers: como(CONTAS.intrusa),
    });
    assert.equal(r.status, 404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('recurso PRÓPRIO sem direito → falta de permissão, não ausência', () => {
  it('a anfitriã não lê o financeiro da sua própria organização (403)', async () => {
    const r = await fetch(`${BASE}/api/org/marina-oropesa/financeiro`, { headers: como(CONTAS.anfitria) });
    assert.equal(r.status, 403);
    const corpo = await r.json();
    assert.equal(corpo.erro, 'sem_permissao');
    assert.equal(corpo.accao, 'financeiro.ler');
  });

  it('a dona lê — é o par outra vez, noutra dimensão', async () => {
    const r = await fetch(`${BASE}/api/org/marina-oropesa/financeiro`, { headers: como(CONTAS.donaA) });
    assert.equal(r.status, 200);
  });

  it('a anfitriã LÊ o catálogo: 403 no financeiro não é 403 em tudo', async () => {
    // Sem isto, uma sessão simplesmente partida daria 403 em todo o lado e o
    // teste acima passava por vácuo.
    const r = await fetch(`${BASE}/api/org/marina-oropesa/marcas/${IDS.marcaA}`, { headers: como(CONTAS.anfitria) });
    assert.equal(r.status, 200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('convites — o papel vem do CONVITE, nunca do pedido', () => {
  async function convidar(comoQuem: string, org: string, corpo: Record<string, unknown>) {
    return fetch(`${BASE}/api/org/${org}/convites`, {
      method: 'POST',
      headers: como(comoQuem),
      body: JSON.stringify(corpo),
    });
  }

  it('aceitar a pedir OWNER no corpo dá o papel do convite, e não o pedido', async () => {
    // O defeito mais banal desta área e o mais caro. Aqui o corpo pede `OWNER`
    // de todas as formas que ocorreriam a alguém — e o que fica é `WAITER`.
    const r = await convidar(CONTAS.donaA, 'marina-oropesa', {
      email: CONTAS.convidada,
      papel: 'WAITER',
    });
    assert.equal(r.status, 201);
    const { token } = await r.json();

    const aceite = await fetch(`${BASE}/api/convites/aceitar`, {
      method: 'POST',
      headers: como(CONTAS.convidada),
      body: JSON.stringify({
        token,
        papel: 'OWNER',
        role: 'OWNER',
        Papel: 'OWNER',
        roleAssignment: { papel: 'OWNER' },
      }),
    });
    assert.equal(aceite.status, 200);
    const corpo = await aceite.json();
    assert.equal(corpo.papel, 'WAITER', 'o papel tem de vir do convite');

    // E na base também — a resposta podia mentir e a linha ser outra.
    const { rows } = await sql.query(
      `SELECT ra.papel FROM role_assignments ra
       JOIN memberships m ON m.id = ra.membership_id
       WHERE m.user_id = $1`,
      [ids.get(CONTAS.convidada)],
    );
    assert.deepEqual(rows.map((r2) => r2.papel), ['WAITER']);
  });

  it('o mesmo convite não serve duas vezes', async () => {
    // A convidada já aceitou um convite acima. Aceitar o MESMO token outra vez
    // é o caso; e a contagem de pertenças confirma que não nasceu uma segunda.
    const r = await convidar(CONTAS.donoB, 'marina-barcelona', {
      email: CONTAS.convidada, papel: 'HOST',
    });
    const { token } = await r.json();

    const primeira = await fetch(`${BASE}/api/convites/aceitar`, {
      method: 'POST', headers: como(CONTAS.convidada), body: JSON.stringify({ token }),
    });
    assert.equal(primeira.status, 200);

    const segunda = await fetch(`${BASE}/api/convites/aceitar`, {
      method: 'POST', headers: como(CONTAS.convidada), body: JSON.stringify({ token }),
    });
    assert.equal(segunda.status, 409);
    assert.equal((await segunda.json()).erro, 'ja_usado');

    const { rows } = await sql.query(
      'SELECT count(*)::int AS n FROM memberships WHERE user_id = $1', [ids.get(CONTAS.convidada)],
    );
    assert.equal(rows[0].n, 2, 'uma em A, uma em B — e não três');
  });

  it('um convite reencaminhado a outro email é recusado', async () => {
    const r = await convidar(CONTAS.donaA, 'marina-oropesa', {
      email: `nunca-registada-${marca}@exemplo.example`,
      papel: 'HOST',
    });
    const { token } = await r.json();

    // A intrusa tem o link. Não tem o endereço.
    const tentativa = await fetch(`${BASE}/api/convites/aceitar`, {
      method: 'POST', headers: como(CONTAS.intrusa), body: JSON.stringify({ token }),
    });
    assert.equal(tentativa.status, 409);
    assert.equal((await tentativa.json()).erro, 'email_diferente');
  });

  it('um convite expirado é recusado', async () => {
    const r = await convidar(CONTAS.donaA, 'marina-oropesa', { email: CONTAS.intrusa, papel: 'HOST' });
    const { conviteId, token } = await r.json();
    await sql.query("UPDATE invitations SET expires_at = now() - interval '1 hour' WHERE id = $1", [conviteId]);

    const tentativa = await fetch(`${BASE}/api/convites/aceitar`, {
      method: 'POST', headers: como(CONTAS.intrusa), body: JSON.stringify({ token }),
    });
    assert.equal(tentativa.status, 409);
    assert.equal((await tentativa.json()).erro, 'expirado');
  });

  it('um convite revogado é recusado, mesmo com o email aberto noutro separador', async () => {
    const r = await convidar(CONTAS.donaA, 'marina-oropesa', { email: CONTAS.intrusa, papel: 'HOST' });
    const { conviteId, token } = await r.json();
    await sql.query("UPDATE invitations SET estado='REVOGADO', revoked_at=now() WHERE id=$1", [conviteId]);

    const tentativa = await fetch(`${BASE}/api/convites/aceitar`, {
      method: 'POST', headers: como(CONTAS.intrusa), body: JSON.stringify({ token }),
    });
    assert.equal(tentativa.status, 409);
    assert.equal((await tentativa.json()).erro, 'revogado');
  });

  it('um token inventado dá ausência, sem dizer se algum existe', async () => {
    const tentativa = await fetch(`${BASE}/api/convites/aceitar`, {
      method: 'POST', headers: como(CONTAS.intrusa), body: JSON.stringify({ token: 'inventado-de-todo' }),
    });
    assert.equal(tentativa.status, 404);
  });

  it('o token NÃO fica na base — só o resumo dele', async () => {
    const alvo = `resumo-${marca}@exemplo.example`;
    const r = await convidar(CONTAS.donaA, 'marina-oropesa', { email: alvo, papel: 'HOST' });
    const { token } = await r.json();
    const { rows } = await sql.query('SELECT token_hash FROM invitations WHERE email = $1', [alvo]);
    assert.ok(rows.length === 1);
    assert.notEqual(rows[0].token_hash, token, 'o token em claro não pode estar guardado');
    assert.equal(rows[0].token_hash.length, 64, 'é um SHA-256 em hexadecimal');
  });

  it('quem não pode gerir equipa não convida', async () => {
    const r = await convidar(CONTAS.anfitria, 'marina-oropesa', {
      email: `nao-devia-${marca}@exemplo.example`, papel: 'HOST',
    });
    assert.equal(r.status, 403);
  });

  it('um convite não concede acima do escopo de quem convida', async () => {
    // A anfitriã nem chega aqui (não gere equipa). Prova-se pelo lado do
    // domínio, que é onde a regra vive, e à porta com um caso real: um
    // WAITER-manager não pode fazer um OWNER.
    const { podeConceder } = await import('../packages/domain/src/permissoes.ts');
    assert.ok(!podeConceder([{ papel: 'VENUE_MANAGER' }], { papel: 'OWNER' }));
    assert.ok(podeConceder([{ papel: 'OWNER' }], { papel: 'VENUE_MANAGER' }));
    assert.ok(!podeConceder([{ papel: 'HOST' }], { papel: 'FINANCE' }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('revogação — as sessões que JÁ EXISTEM param', () => {
  it('uma sessão emitida ANTES da revogação deixa de servir ao pedido seguinte', async () => {
    const email = CONTAS.demitida;
    const membershipId = await darPapel(email, IDS.orgA, 'WAITER');

    // A sessão existe e funciona.
    const antes = await fetch(`${BASE}/api/org/marina-oropesa/marcas/${IDS.marcaA}`, { headers: como(email) });
    assert.equal(antes.status, 200, 'antes da revogação entra');

    // Revogar. Não é apagar a pertença: é fazer parar o que já está aberto.
    const revogacao = await fetch(
      `${BASE}/api/org/marina-oropesa/pessoas/${membershipId}/revogar`,
      { method: 'POST', headers: como(CONTAS.donaA), body: JSON.stringify({ motivo: 'fim de contrato' }) },
    );
    assert.equal(revogacao.status, 200);
    const { sessoesFechadas } = await revogacao.json();
    assert.ok(sessoesFechadas >= 1, 'tem de fechar pelo menos a sessão que estava aberta');

    // O MESMO cookie, o pedido seguinte. Sem limpar nada, sem esperar.
    const depois = await fetch(`${BASE}/api/org/marina-oropesa/marcas/${IDS.marcaA}`, { headers: como(email) });
    assert.equal(depois.status, 401, 'a sessão anterior tem de deixar de servir');
  });

  it('a pertença fica REVOGADA e não apagada — o histórico é obrigação', async () => {
    const { rows } = await sql.query(
      `SELECT m.estado FROM memberships m JOIN users u ON u.id = m.user_id WHERE u.email = $1`,
      [`${CONTAS.demitida}`],
    );
    assert.equal(rows.length, 1, 'a linha continua lá');
    assert.equal(rows[0].estado, 'REVOGADO');
  });

  it('a revogação fica no rasto, com actor e motivo', async () => {
    const { rows } = await sql.query(
      `SELECT accao, actor_email, motivo FROM audit_events
       WHERE accao = 'acesso.revogado' ORDER BY created_at DESC LIMIT 1`,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].actor_email, CONTAS.donaA);
    assert.equal(rows[0].motivo, 'fim de contrato');
  });

  it('o último owner não se revoga a si próprio', async () => {
    // Escrevi este teste a assumir que a dona era a única `OWNER` e ele deu 200.
    // Não era defeito do produto: as fixtures já trazem uma dona, e com DUAS a
    // protecção não tem porque disparar — e não disparou, correctamente.
    //
    // Para medir a regra é preciso que haja mesmo uma só. Suspende-se a outra
    // primeiro, e aí sim.
    const { rows: outros } = await sql.query(
      `SELECT m.id FROM memberships m
       JOIN role_assignments ra ON ra.membership_id = m.id
       JOIN users u ON u.id = m.user_id
       WHERE ra.papel = 'OWNER' AND m.organization_id = $1 AND u.email <> $2 AND m.estado = 'ACTIVO'`,
      [IDS.orgA, CONTAS.donaA],
    );
    for (const o of outros) {
      await sql.query("UPDATE memberships SET estado='SUSPENSO' WHERE id=$1", [o.id]);
    }

    const { rows } = await sql.query(
      `SELECT m.id FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE u.email = $1`, [CONTAS.donaA],
    );
    const r = await fetch(`${BASE}/api/org/marina-oropesa/pessoas/${rows[0].id}/revogar`, {
      method: 'POST', headers: como(CONTAS.donaA), body: JSON.stringify({ motivo: 'engano' }),
    });

    // Repor antes de asseverar, para uma falha não deixar as fixtures partidas.
    for (const o of outros) {
      await sql.query("UPDATE memberships SET estado='ACTIVO' WHERE id=$1", [o.id]);
    }

    assert.equal(r.status, 409);
    assert.equal((await r.json()).erro, 'ultimo_owner');
  });
});
