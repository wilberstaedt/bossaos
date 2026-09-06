import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Cliente Prisma do RUNTIME.
 *
 * A separação de credenciais do aceite 2 do E01 não é aqui uma convenção que
 * alguém tem de lembrar: em Prisma 7 a URL saiu do schema, e por isso ela vive
 * em dois sítios diferentes e incomunicáveis do código —
 *
 *   - `prisma.config.ts` → `MIGRATION_DATABASE_URL`, a credencial que ALTERA o
 *     schema. Só os comandos `prisma migrate` passam por lá.
 *   - este ficheiro       → `DATABASE_URL`, a credencial do runtime, entregue
 *     explicitamente ao adaptador. Não tem DDL (ver `scripts/dev-db.sh`).
 *
 * Não há caminho pelo qual o runtime alcance a credencial de migração por
 * distração, porque não há sítio nenhum onde ele a leia.
 */
let cliente: PrismaClient | undefined;

export function obterPrisma(databaseUrl: string): PrismaClient {
/**
   * `options: '-c timezone=UTC'` não é preferência — é uma correcção.
   *
   * Medido: com a sessão em `Europe/Madrid`, `SELECT now()` devolvia
   * `12:57:56Z` pelo `pg` e **`14:57:56Z` pelo Prisma** — duas horas, exactamente
   * o desvio do fuso. O adaptador lê a renderização local do `timestamptz` e
   * rotula-a como UTC.
   *
   * Apareceu num convite expirado que era aceite: a base dizia
   * `expires_at <= now()` e o código lia uma data duas horas no futuro. Mas o
   * defeito não era dos convites — seria de **todos** os prazos, reservas, turnos
   * e carimbos de auditoria, e num produto de restauração isso é uma mesa
   * reservada à hora errada.
   *
   * Com a sessão em UTC a renderização local É UTC e o desvio desaparece. Está
   * provado em `packages/db/src/fuso.test.ts`, que compara `now()` do Prisma com
   * o relógio do processo e falha se divergirem mais de cinco segundos.
   */
  cliente ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl, options: '-c timezone=UTC' }),
  });
  return cliente;
}

export type EstadoBase =
  | { ok: true; migrado: boolean; schemaVersion: string | null }
  | { ok: false; erro: string };

/**
 * Prontidão real (CT-03: "uma falha de infraestrutura deve retornar
 * indisponibilidade real; não simular banco saudável").
 *
 * Faz DUAS perguntas, porque uma sozinha engana:
 *  1. a base responde? (`SELECT 1` responde numa base vazia — não basta);
 *  2. este schema chegou cá? (lê `app_meta`, que só existe depois da migração).
 */
export async function verificarBase(prisma: PrismaClient): Promise<EstadoBase> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.name : 'erro desconhecido' };
  }
  try {
    const linha = await prisma.appMeta.findUnique({ where: { key: 'schema_version' } });
    return { ok: true, migrado: linha !== null, schemaVersion: linha?.value ?? null };
  } catch {
    // A base responde mas a tabela não existe: schema por migrar. Isto é um
    // estado REAL e distinto de "base em baixo" — e é o que um deploy sem
    // migração produz.
    return { ok: true, migrado: false, schemaVersion: null };
  }
}

export {
  comEscopo, comEscopoSerializavel, comIdentidade, identidadePorEmail,
  type ClienteComEscopo, type ClienteComIdentidade, type Escopo,
} from './escopo.ts';

export {
  listarMarcas, obterMarca, criarMarca,
  listarUnidades, obterUnidade, criarUnidade,
  type PessoaComAcesso,
  papeisDaFiliacao, filiacoesDaOrganizacao,
  organizacoesDoUtilizador, filiacoesDoUtilizador, euProprio,
  concessoesDoActor, pessoasEAcessos, revogarPertenca,
  type DadosDeMarca, type DadosDeUnidade,
} from './repositorios.ts';

export {
  criarConvite, aceitarConvite, revogarConvite, listarConvites,
  organizacaoDoConvite, resumoDoToken, resumosIguais,
  type DadosDeConvite, type ResultadoDeConvite, type ResultadoDeAceitacao,
  type FalhaAoConvidar, type FalhaAoAceitar,
} from './convites.ts';

