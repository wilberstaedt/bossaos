import { NextResponse } from 'next/server';
import { guardarPrevia, registar } from '@bossaos/db';
import {
  corpoDaResposta, detectarSeparador, estadoHttp, exigirAccao, lerCsv, type Estrategia,
} from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 2 MB de CSV são umas dez mil linhas. Acima disso é outra conversa. */
const LIMITE = 2 * 1024 * 1024;

const ESTRATEGIAS: readonly string[] = ['criar_apenas', 'actualizar_por_sku'];

/**
 * CAT-027 / ONB-005 · a PRÉVIA da importação.
 *
 * ── Esta rota não escreve produtos ─────────────────────────────────────────
 *
 * Grava o trabalho e as linhas da prévia, e mais nada. Quem escreve é a rota de
 * confirmação, e lê **estas linhas** em vez de reler o ficheiro: entre a prévia
 * e o clique o catálogo pode ter mudado, e o que a pessoa aprovou tem de ser o
 * que acontece.
 *
 * **A estratégia não tem valor por omissão.** Um `?? 'actualizar_por_sku'`
 * escrito por conveniência era a linha que fundia as cartas de toda a gente — e
 * a base tem o mesmo `CHECK` por baixo, para quem escrever por outro caminho.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const noArranque = texto(dados, 'arranque') === '1';
  const destino = noArranque
    ? `/${idioma}/onboarding/importar`
    : `/${idioma}/app/${orgSlug}/catalogo/importar`;

  const brandId = texto(dados, 'brandId');
  const ficheiro = dados.get('ficheiro');
  const escrita = texto(dados, 'estrategia');
  if (!brandId || !(ficheiro instanceof File)) return voltarPara(destino, { erro: 'campos' });
  if (!escrita || !ESTRATEGIAS.includes(escrita)) {
    return voltarPara(destino, { erro: 'estrategia_por_escolher' });
  }
  if (ficheiro.size > LIMITE) return voltarPara(destino, { erro: 'grande_demais' });

  // O ficheiro chega em bytes. Descodifica-se como UTF-8 e tira-se o BOM, que é
  // o que o Excel em Windows escreve à frente de tudo.
  const bruto = new TextDecoder('utf-8').decode(await ficheiro.arrayBuffer());
  const separadorPedido = texto(dados, 'separador');
  const separador = separadorPedido ?? detectarSeparador(bruto);
  const lido = lerCsv(bruto, separador);

  if (lido.cabecalho.length === 0) return voltarPara(destino, { erro: 'sem_cabecalho' });

  // O mapeamento explícito virá do ecrã quando houver colunas fora do padrão.
  // Por agora é por nome de coluna, e **uma coluna em falta é um erro por
  // linha**, não um campo silenciosamente vazio.
  const colunas = {
    nome: lido.cabecalho.find((c) => /^(nome|name|producto|produto)$/i.test(c)) ?? lido.cabecalho[0]!,
    ...(lido.cabecalho.find((c) => /^sku$/i.test(c)) ? { sku: lido.cabecalho.find((c) => /^sku$/i.test(c))! } : {}),
    ...(lido.cabecalho.find((c) => /^(preco|precio|price)$/i.test(c)) ? { preco: lido.cabecalho.find((c) => /^(preco|precio|price)$/i.test(c))! } : {}),
    ...(lido.cabecalho.find((c) => /^(moeda|moneda|currency)$/i.test(c)) ? { moeda: lido.cabecalho.find((c) => /^(moeda|moneda|currency)$/i.test(c))! } : {}),
  };

  const { jobId, previa } = await comEscopoDoPedido(sessao, async (db) => {
    const r = await guardarPrevia(db, sessao.contexto.organizationId, {
      brandId, ficheiroNome: ficheiro.name, separador,
      colunas, estrategia: escrita as Estrategia, autor: sessao.actor.email,
      cabecalho: lido.cabecalho, linhas: lido.linhas,
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'importacao.prevista', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'import_job', alvoId: r.jobId,
      detalhe: {
        ficheiro: ficheiro.name, estrategia: escrita, separador,
        ...r.previa.resumo,
        // Os problemas de leitura do CSV entram no rasto: linhas com colunas a
        // menos não chegam sequer à prévia, e sem isto desapareciam sem sinal.
        problemasDeLeitura: lido.problemas.length,
      },
    });
    return r;
  });
  void previa;

  return voltarPara(
    noArranque ? `/${idioma}/app/${orgSlug}/catalogo/importar` : destino,
    { job: jobId },
  );
}
