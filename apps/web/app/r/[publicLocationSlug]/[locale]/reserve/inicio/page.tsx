import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { lerPasso, unidadeDoEndereco } from '../../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * RES-C-001 · «Reserva tu mesa» — o primeiro passo (atlas)
 *
 * Duas perguntas e mais nada: quantos são e que dia. Tudo por GET — quem reserva
 * está num telemóvel, muitas vezes numa rede fraca, e um passo que precisa de
 * JavaScript é um passo onde se perde gente.
 */
export default async function InicioDaReserva({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: Idioma }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const passo = lerPasso((await searchParams) ?? {});
  const p = mensagensDe(locale).reservaE19;
  await unidadeDoEndereco(publicLocationSlug);
  const base = `/r/${publicLocationSlug}/${locale}/reserve`;

  return (
    <div className="bo-publico__conteudo">
      <h1 data-tela="RES-C-001">{p.titulo}</h1>
      <form method="get" action={`${base}/horarios`} className="bo-forma">
        <Campo rotulo={p.pessoas} name="pessoas" type="text" inputMode="numeric"
               defaultValue={String(passo.pessoas)} />
        <Campo rotulo={p.dia} name="dia" type="date" defaultValue={passo.dia} />
        <Botao type="submit">{p.continuar}</Botao>
      </form>
      <a className="bo-botao bo-botao--secundario" href={base}>{p.voltar}</a>
    </div>
  );
}
