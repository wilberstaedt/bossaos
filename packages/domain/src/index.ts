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
  chaveDeCache, chaveDaCartaPublica, prefixoDeMedia, nomeDeEvento, chaveDeTarefa, type EscopoDeChave,
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

export {
  estaAberto, momentoLocal, instanteNaZona, intervaloValido, intervalosSeSobrepoem, diaAnterior,
  diasConfigurados, paraRelogio, deRelogio, MINUTOS_POR_DIA,
  type DiaDaSemana, type Intervalo, type EstadoDoDia, type Excepcao,
  type Horario, type Abertura,
} from './horarios.ts';

export {
  listaDeArranque, pendentesDoArranque, podeSeguirParaCatalogo,
  type EstadoDoItem, type ItemDeArranque, type FactosDoArranque,
} from './arranque.ts';

export {
  escalaDaMoeda, moedaValida, deTextoParaMenor, deMenorParaTexto, somar,
  dividirEmPartes, dividirPorPesos,
  type Dinheiro, type ErroDeSoma,
} from './dinheiro.ts';

export {
  ALERGENIOS_UE, PREFERENCIAS, estadoDoAlergenio, fichaDeAlergenios,
  porDeclarar, revisaoDaFicha, avisoDeSeguranca, avisosPorAlergenio,
  type EstadoDeclarado, type EstadoDeAlergenio, type Declaracao,
  type LinhaDeAlergenio, type AlergenioUE, type Preferencia, type TomDoAlergenio,
} from './alergenios.ts';

export {
  NIVEIS, nivelDaRegra, resolverPreco, precosPorCanal, unidadesAfectadasPelaBase,
  type Nivel, type RegraDePreco, type PedidoDePreco, type ResultadoDePreco,
} from './precos.ts';

export {
  MENSALIDADES_NUM_ANO, IMPOSTOS_INCLUIDOS, MOEDA_COMERCIAL, precoDoPlano, coresPublicasDoPlano,
  planosComAnualIncoerente, type CodigoDePlano, type PrecoDePlano,
} from './precificacao.ts';

export {
  validarGrupo, validarEscolhas,
  type GrupoDeModificadores, type ErroDeEscolha,
} from './modificadores.ts';

export {
  neutralizarCampo, paraCsv, lerCsv, detectarSeparador,
  type OpcoesDeEscrita, type LeituraDeCsv, type ProblemaDeLinha,
} from './csv.ts';

export {
  classificarIp, lerIpv4, validarUrlDeBusca, algumEnderecoInterno,
  type ClasseDeEndereco, type DecisaoDeEndereco, type RecusaDeEndereco,
} from './enderecos.ts';

export {
  IMAGENS_PERMITIDAS, tipoPorConteudo, aceitarFicheiro,
  type TipoDeFicheiro, type PedidoDeFicheiro, type ResultadoDeFicheiro,
  type RecusaDeFicheiro, type Aceitacao,
} from './ficheiros.ts';

export {
  IDIOMAS_DE_CONTEUDO, impressaoDoTexto, estadoDaTraducao, resolverTexto, coberturaPorIdioma,
  type IdiomaDeConteudo, type EstadoDaTraducao, type Traducao,
  type TextoResolvido, type OrigemDoTexto, type CoberturaDeIdioma,
} from './traducoes.ts';

export {
  bloqueiosDePublicacao, compararRevisoes, proximaRevisao,
  type ItemParaPublicar, type Bloqueio, type MotivoDeBloqueio,
  type Mudanca, type TipoDeMudanca, type Revisao, type PoliticaDePublicacao,
} from './publicacao.ts';

export {
  preverImportacao, linhasParaGravar,
  type Estrategia, type ColunasMapeadas, type Previa, type LinhaDaPrevia,
  type AccaoDaLinha, type ErroDeImportacao, type Existente,
} from './importacao.ts';

export {
  VALIDADE_PADRAO_MS, decidirDescarregamento, expiraEm, identificadorAdivinhavel,
  type Exportacao, type DecisaoDeDescarregamento, type RecusaDeDescarregamento,
} from './exportacao.ts';

export {
  CAMPOS_DE_PRODUTO, CAMPOS_DE_CATEGORIA, CAMPOS_DE_CARTA,
  projectarCarta, produtoDaCarta, procurarNaCarta,
  type CartaPublica, type CategoriaPublica, type ProdutoPublico, type PedidoDeProjeccao,
} from './projeccao.ts';

export {
  VERSAO_MAXIMA, codificar, descodificar, paraSvg, versaoParaBytes, densidade,
  penalidadeDosModulos, penalidadePorMascara,
  capacidadeEmDados, palavrasTotais, estruturaDeBlocos, lado,
  correccao, sindromes, infoDeFormato, infoDeVersao,
  modulosDeDadosDaVersao, percursoDeDados,
  type NivelDeCorreccao, type Codigo,
} from './qr.ts';

export {
  TIPOS_DE_PAGINA, REDES,
  CAMPOS_DE_SITE, CAMPOS_DE_PAGINA, CAMPOS_DE_POST,
  projectarSite, novidadeDoSite, paginaDoSite, ligacaoSocialValida,
  type TipoDePagina, type Rede, type LigacaoSocial,
  type SitePublico, type PaginaPublica, type NovidadePublica,
  type ContactoPublico, type RascunhoDeSite,
} from './site.ts';

export {
  ORIGENS, MAXIMO_DA_MENSAGEM, validarLead, chaveDeLead,
  type OrigemDeLead, type LeadSubmetido, type RecusaDeLead,
} from './leads.ts';

export {
  ESTADOS_DE_DOMINIO, PREFIXO_DA_PROVA,
  avaliarVerificacao, serveConteudo, nomeDoRegistoDeProva, valorDoRegistoDeProva,
  type EstadoDeDominio, type RespostaDeDns, type Veredicto,
} from './dominios.ts';

export {
  TENTATIVAS_ATE_BLOQUEAR, MINUTOS_DE_BLOQUEIO, MINUTOS_DE_PAREAMENTO,
} from './dispositivos.ts';

export {
  aplicarNoKds, aplicarSequencia, projeccaoVazia, minutosDecorridos, repartirBacklog,
  type BilheteNoEcra, type EventoRecebido, type ProjeccaoDoKds,
  type ResultadoDaAplicacao, type EstadoDaTarefaNoEcra,
} from './kds.ts';

export { estadoDerivado, totalDoPedido } from './pedido-puro.ts';

export {
  sobrepoe, intervaloEfectivo, antecedencia, opcoesDeAlocacao,
  type IntervaloDeReserva, type RecusaDeAntecedencia,
  type MesaDisponivel, type CombinacaoDisponivel,
} from './reservas.ts';

export {
  mesasQueServem, posicaoDerivada, quemCabeNaMesa, estimativaEmMinutos,
  type MesaParaEspera, type NaEspera,
} from './espera.ts';
export {
  CORTE_DO_SERVICO_MINUTOS, diaDeServicoDe, minutosNoDiaDeServico,
} from './ponto.ts';
export {
  mediaPonderada, medido, porLinhaMenor, SEM_DADOS,
  type Agregado, type Medido,
} from './agregacao.ts';

export {
  SEGUNDOS_ATE_NAO_SABER, estadoDeImpressao, identidadeDeImpressao,
  marcaDaVia, renderizarComanda,
  type EnvioDeImpressao, type LeituraDeImpressao, type LinhaDeTalao,
} from './impressao.ts';
