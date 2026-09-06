import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { NavegacaoDoSite } from '../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../src/site-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INT-003 · «Tu restaurante en Google» (atlas p. 256)
 *
 * ── O que esta página faz, e o que declara NÃO fazer ──────────────────────
 *
 * Não fala com o Google. Não há credencial, não há conta ligada, e escrever
 * "sincronizado" ao lado de um botão que não sincroniza nada seria o mesmo
 * defeito que o aceite 2 persegue noutra superfície: sucesso sobre nada.
 *
 * O que faz é o que é verdadeiro e útil hoje: mostra, num sítio só, os dados que
 * têm de coincidir entre a ficha do Google e o site — morada, telefone e o
 * endereço público. Uma ficha que diz um telefone e um site que diz outro é o
 * erro que mais custa a um restaurante, e não se apanha porque cada metade está
 * certa vista sozinha.
 *
 * A ligação a sério é uma dependência externa e fica **declarada** no `E10.md`.
 */
export default async function Integracoes({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const g = m.gestaoSiteE10;
  const { unidade, rascunho } = await carregarSite(idioma, orgSlug, locationSlug);

  const contactoBruto = (rascunho?.paginas.find((p) => p.tipo === 'CONTACTO')?.contacto ?? null) as
    { morada?: string; telefone?: string } | null;

  return (
    <div className="bo-pagina">

      {/* O catálogo do E32 vive ao lado desta: são a mesma família, e procurar
          as chaves de API noutro menu seria a porta morta ao contrário. */}
      <a className="bo-lista__ligacao" data-seccao="INT-001"
         href={`/${idioma}/app/${orgSlug}/${locationSlug}/integrations/catalogo`}>
        {mensagensDe(idioma).integracoesE32.catalogo}
      </a>
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.integracoes}</h1>
        </div>
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="integrations" />
      <Aviso tom="info" titulo={g.integracoes}>{g.googleTexto}</Aviso>

      <dl className="bo-estado__factos">
        <dt>{g.titutloPagina}</dt>
        <dd>{unidade.nome}</dd>
        <dt>{g.moradaCampo}</dt>
        {/* Em falta diz-se com palavras. Um traço ou um espaço em branco lê-se
            como "não tem morada", e a pessoa não vai preencher o que não sabe
            que falta. */}
        <dd>{contactoBruto?.morada ?? g.semEndereco}</dd>
        <dt>{g.telefoneCampo}</dt>
        <dd>{contactoBruto?.telefone ?? g.semEndereco}</dd>
        <dt>{g.verPublico}</dt>
        <dd>
          {unidade.publicSlug
            ? <a href={`/r/${unidade.publicSlug}/${idioma}`}>{`/r/${unidade.publicSlug}/${idioma}`}</a>
            : g.semEndereco}
        </dd>
      </dl>
    </div>
  );
}