export { registar, listarAuditoria, type EventoDeAuditoria } from './auditoria.ts';

export {
  estadoComercial, podeCapacidade, contarUnidades, contarPessoas, contarProdutos,
  catalogoDePlanos,
  type EstadoComercial,
} from './planos.ts';

export {
  CAPACIDADE_DO_TEMA, temaActivo, temaPublico, guardarTema, reverterAoPadrao,
  restaurarTemaAnterior, previaDeDescida, destinosPublicos, rascunhoDoTema,
  guardarRascunho, publicarRascunho, descartarRascunho, historicoDoTema,
  type RascunhoDoTema, type ResultadoDoRascunho, type ResultadoDaPublicacaoDeTema,
  type ResultadoDeGravacao,
} from './tema.ts';

export { obterPrismaDeAutenticacao } from './autenticacao.ts';

export { PrismaClient };

export {
  aplicarDescidaAgendada, descidasDevidas, previaDeDescidaParaPlano, estadoComercialSeFosse,
  pendenciasQueBloqueiamDescida, registarDetectorDePendencia, detectoresRegistados,
  type Pendencia, type DetectorDePendencia, type ResultadoDaDescida,
} from './descidas.ts';

export {
  ePlataforma, organizacoesDaPlataforma, organizacaoDaPlataforma,
  concessoesDaPlataforma, flagsDaPlataforma, implantacoes,
  type OrganizacaoDaPlataforma, type DetalheDaOrganizacao, type ConcessaoDaPlataforma,
  type FlagDaPlataforma, type Implantacao, type FaseDeImplantacao,
} from './plataforma.ts';

export {
  lerHorario, aberturaAgora, validarDia, guardarSemana, esquecerDia,
  guardarExcepcao, apagarExcepcao,
  type ErroDeHorario, type ResultadoDaGravacao as ResultadoDeHorario,
} from './horarios.ts';

export {
  comIdempotencia, criarOrganizacaoComDono, lerPerfil, guardarPerfil, perfilCompleto,
  progressoDoArranque, marcarPasso, arranqueDaOrganizacao,
  dependenciasDaUnidade, arquivarUnidade, desarquivarUnidade,
  type Idempotencia, type ResultadoIdempotente, type PerfilDaOrganizacao,
  type Dependencia, type ResultadoDeArquivo,
} from './onboarding.ts';

export {
  CANAIS, listarProdutos, obterProduto, guardarProduto,
  precoEfectivo, precosDoProduto,
  fichaDeAlergeniosDoProduto, guardarAlergenios,
  gruposDoProduto, validarEscolhasDoProduto, guardarGrupo,
  bloquearProduto, desbloquearProduto, estaDisponivel,
  type Canal, type FiltroDeProdutos, type DadosDeProduto,
  type ResultadoDeEdicao, type DeclaracaoParaGravar,
} from './catalogo.ts';

export {
  montarRevisao, publicar, publicacaoActual, preverPublicacao, historicoDeRevisoes,
  type ItemDaRevisao, type ResultadoDePublicacao,
} from './publicacao.ts';

export {
  LIMITE_BYTES, guardarMedia, buscarPorUrl, listarMedia, ligarAoProduto, substituirConteudo,
  type EntradaDeMedia, type ResultadoDeCarregamento, type RecusaDeBusca,
} from './media.ts';

export {
  impressaoDoProduto, traducoesDoProduto, guardarTraducao, textoDoProduto,
  coberturaDeTraducoes, guardarPrevia, confirmarImportacao, linhasParaGravar,
  catalogoParaCsv, neutralizarCampo, pedirExportacao, podeDescarregar, listarExportacoes,
  type LinhaDeTraducao,
} from './conteudo.ts';

export {
  cartaPublica, horarioPublico, abertoAgora, registarConsulta,
  reservarEnderecoPublico, largarEnderecoPublico,
  type CartaServida, type HorarioPublico, type OrigemDeConsulta, type ResultadoDaReserva,
} from './publico.ts';

export {
  sitePublico, sitePublicoPorDominio, rascunhoDoSite, criarSiteSeFaltar,
  publicarSite, retirarSite,
  type SiteServido, type ResultadoDaPublicacao, type BloqueioDePublicacao,
} from './sites.ts';

