// Sistema visual da BossaOS.
//
// A folha de estilos importa-se à parte, uma vez, na raiz da aplicação:
//   import '@bossaos/ui/estilos.css';

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
  type TemaPublico, type ResultadoDeTema, type VeredictoDeToken,
} from './tema.ts';

export { Botao, type BotaoProps, type TomDoBotao, type Densidade } from './componentes/Botao.tsx';
export { Etiqueta, type EtiquetaProps, type TomDeEtiqueta } from './componentes/Etiqueta.tsx';
export { Cartao, type CartaoProps } from './componentes/Cartao.tsx';
export { Campo, Seletor, type CampoProps, type SeletorProps } from './componentes/Campo.tsx';
export { Aviso, type AvisoProps, type TomDeAviso } from './componentes/Aviso.tsx';
export { Tabela, type TabelaProps, type Coluna } from './componentes/Tabela.tsx';
export { Estado, type EstadoProps, type Facto, type TomDeEstado } from './componentes/Estado.tsx';
export { Separadores, type SeparadoresProps, type Separador } from './componentes/Separadores.tsx';
export { Dialogo, Gaveta, type DialogoProps } from './componentes/Dialogo.tsx';
export { Notificacao, Notificacoes, type NotificacaoProps } from './componentes/Notificacao.tsx';

export {
  EstruturaAdmin, type EstruturaAdminProps, type LigacaoDeNavegacao,
} from './estruturas/EstruturaAdmin.tsx';
export { EstruturaPublica, type EstruturaPublicaProps } from './estruturas/EstruturaPublica.tsx';
export {
  EstruturaStaff, EstruturaKds, type EstruturaStaffProps, type EstruturaKdsProps,
} from './estruturas/EstruturaOperacao.tsx';
