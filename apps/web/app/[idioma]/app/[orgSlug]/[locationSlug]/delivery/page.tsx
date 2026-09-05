import { Aviso, Botao, Campo, Etiqueta, Tabela } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { conectorDeEntrega, listarAreas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { carregarLevar } from '../../../../../../src/levar/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * DEL-001 · «Canales de delivery» (atlas)
 *
 * ── Duas coisas nesta tela, e as duas dizem o mesmo tipo de verdade ───────
 *
 * As **zonas** com a sua taxa, e o **conector** externo. As duas partilham a
 * regra que já usámos três vezes: **ausência não é política**. Sem zona não se
 * entrega e não se inventa taxa; sem provedor não se aceitam pedidos e não se
 * finge que se aceitam.
 *
 * E o conector diz a consequência por palavras, não só o estado — «desligado»
 * sozinho lê-se como um pormenor de configuração.
 */
export default async function CanaisDeDelivery({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const t = m.levarE20;
  const { sessao, unidade } = await carregarLevar(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/delivery`;

  const { areas, conector } = await comEscopoDoPedido(sessao, async (db) => ({
    areas: await listarAreas(db, unidade.id),
    conector: await conectorDeEntrega(db, unidade.id),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="DEL-001">{t.canais}</h1>
        </div>
        <Etiqueta tom={conector.activo ? 'sucesso' : 'neutro'}>
          {conector.activo ? t.ligado : t.desligado}
        </Etiqueta>
      </div>

      {!conector.activo ? (
        <Aviso tom="aviso" titulo={t.conector}>
          <p data-teste="conector-desligado">{t.desligado}</p>
          {/* A consequência, e não só o estado. */}
          <p data-teste="conector-ajuda">{t.conectorAjuda}</p>
        </Aviso>
      ) : null}
      {busca.erro === 'SEM_PROVEDOR' ? <p data-teste="erro">{t.provedor}</p> : null}

      {/* Sem zona não se entrega, e não se inventa taxa nenhuma. A frase fica
          SEMPRE visível: quem acrescenta a segunda zona precisa de a ler tanto
          como quem acrescentou a primeira. */}
      <p className="bo-campo__ajuda" data-teste="sem-areas-ajuda">{t.semAreasAjuda}</p>

      <Tabela
        legenda={t.area}
        vazio={<p data-teste="sem-areas">{t.semAreas}</p>}
        colunas={[
          { chave: 'nome', rotulo: t.area },
          { chave: 'codigoPostal', rotulo: t.codigoPostal },
          { chave: 'taxa', rotulo: t.taxa, numero: true },
        ]}
        linhas={areas.map((a) => ({
          id: a.id, nome: a.nome, codigoPostal: a.codigoPostal,
          taxa: formatarDinheiro({ montanteMenor: a.taxaMenor, moeda: a.moeda }, idioma),
        }))}
      />

      <form method="post" action={`/api/org/${orgSlug}/levar`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="guardar_area" />
        <Campo rotulo={t.area} name="nome" type="text" defaultValue="" />
        <Campo rotulo={t.codigoPostal} name="codigoPostal" type="text" defaultValue="" />
        <Campo rotulo={t.taxa} name="taxaMenor" type="text" inputMode="numeric" defaultValue="" />
        <Botao type="submit" data-teste="guardar-area">{t.adicionar}</Botao>
      </form>

      <form method="post" action={`/api/org/${orgSlug}/levar`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="guardar_conector" />
        <Campo rotulo={t.provedor} name="provedor" type="text"
               defaultValue={conector.provedor ?? ''} />
        <label className="bo-campo">
          <input type="checkbox" name="activo" value="1" data-teste="activo"
                 defaultChecked={conector.activo} />
          <span>{t.activar}</span>
        </label>
        <Botao type="submit">{t.guardar}</Botao>
      </form>

      <p className="bo-campo__ajuda">
        <a href={`${base}/mapeamento`} data-seccao="DEL-002">{t.mapeamento}</a>
        {' · '}
        <a href={`${base}/fila`} data-seccao="DEL-003">{t.filaEntrega}</a>
      </p>
    </div>
  );
}
