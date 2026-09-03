import { createHash } from 'node:crypto';
import type { ClienteComEscopo } from './escopo.ts';
import {
  aceitarFicheiro, algumEnderecoInterno, validarUrlDeBusca,
  type PedidoDeFicheiro, type RecusaDeFicheiro, type ResultadoDeFicheiro,
} from '@bossaos/domain';
import type { PortaDeMedia } from '@bossaos/domain';

/**
 * Média, do lado da base.
 *
 * O domínio decide **o que é** o ficheiro e **se pode entrar**; isto guarda-o,
 * dá-lhe dono, e liga-o aos produtos.
 */

/** 5 MB. Uma foto de prato acima disto é uma foto que ninguém redimensionou. */
export const LIMITE_BYTES = 5 * 1024 * 1024;

export interface EntradaDeMedia {
  brandId: string;
  conteudo: Uint8Array;
  tipoDeclarado?: string;
  nomeOriginal?: string;
  textoAlternativo?: string;
  autor: string;
  exigirTextoAlternativo?: boolean;
}

export type ResultadoDeCarregamento =
  | { ok: true; mediaId: string; chave: string; repetido: boolean }
  | { ok: false; erro: RecusaDeFicheiro; detalhe?: string };

/**
 * Guarda um ficheiro.
 *
 * **A decisão de aceitar é do domínio e vem primeiro.** Nada é escrito no
 * armazenamento antes de o tipo estar confirmado pelos bytes: um SVG que fosse
 * gravado e só depois recusado ficava lá, e o que fica no disco acaba servido.
 *
 * O `digest` desduplica dentro da organização. Não entre organizações — duas
 * cadeias diferentes com a mesma foto não podem partilhar a linha, porque
 * apagar a de uma apagaria a da outra, e porque saber que outra tem o mesmo
 * ficheiro já é informação a atravessar a fronteira.
 */
export async function guardarMedia(
  db: ClienteComEscopo,
  organizationId: string,
  porta: PortaDeMedia,
  entrada: EntradaDeMedia,
): Promise<ResultadoDeCarregamento> {
  const pedido: PedidoDeFicheiro = {
    conteudo: entrada.conteudo,
    limiteBytes: LIMITE_BYTES,
    ...(entrada.tipoDeclarado ? { tipoDeclarado: entrada.tipoDeclarado } : {}),
    ...(entrada.nomeOriginal ? { nome: entrada.nomeOriginal } : {}),
    ...(entrada.textoAlternativo ? { textoAlternativo: entrada.textoAlternativo } : {}),
    ...(entrada.exigirTextoAlternativo ? { exigirTextoAlternativo: true } : {}),
  };
  const decisao: ResultadoDeFicheiro = aceitarFicheiro(pedido);
  if (!decisao.ok) {
    return { ok: false, erro: decisao.erro, ...(decisao.detalhe ? { detalhe: decisao.detalhe } : {}) };
  }

  const digest = createHash('sha256').update(entrada.conteudo).digest('hex');
  const jaExiste = await db.mediaAsset.findFirst({
    where: { digest, brandId: entrada.brandId, archivedAt: null },
    select: { id: true, chave: true },
  });
  if (jaExiste) return { ok: true, mediaId: jaExiste.id, chave: jaExiste.chave, repetido: true };

  // A chave é gerada por quem guarda. Nome vindo de fora é travessia de caminho.
  const guardado = await porta.guardar({
    nome: entrada.nomeOriginal ?? 'ficheiro',
    tipoMime: decisao.aceite.tipoMime,
    conteudo: entrada.conteudo,
  });

  const linha = await db.mediaAsset.create({
    data: {
      organizationId, brandId: entrada.brandId,
      chave: guardado.chave, tipo: decisao.aceite.tipo, tipoMime: decisao.aceite.tipoMime,
      bytes: entrada.conteudo.length, digest, criadoPor: entrada.autor,
      ...(entrada.nomeOriginal ? { nomeOriginal: entrada.nomeOriginal } : {}),
      ...(entrada.textoAlternativo ? { textoAlternativo: entrada.textoAlternativo } : {}),
    },
    select: { id: true, chave: true },
  });
  return { ok: true, mediaId: linha.id, chave: linha.chave, repetido: false };
}

export type RecusaDeBusca =
  | 'url_invalido' | 'esquema_nao_permitido' | 'credenciais_no_url'
  | 'destino_interno' | 'nome_local' | 'resposta_grande_demais' | 'nao_respondeu';

/**
 * Buscar uma imagem por URL — **o pedido é do nosso servidor**.
 *
 * Três portas, e nenhuma delas sozinha chega:
 *
 * 1. a FORMA do endereço (esquema, credenciais, nome local, IP literal privado);
 * 2. o endereço RESOLVIDO, porque um nome público pode resolver para 127.0.0.1;
 * 3. **nenhum redireccionamento**, porque um destino público pode responder 302
 *    para um interno e a verificação de cima já passou.
 *
 * O terceiro é o que quase toda a gente esquece, e é por isso que está escrito
 * aqui em vez de ficar implícito num `fetch`.
 */
