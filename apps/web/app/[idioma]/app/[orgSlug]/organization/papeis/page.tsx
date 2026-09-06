import { notFound } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { NUNCA_ATRAS_DO_PLANO } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-009 · «Roles y permisos» (atlas p. 141)
 *
 * ── O que esta tela mostra, e a linha que ela não deixa passar ────────────
 *
 * Os papéis da casa e o que cada um pode fazer. E, por baixo, a lista das
 * capacidades que **nenhum plano pode esconder**: segurança, privacidade e
 * exportação.
 *
 * Está aqui e não só na tela de retenção porque é aqui que alguém vem quando
 * quer perceber «quem pode o quê» — e é aqui que a pergunta «e se eu subir de
 * plano, ganho mais?» aparece primeiro. A resposta, para estas oito, é não:
 * não se ganha porque nunca se perdeu.
 */
export default async function PapeisEPermissoes({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();

  // ── O papel vive na ATRIBUIÇÃO, e não no membro ─────────────────────────
  //
  // Escrevi `membership.papel` à primeira e o typecheck disse que não existe.
  // Foi bom: uma pessoa pode ter papéis diferentes em marcas ou unidades
  // diferentes — «gerente aqui, empregado ali» — e um papel único por membro
  // teria escondido isso. A tabela certa é a `role_assignments`.
  const atribuicoes = await comEscopoDoPedido(sessao, (db) =>
    db.roleAssignment.findMany({
      where: { organizationId: sessao.contexto.organizationId },
      select: { id: true, papel: true, brandId: true, locationId: true },
      orderBy: { papel: 'asc' },
    }));

  const porPapel = new Map<string, number>();
  for (const a of atribuicoes as { papel: string }[]) {
    porPapel.set(a.papel, (porPapel.get(a.papel) ?? 0) + 1);
  }

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{orgSlug}</p>
          <h1 data-tela="ORG-009">{s.papeis}</h1>
        </div>
      </div>

      {porPapel.size === 0 ? (
        <div data-teste="sem-papeis">
          <Aviso tom="info" titulo={s.papeis}>{s.semPapeis}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="papeis">
          {[...porPapel.entries()].map(([papel, quantos]) => (
            <li key={papel} data-teste="papel">
              <span>{papel}</span> <Etiqueta tom="neutro">{quantos}</Etiqueta>
            </li>
          ))}
        </ul>
      )}

      <h2>{s.nuncaAtrasDoPlano}</h2>
      <p className="bo-campo__ajuda" data-teste="nunca-atras-do-plano">
        {s.nuncaAtrasDoPlanoAjuda}
      </p>
      <ul className="bo-lista bo-lista--blocos" data-teste="protegidas">
        {NUNCA_ATRAS_DO_PLANO.map((c) => (
          <li key={c} data-teste="protegida">
            <span className="bo-identificador">{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
