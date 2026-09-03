import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

/**
 * O aceite 3 do E04: *"Recuperação e MFA funcionam no ambiente de teste e
 * encerram sessões conforme a política registada."*
 *
 * Na primeira entrega do E04 isto ficou por demonstrar e eu declarei-o em vez de
 * o afirmar. Declarar é honesto; não é feito. Isto é o feito.
 *
 * ── Duas decisões que decidem se esta prova mede alguma coisa ───────────────
 *
 * **1. O código TOTP é gerado aqui, não pela biblioteca.** Ela tem um
 * `generateTOTP` e usá-lo seria mais curto — e não provaria nada: um defeito na
 * implementação partilhada apareceria dos dois lados e cancelava-se, com o
 * verificador a aceitar alegremente o que o gerador dele produziu. A
 * implementação abaixo é RFC 6238 escrita do zero contra o `node:crypto`. Se as
 * duas concordarem, concordam por serem ambas a norma.
 *
 * **2. A caixa de correio é LIDA.** Não se verifica que o envio devolveu 200 —
 * verifica-se que a mensagem chegou, abre-se, tira-se a ligação de dentro e
 * usa-se. É a diferença entre "o correio aceitou" e "a pessoa consegue voltar a
 * entrar", e já paguei essa diferença noutro produto.
 */

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3012';
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';
const SENHA = 'uma-senha-bem-comprida-para-provas-123';
const SENHA_NOVA = 'outra-senha-igualmente-comprida-456';
const marca = Date.now();

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Publica com paciência para o travão de abuso.
 *
 * O 429 apanha os passos do segundo factor tal como apanhava o registo. **Não se
 * desliga o travão para a prova passar** — foi a decisão do E04 e mantém-se:
 * desligar uma protecção para chegar ao verde é apagar um requisito. Espera-se.
 */
