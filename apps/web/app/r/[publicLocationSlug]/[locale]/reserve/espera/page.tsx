import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { lerPasso, unidadeDoEndereco } from '../../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * RES-C-009 · «Avísanos cuando haya sitio» (atlas)
 *
 * Entrar na lista **não reserva nada**, e a tela não promete lugar nenhum. O que
 * ela pede é o mínimo para avisar: quem, quantos, e por onde.
 */
export default async function EntrarNaEspera({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: Idioma }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const passo = lerPasso((await searchParams) ?? {});
  const p = mensagensDe(locale).reservaE19;
  await unidadeDoEndereco(publicLocationSlug);

  return (
    <div className="bo-publico__conteudo">
      <h1 data-tela="RES-C-009">{p.entrarEspera}</h1>
      <form method="post" action="/api/publico/reservar" className="bo-forma">
        <input type="hidden" name="accao" value="espera" />
        <input type="hidden" name="slug" value={publicLocationSlug} />
        <input type="hidden" name="idioma" value={locale} />
        <Campo rotulo={p.pessoas} name="pessoas" type="text" inputMode="numeric"
               defaultValue={String(passo.pessoas)} />
        <Campo rotulo={p.nome} name="nome" type="text" defaultValue={passo.nome ?? ''} required />
        <Campo rotulo={p.contacto} name="contacto" type="text"
               defaultValue={passo.contacto ?? ''} required />
        <Botao type="submit" data-teste="entrar-espera">{p.entrarEsperaAccao}</Botao>
      </form>
    </div>
  );
}
