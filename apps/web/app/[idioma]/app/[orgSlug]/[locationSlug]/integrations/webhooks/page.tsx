import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INT-009 · «Tus webhooks» (atlas p. 262)
 *
 * ── O campo do destino é o campo mais perigoso desta tela ─────────────────
 *
 * Um campo onde o cliente escreve um URL é um campo onde o cliente pode pedir
 * ao **nosso** servidor que vá ler o que só ele vê: serviços de metadados na
 * nuvem, painéis internos, bases sem autenticação porque «só se chega de
 * dentro».
 *
 * A validação não está nesta tela — está no motor, antes de guardar, e na base,
 * que recusa o que não é `https`. Esta tela diz a regra por palavras para quem
 * escreve o endereço saber porque é que foi recusado.
 */
export default async function Webhooks({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const pontos = await comEscopoDoPedido(sessao, (db) =>
    db.webhookEndpoint.findMany({
      where: { organizationId: sessao.contexto.organizationId },
      // O `segredoResumo` NÃO entra na projecção: não abre nada, e o que não
      // sai não vaza.
      select: { id: true, url: true, eventos: true, activo: true, criadoEm: true },
      orderBy: { criadoEm: 'desc' },
    }));

  const entregas = await comEscopoDoPedido(sessao, (db) =>
    db.webhookDelivery.findMany({
      where: { organizationId: sessao.contexto.organizationId },
      select: { id: true, evento: true, estado: true, tentativas: true, criadoEm: true },
      orderBy: { criadoEm: 'desc' }, take: 20,
    }));

  const rotulo = (estado: string): string => {
    const v = (s as unknown as Record<string, unknown>)[`entregaEstado${estado}`];
    return typeof v === 'string' ? v : estado;
  };

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INT-009">{s.webhooks}</h1>
        </div>
      </div>

      <p className="bo-campo__ajuda" data-teste="destino-ajuda">{s.destinoAjuda}</p>

      {pontos.length === 0 ? (
        <div data-teste="sem-webhooks">
          <Aviso tom="info" titulo={s.webhooks}>{s.semWebhooks}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="pontos">
          {pontos.map((p: { id: string; url: string; eventos: string[]; activo: boolean }) => (
            <li key={p.id} data-teste="ponto">
              <span className="bo-identificador">{p.url}</span>{' '}
              <Etiqueta tom={p.activo ? 'sucesso' : 'neutro'}>
                {p.activo ? s.estadoACTIVA : s.estadoDESLIGADA}
              </Etiqueta>
              <p className="bo-campo__ajuda">{s.eventos}: {p.eventos.join(', ')}</p>
            </li>
          ))}
        </ul>
      )}

      <h2>{s.entregas}</h2>
      <ul className="bo-lista bo-lista--blocos" data-teste="entregas">
        {entregas.map((e: {
          id: string; evento: string; estado: string; tentativas: number; criadoEm: Date;
        }) => (
          <li key={e.id} data-teste="entrega">
            {e.evento} · <Etiqueta tom={
              e.estado === 'ENTREGUE' ? 'sucesso'
                : e.estado === 'DESISTIU' ? 'perigo'
                : e.estado === 'FALHOU' ? 'aviso' : 'neutro'
            }>{rotulo(e.estado)}</Etiqueta>
            <span className="bo-campo__ajuda"> {formatarDataHora(e.criadoEm, idioma)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
