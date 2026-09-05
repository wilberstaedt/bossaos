import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { lerPasso, unidadeDoEndereco } from '../../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * RES-C-003 · «¿A nombre de quién?» (atlas)
 *
 * O contacto que a reserva precisa. Nada mais — o marketing é outra pergunta,
 * noutro passo, e é assim de propósito: «marketing é opcional e separado do
 * contacto necessário à reserva».
 */
export default async function DadosDoCliente({
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
      <h1 data-tela="RES-C-003">{p.nome}</h1>
      <form method="get" action={`${base}/preferencias`} className="bo-forma">
        <input type="hidden" name="pessoas" value={String(passo.pessoas)} />
        <input type="hidden" name="dia" value={passo.dia} />
        <input type="hidden" name="hora" value={passo.hora ?? ''} />
        <Campo rotulo={p.nome} name="nome" type="text" defaultValue={passo.nome ?? ''} required />
        <Campo rotulo={p.contacto} name="contacto" type="text"
               defaultValue={passo.contacto ?? ''} required />
        <Botao type="submit">{p.continuar}</Botao>
      </form>
      <a className="bo-botao bo-botao--secundario" href={`${base}/horarios?pessoas=${passo.pessoas}&dia=${passo.dia}`}>{p.voltar}</a>
    </div>
  );
}
