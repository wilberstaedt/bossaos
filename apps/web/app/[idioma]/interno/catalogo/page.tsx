import Link from 'next/link';
import { mensagensDe, formatarDinheiro, formatarDataHora, IDIOMAS, NOME_DO_IDIOMA, type Idioma } from '@bossaos/i18n';
import {
  Aviso, Botao, Campo, Cartao, Estado, Etiqueta, Seletor, Separadores, Tabela,
  alvoDeToque, espaco, estado as fichaEstado, marca, razaoArredondada, superficie,
  texto as fichaTexto, tipografia, validarTema,
} from '@bossaos/ui';
import { decidirCapacidade } from '@bossaos/domain';
import { DemoInteractiva } from '../../../../src/componentes/DemoInteractiva.tsx';
import { BloqueioDePlano } from '../../../../src/componentes/BloqueioDePlano.tsx';
import { CartoesDePlano, type PlanoDoCatalogo } from '../../../../src/componentes/CartoesDePlano.tsx';

/**
 * Planos de AMOSTRA, e é por isso que não vêm da base.
 *
 * O catálogo é uma página estática de inspecção: ir à base daqui obrigaria a
 * varredura do Playwright a ter uma base viva para medir uma cor. As
 * capacidades são as mesmas do catálogo real — se divergirem, a prova
 * `provas/planos.test.ts` apanha-o, porque compara os destaques com o que os
 * planos concedem de facto.
 */
const PLANOS_DE_AMOSTRA: readonly PlanoDoCatalogo[] = [
  { codigo: 'STARTER', nome: 'Starter', promessa: 'Publica bien', capacidades: [
    { capacidade: 'carta.digital', quota: null }, { capacidade: 'site.restaurante', quota: null }] },
  { codigo: 'RESTAURANT', nome: 'Restaurant', promessa: 'Conecta el servicio', capacidades: [
    { capacidade: 'carta.digital', quota: null }, { capacidade: 'site.restaurante', quota: null },
    { capacidade: 'reservas', quota: null }, { capacidade: 'sala', quota: null },
    { capacidade: 'kds', quota: null }, { capacidade: 'tema.coresProprias', quota: null }] },
  { codigo: 'PRO', nome: 'Pro', promessa: 'Amplía tu gestión', capacidades: [
    { capacidade: 'carta.digital', quota: null }, { capacidade: 'site.restaurante', quota: null },
    { capacidade: 'reservas', quota: null }, { capacidade: 'sala', quota: null },
    { capacidade: 'kds', quota: null }, { capacidade: 'tema.coresProprias', quota: null },
    { capacidade: 'tpv', quota: null }, { capacidade: 'stock', quota: null }] },
];

/**
 * A recusa do STATE-006 sai do MOTOR, não de texto escrito à mão.
 *
 * `decidirCapacidade` com zero concessões devolve `sem_plano`, e é esse objecto
 * que o bloco desenha. Um estado ilustrado com texto fixo continuaria bonito no
 * dia em que o motor deixasse de recusar.
 */
const RECUSA_DE_AMOSTRA = decidirCapacidade({
  capacidade: 'stock', intencao: 'usar', concessoes: [],
}) as Extract<ReturnType<typeof decidirCapacidade>, { permitido: false }>;

export const dynamic = 'force-static';

/**
 * Catálogo de componentes — superfície de INSPECÇÃO.
 *
 * Vive em `/interno/` e não numa rota comercial, como o E02 manda. Todos os
 * valores são de demonstração e estão rotulados como tal: o atlas avisa (p. 2)
 * que preços e nomes de pratos nele são ilustrativos, e repeti-los aqui sem
 * dizer que o são seria transformar um exemplo num facto.
 *
 * Os números de contraste não estão escritos à mão — são calculados na página,
 * pela mesma função que valida os temas dos clientes. Um catálogo que afirmasse
 * "13,05:1" em texto fixo mentiria no dia em que alguém mudasse a cor.
 */

const SECCAO: React.CSSProperties = { display: 'grid', gap: 24, marginBottom: 56 };

function Amostra({ nome, cor, sobre }: { nome: string; cor: string; sobre: string }) {
  const razao = razaoArredondada(cor, sobre);
  return (
    <div className="bo-cartao bo-cartao--contornado" style={{ padding: 16 }}>
      <div
        style={{
          background: cor,
          borderRadius: 8,
          height: 56,
          marginBottom: 12,
          border: '1px solid var(--bo-borda)',
        }}
      />
      <p style={{ fontWeight: 600 }}>{nome}</p>
      <p className="bo-campo__ajuda">
        <code>{cor}</code> · {razao}:1
      </p>
    </div>
  );
}

