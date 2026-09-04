/**
 * As REGRAS do sistema visual, sem uma linha de React.
 *
 * Existe porque `packages/db` precisa de validar um tema antes de o gravar, e o
 * `overview.md` diz que ele depende de `domain (só tipos)` — não do pacote de
 * interface. Importar a entrada principal traria componentes JSX para dentro da
 * camada de dados, e o `tsc` dela nem sequer tem `--jsx` ligado.
 *
 * A alternativa era duplicar o cálculo de contraste. Uma segunda implementação
 * da mesma régua é a forma mais rápida de as duas divergirem — e nesse dia uma
 * publica o que a outra reprova.
 */
export {
  fichas, marca, acentoSinal, coralDaLogo, superficie, texto, linha, estado, foco,
  tipografia, espaco, grade, raio, movimento, alvoDeToque,
  TOKENS_TEMAVEIS, type TokenTemavel,
} from './fichas.ts';

export {
  LIMIAR, lerHex, luminanciaRelativa, razaoDeContraste, razaoArredondada,
  cumpre, melhorTextoSobre, type TamanhoDeTexto, type EscolhaDeTexto,
} from './contraste.ts';

export {
  TEMA_BOSSAOS, validarTema, tokensNaoPermitidos, variaveisDoTema,
  normalizarCor, coresMalFormadas,
  type TemaPublico, type ResultadoDeTema, type VeredictoDeToken,
} from './tema.ts';
