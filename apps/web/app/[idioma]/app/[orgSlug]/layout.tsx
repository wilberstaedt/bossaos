import { redirect } from 'next/navigation';
import { Etiqueta, EstruturaAdmin } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MarcaEscrita } from '../../../../src/componentes/Marca.tsx';
import { resolverPedido } from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * Moldura da administração, com o contexto já resolvido.
 *
 * A navegação é montada a partir das **acções permitidas** deste actor, e não de
 * uma lista fixa com `if`s espalhados: um menu que mostra o que não se pode
 * fazer ensina as pessoas a bater em portas fechadas.
 *
 * Se a resolução falhar — sem sessão, sem filiação, filiação revogada — vai-se
 * para a escolha de organização. Não se diz qual das três foi: dizê-lo
 * confirmaria que a organização existe.
 */
export default async function LayoutDaOrganizacao({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ idioma: string; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma as Idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const { accoesPermitidas } = await import('@bossaos/domain');
  const permitidas = new Set(accoesPermitidas(sessao.concessoes));

  // ── Uma porta por módulo ENTREGUE, e um marcador honesto no resto ───────
  //
  // «Um `#` num módulo entregue não é marcador: é uma porta que ninguém abriu.»
  // Os módulos que já existem passam a ter ligação; os que ainda não existem
  // levam `porConstruir` com a etapa que os vai fazer — sem `href`, visivelmente
  // inertes, fora do alcance de `getByRole('link')`.
  //
  // Um restaurante que chega à caixa e não chega às reservas é um restaurante
  // que não se usa.
  const navegacao = [
    // Medido: NENHUMA das 396 telas do atlas é o painel de topo do inquilino.
    // Fica marcado com o E30, que é quem faz a gestão multiunidade e revisita
    // as ORG-002/004 — é a etapa mais próxima, e está declarado no E22.md que
    // esta é a atribuição menos certa das quatro.
    // A última entrada morta do menu de gestão, fechada no E30: leva à
    // comparação entre unidades, que é onde um painel de gestão começa.
    { href: `/${idioma}/app/${orgSlug}`, rotulo: m.navegacao.inicio, accao: null },
    { href: `/${idioma}/app/${orgSlug}/catalogo`, rotulo: m.navegacao.catalogo, accao: 'catalogo.ler' },
    { href: `/${idioma}/app/${orgSlug}/ir/reservas`, rotulo: m.navegacao.reservas, accao: 'reservas.ler' },
    { href: `/${idioma}/app/${orgSlug}/ir/sala`, rotulo: m.navegacao.salaPedidos, accao: 'sala.ler' },
    { href: `/${idioma}/app/${orgSlug}/ir/levar`, rotulo: m.navegacao.levar, accao: 'sala.ler' },
    // ── A porta do TPV ────────────────────────────────────────────────────
    //
    // «Um `#` num módulo entregue não é marcador: é uma porta que ninguém
    // abriu.» O módulo da caixa passou a existir no E22, e por isso esta linha
    // deixou de poder ser um `#`.
    //
    // Aponta para `/pos` e não para uma unidade: quem tem três restaurantes tem
    // de dizer em qual está antes de a caixa fazer sentido, e é lá que o diz.
    //
    // As outras entradas continuam em `#` de propósito — são módulos de etapas
    // que ainda não existem, e é esse o `#` legítimo do contrato.
    { href: `/${idioma}/pos`, rotulo: m.navegacao.caixa, accao: 'caixa.ler' },
    // ── A porta do stock ──────────────────────────────────────────────────
    //
    // O módulo passou a existir no E25, e por isso esta linha deixou de poder
    // ser um `#`: «um `#` num módulo entregue não é marcador, é uma porta que
    // ninguém abriu».
    { href: `/${idioma}/app/${orgSlug}/ir/stock`, rotulo: m.navegacao.inventario, accao: 'stock.ler' },
    { href: `/${idioma}/app/${orgSlug}/ir/compras`, rotulo: m.comprasE26.compras, accao: 'stock.gerir' },
    { href: `/${idioma}/app/${orgSlug}/ir/clientes`, rotulo: m.navegacao.clientes, accao: 'clientes.ler' },
    { href: `/${idioma}/app/${orgSlug}/ir/equipa`, rotulo: m.navegacao.equipa, accao: 'equipa.ler' },
    { href: `/${idioma}/app/${orgSlug}/ir/financeiro`, rotulo: m.financeiroE29.financeiro, accao: 'financeiro.ler' },
    { href: `/${idioma}/app/${orgSlug}/ir/kiosks`, rotulo: m.kioskE31.kiosks, accao: 'organizacao.gerir' },
    { href: `/${idioma}/app/${orgSlug}/ajuda`, rotulo: m.plataformaE33.ajuda, accao: null },
    { href: `/${idioma}/app/${orgSlug}/ir/relatorios`, rotulo: m.navegacao.relatorios, accao: 'relatorios.ler' },
  ]
    .filter((l) => l.accao === null || permitidas.has(l.accao as never))
    // ── O ramo do `porConstruir` saiu daqui, e é o E30 a fechar-se ────────
    //
    // Ele existia para propagar a marca das entradas que não levavam a lado
    // nenhum. Depois do E30 **não há nenhuma**: o `início` era a última, e
    // passou a levar à comparação entre unidades.
    //
    // Ficou código morto, e o typecheck disse-o — `porConstruir?: unknown`,
    // porque já não há nenhum membro do array que o tenha. O tipo continua em
    // `EstruturaAdmin` para quem venha a precisar dele; o que sai é o ramo que
    // aqui não tem o que propagar.
    .map(({ href, rotulo }) => ({ href, rotulo }));

  return (
    <EstruturaAdmin
      marca={<MarcaEscrita />}
      organizacao={sessao.contexto.organizationSlug}
      unidade={sessao.actor.email}
      rotuloTrocarUnidade={m.comum.trocarUnidade}
      rotuloAbrirMenu={m.comum.abrirMenu}
      rotuloSaltar={m.comum.saltarParaConteudo}
      migalha={m.pessoas.titulo}
      navegacao={navegacao.map((l, i) => ({ ...l, activa: i === navegacao.length - 1 }))}
      topoDireita={<Etiqueta tom="sucesso">{m.comum.enLinea}</Etiqueta>}
      rodapeLateral={<span>{m.comum.ayudaSoporte}</span>}
      utilizador={{ iniciais: sessao.actor.email.slice(0, 2).toUpperCase(), nome: sessao.actor.nome || sessao.actor.email }}
      // ── No telemóvel, três itens mortos passam a três destinos reais ────
      //
      // `trabalho` e `mais` não são módulos por construir: não existem em etapa
      // nenhuma do atlas. Um marcador exige a etapa que o vai substituir, e sem
      // ela não é marcador — é um resto. Ficam os módulos entregues, que é o que
      // uma barra inferior serve para alcançar.
      navegacaoInferior={[
        { href: `/${idioma}/app/${orgSlug}/ir/sala`, rotulo: m.navegacao.salaPedidos, activa: true },
        { href: `/${idioma}/pos`, rotulo: m.navegacao.caixa },
        { href: `/${idioma}/app/${orgSlug}/ir/reservas`, rotulo: m.navegacao.reservas },
      ]}
    >
      {children}
    </EstruturaAdmin>
  );
}
