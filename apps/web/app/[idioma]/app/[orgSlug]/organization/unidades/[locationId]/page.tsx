import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { aberturaAgora, dependenciasDaUnidade } from '@bossaos/db';
import { paraRelogio } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { UnidadeArquivada } from '../../../../../../../src/componentes/UnidadeArquivada.tsx';

export const dynamic = 'force-dynamic';

/**
 * ORG-005 · a unidade (atlas p. 42), e o STATE-013 onde ele acontece.
 *
 * ── Os campos por configurar dizem-no ──────────────────────────────────────
 *
 * Moeda e fuso podem não existir, e é aqui que se vê. O atlas mostra "EUR" e
 * "Europe/Madrid" porque a fixture dele os tem; mostrar isso quando eles não
 * existem é o defeito que esta etapa inteira existe para não cometer.
 *
 * E o **arquivar mostra as dependências antes**, não depois: arquivar uma
 * unidade com acessos atribuídos e horários publicados sem o dizer é uma
 * surpresa amanhã de manhã. *"Arquivamento não apaga histórico e deve impedir
 * novos serviços de forma controlada"* — o controlo é isto.
 */
export default async function DetalheDaUnidade({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationId: string }>;
}) {
  const { idioma, orgSlug, locationId } = await params;
  const m = mensagensDe(idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidade = await db.location.findFirst({
      where: { id: locationId },
      select: {
        nome: true, slug: true, moeda: true, fuso: true, morada: true, localidade: true,
        contactoEmail: true, archivedAt: true, brand: { select: { nome: true } },
      },
    });
    if (!unidade) return null;
    return {
      unidade,
      abertura: unidade.archivedAt ? null : await aberturaAgora(db, locationId),
      dependencias: await dependenciasDaUnidade(db, locationId),
    };
  });
  if (!dados) notFound();

  const { unidade, abertura, dependencias } = dados;
  const base = `/${idioma}/app/${orgSlug}/organization/unidades`;

  if (unidade.archivedAt) {
    return (
      <div className="bo-pagina">
        <UnidadeArquivada idioma={idioma} unidade={unidade.nome} hrefUnidades={base} />
        <form method="post" action={`/api/org/${orgSlug}/unidades/${locationId}/arquivar`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="reactivar" value="1" />
          <Botao type="submit" tom="secundario">{m.unidades.accaoDesarquivar}</Botao>
        </form>
      </div>
    );
  }

  const semConfigurar = m.unidades.porConfigurar;
  const factos: Array<{ rotulo: string; valor: string; ausente?: boolean }> = [
    { rotulo: m.unidades.marca, valor: unidade.brand.nome },
    { rotulo: m.unidades.localidade, valor: unidade.localidade ?? semConfigurar, ausente: !unidade.localidade },
    { rotulo: m.arranque.unidade.morada, valor: unidade.morada ?? m.arranque.porConfirmar, ausente: !unidade.morada },
    { rotulo: m.unidades.fuso, valor: unidade.fuso ?? semConfigurar, ausente: !unidade.fuso },
    { rotulo: m.unidades.moeda, valor: unidade.moeda ?? semConfigurar, ausente: !unidade.moeda },
    { rotulo: m.unidades.contacto, valor: unidade.contactoEmail ?? semConfigurar, ausente: !unidade.contactoEmail },
    { rotulo: m.unidades.catalogo, valor: m.preferencias.cartaPorMedir, ausente: true },
    {
      rotulo: m.horarios.agora,
      valor: abertura?.estado === 'aberto' ? m.horarios.abertoAte.replace('{hora}', paraRelogio(abertura.ateMin))
        : abertura?.estado === 'fechado' ? m.horarios.fechadoAgora
        : abertura?.motivo === 'sem_fuso' ? m.horarios.semFuso
        : m.horarios.desconhecido,
      ausente: abertura?.estado === 'desconhecido',
    },
  ];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.unidades.sobrancelhaUnidade}</p>
          <h1>{unidade.nome}</h1>
        </div>
        <a className="bo-botao bo-botao--primario" href={`${base}/${locationId}/horarios`}>
          {m.horarios.titulo}
        </a>
      </div>

      <dl className="bo-estado__factos">
        {factos.map((f) => (
          <div key={f.rotulo}>
            <dt>{f.rotulo}</dt>
            <dd className={f.ausente ? 'bo-uso__valor--ausente' : undefined}>{f.valor}</dd>
          </div>
        ))}
      </dl>

      <Cartao variante="contornado">
        {dependencias.length > 0 ? (
          <Aviso tom="aviso" titulo={m.unidades.dependencias}>
            <ul className="bo-planos__lista">
              {dependencias.map((d) => (
                <li key={d.tipo} className="bo-planos__item">
                  {((m.unidades as unknown as Record<string, string>)[`dep${d.tipo[0]!.toUpperCase()}${d.tipo.slice(1)}`] ?? d.tipo)
                    .replace('{n}', String(d.quantas))}
                </li>
              ))}
            </ul>
          </Aviso>
        ) : null}
        <form method="post" action={`/api/org/${orgSlug}/unidades/${locationId}/arquivar`}>
          <input type="hidden" name="idioma" value={idioma} />
          <Botao type="submit" tom="perigo">{m.unidades.accaoArquivar}</Botao>
        </form>
      </Cartao>
    </div>
  );
}
