import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { estadoDaEsperaPublica } from '@bossaos/db';
import { obterBase } from '../../../../../../../src/servidor.ts';
import { unidadeDoEndereco } from '../../../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * RES-C-010 · «Tu lugar en la lista» (atlas)
 *
 * ── A estimativa e o facto NUNCA se dizem da mesma maneira ────────────────
 *
 * O contrato pede duas frases distintas, e a régua reprova se elas se disserem
 * igual. Aqui:
 *
 *  - **enquanto espera**, o texto diz o número E diz que é um cálculo que pode
 *    mudar. A incerteza está na frase que a pessoa lê, não num atributo;
 *  - **quando a mesa está pronta**, muda o verbo e some o «cerca de». É um
 *    facto, e lê-se como facto sem precisar de ver a outra frase ao lado.
 *
 * ── E a posição diz o DENOMINADOR ─────────────────────────────────────────
 *
 * «É o 2.º de 3 grupos que cabem nas mesmas mesas» é verificável por quem a lê.
 * «É o 3.º» é a fila outra vez, e não sobrevive ao grupo de 2 passar à frente.
 *
 * Quem não cabe em mesa nenhuma não recebe número: recebe a verdade.
 */
export default async function EstadoDaEspera({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: Idioma }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const busca = (await searchParams) ?? {};
  const p = mensagensDe(locale).reservaE19;
  await unidadeDoEndereco(publicLocationSlug);

  const esperaId = typeof busca.e === 'string' ? busca.e : '';
  const pronta = busca.pronta === '1';
  const estado = esperaId === '' ? null
    : await estadoDaEsperaPublica(obterBase(), publicLocationSlug, esperaId);

  return (
    <div className="bo-publico__conteudo">
      <h1 data-tela="RES-C-010">{p.estadoEspera}</h1>

      {pronta ? (
        // O FACTO. Sem «cerca de», sem «pode mudar».
        <p data-teste="facto">{p.prontoTexto}</p>
      ) : !estado?.posicao ? (
        <p data-teste="sem-lugar">{p.semLugar}</p>
      ) : (
        <>
          <p data-teste="posicao">
            {p.posicao
              .replace('{posicao}', String(estado.posicao.posicao))
              .replace('{de}', String(estado.posicao.de))}
          </p>
          {estado.estimativa ? (
            // A ESTIMATIVA. A incerteza está no texto, e não num atributo.
            <p data-teste="estimativa">
              {p.estimativaTexto.replace('{minutos}', String(estado.estimativa.minutos))}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
