/**
 * Importar uma carta que veio de outro sítio.
 *
 * ── A regra do E00 que este ficheiro existe para tornar impossível de violar ─
 *
 * > **Nome igual não é chave de identidade.** Dois "Café" não são o mesmo
 * > produto, e um SKU vazio não autoriza fundir linhas. A estratégia de
 * > actualização é explícita ou não há importação.
 *
 * O erro que ela evita é irreversível na prática: fundir dois produtos por nome
 * apaga um deles, e com ele o preço, as opções e — o que importa mesmo — a ficha
 * de alérgenos que alguém assinou. Quem descobre descobre com um cliente à mesa.
 *
 * Por isso a estratégia é um parâmetro **obrigatório** e não tem valor por
 * omissão: um `?? 'actualizar'` escrito por conveniência era exactamente a linha
 * que fundia as cartas de toda a gente.
 */

import { deTextoParaMenor, moedaValida } from './dinheiro.ts';

/**
 * Como tratar uma linha que já existe.
 *
 * `criar_apenas` é o lado seguro e é o que se propõe primeiro no ecrã: uma
 * importação que só cria nunca destrói nada, e o pior que faz é duplicados
 * visíveis — que se apagam.
 */
export type Estrategia = 'criar_apenas' | 'actualizar_por_sku';

export interface ColunasMapeadas {
  nome: string;
  sku?: string;
  descricao?: string;
  preco?: string;
  moeda?: string;
  categoria?: string;
}

export type ErroDeImportacao =
  | 'sem_nome'
  | 'preco_ilegivel'
  | 'moeda_invalida'
  | 'sku_repetido_no_ficheiro'
  | 'sku_em_falta_para_actualizar';

export type AccaoDaLinha = 'criar' | 'actualizar' | 'ignorar' | 'erro';

export interface LinhaDaPrevia {
  /** A linha como a pessoa a vê no Excel: cabeçalho é 1. */
  linha: number;
  accao: AccaoDaLinha;
  nome: string;
  sku: string | null;
  precoMenor: number | null;
  moeda: string | null;
  erro?: ErroDeImportacao;
  /** Em `actualizar`: o que muda, para a prévia poder mostrá-lo. */
  mudancas?: ReadonlyArray<{ campo: string; antes: string; depois: string }>;
  /** Em `actualizar`: o produto que vai ser tocado. */
  productId?: string;
}

export interface Existente {
  productId: string;
  sku: string | null;
  nome: string;
  precoMenor: number | null;
  moeda: string | null;
}

export interface Previa {
  linhas: readonly LinhaDaPrevia[];
  resumo: { criar: number; actualizar: number; ignorar: number; erro: number };
}

const limpar = (v: string | undefined): string => (v ?? '').trim();

/**
 * A prévia da importação — o "dry-run" que o contrato exige antes de confirmar.
 *
 * Não escreve nada. Devolve, **por linha**, o que aconteceria; e o resumo é a
 * soma dessas linhas, nunca uma contagem calculada à parte — duas contagens
 * divergem, e a que a pessoa lê antes de carregar em confirmar tem de ser a
 * mesma que a que vai acontecer.
 */
