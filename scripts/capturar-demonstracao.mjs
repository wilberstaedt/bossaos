import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Client } from 'pg';
import {
  CONTA_DA_DEMO, DEMO, SENHA_DA_DEMO, SLUG_DA_DEMO,
} from '../packages/db/prisma/demonstracao-comum.ts';

/**
 * O MOTOR DE PROVA — fotografa o produto a correr sobre o inquilino de
 * demonstração.
 *
 * ── O que o §6.4 pede, e o que isto faz ───────────────────────────────────
 *
 *   «screenshots reais e determinísticos do build»   → corre contra o build de
 *      produção, com o cenário semeado por `semente-demonstracao.ts`, que tem
 *      identificadores fixos.
 *   «dados claramente artificiais»                   → «Bossa Demo», sem
 *      prefixo de arnês e sem endereço de correio de ninguém.
 *   «desktop, tablet, telemóvel e KDS coerentes»     → quatro larguras, a mesma
 *      casa, o mesmo serviço, o mesmo pedido em cima da mesa.
 *   «mostrar uma acção e o seu resultado»            → o pedido A128 aparece na
 *      sala como sessão aberta e na cozinha como as tarefas dele.
 *   «sem blur, perspectiva ou mockup minúsculo»      → captura recta, 1:1, sem
 *      moldura nem transformação.
 *
 * ── A sessão é REAL ───────────────────────────────────────────────────────
 *
 * Regista-se pela porta do produto e a pertença entra por SQL, que é o mesmo
 * que o arnês faz e pela mesma razão: convidar tem prova própria, e forjar um
 * cookie mede o cookie em vez do produto.
 *
 * **Sem `brand_id` no papel**, e isto está documentado no arnês em prosa: uma
 * concessão de MARCA não alcança um recurso da ORGANIZAÇÃO, e o dono leva 404
 * nas rotas da organização. Parece um defeito de produto e é semeadura errada.
 */

const PORTA = process.env.PORTA_DEMO ?? '3018';
const BASE = `http://127.0.0.1:${PORTA}`;
const DESTINO = process.env.DESTINO_CAPTURAS
  ?? 'docs/visual/rv100/2026-09-06_e953a87/evidence/demonstracao';

/**
 * As composições. Cada uma diz **porque existe** — uma captura sem razão é uma
 * captura que ninguém sabe substituir quando o produto mudar.
 */
const COMPOSICOES = [
  {
    nome: 'kds-cozinha',
    porque: 'A superfície que o §6.4 nomeia, e a que tem menos folga: o quadro '
      + 'da cozinha com o pedido A128 em preparação.',
    rota: `/es-ES/kds/${DEMO.unidade}/${DEMO.estacaoQuente}`,
    largura: 1280, altura: 800, sessao: true,
  },
  {
    nome: 'sala-servico',
    porque: 'O outro lado da mesma acção: a mesa 07 aberta, de onde saiu o A128.',
    rota: '/es-ES/app/bossa-demo/sala/floor',
    largura: 1440, altura: 900, sessao: true,
  },
  {
    nome: 'catalogo',
    porque: 'A base única do §6.3.3 — o catálogo de onde a carta e a cozinha leem. '
      + 'É a LISTA de produtos e não o painel do catálogo: o painel mostra dois '
      + 'indicadores a dizer «Aún no medido», que é o produto a ser honesto sobre '
      + 'o que ainda não construiu — e honesto no produto é péssimo numa peça '
      + 'comercial, porque anuncia o que não existe. O controlo de sujidade '
      + 'apanhou-o e por isso a composição mudou de rota.',
    rota: '/es-ES/app/bossa-demo/catalogo/produtos',
    largura: 1440, altura: 900, sessao: true,
  },
  {
    nome: 'carta-movel',
    porque: 'O que o cliente vê ao apontar para o código da mesa. Sem sessão, '
      + 'porque é assim que ela se usa.',
    rota: `/r/${SLUG_DA_DEMO}/es-ES/menu`,
    largura: 390, altura: 844, sessao: false,
  },
];