export {
  guardarLead, guardarLeadPublico, leadsDaUnidade, registarPedidoDeDemo,
  type ResultadoDoLead, type ResultadoDoLeadPublico, type ResultadoDoPedidoDeDemo,
} from './leads.ts';

export {
  gerarTokenDeProva, vincularDominio, largarDominio, dominiosDaUnidade, registarVerificacao,
  type ResultadoDoVinculo, type DominioVinculado,
} from './dominios.ts';

// ── E13 · sala, sessões, dispositivos e PIN ────────────────────────────────
export {
  abrirSessao, fecharSessao, iniciarEncerramento, iniciarLimpeza, atribuirResponsavel,
  transferirSessao, arquivarMesa,
  registarEvento, listarZonas, listarMesas, salaAgora, historicoDaSessao,
  listarCombinacoes, listarTiposDeServico, pessoasDaUnidade,
  type Actor, type ResultadoDeAbertura, type ResultadoDeFecho,
  type ResultadoDaTransferencia, type ResultadoDeArquivoDeMesa, type ResultadoDeResponsavel,
} from './sala.ts';

export {
  dispositivoPodeComandar, definirPin, entrarComPin, criarPareamento, usarPareamento,
  revogarDispositivo, listarDispositivos, turnoAberto, resumirToken, declararRascunhos,
  type ResultadoDoPin, type ResultadoDoPareamento, type ResultadoDaRevogacao,
} from './dispositivos.ts';

// ── E14 · motor de pedidos ─────────────────────────────────────────────────
export {
  enviarPedido, acrescentarLinhas, guardarPedido, cancelarLinha, pedidoPorComando,
  listarPedidos, obterPedido, historicoDoPedido, totalDoPedido, resumoDoEnvio,
  type LinhaProposta, type ResultadoDoEnvio, type ConflitoRecuperavel, type ActorDoPedido,
} from './pedidos.ts';

export {
  resumoDoServico, porCanal, porProduto, porCategoria, porFranja, porMesa,
  type ResumoDoServico,
} from './relatorios.ts';

// ── E16 · produção, estações e KDS ─────────────────────────────────────────
export {
  listarEstacoes, guardarEstacao, listarRegras, guardarRegra, apagarRegra,
  estacoesParaProduto, criarTarefasDasLinhas, tarefasDaEstacao, estadoDerivado,
  transitarTarefa, priorizarTarefa, cancelarTarefasDaLinha, eventosDesde, cursorActual,
  type EstadoDaProducao, type ActorDeProducao, type ResultadoDaTransicao,
  type EventoDeProducao,
} from './producao.ts';

// ── E17 · o QR da mesa e o visitante ───────────────────────────────────────
export {
  resumirSegredo, segredoNovo, rodarQrDaMesa, sessoesVivasDaMesa, revogarAcessoDaMesa,
  abrirVisitante, visitanteActivo, visitanteFalou, visitantesDaUnidade, estadoDoVisitante,
  JANELA_DE_CHAMADA_SEGUNDOS, chamarASala, chamadasDaVisita, chamadasPorAtender,
  atenderChamada, pedidosDoVisitante, producaoDoVisitante, pedirDoVisitante,
  type PedidoDoVisitante, type LinhaDoVisitante,
  type ResultadoDaRotacao, type VisitanteAberto, type VisitanteActivo,
  type TipoDeChamada, type ChamadaDaMesa, type ChamadaVista,
} from './visitante.ts';

// ── E18 · reservas e capacidade concorrente ──
export {
  TENTATIVAS_DE_SERIALIZACAO,
  lerDefinicoes, guardarDefinicoes,
  ocupacaoNoIntervalo, mesasBloqueadas, disponibilidade, comensaisPorZona,
  confirmarReserva, reagendar, cancelar, registarNaoCompareceu, sentar,
  varrerRetencoesExpiradas,
  listarTurnos, listarCapacidades, listarBloqueios, listarReservas,
  resolverHoraLocal, agoraDaBase, segredoDeGestao,
  type DefinicoesDeReserva, type Ocupacao, type Disponibilidade,
  type PedidoDeReserva, type ResultadoDaConfirmacao, type ResultadoDoReagendamento,
  type MotivoDeRecusa,
} from './reservas.ts';

