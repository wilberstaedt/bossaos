/**
 * CSV: ler o que outra pessoa escreveu, e escrever o que outra pessoa vai abrir.
 *
 * ── Porque é que isto é um ficheiro do domínio e não um utilitário ─────────
 *
 * O `dados-e-accoes-sensiveis.md`, escrito no E00, diz-o melhor do que eu:
 *
 * > **CSV é executável.** Um campo que comece por `=`, `+`, `-` ou `@` é
 * > interpretado como fórmula pelas folhas de cálculo. Um produto chamado
 * > `=HYPERLINK(...)` no menu de um restaurante torna-se código a correr na
 * > máquina de quem abre o relatório — e para o produto tudo isto foi apenas
 * > texto guardado e devolvido. **É a única forma de injecção em que o atacante
 * > não precisa de tocar no nosso sistema**: escreve no nome do prato e espera.
 *
 * O defeito apresenta-se como sucesso. A exportação corre, o ficheiro tem o nome
 * certo, abre no Excel. Um teste do caminho feliz não vê nada.
 */

/** Os prefixos que uma folha de cálculo lê como início de fórmula. */
const PERIGOSOS = ['=', '+', '-', '@', '\t', '\r'] as const;

/**
 * Um número bem formado não é uma fórmula.
 *
 * Isto existe porque a regra ingénua — "neutraliza tudo o que comece por `-`" —
 * transforma **todos os valores negativos** em texto. Numa exportação de preços
 * isso estraga a coluna inteira, e quem a recebe começa a corrigi-la à mão, que
 * é o caminho mais curto para alguém desligar a neutralização.
 *
 * `-5,50` é um número e passa. `-2+3` não é, e não passa.
 */
const NUMERO = /^[+-]?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * Neutraliza um campo para exportação.
 *
 * **Aspas não protegem.** Um campo `"=1+1"` continua a ser avaliado pelo Excel —
 * as aspas são sintaxe do CSV, não do avaliador de fórmulas. A neutralização tem
 * de mudar o PRIMEIRO CARÁCTER que a folha vê, e a forma reconhecida de o fazer
 * é prefixar com um apóstrofo, que as folhas consomem e mostram o resto como
 * texto.
 */
export function neutralizarCampo(valor: string): string {
  if (valor === '') return valor;
  const primeiro = valor[0]!;
  if (!(PERIGOSOS as readonly string[]).includes(primeiro)) return valor;
  // Um número negativo continua a ser um número.
  if (NUMERO.test(valor)) return valor;
  return `'${valor}`;
}