export function preverImportacao(
  linhas: ReadonlyArray<readonly string[]>,
  cabecalho: readonly string[],
  colunas: ColunasMapeadas,
  estrategia: Estrategia,
  existentes: readonly Existente[],
): Previa {
  const indice = (nome: string | undefined): number =>
    nome === undefined ? -1 : cabecalho.indexOf(nome);
  const iNome = indice(colunas.nome);
  const iSku = indice(colunas.sku);
  const iPreco = indice(colunas.preco);
  const iMoeda = indice(colunas.moeda);

  // Índice por SKU, e **só** por SKU. Não existe aqui nenhum mapa por nome, e é
  // de propósito: o que não existe não se usa por distracção.
  const porSku = new Map<string, Existente>();
  for (const e of existentes) if (e.sku) porSku.set(e.sku.toLowerCase(), e);

  const vistosNoFicheiro = new Set<string>();
  const saida: LinhaDaPrevia[] = [];

  linhas.forEach((l, i) => {
    const numero = i + 2;
    const nome = limpar(l[iNome]);
    const skuBruto = iSku >= 0 ? limpar(l[iSku]) : '';
    const sku = skuBruto === '' ? null : skuBruto;
    const moedaBruta = iMoeda >= 0 ? limpar(l[iMoeda]).toUpperCase() : '';
    const precoBruto = iPreco >= 0 ? limpar(l[iPreco]) : '';

    const erro = (e: ErroDeImportacao): void => {
      saida.push({ linha: numero, accao: 'erro', nome, sku, precoMenor: null, moeda: null, erro: e });
    };

    if (nome === '') { erro('sem_nome'); return; }

    let precoMenor: number | null = null;
    let moeda: string | null = null;
    if (precoBruto !== '') {
      if (moedaBruta === '' || !moedaValida(moedaBruta)) { erro('moeda_invalida'); return; }
      // Nunca `parseFloat`: é o mesmo parser do E07, que trabalha em dígitos e
      // recusa separador de milhares por ser ambíguo entre convenções.
      const menor = deTextoParaMenor(precoBruto, moedaBruta);
      if (menor === null) { erro('preco_ilegivel'); return; }
      precoMenor = menor;
      moeda = moedaBruta;
    }

    if (sku !== null) {
      const chave = sku.toLowerCase();
      // Duas linhas com o mesmo SKU no MESMO ficheiro: a segunda não actualiza a
      // primeira em silêncio. É um erro do ficheiro, e quem o corrige é quem o
      // fez — nós não sabemos qual das duas está certa.
      if (vistosNoFicheiro.has(chave)) { erro('sku_repetido_no_ficheiro'); return; }
      vistosNoFicheiro.add(chave);
    }

    if (estrategia === 'criar_apenas') {
      saida.push({ linha: numero, accao: 'criar', nome, sku, precoMenor, moeda });
      return;
    }

    // ── `actualizar_por_sku` ─────────────────────────────────────────────────
    if (sku === null) {
      // **Um SKU vazio não autoriza fundir linhas.** Não se procura por nome: é
      // exactamente aqui que a carta de alguém seria fundida com a sua própria.
      erro('sku_em_falta_para_actualizar');
      return;
    }
    const alvo = porSku.get(sku.toLowerCase());
    if (!alvo) {
      saida.push({ linha: numero, accao: 'criar', nome, sku, precoMenor, moeda });
      return;
    }

    const mudancas: Array<{ campo: string; antes: string; depois: string }> = [];
    if (alvo.nome !== nome) mudancas.push({ campo: 'nome', antes: alvo.nome, depois: nome });
    if (precoMenor !== null && (alvo.precoMenor !== precoMenor || alvo.moeda !== moeda)) {
      mudancas.push({
        campo: 'preco',
        antes: alvo.precoMenor === null ? '—' : `${alvo.precoMenor} ${alvo.moeda ?? '?'}`,
        depois: `${precoMenor} ${moeda}`,
      });
    }
    if (mudancas.length === 0) {
      // Nada a fazer é uma acção própria. Contá-la como "actualizar" fazia a
      // segunda importação do mesmo ficheiro parecer trabalho.
      saida.push({
        linha: numero, accao: 'ignorar', nome, sku, precoMenor, moeda,
        productId: alvo.productId,
      });
      return;
    }
    saida.push({
      linha: numero, accao: 'actualizar', nome, sku, precoMenor, moeda,
      productId: alvo.productId, mudancas,
    });
  });

  const resumo = { criar: 0, actualizar: 0, ignorar: 0, erro: 0 };
  for (const l of saida) resumo[l.accao]++;
  return { linhas: saida, resumo };
}

/**
 * As linhas que a confirmação vai escrever.
 *
 * As de erro **não entram**, e não há aqui nenhuma opção para as forçar: uma
 * linha que não se conseguiu ler não se escreve "como está".
 */
export function linhasParaGravar(previa: Previa): readonly LinhaDaPrevia[] {
  return previa.linhas.filter((l) => l.accao === 'criar' || l.accao === 'actualizar');
}
