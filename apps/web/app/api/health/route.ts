import { NextResponse } from 'next/server';
import { CABECALHO_REQUEST_ID } from '../../../proxy.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vivacidade: este processo está a responder?
 *
 * NÃO toca na base de dados, e é essa a diferença para `/ready`. Confundir as
 * duas é o erro clássico: um health que consulta a base faz o orquestrador
 * reiniciar a aplicação quando quem está em baixo é o Postgres — e reiniciar
 * não cura uma base em baixo, só apaga o processo que sabia reportá-lo.
 */
/**
 * O que o BUILD diz que é — e nada mais do que isso.
 *
 * ── Para que serve, e para que NÃO serve ──────────────────────────────────
 *
 * Serve para responder «entrou?» **de fora, por HTTP, sem acesso ao servidor**.
 * Até aqui a única forma de saber que versão estava no ar era `docker inspect`
 * à etiqueta `bossaos.versao`, o que exige o Docker à mão — e quem faz a
 * pergunta costuma estar no telemóvel.
 *
 * **Não substitui essa etiqueta, e não é uma medição do código a correr.** É o
 * valor que veio no `ARG VERSAO` do `infra/web.Dockerfile`, promovido a `ENV`,
 * e portanto é uma DECLARAÇÃO do build sobre si próprio. O portão 4 do
 * `publicar.sh` continua a ler a etiqueta, que é o que compara o que se
 * construiu com o que está no ar. O nome do campo diz isso: `versao_do_build`.
 *
 * ── «desconhecida» em vez de ausente ──────────────────────────────────────
 *
 * Sem `BOSSAOS_VERSAO` o campo sai `'desconhecida'` e **nunca desaparece**: um
 * campo ausente lê-se como «build antigo, ainda sem isto», e um campo a dizer
 * «desconhecida» lê-se como «não sei» — que é a verdade. O
 * `infra/compose.prod.yml` já tinha esse instinto no `${VERSAO:-desconhecida}`.
 *
 * ── E não passa pelo `loadEnv` de propósito ───────────────────────────────
 *
 * Este é o ecrã da vivacidade. Fazê-lo depender de um carregamento de
 * configuração que pode lançar era trocar uma pergunta por um problema: o
 * health passaria a falhar por um motivo que não tem nada que ver com estar
 * vivo. Lê-se do ambiente, com valor por omissão, e acabou.
 */
function versaoDoBuild(): string {
  return process.env.BOSSAOS_VERSAO || 'desconhecida';
}

export function GET(pedido: Request) {
  const requestId = pedido.headers.get(CABECALHO_REQUEST_ID) ?? undefined;
  return NextResponse.json(
    {
      estado: 'vivo',
      ts: new Date().toISOString(),
      versao_do_build: versaoDoBuild(),
      ...(requestId ? { request_id: requestId } : {}),
    },
    { status: 200, headers: { 'cache-control': 'no-store' } },
  );
}
