import { notFound, redirect } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { momentoLocal, precoDoPlano, IMPOSTOS_INCLUIDOS, MOEDA_COMERCIAL } from '@bossaos/domain';
import {
  CAPACIDADE_DO_TEMA, estadoComercial, historicoDoTema, listarUnidades, podeCapacidade,
  previaDeDescidaParaPlano, temaActivo,
} from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * THEME-008 · «Así cambia el tema al bajar de plan» (atlas p. 386)
 *
 * ── Três promessas, e falham por caminhos diferentes ──────────────────────
 *
 * A régua do E12 é explícita sobre este aceite ser o mais perigoso dos três:
 *
 *   1. **reverte na data** — não à meia-noite do servidor;
 *   2. **preserva conteúdo** — a aparência recua, o que se escreveu fica;
 *   3. **restaura depois do upgrade** — e esta é a que separa reverter de
 *      apagar. *«Uma implementação que APAGASSE o tema passava as duas
 *      primeiras.»*
 *
 * Esta tela mostra as três, e a terceira tem botão: `restaurarTemaAnterior` só
 * existe porque sem ela subir de plano obrigava a reconfigurar do zero.
 *
 * ── A data é a do SÍTIO, e é aqui que isso se vê ──────────────────────────
 *
 * `descer_em` é um instante. O que a pessoa precisa de ler é o DIA no fuso da
 * unidade dela — e `momentoLocal` é a mesma função que os horários usam desde o
 * E06. Formatar o instante com o fuso do servidor daria, numa unidade a oeste de
 * Greenwich, um dia diferente do que foi agendado.
 *
 * **Unidade sem fuso não vira UTC.** A tela diz que não sabe dizer o dia e manda
 * configurar. É a mesma regra dos alergénios e do DNS: ausência não é política.
 *
 * ── E o valor, que é a parte que se esquece ───────────────────────────────
 *
 * A `PRECIFICACAO.md` obriga a mostrar **data, valor e impacto ANTES** da
 * mudança. O impacto é o que se esquece — e um ecrã que mostra data e valor e
 * cala o impacto engana a pessoa no momento em que ela decide.
 */
export default async function TemaEPlano({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const t = m.temaE12;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    const estado = await estadoComercial(db, sessao.contexto.organizationId);
    return {
      unidade: unidades.find((u) => u.slug === locationSlug) ?? null,
      estado,
      activo: await temaActivo(db, sessao.contexto.organizationId),
      historico: await historicoDoTema(db, sessao.contexto.organizationId, 20),
      previa: estado.descerParaPlano
        ? await previaDeDescidaParaPlano(db, sessao.contexto.organizationId, estado.descerParaPlano)
        : null,
    };
  });
  if (!dados.unidade) notFound();

  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/website/theme`;
  const podeCores = podeCapacidade(dados.estado, {
    capacidade: CAPACIDADE_DO_TEMA, intencao: 'usar',
  });

  // O dia, no fuso da unidade. Sem fuso não há dia — e não se inventa um.
  const fuso = dados.unidade.fuso;
  const diaEfectivo = dados.estado.descerEm && fuso
    ? momentoLocal(dados.estado.descerEm, fuso).data
    : null;

  const preco = dados.estado.descerParaPlano ? precoDoPlano(dados.estado.descerParaPlano) : null;

  // Há tema próprio guardado para restaurar? É a pergunta da terceira promessa,
  // e a resposta sai do histórico: uma revisão NÃO padrão, seja ela activa ou
  // não. Se a descida tivesse apagado o tema, isto ficava vazio — e é
  // exactamente isso que o par mede.
  const temaGuardado = dados.historico.find((r) => !r.padrao) ?? null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{t.sobrancelha}</p>
          <h1>{t.planoTitulo}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={base}>{m.comum.voltar}</a>
      </div>

      {busca.restaurado ? (
        <Aviso tom="sucesso" titulo={t.restaurado}>{t.revisao}: {String(busca.restaurado)}</Aviso>
      ) : null}
      {busca.erro === 'nada_para_restaurar' ? (
        <Aviso tom="aviso" titulo={t.nadaParaRestaurar}>{t.nadaParaRestaurar}</Aviso>
      ) : null}

      {dados.estado.descerParaPlano ? (
        <Cartao titulo={t.planoTitulo}>
          <dl className="bo-estado__factos">
            <dt>{t.planoData}</dt>
            <dd>
              {diaEfectivo ?? t.planoSemFuso}
              {fuso ? ` · ${t.planoFuso}: ${fuso}` : ''}
            </dd>

            <dt>{t.planoValor}</dt>
            <dd>
              {preco ? (
                <>
                  {formatarDinheiro({ montanteMenor: preco.mensal, moeda: MOEDA_COMERCIAL }, idioma)} {t.aoMes}
                  {' · '}
                  {formatarDinheiro({ montanteMenor: preco.anual, moeda: MOEDA_COMERCIAL }, idioma)} {t.aoAno}
                  {' · '}
                  {t.equivalenteMes.replace(
                    '{valor}',
                    formatarDinheiro({ montanteMenor: preco.equivalenteMensal, moeda: MOEDA_COMERCIAL }, idioma),
                  )}
                  {IMPOSTOS_INCLUIDOS ? '' : ` · ${t.maisIva}`}
                </>
              ) : (
                // «Um campo sem valor não vira gratuito.» Sem preço na fonte, o
                // ecrã diz "a orçar" e não um zero.
                t.semPreco
              )}
            </dd>

            <dt>{t.planoImpacto}</dt>
            <dd>
              {t.planoImpactoTexto}
              {dados.previa?.perdeCoresProprias === false ? ` · ${t.semAlteracoes}` : ''}
            </dd>

            <dt>{t.planoPreserva}</dt>
            <dd>{t.planoPreservaTexto}</dd>

            <dt>{t.planoRestaura}</dt>
            <dd>{t.planoRestauraTexto}</dd>
          </dl>
        </Cartao>
      ) : (
        <Aviso titulo={t.planoTitulo}>{t.planoSemDescida}</Aviso>
      )}

      <Cartao titulo={t.planoRestaura}>
        <dl className="bo-estado__factos">
          <dt>{t.origem}</dt>
          <dd>{dados.activo.padrao ? t.origemPadrao : t.origemPublicado}</dd>
          <dt>{t.historico}</dt>
          <dd>
            {temaGuardado
              ? <code className="bo-tema__valor">{temaGuardado.primaria.toUpperCase()}</code>
              : t.nadaParaRestaurar}
          </dd>
        </dl>

        {/* O botão só aparece quando as duas condições da terceira promessa se
            verificam: o direito voltou E há tema guardado. Com o direito em
            falta, `restaurarTemaAnterior` recusa na mesma — a verificação está no
            serviço, e este `if` é cortesia, não segurança. */}
        {temaGuardado && podeCores.permitido && dados.activo.padrao ? (
          <form method="post" action={`/api/org/${orgSlug}/tema/rascunho`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="restaurar" />
            <button className="bo-botao bo-botao--primario" type="submit">{t.planoRestaurar}</button>
          </form>
        ) : null}
      </Cartao>
    </div>
  );
}