/** Regista a conta pela porta real e dá-lhe pertença na demonstração. */
async function abrirSessao(navegador) {
  const contexto = await navegador.newContext({
    baseURL: BASE, locale: 'es-ES', timezoneId: 'Europe/Madrid',
  });
  const pedido = contexto.request;

  /**
   * O limitador de abuso devolve 429 ao fim de três pedidos a `/sign-in*` ou
   * `/sign-up*` numa janela de dez segundos, e **é suposto estar lá**: só liga
   * em produção, e o build que se fotografa é o de produção. Desligá-lo para as
   * capturas passarem seria apagar uma protecção real para chegar ao verde.
   *
   * Espera-se por ele, como o arnês faz. Espera fixa acima da janela — escalonar
   * torna o arranque imprevisível.
   */
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const comPaciencia = async (nome, fazer) => {
    let resposta;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      resposta = await fazer();
      if (resposta.status() !== 429) return resposta;
      await dormir(11_000);
    }
    return resposta;
  };

  const entrar = () => comPaciencia('entrada', () => pedido.post('/api/auth/sign-in/email', {
    data: { email: CONTA_DA_DEMO, password: SENHA_DA_DEMO },
    headers: { origin: BASE },
  }));

  let entrou = await entrar();
  if (!entrou.ok()) {
    const inscricao = await comPaciencia('inscrição', () => pedido.post('/api/auth/sign-up/email', {
      data: { email: CONTA_DA_DEMO, password: SENHA_DA_DEMO, name: 'Bossa Demo' },
      headers: { origin: BASE },
    }));
    if (!inscricao.ok()) {
      throw new Error(`a inscrição da conta de demonstração falhou: ${inscricao.status()}`);
    }
    entrou = await entrar();
  }
  if (!entrou.ok()) throw new Error(`a entrada da demonstração falhou: ${entrou.status()}`);

  const sql = new Client({
    connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
  });
  await sql.connect();
  try {
    const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [CONTA_DA_DEMO]);
    const userId = rows[0]?.id;
    if (!userId) throw new Error('a conta de demonstração não ficou na base');
    await sql.query(
      `INSERT INTO memberships (id, organization_id, user_id, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVO', now())
       ON CONFLICT (organization_id, user_id) DO UPDATE SET estado = 'ACTIVO', updated_at = now()`,
      [DEMO.org, userId],
    );
    const { rows: filiacao } = await sql.query(
      'SELECT id FROM memberships WHERE organization_id = $1 AND user_id = $2',
      [DEMO.org, userId]);
    // Sem `brand_id`: ver o cabeçalho.
    await sql.query(
      `INSERT INTO role_assignments (id, organization_id, membership_id, papel, updated_at)
       SELECT gen_random_uuid(), $1, $2, 'OWNER', now()
       WHERE NOT EXISTS (
         SELECT 1 FROM role_assignments WHERE organization_id = $1 AND membership_id = $2)`,
      [DEMO.org, filiacao[0].id],
    );
  } finally {
    await sql.end();
  }
  return contexto;
}

const navegador = await chromium.launch();
mkdirSync(DESTINO, { recursive: true });

const comSessao = await abrirSessao(navegador);
const semSessao = await navegador.newContext({
  baseURL: BASE, locale: 'es-ES', timezoneId: 'Europe/Madrid',
});

const registo = [];
let reprovadas = 0;

for (const c of COMPOSICOES) {
  const pagina = await (c.sessao ? comSessao : semSessao).newPage();
  await pagina.setViewportSize({ width: c.largura, height: c.altura });
  const resposta = await pagina.goto(BASE + c.rota, { waitUntil: 'networkidle' });
  const estado = resposta?.status() ?? 0;
  const caminhoFinal = new URL(pagina.url()).pathname;

  /**
   * O CONTROLO da captura, e é o que a torna prova em vez de fotografia.
   *
   * Três coisas que uma captura comercial não pode ter, e que a do arnês tinha
   * todas: o prefixo do arnês, um domínio de fantasia, e o rótulo de uma coisa
   * que o produto ainda não mede. Se alguma aparecer, a captura sai marcada e o
   * guião reprova — em vez de o ficheiro ir para a landing na mesma.
   */
  // `document` vive no NAVEGADOR, não aqui: o corpo do `evaluate` é serializado
  // e corre lá dentro. O eslint lê este ficheiro como Node e não tem como saber
  // disso — daí a declaração, que é mais honesta do que desligar a regra.
  /* global document */
  const texto = await pagina.evaluate(() => document.body.innerText);
  const sujidade = [
    ['insp-', /insp-/i],
    ['example', /\bexample\b|@[a-z0-9-]+\.example/i],
    ['por medir', /A[úu]n no medido|Ainda n[ãa]o medido|Not measured yet/i],
    ['sem configurar', /sin configurar|sem configurar|not configured/i],
  ].filter(([, padrao]) => padrao.test(texto)).map(([nome]) => nome);

  const desviou = caminhoFinal !== c.rota;
  const mau = estado >= 400 || desviou || sujidade.length > 0;
  if (mau) reprovadas++;

  const ficheiro = `${DESTINO}/${c.nome}-${c.largura}.png`;
  await pagina.screenshot({ path: ficheiro, animations: 'disabled' });
  registo.push({
    nome: c.nome, porque: c.porque, rota: c.rota, largura: c.largura, altura: c.altura,
    estado, caminhoFinal, desviou, sujidade, ficheiro,
  });
  console.log(
    `${mau ? 'FALHA' : 'ok   '} ${c.nome.padEnd(14)} ${String(estado).padEnd(4)} `
    + `${sujidade.length ? 'sujidade: ' + sujidade.join(', ') : ''}${desviou ? ' DESVIOU para ' + caminhoFinal : ''}`,
  );
  await pagina.close();
}

writeFileSync(`${DESTINO}/composicoes.json`, JSON.stringify(registo, null, 2) + '\n');
await navegador.close();

if (reprovadas > 0) {
  console.error(`\n${reprovadas} composição(ões) reprovada(s) — não vão para a landing assim.`);
  process.exit(1);
}
console.log(`\n${registo.length} composições em ${DESTINO}`);
