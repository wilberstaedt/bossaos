import { redirect } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, obterPrisma } from '@bossaos/db';
import { estadoDaSessao } from '@bossaos/domain';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-007 · «Cola de soporte» (atlas p. 237)
 *
 * ── A tela onde se vê se estamos a cumprir as nossas próprias regras ──────
 *
 * Mostra as sessões, e o estado de cada uma é **derivado**: viva, terminada, ou
 * **expirada**. A terceira é a que interessa — uma sessão expirada é uma que
 * ninguém fechou, e a lista delas é a medida de quão bem estamos a fechar o que
 * abrimos.
 *
 * Não é uma lista de erros: a expiração funcionou, e por isso ninguém ficou com
 * acesso. É uma lista de hábitos.
 */
export default async function FilaDeSuporte({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const sessoes = await comIdentidade(prisma, actor.id, (db) =>
    db.supportSession.findMany({
      select: {
        id: true, organizationId: true, staffEmail: true, motivo: true,
        ambito: true, abertaEm: true, expiraEm: true, terminadaEm: true,
      },
      orderBy: { abertaEm: 'desc' }, take: 50,
    }));

  const agora = new Date();
  const esquecidas = sessoes.filter(
    (x: { terminadaEm: Date | null; expiraEm: Date }) =>
      estadoDaSessao(x, agora) === 'expirada');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.painel}</p>
          <h1 data-tela="PLAT-007">{s.filaDeSuporte}</h1>
        </div>
      </div>

      <p className="bo-campo__ajuda" data-teste="expira-sozinha">{s.expiraSozinha}</p>
      {/* Quantas ficaram por fechar. Não é um erro — é um hábito medido. */}
      <p data-teste="quantas-expiradas">{esquecidas.length}</p>

      {sessoes.length === 0 ? (
        <div data-teste="sem-sessoes">
          <Aviso tom="info" titulo={s.filaDeSuporte}>{s.semSessoes}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="sessoes">
          {sessoes.map((x: {
            id: string; organizationId: string; staffEmail: string; motivo: string;
            ambito: string[]; abertaEm: Date; expiraEm: Date; terminadaEm: Date | null;
          }) => {
            const estado = estadoDaSessao(x, agora);
            return (
              <li key={x.id} data-teste="sessao">
                <a className="bo-lista__ligacao" data-seccao="PLAT-008"
                   href={`/${idioma}/platform/suporte/${x.id}`}>
                  <span data-teste="quem">{x.staffEmail}</span>
                  <Etiqueta tom={
                    estado === 'viva' ? 'aviso'
                      : estado === 'expirada' ? 'perigo' : 'neutro'
                  }>
                    {estado === 'viva' ? s.sessaoViva
                      : estado === 'terminada' ? s.sessaoTerminada : s.sessaoExpirada}
                  </Etiqueta>
                </a>
                <p className="bo-campo__ajuda">{x.motivo}</p>
                <p className="bo-campo__ajuda">
                  {formatarDataHora(x.abertaEm, idioma)} · {x.ambito.join(', ')}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