export async function buscarPorUrl(
  texto: string,
  resolver: (nome: string) => Promise<readonly string[]>,
  limiteBytes = LIMITE_BYTES,
): Promise<
  | { ok: true; conteudo: Uint8Array; tipoDeclarado: string }
  | { ok: false; erro: RecusaDeBusca; detalhe?: string }
> {
  const forma = validarUrlDeBusca(texto);
  if (!forma.ok) return { ok: false, erro: forma.erro, ...(forma.detalhe ? { detalhe: forma.detalhe } : {}) };

  if (forma.porResolver) {
    const enderecos = await resolver(forma.url.hostname);
    // Sem endereços não se avança: "não consegui resolver" não é "é público".
    if (enderecos.length === 0) return { ok: false, erro: 'nao_respondeu' };
    const interno = algumEnderecoInterno(enderecos);
    if (interno.interno) return { ok: false, erro: 'destino_interno', detalhe: interno.classe };
  }

  let resposta: Response;
  try {
    resposta = await fetch(forma.url, {
      // Um destino público que responda 302 para `http://169.254.169.254/` passa
      // por todas as verificações de cima. `manual` faz o redireccionamento
      // chegar aqui como uma resposta 3xx em vez de ser seguido às escondidas.
      redirect: 'manual',
      headers: { accept: 'image/*' },
    });
  } catch {
    return { ok: false, erro: 'nao_respondeu' };
  }
  if (resposta.status >= 300 && resposta.status < 400) {
    return { ok: false, erro: 'destino_interno', detalhe: 'redireccionamento' };
  }
  if (!resposta.ok) return { ok: false, erro: 'nao_respondeu', detalhe: String(resposta.status) };

  const bruto = new Uint8Array(await resposta.arrayBuffer());
  // O `Content-Length` é uma afirmação de quem responde; o tamanho lido é o
  // facto. Verifica-se o facto.
  if (bruto.length > limiteBytes) return { ok: false, erro: 'resposta_grande_demais' };

  return {
    ok: true, conteudo: bruto,
    tipoDeclarado: resposta.headers.get('content-type')?.split(';')[0]?.trim() ?? '',
  };
}

export function listarMedia(db: ClienteComEscopo, brandId?: string) {
  return db.mediaAsset.findMany({
    where: { archivedAt: null, ...(brandId ? { brandId } : {}) },
    select: {
      id: true, chave: true, tipo: true, tipoMime: true, bytes: true,
      nomeOriginal: true, textoAlternativo: true, criadoPor: true, createdAt: true,
      _count: { select: { emProdutos: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** Liga um ficheiro a um produto. Uma só principal — o índice parcial garante-o. */
export async function ligarAoProduto(
  db: ClienteComEscopo,
  organizationId: string,
  productId: string,
  mediaId: string,
  principal = false,
): Promise<void> {
  if (principal) {
    // Baixar as outras primeiro: com o índice parcial, subir esta com outra a
    // `true` violaria a restrição — e a violação chegava ao ecrã como um erro
    // de base, que não ajuda ninguém.
    await db.productMedia.updateMany({ where: { productId, principal: true }, data: { principal: false } });
  }
  const quantas = await db.productMedia.count({ where: { productId } });
  const existente = await db.productMedia.findFirst({
    where: { productId, mediaId }, select: { id: true },
  });
  if (existente) {
    await db.productMedia.update({ where: { id: existente.id }, data: { principal } });
    return;
  }
  await db.productMedia.create({
    data: { organizationId, productId, mediaId, principal, ordem: quantas + 1 },
  });
}

/**
 * Substituir o conteúdo de um ficheiro **sem quebrar as referências publicadas**.
 *
 * As ligações produto↔média continuam a apontar para a mesma linha, e as
 * revisões já publicadas continuam a apontar para a CHAVE ANTIGA, que fica onde
 * está. É isso que faz a substituição não reescrever o passado: uma carta
 * publicada em Março continua a mostrar a foto de Março.
 */
export async function substituirConteudo(
  db: ClienteComEscopo,
  porta: PortaDeMedia,
  mediaId: string,
  conteudo: Uint8Array,
  tipoDeclarado?: string,
): Promise<ResultadoDeCarregamento> {
  const decisao = aceitarFicheiro({
    conteudo, limiteBytes: LIMITE_BYTES,
    ...(tipoDeclarado ? { tipoDeclarado } : {}),
  });
  if (!decisao.ok) {
    return { ok: false, erro: decisao.erro, ...(decisao.detalhe ? { detalhe: decisao.detalhe } : {}) };
  }
  const actual = await db.mediaAsset.findFirst({ where: { id: mediaId }, select: { id: true } });
  if (!actual) return { ok: false, erro: 'tipo_nao_permitido', detalhe: 'nao_encontrado' };

  const guardado = await porta.guardar({
    nome: 'substituicao', tipoMime: decisao.aceite.tipoMime, conteudo,
  });
  const linha = await db.mediaAsset.update({
    where: { id: mediaId },
    data: {
      chave: guardado.chave, tipo: decisao.aceite.tipo, tipoMime: decisao.aceite.tipoMime,
      bytes: conteudo.length, digest: createHash('sha256').update(conteudo).digest('hex'),
    },
    select: { id: true, chave: true },
  });
  return { ok: true, mediaId: linha.id, chave: linha.chave, repetido: false };
}
