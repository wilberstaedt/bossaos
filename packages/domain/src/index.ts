// Domínio partilhado do BossaOS.
//
// Portas, o contexto de inquilino e as chaves que o levam para fora da base.
// As entidades do produto continuam a entrar nas etapas que as desenham — não se
// criam tabelas nem tipos vazios para o futuro.
//
// Zero React e zero Prisma aqui dentro, como o `overview.md` manda: este pacote
// define o que o mundo tem de cumprir, não como o cumpre.
export type { PortaDeMedia, FicheiroGuardado } from './portas/media.ts';

export {
  resolverContexto,
  type Filiacao, type Alvo, type ContextoDeInquilino,
  type RecusaDeContexto, type ResolucaoDeContexto,
} from './tenant.ts';

export {
  negarTudo, autorizacaoPorConcessoes,
  type PortaDeAutorizacao, type PedidoDeAutorizacao, type Decisao,
} from './portas/autorizacao.ts';

export {
  chaveDeCache, prefixoDeMedia, nomeDeEvento, chaveDeTarefa, type EscopoDeChave,
} from './chaves.ts';

export {
  ACCOES, alcanca, podeFazer, accoesPermitidas, podeConceder, accoesDoPapel,
  type Accao, type Papel, type Concessao, type EscopoDoRecurso,
} from './permissoes.ts';

export {
  decidirLeitura, exigirAccao, estadoHttp, corpoDaResposta, type Resultado,
} from './acesso.ts';

export {
  CAPACIDADES, tipoDaCapacidade, decidirCapacidade, estadoHttpDeCapacidade,
  type Capacidade, type TipoDeCapacidade, type Concessao as ConcessaoDeCapacidade,
  type Flag, type Intencao, type PedidoDeCapacidade, type ResultadoDeCapacidade,
} from './capacidades.ts';
