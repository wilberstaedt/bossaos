import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { politicaDeRetencao } from '@bossaos/db';
import { NUNCA_ATRAS_DO_PLANO } from '@bossaos/domain';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-013 · «Retención y privacidad» (atlas p. 171)
 *
 * ── Vazio quer dizer «não decidido», e não «para sempre» ──────────────────
 *
 * É a mesma distinção do E30 entre ausência e zero, aplicada a uma decisão
 * jurídica. Um campo vazio que o produto lesse como «guardar indefinidamente»
 * seria o produto a decidir por quem tem de decidir — e a decisão de quanto
 * tempo se guardam dados de clientes depende de conselho jurídico que este
 * projecto não tem.
 *
 * Por isso não há valor por omissão. A tela di-lo por palavras, e a base aceita
 * `NULL`.
 *
 * ── E esta tela funciona no plano mais barato ─────────────────────────────
 *
 * **Segurança, privacidade e exportação nunca ficam atrás do plano.** É a única
 * exigência da régua que não é técnica, e a que chega devagar: começa por «a
 * exportação em massa é uma funcionalidade Pro» e acaba com um cliente sem forma
 * de sair.
 *
 * Não há aqui verificação de plano nenhuma — e a ausência é a garantia. Um
 * gatilho na base recusa pôr qualquer destas capacidades atrás de um plano.
 */
export default async function RetencaoEPrivacidade({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const politica = await comEscopoDoPedido(sessao,
    (db) => politicaDeRetencao(db, sessao.contexto.organizationId));

  const campos = [
    { nome: 'diasPedidos', rotulo: s.diasPedidos, valor: politica?.diasPedidos },
    { nome: 'diasClientes', rotulo: s.diasClientes, valor: politica?.diasClientes },
    { nome: 'diasAuditoria', rotulo: s.diasAuditoria, valor: politica?.diasAuditoria },
  ];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="SET-013">{s.retencao}</h1>
        </div>
      </div>

      {/* A promessa que não é técnica, escrita onde quem paga a lê. */}
      <div data-teste="nunca-atras-do-plano">
        <Aviso tom="info" titulo={s.nuncaAtrasDoPlano}>{s.nuncaAtrasDoPlanoAjuda}</Aviso>
      </div>

      <form method="post" action={`/api/org/${orgSlug}/retencao`}>
        {campos.map((c) => (
          <label className="bo-campo__linha" key={c.nome}>
            <span>{c.rotulo}</span>
            {/* `type="text"` e não `number`: a armadilha do `step` do E22, e
                porque o vazio tem de poder ser vazio. */}
            <input type="text" inputMode="numeric" name={c.nome}
                   defaultValue={c.valor === null || c.valor === undefined ? '' : String(c.valor)}
                   placeholder={s.retencaoNaoDecidida}
                   data-teste={c.nome} />
          </label>
        ))}
        <p className="bo-campo__ajuda" data-teste="nao-decidida">{s.retencaoAjuda}</p>
        <button className="bo-botao" type="submit">{s.guardar}</button>
      </form>

      <h2>{s.exportar}</h2>
      {/* Sem portão de plano. A ausência de verificação é a garantia. */}
      <form method="post" action={`/api/org/${orgSlug}/exportar`}>
        <button className="bo-botao" type="submit" data-teste="exportar">{s.exportar}</button>
      </form>

      <p className="bo-campo__ajuda" data-teste="protegidas">
        {NUNCA_ATRAS_DO_PLANO.join(' · ')}
      </p>
    </div>
  );
}