/** Escapa um campo para o formato: aspas a dobrar, e aspas à volta se preciso. */
function escapar(valor: string, separador: string): string {
  const precisa = valor.includes(separador) || valor.includes('"')
    || valor.includes('\n') || valor.includes('\r');
  const escapado = valor.replace(/"/g, '""');
  return precisa ? `"${escapado}"` : escapado;
}

export interface OpcoesDeEscrita {
  separador?: string;
  /**
   * Desligar a neutralização. **Existe só para o controlo negativo** — é a única
   * forma de provar que a neutralização faz alguma coisa, e o `dados-e-accoes`
   * pede-o por escrito: *"gerar a exportação com a neutralização desligada e
   * confirmar que o campo sai como fórmula"*.
   */
  neutralizar?: boolean;
}

/**
 * Escreve linhas para CSV.
 *
 * O BOM vai à frente de propósito: sem ele, o Excel em Windows lê UTF-8 como
 * Latin-1 e "Café con leche" chega como "CafÃ© con leche". Não é cosmético num
 * produto que vive em espanhol e português.
 */
export function paraCsv(
  linhas: ReadonlyArray<readonly string[]>,
  opcoes: OpcoesDeEscrita = {},
): string {
  const separador = opcoes.separador ?? ',';
  const neutralizar = opcoes.neutralizar ?? true;
  const corpo = linhas
    .map((l) => l
      .map((c) => escapar(neutralizar ? neutralizarCampo(c) : c, separador))
      .join(separador))
    .join('\r\n');
  return `\uFEFF${corpo}`;
}

/**
 * Adivinha o separador contando ocorrências FORA de aspas na primeira linha.
 *
 * O Excel em espanhol e em português escreve `;` porque a vírgula é o separador
 * decimal desses sítios. Assumir `,` faz a importação ler a carta inteira como
 * uma coluna só — e o erro que aparece é "faltam colunas", que manda a pessoa
 * procurar no sítio errado.
 */
export function detectarSeparador(texto: string): string {
  const primeira = texto.replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? '';
  let melhor = ',';
  let maximo = -1;
  for (const candidato of [',', ';', '\t', '|']) {
    let contagem = 0;
    let dentro = false;
    for (let i = 0; i < primeira.length; i++) {
      const c = primeira[i];
      if (c === '"') dentro = !dentro;
      else if (c === candidato && !dentro) contagem++;
    }
    if (contagem > maximo) { maximo = contagem; melhor = candidato; }
  }
  return melhor;
}

export interface ProblemaDeLinha {
  /** 1-indexada e **incluindo o cabeçalho**, que é como a pessoa vê no Excel. */
  linha: number;
  erro: 'colunas_a_mais' | 'colunas_a_menos' | 'aspas_por_fechar';
  detalhe: string;
}

export interface LeituraDeCsv {
  cabecalho: readonly string[];
  linhas: ReadonlyArray<readonly string[]>;
  problemas: readonly ProblemaDeLinha[];
}

/**
 * Lê um CSV e devolve **os problemas por linha**, não a primeira excepção.
 *
 * O contrato pede *"mostrar erros por linha"*, e a razão é prática: quem exporta
 * do sistema antigo tem quatrocentas linhas e três erradas. Parar na primeira
 * obriga a quatro voltas de tentativa e erro, e ao fim da segunda a pessoa
 * desiste da importação e escreve a carta à mão.
 *
 * As linhas com problema **não entram** em `linhas`. Uma linha com colunas a
 * menos lida à mesma daria campos deslocados — o preço no sítio da descrição —
 * e isso é pior do que recusá-la.
 */
export function lerCsv(texto: string, separadorPedido?: string): LeituraDeCsv {
  const limpo = texto.replace(/^\uFEFF/, '');
  const separador = separadorPedido ?? detectarSeparador(limpo);
  const problemas: ProblemaDeLinha[] = [];

  // Percorre carácter a carácter: um `split('\n')` parte campos com quebra de
  // linha dentro de aspas, que é CSV legal e aparece em descrições de pratos.
  const registos: string[][] = [];
  let campo = '';
  let registo: string[] = [];
  let dentro = false;
  let linhaDoRegisto = 1;
  let linhaActual = 1;

  const fecharCampo = () => { registo.push(campo); campo = ''; };
  const fecharRegisto = () => {
    fecharCampo();
    registos.push(registo);
    registo = [];
    linhaDoRegisto = linhaActual + 1;
  };

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i]!;
    if (dentro) {
      if (c === '"') {
        if (limpo[i + 1] === '"') { campo += '"'; i++; } else dentro = false;
      } else {
        if (c === '\n') linhaActual++;
        campo += c;
      }
      continue;
    }
    if (c === '"' && campo === '') { dentro = true; continue; }
    if (c === separador) { fecharCampo(); continue; }
    if (c === '\r') continue;
    if (c === '\n') { fecharRegisto(); linhaActual++; continue; }
    campo += c;
  }
  if (dentro) {
    problemas.push({
      linha: linhaDoRegisto, erro: 'aspas_por_fechar',
      detalhe: 'o ficheiro acaba com aspas abertas',
    });
  }
  if (campo !== '' || registo.length > 0) fecharRegisto();

  // Uma última linha vazia (o ficheiro acaba em quebra) não é um registo.
  while (registos.length > 0) {
    const ultimo = registos[registos.length - 1]!;
    if (ultimo.length === 1 && ultimo[0] === '') registos.pop();
    else break;
  }

  const cabecalho = registos.shift() ?? [];
  const linhas: string[][] = [];
  registos.forEach((r, i) => {
    const numero = i + 2; // +1 pelo cabeçalho, +1 porque a pessoa conta de 1
    if (r.length > cabecalho.length) {
      problemas.push({
        linha: numero, erro: 'colunas_a_mais',
        detalhe: `${r.length} campos para ${cabecalho.length} colunas`,
      });
      return;
    }
    if (r.length < cabecalho.length) {
      problemas.push({
        linha: numero, erro: 'colunas_a_menos',
        detalhe: `${r.length} campos para ${cabecalho.length} colunas`,
      });
      return;
    }
    linhas.push(r);
  });

  return { cabecalho, linhas, problemas };
}