async function publicar(caminho: string, cabecalhos: HeadersInit, corpo: unknown): Promise<Response> {
  let r: Response | undefined;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    r = await fetch(`${BASE}${caminho}`, {
      method: 'POST', headers: cabecalhos, body: JSON.stringify(corpo),
    });
    if (r.status !== 429) break;
    await dormir(11_000);
  }
  return r!;
}
const mutacao = (extra: Record<string, string> = {}): HeadersInit => ({
  'content-type': 'application/json', origin: BASE, ...extra,
});
const bolachas = (r: Response) =>
  (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');

/**
 * Lê o corpo UMA vez.
 *
 * `assert.ok(r.ok, `... ${await r.text()}`)` parece inofensivo e não é: a
 * mensagem é construída mesmo quando a asserção passa, o corpo fica consumido e
 * o `r.json()` seguinte rebenta com "Body has already been read". Apanhei-o a
 * correr, e o sintoma foi sete asserções vermelhas por uma causa que não tinha
 * nada a ver com autenticação.
 */
async function ler(r: Response): Promise<{ ok: boolean; status: number; texto: string; dados: Record<string, unknown> }> {
  const texto = await r.text();
  let dados: Record<string, unknown> = {};
  try {
    const cru: unknown = JSON.parse(texto);
    // `get-session` sem sessão devolve o literal `null`, e `null.user` rebenta.
    if (cru && typeof cru === 'object') dados = cru as Record<string, unknown>;
  } catch { /* corpo não-JSON */ }
  return { ok: r.ok, status: r.status, texto, dados };
}

// ── RFC 6238, implementação independente ────────────────────────────────────

function base32ParaBytes(s: string): Buffer {
  const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, acumulador = 0;
  const saida: number[] = [];
  for (const caractere of s.replace(/=+$/, '').toUpperCase()) {
    const i = ALFABETO.indexOf(caractere);
    if (i < 0) continue;
    acumulador = (acumulador << 5) | i;
    bits += 5;
    if (bits >= 8) {
      saida.push((acumulador >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(saida);
}

interface ParametrosTotp { segredo: string; digitos: number; passo: number; algoritmo: string }

/** Lê o `otpauth://` que a biblioteca dá e não assume os valores por omissão. */
function lerTotpURI(uri: string): ParametrosTotp {
  const u = new URL(uri);
  const segredo = u.searchParams.get('secret');
  assert.ok(segredo, `o totpURI não traz segredo: ${uri}`);
  return {
    segredo,
    digitos: Number(u.searchParams.get('digits') ?? 6),
    passo: Number(u.searchParams.get('period') ?? 30),
    algoritmo: (u.searchParams.get('algorithm') ?? 'SHA1').toLowerCase(),
  };
}

function codigoTotp(p: ParametrosTotp, quando = Date.now()): string {
  const contador = Math.floor(quando / 1000 / p.passo);
  const bloco = Buffer.alloc(8);
  bloco.writeBigUInt64BE(BigInt(contador));
  const h = createHmac(p.algoritmo, base32ParaBytes(p.segredo)).update(bloco).digest();
  const desvio = h[h.length - 1]! & 0x0f;
  const truncado =
    ((h[desvio]! & 0x7f) << 24) | (h[desvio + 1]! << 16) | (h[desvio + 2]! << 8) | h[desvio + 3]!;
  return String(truncado % 10 ** p.digitos).padStart(p.digitos, '0');
}

// ── Mailpit ─────────────────────────────────────────────────────────────────

interface Mensagem { ID: string; Subject: string }

async function mailpitVivo(): Promise<boolean> {
  try {
    return (await fetch(`${MAILPIT}/api/v1/info`)).ok;
  } catch {
    return false;
  }
}

/**
 * A caixa é ESVAZIADA antes de cada pedido de recuperação.
 *
 * Sem isto, uma execução anterior deixa lá uma mensagem para o mesmo endereço e
 * a prova lê o token velho: fica verde a usar uma ligação que já existia antes
 * de ela correr. É a mesma armadilha da população zero, ao contrário — medir uma
 * coisa que veio de outro lado.
 */
async function esvaziarCaixa(): Promise<void> {
  const r = await fetch(`${MAILPIT}/api/v1/messages`, { method: 'DELETE' });
  assert.ok(r.ok, `não foi possível esvaziar a caixa do Mailpit: ${r.status}`);
}

async function esperarMensagem(para: string, segundos = 20): Promise<string> {
  for (let i = 0; i < segundos * 4; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${para}`)}`);
    if (r.ok) {
      const { messages } = (await r.json()) as { messages?: Mensagem[] };
      if (messages?.length) {
        const corpo = await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
        assert.ok(corpo.ok, `mensagem listada mas não legível: ${corpo.status}`);
        const { Text } = (await corpo.json()) as { Text: string };
        return Text;
      }
    }
    await dormir(250);
  }
  assert.fail(`nenhuma mensagem para ${para} em ${segundos}s — a recuperação não saiu`);
}

// ── Contas ──────────────────────────────────────────────────────────────────

async function registar(email: string): Promise<string> {
  let r: Response | undefined;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    r = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: 'POST', headers: mutacao(),
      body: JSON.stringify({ email, password: SENHA, name: email.split('@')[0] }),
    });
    if (r.status !== 429) break;
    await dormir(11_000);
  }
  const bolacha = bolachas(r!);
  const lido = await ler(r!);
  assert.ok(lido.ok, `registo de ${email} falhou: ${lido.status} ${lido.texto}`);
  return bolacha;
}

async function entrar(email: string, senha: string) {
  let r: Response | undefined;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    r = await fetch(`${BASE}/api/auth/sign-in/email`, {
      method: 'POST', headers: mutacao(), body: JSON.stringify({ email, password: senha }),
    });
    if (r!.status !== 429) break;
    await dormir(11_000);
  }
  const cookie = bolachas(r!);
  const lido = await ler(r!);
  return { resposta: r!, corpo: lido.dados, cookie };
}

async function sessaoValida(cookie: string): Promise<boolean> {
  const r = await fetch(`${BASE}/api/auth/get-session`, { headers: { cookie } });
  if (!r.ok) return false;
  return Boolean((await ler(r)).dados.user);
}

const contaMfa = `mfa-${marca}@exemplo.example`;
const contaReset = `reset-${marca}@exemplo.example`;

