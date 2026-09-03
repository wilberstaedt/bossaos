import { notFound, redirect } from 'next/navigation';
import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import {
  comIdentidade, concessoesDaPlataforma, obterPrisma, organizacaoDaPlataforma,
} from '@bossaos/db';
import { CAPACIDADES } from '@bossaos/domain';
import { actorDoPedido } from '../../../../../src/sessao.ts';
import { obterEnv } from '../../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-004 · "Funciones contratadas" (atlas p. 362)
 *
 * ── O botão de guardar está desenhado e não guarda, e isso é a decisão ──────
 *
 * O atlas põe aqui "Guardar permisos comerciales". Fazê-lo funcionar exigiria
 * devolver ao runtime o `INSERT`/`UPDATE` em `entitlement_grants` — que o E05
 * lhe tirou de propósito, porque um catálogo comercial que o processo do
 * restaurante reescreve é um restaurante a dar-se um plano. Essa fronteira tem
 * prova própria e não se abre por causa de um ecrã.
 *
 * Enquanto a E33 não traz a interface completa, quem opera o piloto escreve com
 * `scripts/plataforma.mjs`, com a credencial de migração e com auditoria — e o
 * ecrã **diz isso**, em vez de ter um botão que não faz nada.
 *
 * A lista mostra o catálogo INTEIRO de capacidades, não só as concedidas: um
 * ecrã que só lista o que está ligado não responde à pergunta que se faz aqui,
 * que é "o que é que este cliente NÃO tem".
 */
export default async function ConcessoesDoTenant({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgId: string }>;
}) {
  const { idioma, orgId } = await params;
  const m = mensagensDe(idioma);
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const { org, concessoes } = await comIdentidade(prisma, actor.id, async (db) => ({
    org: await organizacaoDaPlataforma(db, orgId),
    concessoes: await concessoesDaPlataforma(db, orgId),
  }));
  if (!org) notFound();

  const porCapacidade = new Map(concessoes.map((c) => [c.capacidade, c]));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.plataforma.sobrancelhaConcessoes}</p>
          <h1>{m.plataforma.tituloConcessoes}</h1>
        </div>
      </div>

      <p className="bo-planos__actual">
        {org.nome} · {org.plano ?? '—'}
      </p>

      <div className="bo-plataforma__lista">
        {Object.keys(CAPACIDADES).map((capacidade) => {
          const c = porCapacidade.get(capacidade);
          const expirada = c?.validoAte ? c.validoAte.getTime() <= Date.now() : false;
          return (
            <Cartao key={capacidade} className="bo-plataforma__linha">
              <span>
                <span className="bo-tema__rotulo">{capacidade}</span>
                <span className="bo-uso__nota">
                  {c
                    ? `${(m.plataforma as unknown as Record<string, string>)[`origem${c.origem}`] ?? c.origem}${
                        c.quota === null ? '' : ` · ${c.quota}`
                      }${c.validoAte ? ` · ${formatarData(c.validoAte, idioma)}` : ''}`
                    : m.plataforma.naoIncluida}
                </span>
              </span>
              <Etiqueta tom={!c ? 'neutro' : expirada ? 'aviso' : c.validoAte ? 'info' : 'sucesso'}>
                {!c ? m.plataforma.naoIncluida : c.validoAte ? m.plataforma.temporal : m.plataforma.incluida}
              </Etiqueta>
            </Cartao>
          );
        })}
      </div>

      <Aviso titulo={m.plataforma.accaoGuardarConcessoes}>{m.plataforma.escritaPorScript}</Aviso>
    </div>
  );
}