export default async function Catalogo({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);
  const tema = validarTema({});
  const momento = new Date('2026-12-31T20:05:00Z');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
      <a className="bo-saltar" href="#conteudo">
        {m.comum.saltarParaConteudo}
      </a>

      <header style={{ marginBottom: 40 }}>
        <p className="bo-estado__sobrancelha">BossaOS · E02</p>
        <h1>{m.catalogo.titulo}</h1>
        <p style={{ color: 'var(--bo-texto-secundario)', maxWidth: '70ch', marginTop: 12 }}>
          {m.catalogo.descricao}
        </p>
        <div style={{ marginTop: 16 }}>
          <Aviso tom="aviso" titulo={m.comum.datosDemostracion}>
            {m.catalogo.avisoDemo}
          </Aviso>
        </div>
        <nav aria-label={m.catalogo.seccaoIdiomas} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {IDIOMAS.map((i) => (
            <Link
              key={i}
              href={`/${i}/interno/catalogo`}
              className={`bo-botao ${i === idioma ? 'bo-botao--primario' : 'bo-botao--fantasma'}`}
              aria-current={i === idioma ? 'page' : undefined}
            >
              {NOME_DO_IDIOMA[i]}
            </Link>
          ))}
        </nav>
      </header>

      <main id="conteudo">
        {/* ── Fundações ─────────────────────────────────────────────────── */}
        <section style={SECCAO} aria-labelledby="s-fundacoes">
          <h2 id="s-fundacoes">{m.catalogo.seccaoFundacoes}</h2>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            <Amostra nome="Verde Atlântico" cor={marca.primaria} sobre={superficie.base} />
            <Amostra nome="Coral Bossa" cor={marca.acento} sobre={superficie.base} />
            <Amostra nome="Areia Clara" cor={superficie.base} sobre={marca.primaria} />
            <Amostra nome="Cítrico" cor={marca.realce} sobre={marca.primaria} />
            <Amostra nome="Texto secundário" cor={fichaTexto.secundario} sobre={superficie.base} />
          </div>
          <p className="bo-campo__ajuda">
            Razão de contraste medida contra a superfície em que cada cor é usada, calculada nesta
            página. WCAG 2.2: 4,5:1 para texto comum, 3:1 para texto grande e elementos gráficos.
          </p>

          {tema.avisos.length > 0 ? (
            <Aviso tom="aviso" titulo="Coral Bossa">
              {tema.avisos[0]}
            </Aviso>
          ) : null}

          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            {Object.entries(fichaEstado).map(([nome, cor]) => (
              <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Etiqueta tom={nome as 'sucesso'}>{nome}</Etiqueta>
                <span className="bo-campo__ajuda">
                  <code>{cor}</code> · {razaoArredondada(cor, superficie.base)}:1 sobre areia · fixo
                  em todos os planos
                </span>
              </div>
            ))}
          </div>

          <div>
            <h1 style={{ marginBottom: 8 }}>Rubik 700</h1>
            <h2 style={{ marginBottom: 8 }}>Título de secção</h2>
            <p style={{ maxWidth: '60ch' }}>
              Noto Sans 400 a {tipografia.escala.corpo.tamanho}/
              {tipografia.escala.corpo.entrelinha} px. Una mesa, cuatro personas, dos pedidos.
              Acentuação e € em três línguas: ação, coração, ñ, ç, 12,50&nbsp;€.
            </p>
            <p className="bo-campo__ajuda">
              Corpo mínimo {tipografia.tamanhoMinimo} px · grade de {espaco.xs} px · alvo de toque{' '}
              {alvoDeToque.publico} px no público e {alvoDeToque.operacao} px na operação
            </p>
          </div>
        </section>

        {/* ── Componentes ───────────────────────────────────────────────── */}
        <section style={SECCAO} aria-labelledby="s-componentes">
          <h2 id="s-componentes">{m.catalogo.seccaoComponentes}</h2>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Botao>{m.comum.guardar}</Botao>
            <Botao tom="secundario">{m.comum.cancelar}</Botao>
            <Botao tom="fantasma">{m.comum.voltar}</Botao>
            <Botao tom="perigo">{m.estado.arquivar.accao}</Botao>
            <Botao disabled>{m.comum.guardar}</Botao>
            <Botao aCarregar>{m.comum.guardar}</Botao>
            <Botao densidade="operacao">{m.comum.guardar} · 48 px</Botao>
          </div>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <Campo rotulo={m.estado.porGuardar.rotuloProduto} defaultValue="Croquetas caseras" />
            <Campo
              rotulo={m.catalogo.colunaPreco}
              defaultValue="12,50"
              inputMode="decimal"
              ajuda="Unidades mínimas inteiras no armazenamento."
            />
            <Campo
              rotulo={m.catalogo.colunaProduto}
              defaultValue=""
              erro={m.estado.erroAoGuardar.situacaoTitulo}
            />
            <Seletor rotulo={m.catalogo.colunaCanal} defaultValue="carta">
              <option value="carta">Carta digital</option>
              <option value="sala">Sala</option>
              <option value="recogida">Recogida</option>
            </Seletor>
          </div>

          <Separadores
            etiqueta={m.catalogo.seccaoComponentes}
            separadores={[
              {
                chave: 'tabela',
                rotulo: m.catalogo.colunaProduto,
                conteudo: (
                  <Tabela
                    legenda={`${m.catalogo.titulo} — ${m.comum.datosDemostracion}`}
                    colunas={[
                      { chave: 'nome', rotulo: m.catalogo.colunaProduto },
                      { chave: 'canal', rotulo: m.catalogo.colunaCanal },
                      { chave: 'preco', rotulo: m.catalogo.colunaPreco, numero: true },
                      { chave: 'situacao', rotulo: m.catalogo.colunaEstado },
                    ]}
                    linhas={[
                      { id: '1', nome: 'Croquetas caseras', canal: 'Carta digital', montante: 1250, situacao: 'sucesso' },
                      { id: '2', nome: 'Pulpo a la gallega', canal: 'Sala', montante: 2450, situacao: 'aviso' },
                      { id: '3', nome: 'Tarta de queso', canal: 'Recogida', montante: 690, situacao: 'perigo' },
                    ].map((l) => ({ ...l, preco: formatarDinheiro({ montanteMenor: l.montante, moeda: 'EUR' }, idioma) }))}
                    celula={(linha, coluna) =>
                      coluna.chave === 'situacao' ? (
                        <Etiqueta tom={linha.situacao as 'sucesso'}>
                          {linha.situacao === 'sucesso'
                            ? m.comum.enLinea
                            : linha.situacao === 'aviso'
                              ? m.estado.porGuardar.sobrancelha
                              : m.estado.erroAoGuardar.sobrancelha}
                        </Etiqueta>
                      ) : (
                        String(linha[coluna.chave] ?? '')
                      )
                    }
                  />
                ),
              },
              {
                chave: 'avisos',
                rotulo: m.estado.erroAoGuardar.sobrancelha,
                conteudo: (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <Aviso tom="info" titulo={m.estado.vazio.situacaoTitulo}>
                      {m.estado.vazio.situacaoDetalhe}
                    </Aviso>
                    <Aviso tom="sucesso" titulo={m.catalogo.exemploNotificacao} />
                    <Aviso tom="aviso" titulo={m.estado.porGuardar.titulo} />
                    <Aviso tom="perigo" urgente titulo={m.estado.erroAoGuardar.titulo}>
                      {m.estado.erroAoGuardar.situacaoDetalhe}
                    </Aviso>
                  </div>
                ),
              },
              {
                chave: 'cartoes',
                rotulo: m.catalogo.seccaoComponentes,
                conteudo: (
                  <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                    <Cartao titulo="Elevado">Superfície branca sobre a areia.</Cartao>
                    <Cartao variante="contornado" titulo="Contornado">Com borda, sem sombra.</Cartao>
                    <Cartao variante="suave" titulo="Suave">Superfície de apoio.</Cartao>
                  </div>
                ),
              },
            ]}
          />

          <DemoInteractiva
            rotuloDialogo={m.catalogo.abrirDialogo}
            rotuloGaveta={m.catalogo.abrirGaveta}
            tituloDialogo={m.catalogo.exemploDialogoTitulo}
            corpoDialogo={m.catalogo.exemploDialogoCorpo}
            tituloGaveta={m.catalogo.exemploGavetaTitulo}
            corpoGaveta={m.catalogo.exemploGavetaCorpo}
            rotuloGuardar={m.comum.guardar}
            rotuloCancelar={m.comum.cancelar}
            rotuloFechar={m.comum.fechar}
            tituloNotificacao={m.catalogo.exemploNotificacao}
          />
        </section>

        {/* ── Estados transversais ──────────────────────────────────────── */}
        <section style={SECCAO} aria-labelledby="s-estados">
          <h2 id="s-estados">{m.catalogo.seccaoEstados}</h2>
          <p className="bo-campo__ajuda">
            STATE-001, 002, 003, 005, 007 e 016 do atlas. São <strong>estados</strong>, não páginas:
            acontecem dentro da rota que carregou, falhou ou ficou vazia.
          </p>

          <div style={{ display: 'grid', gap: 40 }}>
            <Cartao variante="contornado">
              <Estado
                sobrancelha={m.estado.carga.sobrancelha}
                titulo={m.estado.carga.titulo}
                esqueleto={3}
                nota={m.estado.carga.nota}
                accaoPrincipal={<Botao tom="secundario" disabled>{m.estado.carga.accao}</Botao>}
              />
            </Cartao>

            <Cartao variante="contornado">
              <Estado
                sobrancelha={m.estado.vazio.sobrancelha}
                titulo={m.estado.vazio.titulo}
                situacao={{
                  tom: 'sucesso',
                  titulo: m.estado.vazio.situacaoTitulo,
                  detalhe: m.estado.vazio.situacaoDetalhe,
                }}
                factos={[
                  { rotulo: m.estado.vazio.rotuloContexto, valor: 'Catálogo sin productos' },
                  { rotulo: m.estado.vazio.rotuloProximoPasso, valor: 'Añade un producto o importa tu carta.' },
                  { rotulo: m.estado.vazio.rotuloAjuda, valor: 'Guía de primeros pasos' },
                ]}
                accaoPrincipal={<Botao>{m.estado.vazio.accao}</Botao>}
              />
            </Cartao>

            <Cartao variante="contornado">
              <Estado
                sobrancelha={m.estado.erroAoGuardar.sobrancelha}
                titulo={m.estado.erroAoGuardar.titulo}
                situacao={{
                  tom: 'perigo',
                  titulo: m.estado.erroAoGuardar.situacaoTitulo,
                  detalhe: m.estado.erroAoGuardar.situacaoDetalhe,
                }}
                factos={[
                  { rotulo: m.estado.erroAoGuardar.rotuloRascunho, valor: 'Conservado' },
                  { rotulo: m.estado.erroAoGuardar.rotuloCausa, valor: 'Conexión interrumpida' },
                  { rotulo: m.estado.erroAoGuardar.rotuloProximoPasso, valor: 'Revisa la conexión y vuelve a intentar.' },
                  { rotulo: m.estado.erroAoGuardar.rotuloAccaoSecundaria, valor: 'Volver al editor' },
                ]}
                accaoPrincipal={<Botao>{m.estado.erroAoGuardar.accao}</Botao>}
              />
            </Cartao>

            <Cartao variante="contornado">
              <Estado
                sobrancelha={m.estado.semAcesso.sobrancelha}
                titulo={m.estado.semAcesso.titulo}
                situacao={{
                  tom: 'perigo',
                  titulo: m.estado.semAcesso.situacaoTitulo,
                  detalhe: m.estado.semAcesso.situacaoDetalhe,
                }}
                factos={[
                  { rotulo: m.estado.semAcesso.rotuloAccao, valor: 'Editar precios' },
                  { rotulo: m.estado.semAcesso.rotuloFuncao, valor: 'Camarero' },
                  { rotulo: m.estado.semAcesso.rotuloAcessoNecessario, valor: 'Responsable de catálogo' },
                  { rotulo: m.estado.semAcesso.rotuloPedir, valor: 'Contactar al responsable' },
                ]}
                accaoPrincipal={<Botao>{m.estado.semAcesso.accao}</Botao>}
              />
            </Cartao>

            <Cartao variante="contornado">
              <Estado
                sobrancelha={m.estado.porGuardar.sobrancelha}
                titulo={m.estado.porGuardar.titulo}
                emCartao
                factos={[
                  { rotulo: m.estado.porGuardar.rotuloProduto, valor: 'Croquetas caseras' },
                  { rotulo: m.estado.porGuardar.rotuloAlteracao, valor: 'Descripción y precio' },
                  { rotulo: m.estado.porGuardar.rotuloGuardar, valor: 'Conservar el borrador' },
                  { rotulo: m.estado.porGuardar.rotuloDescartar, valor: 'Perder cambios locales' },
                ]}
                accaoSecundaria={<Botao tom="secundario">{m.comum.voltar}</Botao>}
                accaoPrincipal={<Botao>{m.estado.porGuardar.accao}</Botao>}
              />
            </Cartao>

            <Cartao variante="contornado">
              <Estado
                sobrancelha={m.estado.arquivar.sobrancelha}
                titulo={m.estado.arquivar.titulo}
                emCartao
                factos={[
                  { rotulo: m.estado.arquivar.rotuloElemento, valor: 'Producto de temporada' },
                  { rotulo: m.estado.arquivar.rotuloEfeito, valor: 'No disponible para nuevos pedidos' },
                  { rotulo: m.estado.arquivar.rotuloHistorial, valor: 'Se conserva en pedidos anteriores' },
                  { rotulo: m.estado.arquivar.rotuloMotivo, valor: 'Fuera de temporada' },
                  { rotulo: m.estado.arquivar.rotuloConfirmacao, valor: 'Requiere responsable' },
                ]}
                accaoSecundaria={<Botao tom="secundario">{m.comum.voltar}</Botao>}
                accaoPrincipal={<Botao tom="perigo">{m.estado.arquivar.accao}</Botao>}
              />
            </Cartao>
          </div>
        </section>

        {/* ── Estruturas ────────────────────────────────────────────────── */}
        <section style={SECCAO} aria-labelledby="s-estruturas">
          <h2 id="s-estruturas">{m.catalogo.seccaoEstruturas}</h2>
          <p className="bo-campo__ajuda">
            Cada uma abre em página inteira, para poder ser inspeccionada nos cinco pontos de
            largura.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              ['admin', 'Administração'],
              ['publica', 'Pública'],
              ['staff', 'Staff'],
              ['kds', 'KDS / TPV'],
            ].map(([chave, rotulo]) => (
              <Link
                key={chave}
                className="bo-botao bo-botao--secundario"
                href={`/${idioma}/interno/estruturas/${chave}`}
              >
                {rotulo}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Idiomas e formato ─────────────────────────────────────────── */}
        {/* ── E05 ──────────────────────────────────────────────────────────
            Os componentes comerciais entram aqui pela mesma razão que os
            estados do E02: é esta a página que a inspecção do Playwright
            atravessa nas cinco larguras e nos três idiomas, medindo contraste
            no DOM. As páginas de planos exigem sessão e organização, e uma
            varredura que tivesse de autenticar-se para medir uma cor acabaria
            por não medir nenhuma. */}
        <section style={SECCAO} aria-labelledby="s-planos">
          <h2 id="s-planos">{m.catalogo.seccaoPlanos}</h2>
          <p className="bo-campo__ajuda">
            ONB-004, ORG-010/013/014, STATE-006 e THEME-001. Os planos aqui são
            <strong> exemplos de forma</strong>, não o catálogo da base — e continuam sem preço,
            porque o preço não existe em lado nenhum do produto.
          </p>

          <CartoesDePlano idioma={idioma} catalogo={PLANOS_DE_AMOSTRA} planoActual="RESTAURANT" />

          <div className="bo-uso">
            <Cartao className="bo-uso__cartao">
              <p className="bo-uso__rotulo">{m.uso.unidades}</p>
              <p className="bo-uso__valor">{m.uso.deQuota.replace('{uso}', '1').replace('{quota}', '3')}</p>
            </Cartao>
            <Cartao className="bo-uso__cartao">
              <p className="bo-uso__rotulo">{m.uso.pessoas}</p>
              <p className="bo-uso__valor">{m.uso.activas.replace('{n}', '8')}</p>
              <p className="bo-uso__nota">{m.uso.porContratar}</p>
            </Cartao>
            <Cartao variante="suave" className="bo-uso__cartao">
              <p className="bo-uso__rotulo">{m.uso.produtos}</p>
              <p className="bo-uso__valor bo-uso__valor--ausente">{m.uso.aindaNaoMedido}</p>
              <p className="bo-uso__nota">{m.uso.razaoArmazenamento}</p>
            </Cartao>
          </div>

          <div className="bo-tema">
            <div className="bo-tema__ficha">
              {[
                { rotulo: m.tema.primaria, cor: '#102E35' },
                { rotulo: m.tema.acento, cor: '#F5664D' },
                { rotulo: m.tema.fundo, cor: '#F7F4EC' },
              ].map((a) => (
                <div key={a.rotulo} className="bo-tema__cor">
                  <span className="bo-tema__amostra" style={{ background: a.cor }} aria-hidden="true" />
                  <span>
                    <span className="bo-tema__rotulo">{a.rotulo}</span>
                    <code className="bo-tema__valor">{a.cor}</code>
                  </span>
                </div>
              ))}
            </div>
            <Cartao className="bo-tema__previa">
              <h3 className="bo-tema__nome">La Societat 1927</h3>
              <p className="bo-tema__legenda">{m.tema.carta}</p>
              <div className="bo-tema__imagem" style={{ background: '#F7F4EC' }} aria-hidden="true" />
            </Cartao>
          </div>

          {/* STATE-006 com uma recusa REAL do motor, não com texto escrito à mão:
              é `decidirCapacidade` a devolver `sem_plano` que gera este bloco. */}
          <Cartao variante="contornado">
            <BloqueioDePlano
              idioma={idioma}
              resultado={RECUSA_DE_AMOSTRA}
              catalogo={PLANOS_DE_AMOSTRA}
              planoActual="Restaurant"
              hrefPlanos="#"
            />
          </Cartao>
        </section>

        {/* ── E06 ──────────────────────────────────────────────────────────
            Os três estados de um dia, e a lista de arranque com os quatro dela.
            Estão aqui pela mesma razão dos componentes do E05: as telas de
            configuração exigem sessão e organização, e é esta página que a
            varredura do Playwright atravessa nas cinco larguras a medir
            contraste no DOM. Uma etiqueta de estado que não chegasse a 4,5:1
            passaria despercebida se só existisse atrás de um login. */}
        <section style={SECCAO} aria-labelledby="s-horarios">
          <h2 id="s-horarios">{m.catalogo.seccaoHorarios}</h2>
          <p className="bo-campo__ajuda">
            ONB-001/002/003/010, ORG-001 a 006 e SET-001/002. O que importa aqui é que
            <strong> um dia por configurar não é um dia fechado</strong>: são três estados, e o
            terceiro tem etiqueta própria.
          </p>

          <div className="bo-plataforma__lista">
            {([
              ['dia1', 'por_configurar'],
              ['dia2', 'fechado'],
              ['dia5', 'aberto'],
            ] as const).map(([chave, tipo]) => (
              <Cartao key={chave} className="bo-horario__dia">
                <div className="bo-horario__cabecalho">
                  <span className="bo-tema__rotulo">
                    {(m.horarios as unknown as Record<string, string>)[chave]}
                  </span>
                  <Etiqueta tom={tipo === 'aberto' ? 'sucesso' : tipo === 'fechado' ? 'neutro' : 'aviso'}>
                    {tipo === 'aberto' ? m.horarios.aberto
                      : tipo === 'fechado' ? m.horarios.fechado
                      : m.horarios.porConfigurar}
                  </Etiqueta>
                </div>
                {tipo === 'aberto' ? (
                  <div className="bo-horario__par">
                    <Campo rotulo={`${m.horarios.de} 1`} defaultValue="13:00" readOnly />
                    <Campo rotulo={`${m.horarios.ate} 1`} defaultValue="16:00" readOnly />
                    <Campo rotulo={`${m.horarios.de} 2`} defaultValue="20:00" readOnly />
                    {/* 01:00 do dia seguinte. É o caso que o motor guarda como 1500. */}
                    <Campo rotulo={`${m.horarios.ate} 2`} defaultValue="01:00" readOnly />
                  </div>
                ) : null}
              </Cartao>
            ))}
          </div>

          <p className="bo-campo__ajuda">{m.horarios.nota}</p>

          <div className="bo-plataforma__lista">
            {([
              ['itemUnidade', 'feito'],
              ['itemHorarios', 'pendente'],
              ['itemPedidoDeProva', 'naoAplicavel'],
              // `itemCarta` saiu daqui: passou a medir-se no E07. O que continua
              // por medir é o QR, e por causa da publicação (E08).
              ['itemQr', 'porMedir'],
            ] as const).map(([chave, estado]) => (
              <Cartao key={chave} className="bo-plataforma__linha">
                <span className="bo-tema__rotulo">
                  {(m.arranque as unknown as Record<string, string>)[chave]}
                </span>
                <Etiqueta tom={estado === 'feito' ? 'sucesso' : estado === 'pendente' ? 'aviso' : 'neutro'}>
                  {(m.arranque as unknown as Record<string, string>)[estado]}
                </Etiqueta>
              </Cartao>
            ))}
          </div>
        </section>


        {/* ── E07: a ficha de alérgenos, e porque está aqui ────────────────
            Esta secção existe para as peças novas entrarem na varredura de
            contraste e de alvo de toque do Playwright. Sem isto, o ecrã dos
            alérgenos só seria medido por trás de um login, que a inspecção não
            atravessa — e é o ecrã onde o custo de uma cor ilegível é maior. */}
        <section style={SECCAO} aria-labelledby="s-catalogo-e07">
          <h2 id="s-catalogo-e07">{m.catalogo.seccaoCatalogoE07}</h2>
          <p className="bo-campo__ajuda">
            CAT-001 a CAT-019 e CAT-022. O que importa aqui é que
            <strong> sin declarar não é o mesmo que no contiene</strong>: são
            QUATRO estados, e o quarto tem etiqueta própria — nunca uma caixa
            por marcar.
          </p>

          <div className="bo-plataforma__lista">
            {([
              ['gluten', 'CONTEM', 'perigo'],
              ['leite', 'PODE_CONTER', 'aviso'],
              ['peixe', 'NAO_CONTEM', 'sucesso'],
              ['amendoins', 'DESCONHECIDO', 'neutro'],
            ] as const).map(([codigo, estado, tom]) => (
              <Cartao key={codigo} className="bo-alergenio">
                <div className="bo-alergenio__cabecalho">
                  <span className="bo-tema__rotulo">
                    {(m.alergenios as unknown as Record<string, string>)[codigo]}
                  </span>
                  {/* Texto sempre, nunca só cor: quem não distingue vermelho de
                      verde tem de conseguir ler a diferença entre "contiene" e
                      "no contiene". É o manual, p. 16. */}
                  <Etiqueta tom={tom}>
                    {(m.catalogoE07 as unknown as Record<string, string>)[`estado${estado}`]}
                  </Etiqueta>
                </div>
              </Cartao>
            ))}
          </div>
          <p className="bo-campo__ajuda">{m.catalogoE07.avisoNaoInferimos}</p>

          {/* A origem do preço, e a recusa. O conflito é uma mensagem, não um
              preço escolhido pela ordem da base. */}
          <div className="bo-plataforma__lista">
            <Cartao className="bo-plataforma__linha">
              <span className="bo-tema__rotulo">{m.catalogoE07.precoBase}</span>
              <Etiqueta tom="neutro">{m.catalogoE07.herdado}</Etiqueta>
            </Cartao>
            <Cartao className="bo-plataforma__linha">
              <span className="bo-tema__rotulo">{m.catalogoE07.unidade}</span>
              <Etiqueta tom="info">{m.catalogoE07.local}</Etiqueta>
            </Cartao>
            <Cartao className="bo-plataforma__linha">
              <span className="bo-tema__rotulo">{m.catalogoE07.conflitoPreco}</span>
              <Etiqueta tom="perigo">{m.catalogoE07.semPreco}</Etiqueta>
            </Cartao>
            <Cartao className="bo-plataforma__linha">
              <span className="bo-tema__rotulo">{m.catalogoE07.maximo}</span>
              {/* Sem tecto por extenso. Um campo vazio lia-se como zero. */}
              <Etiqueta tom="neutro">{m.catalogoE07.semTecto}</Etiqueta>
            </Cartao>
          </div>

          {/* A separação que o contrato exige, com as duas coisas lado a lado
              para se ver que NÃO se tocam. */}
          <p className="bo-campo__ajuda">{m.catalogoE07.notaPreferencias}</p>
          <div className="bo-plataforma__lista">
            {(['vegetariano', 'vegano', 'halal'] as const).map((p) => (
              <Cartao key={p} className="bo-plataforma__linha">
                <span className="bo-tema__rotulo">
                  {(m.preferenciasAlimentares as unknown as Record<string, string>)[p]}
                </span>
                <Etiqueta tom="info">{m.catalogoE07.preferencias}</Etiqueta>
              </Cartao>
            ))}
          </div>
        </section>


        {/* ── E08: os estados que se apresentam como sucesso ────────────────
            Esta secção existe para as peças novas entrarem na varredura de
            contraste e de alvo de toque do Playwright. As três armadilhas do
            CT-14 produzem ecrãs que PARECEM correr bem — uma exportação que
            abre, um ficheiro que aparece, um link que responde — e é por isso
            que os estados de recusa precisam de ser tão legíveis como os de
            sucesso. */}
        <section style={SECCAO} aria-labelledby="s-publicacao-e08">
          <h2 id="s-publicacao-e08">{m.catalogo.seccaoPublicacaoE08}</h2>
          <p className="bo-campo__ajuda">
            CAT-014/015, 023-027; ONB-005/006; SET-012. O que importa aqui é que
            <strong> uma tradução obsoleta não é uma tradução pendente</strong>: a
            primeira foi confirmada e depois o original mudou, e por isso tem
            assinatura e data — parece verificada.
          </p>

          <div className="bo-plataforma__lista">
            {([
              ['estadoRevisada', 'sucesso'],
              ['estadoPendente', 'info'],
              ['estadoObsoleta', 'aviso'],
              ['semTraducao', 'neutro'],
            ] as const).map(([chave, tom]) => (
              <Cartao key={chave} className="bo-plataforma__linha">
                <span className="bo-tema__rotulo">
                  {(m.publicacaoE08 as unknown as Record<string, string>)[chave]}
                </span>
                <Etiqueta tom={tom}>
                  {(m.publicacaoE08 as unknown as Record<string, string>)[chave]}
                </Etiqueta>
              </Cartao>
            ))}
          </div>
          <p className="bo-campo__ajuda">{m.publicacaoE08.notaObsoleta}</p>

          {/* As três mudanças de uma publicação. `removido` tem tom próprio: é a
              que mais custa a notar numa lista de cinquenta, e a que um cliente
              encontra primeiro. */}
          <div className="bo-plataforma__lista">
            {([
              ['mudancaAcrescentado', 'sucesso'],
              ['mudancaAlterado', 'info'],
              ['mudancaRemovido', 'aviso'],
            ] as const).map(([chave, tom]) => (
              <Cartao key={chave} className="bo-plataforma__linha">
                <span className="bo-tema__rotulo">
                  {(m.publicacaoE08 as unknown as Record<string, string>)[chave]}
                </span>
                <Etiqueta tom={tom}>{m.publicacaoE08.tituloPublicar}</Etiqueta>
              </Cartao>
            ))}
          </div>

          {/* Os bloqueios, e a frase que impede a correcção rápida de inventar
              um preço para o portão abrir. */}
          <div className="bo-plataforma__lista">
            {([
              'motivoSemPreco', 'motivoConflitoPreco', 'motivoAlergenosPorDeclarar',
            ] as const).map((chave) => (
              <Cartao key={chave} className="bo-plataforma__linha">
                <span className="bo-tema__rotulo">
                  {(m.publicacaoE08 as unknown as Record<string, string>)[chave]}
                </span>
                <Etiqueta tom="perigo">{m.publicacaoE08.bloqueios}</Etiqueta>
              </Cartao>
            ))}
          </div>
          <p className="bo-campo__ajuda">{m.publicacaoE08.notaBloqueios}</p>

          {/* As duas notas que são o ecrã da exportação inteiro. */}
          <p className="bo-campo__ajuda">{m.publicacaoE08.notaExportacao}</p>
          <p className="bo-campo__ajuda">{m.publicacaoE08.notaFormula}</p>
          <p className="bo-campo__ajuda">{m.publicacaoE08.notaSvg}</p>
          <p className="bo-campo__ajuda">{m.publicacaoE08.notaEstrategia}</p>
        </section>

        <section style={SECCAO} aria-labelledby="s-idiomas">
          <h2 id="s-idiomas">{m.catalogo.seccaoIdiomas}</h2>
          <Tabela
            legenda={m.catalogo.seccaoIdiomas}
            colunas={[
              { chave: 'idioma', rotulo: 'Idioma' },
              { chave: 'dinheiro', rotulo: m.catalogo.colunaPreco, numero: true },
              { chave: 'quando', rotulo: 'Data e hora' },
            ]}
            linhas={IDIOMAS.map((i) => ({
              id: i,
              idioma: `${NOME_DO_IDIOMA[i]} (${i})`,
              dinheiro: formatarDinheiro({ montanteMenor: 123456, moeda: 'EUR' }, i),
              quando: formatarDataHora(momento, i),
            }))}
          />
          <p className="bo-campo__ajuda">
            O mesmo instante e o mesmo montante, nas três convenções. O montante é guardado como
            123456 (unidades mínimas), nunca como 1234,56.
          </p>
        </section>
      </main>
    </div>
  );
}
