import { redirect } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, obterPrisma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-020 · «Proveedores de la plataforma» (atlas p. 250)
 *
 * ── Esta tela lista provedores e **não mostra uma única credencial** ──────
 *
 * E não é por estarem mascaradas: é porque não estão na base. As credenciais
 * reais entram pelo **ambiente autorizado** — a decisão do E23 para o segredo
 * do webhook, aplicada a tudo o resto.
 *
 * Uma tela que mostrasse `sk_live_••••••` estaria a dizer que a chave existe do
 * lado de cá, e uma que tivesse um campo para a escrever estaria a criar uma
 * coluna para ela. Nem uma nem outra.
 *
 * O que se vê é o que é verdadeiro: quais estão declarados, em que estado, e o
 * que falta a cada um.
 */
export default async function ProvedoresDaPlataforma({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const integracoes = await comIdentidade(prisma, actor.id, (db) =>
    db.integration.findMany({
      select: {
        id: true, familia: true, provedor: true, estado: true,
        requisitos: true, ultimoErro: true,
      },
      orderBy: [{ familia: 'asc' }, { provedor: 'asc' }],
    }));

  const rotulo = (estado: string): string => {
    const v = (s as unknown as Record<string, unknown>)[`estado${estado}`];
    return typeof v === 'string' ? v : estado;
  };

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.catalogo}</p>
          <h1 data-tela="PLAT-020">{s.provedores}</h1>
        </div>
      </div>

      {integracoes.length === 0 ? (
        <div data-teste="sem-integracoes">
          <Aviso tom="info" titulo={s.provedores}>{s.semIntegracoes}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="provedores">
          {integracoes.map((i: {
            id: string; familia: string; provedor: string; estado: string;
            requisitos: string | null; ultimoErro: string | null;
          }) => (
            <li key={i.id} data-teste="provedor">
              <span>{i.familia} · {i.provedor}</span>{' '}
              <Etiqueta tom={
                i.estado === 'ACTIVA' ? 'sucesso'
                  : i.estado === 'ERRO' ? 'perigo' : 'neutro'
              }>{rotulo(i.estado)}</Etiqueta>
              {i.requisitos ? (
                <p className="bo-campo__ajuda" data-teste="requisitos">
                  {s.requisitos}: {i.requisitos}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
