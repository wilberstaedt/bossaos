// Interface partilhada do BossaOS.
//
// Nesta etapa exporta apenas fichas de design. Componentes entram com as telas
// que os justificam — o E01 manda explicitamente não gerar menus e rotas de
// módulos que ainda não existem, e uma biblioteca de componentes sem ecrã que
// os use é a mesma armadilha noutra pasta.
export { cores, espaco, raio, type Cor } from './tokens.ts';
