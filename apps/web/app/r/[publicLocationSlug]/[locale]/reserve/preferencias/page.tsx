import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comPasso, lerPasso, unidadeDoEndereco } from '../../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * RES-C-004 · «Cuéntanos qué necesitas» (atlas)
 *
 * ── O marketing é uma caixa por marcar, e está aqui e não antes ───────────
 *
 * «Marketing é opcional e separado do contacto necessário à reserva.» Se
 * estivesse no passo do contacto, aceitar a reserva era aceitar o marketing por
 * distracção — e o `false` da base só é verdade se for alguém a não o marcar.
 */
export default async function PreferenciasDaReserva({
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
      <h1 data-tela="RES-C-004">{p.preferencias}</h1>
      <form method="get" action={`${base}/rever`} className="bo-forma">
        <input type="hidden" name="pessoas" value={String(passo.pessoas)} />
        <input type="hidden" name="dia" value={passo.dia} />
        <input type="hidden" name="hora" value={passo.hora ?? ''} />
        <input type="hidden" name="nome" value={passo.nome ?? ''} />
        <input type="hidden" name="contacto" value={passo.contacto ?? ''} />
        <Campo rotulo={p.notas} name="notas" type="text" defaultValue={passo.notas ?? ''} />
        <label className="bo-campo">
          <input type="checkbox" name="marketing" value="1" data-teste="marketing"
                 defaultChecked={passo.marketing === '1'} />
          <span>{p.marketing}</span>
        </label>
        <p className="bo-campo__ajuda">{p.marketingAjuda}</p>
        <Botao type="submit">{p.continuar}</Botao>
      </form>
      <a className="bo-botao bo-botao--secundario" href={comPasso(`${base}/dados`, passo)}>{p.voltar}</a>
    </div>
  );
}
