import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Cartao, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { CANAIS, estadoComercial, obterProduto, podeCapacidade, type Canal } from '@bossaos/db';
import type { Capacidade } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-016 · "Dónde se vende" (atlas p. 68)
 *
 * ── O que este ecrã NÃO faz ────────────────────────────────────────────────
 *
 * Não esconde os canais que o plano não inclui. Mostra-os **desligados e com o
 * motivo**, porque esconder faz o dono do restaurante procurar uma
 * funcionalidade que existe e ele não vê, e culpar-se por não a encontrar.
 *
 * E — isto é o que importa — **o desligar não é a protecção**. O `disabled` é
 * cortesia de interface; quem chamar a rota directamente com `curl` encontra a
 * mesma verificação do lado do servidor, que é onde ela conta. É o comentário
 * que já está em `capacidades.ts`: o ecrã esconde para não frustrar, o servidor
 * recusa para proteger.
 *
 * `TAKEAWAY` não tem capacidade no catálogo do E05 e por isso **não é limitado
 * por plano**. Inventar-lhe aqui um nome de flag seria pior do que não a ter:
 * uma flag que ninguém registou lê-se como "não lançado", e o canal desaparecia
 * para toda a gente por causa de uma linha de código minha.
 */
const CAPACIDADE_DO_CANAL: Partial<Record<Canal, Capacidade>> = {
  CARTA: 'carta.digital',
  SITE: 'site.restaurante',
  SALA: 'sala',
  TPV: 'tpv',
  KIOSK: 'kiosk',
};

export default async function CanaisDoProduto({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; productId: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { idioma, orgSlug, productId } = await params;
  const { guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const produto = await obterProduto(db, productId);
    if (!produto) return null;
    return { produto, estado: await estadoComercial(db, sessao.contexto.organizationId) };
  });
  if (!dados) notFound();

  const { produto, estado } = dados;
  const visiveis = new Map(produto.canais.map((x) => [x.canal, x.visivel]));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaCanais}</p>
          <h1>{c.tituloCanais}</h1>
        </div>
      </div>
      {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}

      <form method="post" action={`/api/org/${orgSlug}/produtos/${productId}/canais`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        {CANAIS.map((canal) => {
          const capacidade = CAPACIDADE_DO_CANAL[canal];
          const permissao = capacidade
            ? podeCapacidade(estado, { capacidade, intencao: 'usar' })
            : { permitido: true as const };
          const rotulo = (c as unknown as Record<string, string>)[`canal${canal}`] ?? canal;
          return (
            <Cartao key={canal} {...(permissao.permitido ? {} : { variante: 'suave' as const })}>
              <div className="bo-estado__cabecalho">
                <label className="bo-campo__envolvente">
                  <input
                    type="checkbox" name="canal" value={canal}
                    defaultChecked={visiveis.get(canal) ?? false}
                    disabled={!permissao.permitido}
                  />
                  <span>{rotulo}</span>
                </label>
                {permissao.permitido
                  ? <Etiqueta tom={visiveis.get(canal) ? 'sucesso' : 'neutro'}>
                      {visiveis.get(canal) ? c.visivelNoCanal : c.oculto}
                    </Etiqueta>
                  : <Etiqueta tom="aviso">
                      {/* "Comprado mas por construir" e "não comprado" são
                          respostas diferentes, e o E05 já as distingue. */}
                      {permissao.motivo === 'desligado' ? m.planos.motivoDesligado : c.semPlano}
                    </Etiqueta>}
              </div>
            </Cartao>
          );
        })}
        <Botao type="submit">{c.accaoGuardarCanais}</Botao>
      </form>
    </div>
  );
}
