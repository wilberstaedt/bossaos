import { notFound } from 'next/navigation';
import { formatarDinheiro, formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import {
  Aviso, Botao, Cartao, Estado, Etiqueta, EstruturaAdmin, EstruturaKds,
  EstruturaPublica, EstruturaStaff, Tabela,
} from '@bossaos/ui';
import { MarcaEscrita, Wordmark } from '../../../../../src/componentes/Marca.tsx';

export const dynamic = 'force-static';

const ESTRUTURAS = ['admin', 'publica', 'staff', 'kds'] as const;
type Qual = (typeof ESTRUTURAS)[number];

export function generateStaticParams() {
  return ESTRUTURAS.map((qual) => ({ qual }));
}

/**
 * As cinco superfícies, em página inteira, para inspecção.
 *
 * Não são telas do produto: nenhum número aqui é real, e nenhuma delas contém
 * regra de negócio — recebem tudo já decidido. O que se inspecciona é a
 * **moldura**: onde fica a navegação, o que acontece a 360 px, quanto mede um
 * alvo de toque em cada uma.
 */
export default async function Estrutura({
  params,
}: {
  params: Promise<{ idioma: Idioma; qual: string }>;
}) {
  const { idioma, qual } = await params;
  if (!(ESTRUTURAS as readonly string[]).includes(qual)) notFound();
  const m = mensagensDe(idioma);
  const preco = (c: number) => formatarDinheiro({ montanteMenor: c, moeda: 'EUR' }, idioma);
  const demo = <Etiqueta tom="aviso">{m.comum.datosDemostracion}</Etiqueta>;

  if (qual === ('admin' satisfies Qual)) {
    return (
      <EstruturaAdmin
        marca={<MarcaEscrita />}
        organizacao="La Societat 1927"
        unidade="Oropesa del Mar"
        rotuloTrocarUnidade={m.comum.trocarUnidade}
        rotuloAbrirMenu={m.comum.abrirMenu}
        rotuloSaltar={m.comum.saltarParaConteudo}
        migalha={m.catalogo.seccaoEstruturas}
        topoDireita={
          <>
            {demo}
            <Etiqueta tom="sucesso">{m.comum.enLinea}</Etiqueta>
          </>
        }
        rodapeLateral={<span>{m.comum.ayudaSoporte}</span>}
        utilizador={{ iniciais: 'AG', nome: 'Andrea' }}
        navegacaoInferior={[
          { href: '#', rotulo: m.navegacao.inicio, activa: true },
          { href: '#', rotulo: m.navegacao.trabalho },
          { href: '#', rotulo: m.navegacao.mais },
        ]}
        navegacao={[
          { href: '#', rotulo: m.navegacao.inicio },
          { href: '#', rotulo: m.navegacao.catalogo, activa: true },
          { href: '#', rotulo: m.navegacao.reservas },
          { href: '#', rotulo: m.navegacao.salaPedidos },
          { href: '#', rotulo: m.navegacao.caixa },
          { href: '#', rotulo: m.navegacao.inventario },
          { href: '#', rotulo: m.navegacao.clientes },
          { href: '#', rotulo: m.navegacao.equipa },
          { href: '#', rotulo: m.navegacao.relatorios },
          { href: '#', rotulo: m.navegacao.configuracao },
        ]}
      >
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
          accaoNoTopo
          accaoPrincipal={<Botao>{m.estado.vazio.accao}</Botao>}
        />
      </EstruturaAdmin>
    );
  }

  if (qual === ('publica' satisfies Qual)) {
    return (
      <EstruturaPublica
        marca={<Wordmark />}
        rotuloSaltar={m.comum.saltarParaConteudo}
        assinatura={m.comum.asinatura}
        navegacao={demo}
      >
        <h1>La Societat 1927</h1>
        <p style={{ color: 'var(--bo-texto-secundario)', maxWidth: '60ch', marginTop: 12 }}>
          {m.catalogo.avisoDemo}
        </p>
        <div style={{ marginTop: 32, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {[
            ['Croquetas caseras', 1250],
            ['Pulpo a la gallega', 2450],
            ['Tarta de queso', 690],
          ].map(([nome, c]) => (
            <Cartao key={String(nome)} titulo={String(nome)}>
              <p style={{ fontWeight: 600 }}>{preco(Number(c))}</p>
            </Cartao>
          ))}
        </div>
        <div style={{ marginTop: 32 }}>
          <Botao>{m.estado.vazio.accao}</Botao>
        </div>
      </EstruturaPublica>
    );
  }

  if (qual === ('staff' satisfies Qual)) {
    return (
      <EstruturaStaff
        titulo={m.navegacao.salaPedidos}
        rotuloSaltar={m.comum.saltarParaConteudo}
        topoDireita={demo}
      >
        <Aviso tom="info" titulo={m.estado.vazio.situacaoTitulo}>
          {m.estado.vazio.situacaoDetalhe}
        </Aviso>
        <Tabela
          legenda={m.navegacao.salaPedidos}
          colunas={[
            { chave: 'mesa', rotulo: 'Mesa' },
            { chave: 'itens', rotulo: m.catalogo.colunaProduto, numero: true },
            { chave: 'total', rotulo: m.catalogo.colunaPreco, numero: true },
            { chave: 'situacao', rotulo: m.catalogo.colunaEstado },
          ]}
          linhas={[
            { id: '1', mesa: 'Mesa 4', itens: '3', total: preco(4390), situacao: m.comum.enLinea },
            { id: '2', mesa: 'Mesa 9', itens: '1', total: preco(1250), situacao: m.estado.porGuardar.sobrancelha },
          ]}
        />
        <Botao densidade="operacao" largo>
          {m.estado.vazio.accao}
        </Botao>
      </EstruturaStaff>
    );
  }

  return (
    <EstruturaKds titulo={m.navegacao.salaPedidos} topoDireita={demo}>
      {[
        ['#1042', 'Mesa 4', ['Croquetas caseras', 'Pulpo a la gallega'], '2026-12-31T11:04:00Z'],
        ['#1043', 'Mesa 9', ['Tarta de queso'], '2026-12-31T11:07:00Z'],
        ['#1044', 'Barra', ['Croquetas caseras', 'Tarta de queso', 'Pulpo a la gallega'], '2026-12-31T11:09:00Z'],
      ].map(([n, mesa, itens, quando]) => (
        <Cartao key={String(n)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span className="bo-kds__numero">{String(n)}</span>
            <span>{String(mesa)}</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
            {(itens as string[]).map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          {/* Uma hora só, formatada no idioma. A primeira versão imprimia a
              string crua E a hora formatada, e saía "12:04 · 12:04" em todos os
              cartões — só apareceu ao olhar para a captura. */}
          <p style={{ marginTop: 12, opacity: 0.8 }}>
            {formatarHora(new Date(String(quando)), idioma)}
          </p>
          <div style={{ marginTop: 16 }}>
            <Botao densidade="operacao" largo>
              {m.catalogo.exemploKdsAccao}
            </Botao>
          </div>
        </Cartao>
      ))}
    </EstruturaKds>
  );
}
