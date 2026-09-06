import { redirect } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, obterPrisma, todasAsDenuncias } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-018 · «Moderación y abusos» (atlas p. 248)
 *
 * ── O poder mais bruto desta etapa, e o que o limita ──────────────────────
 *
 * Moderar é agir sobre a casa de um cliente sem ele pedir. É legítimo — há
 * conteúdo que não pode ficar no ar —, e é exactamente o tipo de acção que,
 * feita de boa fé e com pressa, se torna arbitrária.
 *
 * O que a limita: cada resolução leva **quem** e **quando**, com um `CHECK` na
 * base a obrigar as duas a andarem juntas. Uma denúncia resolvida sem nome é uma
 * decisão que ninguém consegue rever daqui a seis meses — e as decisões que
 * ninguém revê são as que se tornam hábito.
 */
export default async function Moderacao({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  // Pela função do motor, e não por uma consulta escrita outra vez aqui. A
  // varredura de alcance apanhou-a sem chamador — e uma consulta repetida na
  // tela é uma regra que a prova do motor não cobre.
  const denuncias = await comIdentidade(prisma, actor.id, (db) =>
    todasAsDenuncias(db));
  const porResolver = denuncias.filter(
    (d: { resolvidoEm: Date | null }) => d.resolvidoEm === null);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.painel}</p>
          <h1 data-tela="PLAT-018">{s.moderacao}</h1>
        </div>
      </div>

      <p data-teste="por-resolver">{porResolver.length}</p>

      {denuncias.length === 0 ? (
        <div data-teste="sem-denuncias">
          <Aviso tom="sucesso" titulo={s.moderacao}>{s.semDenuncias}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="denuncias">
          {denuncias.map((d: {
            id: string; origem: string; motivo: string;
            resolvidoEm: Date | null; resolvidoPor: string | null; criadoEm: Date;
          }) => (
            <li key={d.id} data-teste="denuncia">
              <span>{d.origem}</span>{' '}
              <Etiqueta tom={d.resolvidoEm ? 'sucesso' : 'aviso'}>
                {d.resolvidoEm ? s.ticketFECHADO : s.ticketABERTO}
              </Etiqueta>
              <p className="bo-campo__ajuda">{d.motivo}</p>
              <p className="bo-campo__ajuda">
                {formatarDataHora(d.criadoEm, idioma)}
                {/* Quem resolveu, pelo nome. Uma decisão sem nome não se revê. */}
                {d.resolvidoPor ? ` · ${d.resolvidoPor}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
