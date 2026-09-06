import { notFound, redirect } from 'next/navigation';
import { Etiqueta, EstruturaAdmin } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, ePlataforma, obterPrisma } from '@bossaos/db';
import { MarcaEscrita } from '../../../src/componentes/Marca.tsx';
import { actorDoPedido } from '../../../src/sessao.ts';
import { obterEnv } from '../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * Moldura da administração de plataforma (atlas pp. 360-369).
 *
 * ── O portão está aqui, e não em cada página ────────────────────────────────
 *
 * Uma verificação por página é uma verificação que a próxima página se esquece
 * de fazer — e "esquecer-se de verificar" foi o defeito real que esta etapa
 * apanhou na flag. Aqui o `layout` cobre a subárvore inteira.
 *
 * **E não é a única.** Cada função `plataforma_*` da base verifica por si:
 * quem chegar ao SQL por outro caminho continua a bater na mesma porta. Esta
 * camada existe para a pessoa não ver um ecrã vazio; a que protege é a de baixo.
 *
 * ── Ausência, não permissão negada ──────────────────────────────────────────
 *
 * Quem não é da plataforma leva **404**, não 403. Um 403 confirmaria que a
 * superfície existe e que só falta o direito — que é o mesmo oráculo de
 * existência que o E04 fechou entre inquilinos.
 */
export default async function LayoutDaPlataforma({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ idioma: string }>;
}) {
  const { idioma } = await params;
  const m = mensagensDe(idioma as Idioma);

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const autorizado = await comIdentidade(prisma, actor.id, (db) => ePlataforma(db));
  if (!autorizado) notFound();

  const base = `/${idioma}/platform`;
  const navegacao = [
    { href: base, rotulo: m.plataforma.navResumo },
    { href: base, rotulo: m.plataforma.navOrganizacoes, activa: true },
    { href: `${base}/planos`, rotulo: m.plataforma.navPlanos },
    // ── As três que faltam levam a MARCA, e não um `#` ──────────────────
    //
    // Um `href: '#'` parece clicável e não leva a lado nenhum: quem carrega
    // pensa que a página falhou. O `porConstruir` é a marca de que o módulo
    // **ainda não existe**, e a estrutura desenha-o inerte com a etapa ao lado.
    //
    // As três são do E33, e ficam a dizê-lo — em vez de mentirem em silêncio.
    // É a mesma decisão que o menu de gestão fechou no E30; aqui a diferença é
    // que o destino ainda não está construído, e por isso a honestidade é
    // declarar a ausência, não inventar uma porta.
    { rotulo: m.plataforma.navSuporte, porConstruir: 'E33' },
    { rotulo: m.plataforma.navIncidentes, porConstruir: 'E33' },
    { href: `${base}/implantacoes`, rotulo: m.plataforma.navTrabalhos },
    { href: `${base}/flags`, rotulo: m.plataforma.navIntegracoes },
    { rotulo: m.plataforma.navAuditoria, porConstruir: 'E33' },
  ];

  return (
    <EstruturaAdmin
      marca={<MarcaEscrita />}
      organizacao={m.plataforma.marca}
      unidade={actor.email}
      rotuloTrocarUnidade={m.comum.trocarUnidade}
      rotuloAbrirMenu={m.comum.abrirMenu}
      rotuloSaltar={m.comum.saltarParaConteudo}
      migalha={m.plataforma.marca}
      navegacao={navegacao}
      topoDireita={<Etiqueta tom="sucesso">{m.comum.enLinea}</Etiqueta>}
      rodapeLateral={<span>{m.comum.ayudaSoporte}</span>}
      utilizador={{ iniciais: actor.email.slice(0, 2).toUpperCase(), nome: actor.nome || actor.email }}
      navegacaoInferior={[
        { href: base, rotulo: m.navegacao.inicio, activa: true },
        { href: `${base}/implantacoes`, rotulo: m.navegacao.trabalho },
        { href: `${base}/flags`, rotulo: m.navegacao.mais },
      ]}
    >
      {children}
    </EstruturaAdmin>
  );
}
