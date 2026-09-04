import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';

/**
 * MKT-006 · «Así empezamos contigo» (atlas p. 14)
 *
 * ── Esta rota NÃO é a que o atlas sugere, e o motivo é um conflito dele ───
 *
 * O atlas dá `/[locale]/onboarding` a esta tela **e** ao ONB-009 («Invita a tu
 * equipo»), que é do E04 e está **validado** nessa rota. Duas telas, duas
 * etapas, o mesmo endereço.
 *
 * Não mexo em trabalho validado para acomodar uma tela nova, e a colisão não é
 * minha para resolver: é uma correcção no atlas, e quem o assina é que a faz. O
 * MKT-006 fica em `/getting-started` e a divergência está declarada no `E10.md`
 * — como o conflito CT-03 / ADR 0001 ficou declarado no E01.
 */
export const dynamic = 'force-static';

const PASSOS = ['passo1', 'passo2', 'passo3', 'passo4'] as const;

export default async function Comecamos({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/getting-started">
      <section className="bo-mkt__heroi">
        <h1>{k.comecamosTitulo}</h1>
        <p className="bo-publico__texto">{k.comecamosTexto}</p>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="passos">
        <h2 id="passos">{k.comecamosTitulo}</h2>
        <ol className="bo-mkt__passos">
          {PASSOS.map((p) => (
            <li key={p} className="bo-mkt__passo">
              <h3>{k[p]}</h3>
              <p>{k[`${p}Texto` as keyof typeof k] as string}</p>
            </li>
          ))}
        </ol>
        <p className="bo-mkt__chamada" style={{ marginTop: 'var(--bo-espaco-xl)' }}>
          <a className="bo-botao bo-botao--primario" href={`/${idioma}/demo`}>{k.pedirDemo}</a>
        </p>
      </section>
    </MolduraMkt>
  );
}
