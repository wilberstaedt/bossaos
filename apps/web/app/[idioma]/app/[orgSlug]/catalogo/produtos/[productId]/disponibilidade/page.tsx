import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Etiqueta, Seletor } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { estaDisponivel, listarUnidades, obterProduto } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-017 · disponibilidade (atlas p. 69)
 *
 * A camada de baixo das duas que o contrato separa: **"acabou o polvo" retira a
 * venda na hora e não republica a carta**. Um restaurante que tivesse de refazer
 * a publicação para dizer que acabou uma coisa deixava simplesmente de o dizer,
 * e o cliente pedia o que não há.
 *
 * O bloqueio com data de fim **expira sozinho** — é o "hasta próximo servicio"
 * do atlas. Sem isso, alguém tinha de se lembrar de desbloquear amanhã de
 * manhã, e ninguém se lembra.
 *
 * O aviso dos pedidos existentes é literal do contrato: um pedido já feito
 * **conserva a informação original**. Bloquear um produto não reescreve o que
 * alguém já pediu, nem o preço a que o pediu.
 */
export default async function DisponibilidadeDoProduto({
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
    const unidades = await listarUnidades(db);
    const estados = await Promise.all(
      unidades.map(async (u) => [u, await estaDisponivel(db, productId, u.id)] as const),
    );
    return { produto, unidades, estados };
  });
  if (!dados) notFound();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaDisponibilidade}</p>
          <h1>{dados.produto.nome}</h1>
        </div>
      </div>
      {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}
      <Aviso tom="info" titulo={c.pedidosExistentes}>{c.pedidosConservam}</Aviso>

      {dados.estados.map(([unidade, estado]) => (
        <Cartao key={unidade.id}>
          <div className="bo-estado__cabecalho">
            <h2 className="bo-planos__nome">{unidade.nome}</h2>
            <Etiqueta tom={estado.disponivel ? 'sucesso' : 'aviso'}>
              {estado.disponivel ? c.disponivel : c.esgotado}
            </Etiqueta>
          </div>
          {estado.motivo ? <p className="bo-planos__nota">{`${c.motivo}: ${estado.motivo}`}</p> : null}
          {estado.ate
            ? <p className="bo-planos__nota">
                {`${c.ate} ${formatarDataHora(estado.ate, idioma, unidade.fuso ?? 'UTC')}`}
              </p>
            : null}

          <form method="post" action={`/api/org/${orgSlug}/produtos/${productId}/disponibilidade`}
                className="bo-forma">
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationId" value={unidade.id} />
            <div className="bo-forma__grelha">
              <Seletor rotulo={c.estado} name="bloqueado" defaultValue={estado.disponivel ? '0' : '1'}>
                <option value="0">{c.disponivel}</option>
                <option value="1">{c.esgotado}</option>
              </Seletor>
              <Campo rotulo={c.motivo} name="motivo" defaultValue={estado.motivo ?? ''} />
              {/*
                `datetime-local` escreve uma hora SEM fuso. A rota interpreta-a
                no fuso DA UNIDADE, não no do servidor nem no do navegador de
                quem carrega no botão — que pode estar noutro país.
              */}
              <Campo rotulo={c.ate} name="ate" type="datetime-local" />
            </div>
            <Botao type="submit">{c.accaoGuardarDisponibilidade}</Botao>
          </form>
        </Cartao>
      ))}
    </div>
  );
}
