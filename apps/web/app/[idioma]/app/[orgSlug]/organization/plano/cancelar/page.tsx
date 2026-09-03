import { redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { estadoComercial, lerPerfil } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-015 · "Cancelar la suscripción" (atlas p. 52)
 *
 * Dois campos do atlas são reais e dois não. **Efeito** e **confirmação forte**
 * são reais: o efeito é ao fim do período, e a confirmação exige escrever o nome
 * da organização. A **exportação** ainda não existe (E32), e diz que não existe
 * em vez de ter um botão que não descarrega nada.
 *
 * E a frase que falta no atlas e que devia estar lá: **cancelar não apaga**. O
 * histórico fica, porque é obrigação e não conveniência.
 */
export default async function CancelarSubscricao({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
  searchParams: Promise<{ registado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const { registado, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.cancelar;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);
  const dados = await comEscopoDoPedido(sessao, async (db) => ({
    perfil: await lerPerfil(db, sessao.contexto.organizationId),
    estado: await estadoComercial(db, sessao.contexto.organizationId),
  }));

  return (
    <div className="bo-pagina">
      <form method="post" action={`/api/org/${orgSlug}/cancelamento`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{c.sobrancelha}</p>
            <h1>{c.titulo}</h1>
          </div>
        </div>

        {registado ? <Aviso tom="sucesso" titulo={c.sobrancelha}>{c.pedidoRegistado}</Aviso> : null}
        {erro ? <Aviso tom="perigo" titulo={c.confirmacao} urgente>
          {c.escreva.replace('{nome}', dados.perfil?.nome ?? '')}
        </Aviso> : null}

        <Cartao>
          <dl className="bo-estado__factos">
            <div><dt>{c.organizacao}</dt><dd>{dados.perfil?.nome ?? '—'}</dd></div>
            <div><dt>{m.planos.planoActual}</dt><dd>{dados.estado.planoNome ?? m.planos.semSubscricao}</dd></div>
            <div><dt>{c.efeito}</dt><dd>{c.aoFimDoPeriodo}</dd></div>
            <div>
              <dt>{c.exportacao}</dt>
              {/* Sem botão. Um "Descargar" que não descarrega é pior do que a
                  ausência: alguém cancela a contar com ele. */}
              <dd className="bo-uso__valor--ausente">{c.exportacaoPorMedir}</dd>
            </div>
          </dl>

          <div className="bo-forma__grelha">
            <Campo rotulo={c.motivo} name="motivo" />
            <Campo rotulo={c.confirmacao} name="confirmacao" required
                   ajuda={c.escreva.replace('{nome}', dados.perfil?.nome ?? '')} />
          </div>

          <div className="bo-estado__accoes">
            <a className="bo-botao bo-botao--secundario" href={`/${idioma}/app/${orgSlug}/organization/plano`}>
              {c.voltar}
            </a>
            <Botao type="submit" tom="perigo">{c.accao}</Botao>
          </div>
        </Cartao>

        <p className="bo-planos__nota">{c.nota}</p>
      </form>
    </div>
  );
}