before(async () => {
  // Uma prova que salta quando falta a infraestrutura é uma prova que diz verde
  // no dia em que a infraestrutura não está lá. Falha alto.
  assert.ok(
    await mailpitVivo(),
    `Mailpit em baixo em ${MAILPIT}. Esta prova LÊ a caixa; sem ela não há nada a medir.`,
  );
});

describe('1. Segundo factor, ponta a ponta', () => {
  let cookie = '';
  let parametros: ParametrosTotp;
  let codigosDeReserva: string[] = [];

  before(async () => { cookie = await registar(contaMfa); });

  it('activar devolve um segredo TOTP e códigos de reserva', async () => {
    const r = await publicar('/api/auth/two-factor/enable', mutacao({ cookie }), { password: SENHA });
    const { ok, status, texto, dados } = await ler(r);
    assert.ok(ok, `enable falhou: ${status} ${texto}`);
    const corpo = dados as { totpURI?: string; backupCodes?: string[] };
    assert.ok(corpo.totpURI, 'sem totpURI não há nada para pôr na aplicação autenticadora');
    parametros = lerTotpURI(corpo.totpURI);
    codigosDeReserva = corpo.backupCodes ?? [];
    assert.ok(codigosDeReserva.length > 0, 'sem códigos de reserva, perder o telemóvel é perder a conta');
  });

  it('um código GERADO AQUI é aceite — as duas implementações concordam', async () => {
    const r = await publicar('/api/auth/two-factor/verify-totp', mutacao({ cookie }), { code: codigoTotp(parametros) });
    const lido = await ler(r);
    assert.ok(lido.ok, `código válido recusado: ${lido.status} ${lido.texto}`);
  });

  it('um código ERRADO é recusado — sem isto, "aceita" não distingue nada', async () => {
    // O par. Sem este caso, um verificador que devolvesse 200 a tudo passava no
    // caso de cima e a conta ficava com um segundo factor decorativo.
    const certo = codigoTotp(parametros);
    const errado = String((Number(certo) + 1) % 10 ** parametros.digitos).padStart(parametros.digitos, '0');
    const r = await publicar('/api/auth/two-factor/verify-totp', mutacao({ cookie }), { code: errado });
    assert.equal(r.ok, false, 'um código errado foi ACEITE — o segundo factor não protege nada');
  });

  it('um código de uma janela ANTIGA é recusado', async () => {
    // Dez minutos atrás. Um verificador com janela infinita aceita qualquer
    // código alguma vez válido, e um código antigo é o que fica no ombro de
    // quem passa, na fotografia, no registo de um teclado.
    const antigo = codigoTotp(parametros, Date.now() - 10 * 60 * 1000);
    const r = await publicar('/api/auth/two-factor/verify-totp', mutacao({ cookie }), { code: antigo });
    assert.equal(r.ok, false, 'um código de há dez minutos foi aceite — a janela não fecha');
  });

  it('com MFA activo, a senha sozinha JÁ NÃO ENTRA', async () => {
    // É esta que prova que activar serviu para alguma coisa. As três de cima
    // passariam todas com o segundo factor guardado e nunca exigido.
    const { corpo, cookie: temporaria } = await entrar(contaMfa, SENHA);
    assert.equal(corpo.twoFactorRedirect, true, `entrou sem segundo factor: ${JSON.stringify(corpo)}`);
    assert.equal(await sessaoValida(temporaria), false, 'a bolacha do primeiro passo já dá sessão');
  });

  it('a entrada completa-se com o código, e aí sim há sessão', async () => {
    const { cookie: temporaria } = await entrar(contaMfa, SENHA);
    const r = await publicar('/api/auth/two-factor/verify-totp', mutacao({ cookie: temporaria }), { code: codigoTotp(parametros) });
    const lido = await ler(r);
    assert.ok(lido.ok, `segundo passo falhou: ${lido.status} ${lido.texto}`);
    assert.equal(await sessaoValida(bolachas(r)), true, 'passou os dois passos e não tem sessão');
  });

  it('um código de reserva serve UMA vez e a segunda é recusada', async () => {
    const { cookie: temporaria } = await entrar(contaMfa, SENHA);
    const codigo = codigosDeReserva[0]!;
    const primeira = await publicar('/api/auth/two-factor/verify-backup-code', mutacao({ cookie: temporaria }), { code: codigo });
    assert.ok(primeira.ok, `código de reserva recusado à primeira: ${primeira.status}`);

    const { cookie: outra } = await entrar(contaMfa, SENHA);
    const segunda = await publicar('/api/auth/two-factor/verify-backup-code', mutacao({ cookie: outra }), { code: codigo });
    assert.equal(segunda.ok, false, 'o mesmo código de reserva funcionou duas vezes');
  });
});

