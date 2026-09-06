/**
 * As decisões da implantação e do piloto — o E35.
 *
 * ── Porque é que isto é um módulo e não só um guião de shell ──────────────
 *
 * Os quatro portões são decisões, e uma decisão em `bash` não se testa: testa-se
 * o guião inteiro, com rede, com Docker e com um servidor. Aqui ficam as
 * decisões puras, cada uma com o seu par — e o guião passa a ser canalização.
 *
 * O contrato desta etapa não foi escrito por dedução: foi escrito **depois de
 * uma publicação com nove paragens**. Cada função abaixo corresponde a uma.
 */

// ═══════════════════════════════════════════════════════════════════════════
// PORTÃO 1 · não se publica o que não foi assinado
// ═══════════════════════════════════════════════════════════════════════════

export interface EstadoDaEtapa {
  readonly etapa: string;
  readonly estado: string;
}

/**
 * Que etapas estão por validar?
 *
 * ── Porque é que isto é um portão e não um aviso ──────────────────────────
 *
 * Se houver etapa por validar, o que vai para o ar **inclui código que ninguém
 * reviu**. Não é uma questão de processo: é que a revisão desta casa apanha
 * defeitos que os testes não apanham — a carta vazia do E31 e a chave em claro
 * do E32 saíram os dois de revisão, não de testes.
 *
 * O `E00` fica de fora: é a etapa do próprio contrato, e nunca foi uma etapa de
 * código. Excluí-la aqui é a mesma decisão que a `validar-assinaturas.sh` já
 * tomou, e está escrita nos dois sítios porque as duas leem a mesma matriz.
 */
