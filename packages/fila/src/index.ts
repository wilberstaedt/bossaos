export {
  chaveDaParticao, mesmaParticao, sincronizavel, paraEnviar, suspensas, opacar, aoSair,
  type EntradaDaFila, type EstadoDaEntrada, type Particao, type ArmazemDaFila,
  type EntradaOpaca,
} from './fila.ts';

export {
  sincronizar, aplicarEvento, exigeRede, podeOffline, ACCOES_QUE_EXIGEM_REDE,
  type PortasDeRede, type RespostaDaConsulta, type RespostaDoEnvio,
  type ResumoDaSincronizacao, type AccaoQueExigeRede,
} from './sincronizacao.ts';

export {
  armazemDoNavegador, chaveDoArmazem, chavesNoAparelho, limparConteudoLegivel,
  porEnviarNoAparelho,
} from './navegador.ts';