describe('2. Recuperação de acesso, com a caixa lida', () => {
  let cookieAntigo = '';
  let ligacao = '';
  let token = '';

  before(async () => {
    cookieAntigo = await registar(contaReset);
    assert.equal(await sessaoValida(cookieAntigo), true, 'a sessão de partida tem de estar viva');
    await esvaziarCaixa();
  });

  it('pedir recuperação faz chegar uma mensagem com uma ligação', async () => {
    const r = await fetch(`${BASE}/api/auth/request-password-reset`, {
      method: 'POST', headers: mutacao(),
      body: JSON.stringify({ email: contaReset, redirectTo: `${BASE}/es/auth/reset` }),
    });
    const lido = await ler(r);
    assert.ok(lido.ok, `pedido recusado: ${lido.status} ${lido.texto}`);

    const texto = await esperarMensagem(contaReset);
    const encontrada = texto.match(/https?:\/\/\S+/);
    assert.ok(encontrada, `a mensagem chegou sem ligação nenhuma:\n${texto}`);
    ligacao = encontrada[0].replace(/[).,]+$/, '');
    token = new URL(ligacao).pathname.split('/').pop() ?? '';
    assert.ok(token.length > 10, `sem token utilizável na ligação: ${ligacao}`);
  });

  it('um token inventado é recusado', async () => {
    // O par outra vez. Sem ele, um `reset-password` que ignorasse o token
    // passava no caso seguinte e qualquer pessoa mudava a senha de qualquer um.
    const r = await fetch(`${BASE}/api/auth/reset-password`, {
      method: 'POST', headers: mutacao(),
      body: JSON.stringify({ newPassword: SENHA_NOVA, token: 'nao-e-um-token-de-lado-nenhum' }),
    });
    assert.equal(r.ok, false, 'um token inventado foi aceite');
  });

  it('o token da caixa muda a senha', async () => {
    const r = await fetch(`${BASE}/api/auth/reset-password`, {
      method: 'POST', headers: mutacao(), body: JSON.stringify({ newPassword: SENHA_NOVA, token }),
    });
    const lido = await ler(r);
    assert.ok(lido.ok, `token real recusado: ${lido.status} ${lido.texto}`);
  });

  it('a senha NOVA entra e a ANTIGA já não', async () => {
    assert.equal((await entrar(contaReset, SENHA_NOVA)).resposta.ok, true, 'a senha nova não entra');
    assert.equal((await entrar(contaReset, SENHA)).resposta.ok, false, 'a senha antiga continua a entrar');
  });

  it('as sessões que JÁ EXISTIAM foram encerradas', async () => {
    // Este é o "e encerram sessões conforme a política registada" do aceite 3.
    // Quem recupera o acesso está a responder a uma suspeita; trocar a senha e
    // deixar a sessão do outro lado viva resolve nada de forma convincente.
    assert.equal(
      await sessaoValida(cookieAntigo), false,
      'a sessão anterior à recuperação continua viva — mudar a senha não expulsou ninguém',
    );
  });

  it('o mesmo token não serve uma segunda vez', async () => {
    const r = await fetch(`${BASE}/api/auth/reset-password`, {
      method: 'POST', headers: mutacao(),
      body: JSON.stringify({ newPassword: 'terceira-senha-comprida-789', token }),
    });
    assert.equal(r.ok, false, 'a ligação de recuperação é reutilizável');
  });
});
