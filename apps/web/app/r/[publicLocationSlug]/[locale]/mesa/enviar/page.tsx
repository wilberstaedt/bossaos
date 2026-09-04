import { randomUUID } from 'node:crypto';
import { comEscopo, obterProduto, obterPrisma } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarVisita } from '../../../../../../src/visitante/carregar-visita.ts';
import {
  CabecalhoDaVisita, NavegacaoDaVisita, textosDoVisitante,
} from '../../../../../../src/visitante/PecasDoVisitante.tsx';
import { lerCarrinho } from '../../../../../../src/visitante/carrinho.ts';
import { obterEnv } from '../../../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * MENU-008 · «Todo listo para enviar» (atlas p. 88)
 *
 * ── A chave do comando nasce AQUI, e não no botão ─────────────────────────
 *
 * `command_id` num campo escondido, gerado ao desenhar a página. É a regra do
 * E14 (*«o `command_id` nasce no cliente, antes do envio»*), e o efeito prático é
 * o que interessa numa mesa: quem carrega duas vezes no botão, ou recarrega a
 * página depois de enviar, **não pede duas vezes** — o servidor reconhece a
 * chave e devolve a mesma resposta.
 *
 * É o defeito que mais dói neste ecrã: duas rondas iguais para a cozinha, e uma
 * conta a dobrar que alguém descobre no fim.
 */
export default async function ProntoParaEnviar({
  params,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
}) {
  const { publicLocationSlug, locale } = await params;
  const idioma = locale as Idioma;
  const s = textosDoVisitante(idioma);
  const visitante = await carregarVisita(publicLocationSlug, locale);
  const carrinho = await lerCarrinho();
  const base = `/r/${publicLocationSlug}/${locale}`;

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const nomes = await comEscopo(prisma, { organizationId: visitante.organizationId },
    (db) => Promise.all(carrinho.map(async (i) => ({
      ...i, nome: (await obterProduto(db, i.productId))?.nome ?? i.productId,
    }))));

  return (
    <div className="bo-pagina">
      <CabecalhoDaVisita sobrancelha={`${s.naMesa} ${visitante.mesaCodigo}`}
                         titulo={s.prontoParaEnviar} tela="MENU-008" />
      <NavegacaoDaVisita idioma={idioma} base={base} actual="/pedido" />

      <p data-teste="quantos">{nomes.length}</p>

      {nomes.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="vazio">{s.carrinhoVazio}</p>
      ) : (
        <>
          <ul className="bo-publico__lista" data-teste="a-enviar">
            {nomes.map((l) => (
              <li key={l.productId} className="bo-publico__produto" data-teste="item">
                <span className="bo-publico__nome">{l.quantidade}× {l.nome}</span>
              </li>
            ))}
          </ul>
          <form method="post" action="/api/publico/mesa" data-teste="enviar">
            <input type="hidden" name="slug" value={publicLocationSlug} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="accao" value="pedir" />
            {/* A chave nasce ao desenhar a página: recarregar e voltar a enviar
                devolve a MESMA resposta em vez de criar uma segunda ronda. */}
            <input type="hidden" name="commandId" value={randomUUID()} />
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--primario" type="submit">
                {s.enviarACozinha}
              </button>
            </div>
          </form>
          <p className="bo-campo__ajuda" data-teste="origem">{s.aOrigem}</p>
        </>
      )}
    </div>
  );
}