export function etapasPorValidar(
  matriz: readonly EstadoDaEtapa[],
): readonly string[] {
  return matriz
    .filter((e) => e.etapa !== 'E00' && e.estado.trim().toLowerCase() !== 'validado')
    .map((e) => e.etapa);
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTÃO 2 · publica-se um COMMIT, não a árvore de trabalho
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A árvore está limpa o suficiente para publicar?
 *
 * ── Enviar o disco é uma PROMESSA de que o disco e o commit coincidem ─────
 *
 * E é uma promessa que ninguém verifica. Um ficheiro por commitar, um plante de
 * controlo esquecido, uma experiência a meio — vão todos, e o que está em
 * produção deixa de existir em git.
 *
 * A cura não é «ter cuidado»: é publicar por `git archive`, onde **o que vai
 * para o ar existe em git porque não há outra maneira de lá chegar**. Esta
 * função é o aviso antes disso, para quem publica saber que o que tem no disco
 * não vai.
 */
export function arvoreLimpa(estadoDoGit: string): boolean {
  return estadoDoGit.trim() === '';
}

/**
 * O que fica de fora do que se publica.
 *
 * Não é uma lista de conveniência: cada entrada é um ficheiro que já causou
 * estrago neste vault, ou que causaria. O `.env` foi comido uma vez por um
 * `rsync --delete`, e a recuperação demorou uma noite.
 */
export const NUNCA_SOBE = [
  '.env', '.env.prod', '.env.local', '.env.production',
  'node_modules', '.next', '.git', 'inspeccao/.resultados',
] as const;

/**
 * ── A regra é sobre SEGMENTOS do caminho, e não sobre prefixos ────────────
 *
 * A primeira versão comparava início e fim: `caminho === p`, `startsWith(p + '/')`
 * ou `endsWith('/' + p)`. Deixava passar `apps/web/.next/build.json` — o `.next`
 * está no MEIO —, e o *build* inteiro ia para o ar.
 *
 * Apanhou-o o teste, e é a mesma família das três aspas do
 * `validar-alergenios.sh`: cobrir as formas de escrever a coisa em vez de medir
 * a propriedade. A propriedade é «este nome aparece como pasta ou ficheiro em
 * qualquer nível», e isso lê-se partindo o caminho.
 *
 * As entradas com barra (`inspeccao/.resultados`) comparam-se como sequência de
 * segmentos, e não como texto — senão `outra/inspeccao/.resultados` escapava.
 */
export function podeSubir(caminho: string): boolean {
  const partes = caminho.split('/').filter((x) => x !== '');
  return !NUNCA_SOBE.some((entrada) => {
    const alvo = entrada.split('/');
    for (let i = 0; i + alvo.length <= partes.length; i += 1) {
      if (alvo.every((seg, j) => partes[i + j] === seg)) return true;
    }
    return false;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTÃO 4 · a versão que RESPONDE é a que foi construída
// ═══════════════════════════════════════════════════════════════════════════

/**
 * O que respondeu é o que se construiu?
 *
 * ── Um `up` sem erro não é uma publicação ────────────────────────────────
 *
 * Um build que não pegou serve o *bundle* antigo com ar de sucesso: o processo
 * arranca, a porta responde, os registos não dizem nada. A única diferença é que
 * o código é o de ontem.
 *
 * ── E a sonda NÃO atravessa o produto ────────────────────────────────────
 *
 * A do sénior pedia `/versao.txt` e o encaminhamento por idioma respondeu com
 * `/es-ES/versao.txt`: mediu **o comportamento da casa** em vez do build. Uma
 * sonda que passa pelo produto mede o produto, e o que aqui se quer saber é o
 * que está lá dentro.
 *
 * Por isso o argumento chama-se `etiquetaDaImagem`: lê-se do Docker, do lado de
 * fora. `Medido<T>` outra vez — não conseguir ler a etiqueta **não é** «versão
 * errada», é não saber, e as duas mandam fazer coisas diferentes.
 */
export type LeituraDaVersao =
  | { readonly sabe: true; readonly coincide: boolean; readonly noAr: string }
  | { readonly sabe: false };

export function versaoQueResponde(
  etiquetaDaImagem: string | null, esperada: string,
): LeituraDaVersao {
  if (etiquetaDaImagem === null || etiquetaDaImagem.trim() === '') return { sabe: false };
  const noAr = etiquetaDaImagem.trim();
  return { sabe: true, coincide: noAr === esperada.trim(), noAr };
}

// ═══════════════════════════════════════════════════════════════════════════
// A `pilot.md` distingue TRÊS estados
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Feito, pendente, **não medido**. Nunca duas colunas.
 *
 * > Uma linha vazia lê-se como uma linha aprovada, e as duas custam a mesma
 * > tinta.
 *
 * É a mesma regra da matriz de homologação do E31, e do `Medido<T>` do E30. Aqui
 * a consequência é comercial: quem lê a `pilot.md` decide se o restaurante
 * abre com isto.
 */
export type EstadoDoPacote = 'feito' | 'pendente' | 'nao_medido';

export const ESTADOS_DO_PACOTE: readonly EstadoDoPacote[] =
  ['feito', 'pendente', 'nao_medido'];

/**
 * Um runbook pode prometer RPO?
 *
 * ── Um backup que nunca foi restaurado é uma esperança ───────────────────
 *
 * O número que se diz ao cliente sem ensaio é inventado — e o cliente toma
 * decisões de negócio com ele: quanto trabalho perde numa avaria, quanto tempo
 * fica fechado.
 *
 * Propõe-se o objectivo, faz-se o ensaio, anexa-se o resultado **real**. Que
 * costuma ser pior, e é exactamente por isso que se mede.
 */
export function podeDeclararRpo(ensaio: {
  readonly feitoEm: Date | null;
  readonly duracaoSegundos: number | null;
}): boolean {
  return ensaio.feitoEm !== null && ensaio.duracaoSegundos !== null;
}

// ═══════════════════════════════════════════════════════════════════════════
// A importação a seco
// ═══════════════════════════════════════════════════════════════════════════

/** Uma linha do ficheiro que a casa entrega. Tudo texto, como vem. */
export interface LinhaDeImportacao {
  readonly nome: string;
  readonly preco: string;
  readonly idioma: string;
  readonly alergenios: string;
}

export interface AvisoDeImportacao {
  readonly linha: number;
  readonly campo: string;
  readonly problema: string;
}

/**
 * Lê o ficheiro da casa e devolve **o que ela tem de conferir**. Não escreve.
 *
 * ── Os alergénios não se importam por adivinhação ────────────────────────
 *
 * **Campo vazio é `DESCONHECIDO`, nunca «não contém».** É a regra do E07, e é a
 * única deste projecto cujo erro manda alguém para o hospital — e uma
 * importação é exactamente onde ela se perde, porque a folha de cálculo do
 * cliente tem células vazias por todo o lado e «vazio» parece «nada».
 *
 * Por isso a ausência não vira um valor: vira um **aviso para a casa conferir**.
 */
export function conferirImportacao(
  linhas: readonly LinhaDeImportacao[],
): readonly AvisoDeImportacao[] {
  const avisos: AvisoDeImportacao[] = [];
  linhas.forEach((l, i) => {
    const n = i + 1;
    if (l.nome.trim() === '') {
      avisos.push({ linha: n, campo: 'nome', problema: 'sem nome' });
    }
    // O preço lê-se como TEXTO e valida-se como texto. Um `Number()` aqui
    // aceitava `1.2.3` como `1.2` em silêncio — a lição do E29.
    if (!/^\d+([.,]\d{1,2})?$/.test(l.preco.trim())) {
      avisos.push({ linha: n, campo: 'preco', problema: `preço ilegível: "${l.preco}"` });
    }
    if (l.idioma.trim() === '') {
      avisos.push({ linha: n, campo: 'idioma', problema: 'sem idioma' });
    }
    if (l.alergenios.trim() === '') {
      avisos.push({
        linha: n, campo: 'alergenios',
        problema: 'vazio fica DESCONHECIDO, e não «não contém» — a casa tem de confirmar',
      });
    }
  });
  return avisos;
}

// ═══════════════════════════════════════════════════════════════════════════
// A entrada progressiva
// ═══════════════════════════════════════════════════════════════════════════

export interface Degrau {
  readonly nome: string;
  readonly criterios: readonly string[];
  /** **Como se volta atrás.** Um degrau sem isto não se sobe. */
  readonly saida: string | null;
}

/**
 * Este degrau pode ser subido?
 *
 * ── Um plano de entrada sem plano de saída é uma aposta ──────────────────
 *
 * E a saída define-se **antes** de subir, não depois — depois é quando já há
 * pedidos a sério na casa e a pergunta passa a ser «como é que voltamos sem
 * duplicar vendas?».
 */
export function degrauPodeSubir(d: Degrau): { ok: true } | { ok: false; razao: string } {
  if (d.saida === null || d.saida.trim() === '') {
    return { ok: false, razao: 'sem plano de saída' };
  }
  if (d.criterios.length === 0) {
    return { ok: false, razao: 'sem critérios' };
  }
  return { ok: true };
}

/**
 * Lê os degraus do documento da entrada progressiva.
 *
 * ── Porque é que isto teve de existir ─────────────────────────────────────
 *
 * O `degrauPodeSubir` estava certo e **nunca via um degrau verdadeiro**. O
 * controlo tinha duas metades que não se tocavam: uma contava cabeçalhos no
 * documento (`## Degrau ` contra `**Plano de saída`), a outra aplicava a regra a
 * objectos inventados (`{ nome: "x", saida: null }`).
 *
 * O sénior mediu o buraco em vez de o supor: esvaziou o plano de saída do último
 * degrau **deixando o cabeçalho intacto**, e o controlo respondeu `degraus=3
 * saidas=3`, verde, com o plano vazio. Contar títulos mede que alguém escreveu o
 * título.
 *
 * Esta função é a ponte que faltava: transforma o documento em `Degrau`s, e a
 * regra passa a correr sobre os dados a sério.
 *
 * ── E por isso a `saida` sai do TEXTO e não da presença do rótulo ─────────
 *
 * O que se devolve é o que está **depois** de `**Plano de saída…**`, sem o
 * rótulo. Um cabeçalho sozinho dá cadeia vazia, e cadeia vazia é o que o
 * `degrauPodeSubir` recusa. Se isto lesse «tem rótulo, logo tem plano»,
 * reproduzia exactamente o defeito que veio corrigir.
 */
export function lerDegraus(documento: string): readonly Degrau[] {
  const degraus: Degrau[] = [];
  const blocos = documento.split(/^## Degrau /m).slice(1);
  for (const bloco of blocos) {
    const linhas = bloco.split('\n');
    const nome = `Degrau ${(linhas[0] ?? '').trim()}`;
    const criterios = linhas
      .filter((l) => /^\d+\.\s+\S/.test(l.trim()))
      .map((l) => l.trim());
    // O rótulo pode ser `**Plano de saída:**` ou `**Plano de saída, por
    // partes**` — o que interessa é onde ele ACABA, e não a forma como está
    // escrito. Medir a forma era o defeito anterior.
    const m = /\*\*Plano de saída[^*]*\*\*:?/.exec(bloco);
    const saida = m === null
      ? null
      : bloco
          .slice(m.index + m[0].length)
          // O bloco seguinte não é deste degrau.
          .split(/^---$/m)[0]!
          // Um travessão ou dois pontos logo a seguir ao rótulo são pontuação,
          // e pontuação sozinha não é um plano.
          .replace(/^[\s:—-]+/, '')
          .trim();
    degraus.push({ nome, criterios, saida: saida === '' ? null : saida });
  }
  return degraus;
}