// ── E19 · lista de espera ──
export {
  entrarNaEspera, esperaDaUnidade, posicaoNaEspera, esperaEstimada,
  sugestoesParaMesa, chamarDaEspera, sentarQuemEsperava, desistir,
  type EntradaNaEspera,
} from './espera.ts';

// ── E19 · a porta pública da reserva ──
export {
  JANELA_PUBLICA_SEGUNDOS, MAXIMO_PUBLICO_POR_JANELA,
  unidadePublica, horariosPublicos, reservarDaRua, esperarDaRua, estadoDaEsperaPublica,
  reservaPorSegredo,
  type UnidadePublica, type HorarioOferecido, type ResultadoPublico, type RecusaPublica,
} from './reserva-publica.ts';

// ── E19 · o host ──
export {
  agendaDoDia, chegadasPorHora, reservasAChegar, atrasadas,
  marcarChegada, sentarReserva, abrirWalkIn, reservaPorId, relatorioDeReservas,
  horaDaCasa,
  type ReservaDoDia, type NumeroComDefinicao,
} from './host.ts';

// ── E19 · mensagens ──
export {
  conectorDaUnidade, templateDe, enfileirar, historicoDeMensagens, acontecimento,
  listarTemplates, guardarTemplate, guardarConector,
  type Conector, type ResultadoDaMensagem, type MensagemNoHistorico,
} from './mensagens.ts';

// ── E20 · pedidos para mais tarde, takeaway e entrega ──
export {
  horaDeEntrega, preparoDoPedido, agendarPedido, agendadosPorEntrar,
  areaQueServe, guardarArea, listarAreas, marcarParaEntrega,
  conectorDeEntrega, guardarConectorDeEntrega, guardarMapaExterno,
  listarMapasExternos, receberPedidoExterno, agendadosEmRisco,
  filaDoCanal, marcarSaida,
  type HoraDeEntrega, type RecusaDeAgendamento, type ResultadoDaArea,
  type ConectorDeEntrega, type ResultadoExterno, type PedidoEmRisco,
} from './mais-tarde.ts';
export * from './contas.ts';
export {
  abrirCaixa, contar, corrigirMovimento, entrarPagamentoEmDinheiro, esperadoNaGaveta,
  estadoDaCaixa, fecharCaixa, historicoDeCaixas, movimentar, rastoDaCaixa, reabrirCaixa,
  resumoDaCaixa, RecusaDaCaixa, type EstadoDaCaixa, type RecusaDeCaixa,
} from './caixa.ts';
export {
  acontecimentosDaConta, assinaturaConfere, conectorDePagamento, estadoAutorizado,
  guardarConectorDePagamento, receberWebhook, reconciliarComProvedor, RecusaDeWebhook,
  type AcontecimentoDoProvedor, type RecusaDoAdquirente, type ResultadoDoWebhook,
} from './adquirente.ts';
export { reciboPublico } from './visitante.ts';
export {
  conectorFiscal, corrigirDocumento, eDocumentoFiscal, enviarDocumento, filaFiscal,
  guardarConectorFiscal, pedirDocumento, responderDocumento, RecusaDoFiscal,
  type RecusaFiscal,
} from './fiscal.ts';
export {
  consumirPelaLinha, criarFicha, criarInsumo, dividaDeStock, fichasDaUnidade,
  folhasDaFicha, insumosDaUnidade, juntarLinhaDaFicha, movimentarStock,
  movimentosDoInsumo, RecusaDoStock, MILI, type RecusaDeStock,
} from './stock.ts';
export {
  artigosDoFornecedor, conferirEncomenda, converterParaUso, criarEncomenda,
  criarFornecedor, custoDoInsumo, encomendasDaUnidade, fornecedoresDaUnidade,
  juntarLinhaDaEncomenda, ligarArtigo, receber, registarFactura,
  RecusaDaCompra, UMA_UNIDADE,
  type CustoDoInsumo, type LinhaConferida, type RecusaDeCompra,
} from './compras.ts';
export {
  audiencia, campanhasDaUnidade, clientesDaUnidade, consentimentosDe, criarCampanha,
  criarCliente, criarModeloDeCampanha, criarRecompensa, criarSegmento, enviarCampanha,
  enviosDaCampanha, feedbackDaRua, juntarContactos, modelosDaUnidade, movimentarPontos,
  movimentosDePontos, origensDaUnidade, recompensasDaUnidade, registarConsentimento,
  resgatar, respostasDaUnidade, segmentosDaUnidade, temConsentimento,
  RecusaDoCrm,
  type CanalDeContacto, type Finalidade, type RecusaDeCrm, type RegraDeSegmento,
  type ResultadoDaCampanha,
} from './crm.ts';
export {
  corrigir, correccoesDaUnidade, criarFuncao, criarTurno, diaDeServicoDe,
  equipaDaUnidade, funcoesDaUnidade, jornadaDoDia, jornadasDaUnidade,
  marcacoesDoDia, picar, turnosDaSemana,
  RecusaDoPonto, CORTE_DO_SERVICO_MINUTOS,
  type JornadaDoDia, type MarcacaoLida, type RecusaDePonto,
} from './ponto.ts';
export {
  caixaDoPeriodo, centrosDeCusto, confirmarCorrespondencia, contasDaUnidade,
  converterTotal, correspondenciasDaConta, criarConta, criarPeriodo,
  extractoDaConta, fecharPeriodo, importacoesDaConta, importarExtracto,
  periodosDaUnidade, reabrirPeriodo, registarMovimento, resultadoDoPeriodo,
  sugerirCorrespondencia, totalizar, RecusaDoFinanceiro,
  type Convertido, type LinhaConciliada, type LinhaDeRelatorio,
  type LinhaDoFicheiro, type RecusaFinanceira, type ResultadoDaImportacao,
  type TotalPorMoeda,
} from './financeiro.ts';
export {
  estadoDosPagamentos, evolucaoDeCustos, janelasDasUnidades,
  movimentosDeArmazem, porCampanha, previsaoDaClonagem, recorrencia,
  totalDaOrganizacao, trabalhoPorFuncao, vendasPorUnidade,
  type Diferenca, type IndicadorDaUnidade, type JanelaDaUnidade,
  type LinhaDeIndicador,
} from './analitica.ts';

