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

  const navegacao = [
    { href: '#', rotulo: m.navegacao.inicio, accao: null },
    { href: '#', rotulo: m.navegacao.catalogo, accao: 'catalogo.ler' },
    { href: '#', rotulo: m.navegacao.reservas, accao: 'reservas.ler' },
    { href: '#', rotulo: m.navegacao.salaPedidos, accao: 'sala.ler' },
    { href: '#', rotulo: m.navegacao.caixa, accao: 'caixa.ler' },
    { href: '#', rotulo: m.navegacao.inventario, accao: 'stock.ler' },
    { href: '#', rotulo: m.navegacao.clientes, accao: 'clientes.ler' },
    { href: `/${idioma}/app/${orgSlug}/organization`, rotulo: m.navegacao.equipa, accao: 'equipa.ler' },
    { href: '#', rotulo: m.navegacao.relatorios, accao: 'relatorios.ler' },
  ]
    .filter((l) => l.accao === null || permitidas.has(l.accao as never))
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
      navegacaoInferior={[
        { href: '#', rotulo: m.navegacao.inicio, activa: true },
        { href: '#', rotulo: m.navegacao.trabalho },
        { href: '#', rotulo: m.navegacao.mais },
      ]}
    >
      {children}
    </EstruturaAdmin>
  );
}