export {
  RecusaDoKiosk, abrirSessaoDeKiosk, apagarPessoa, estadoDoKiosk, ligarPessoaAoPedido,
  sessaoViva, terminarSessao,
  type MotivoDeSaida, type RecusaDeKiosk,
} from './kiosk.ts';

export {
  RecusaDaImpressao, desactivarImpressora, enfileirarComanda, enfileirarImpressao,
  entregueAPonte, filaDaUnidade, impressorasDaUnidade, registarImpressora,
  respostaDoAparelho,
  type RecusaDeImpressao,
} from './impressao.ts';

export {
  apagarPessoaNoKiosk, comecarNoKiosk, estadoParaOEcra, kioskDoAparelho,
  ligarPessoaNoKiosk, terminarNoKiosk, type KioskPublico,
} from './kiosk-publico.ts';

export {
  RecusaDaIntegracao, assinarCorpo, criarChave, criarEndpoint,
  declararIntegracao, enfileirarEntrega, entregar, facturasDoSaas,
  ligarClienteSaas,
  listarChaves, listarIntegracoes, registosDaIntegracao, resumirChave,
  revogarChave, seguroParaSeguir, verificarChave, type RecusaDeIntegracao,
} from './integracoes.ts';

export {
  aplicarEventoDeCobrancaPublico, receberEventoDeCobrancaPublico,
} from './saas-publico.ts';

export {
  autorizarChave, comOEscopoDaChave, registarChamadaPublica, type Autorizado,
} from './api-publica.ts';

export {
  RecusaDePlataforma, abrirPedidoDeAjuda, abrirSessaoDeSuporte, auditoriaDaCasa,
  concederCapacidade, denuncias, enfileirarTrabalho, guardarPoliticaDeAcesso,
  guardarPoliticaDeRetencao, incidentesPublicos, incidentesTodos,
  pedidosDeAjuda, politicaDeAcesso, politicaDeRetencao, reprocessarTrabalho,
  segredosDaPlataforma, sessaoAutoriza, sessoesDaCasa, terminarSessaoDeSuporte,
  trabalhosDaPlataforma, type RecusaDaPlataforma,
} from './plataforma-suporte.ts';
