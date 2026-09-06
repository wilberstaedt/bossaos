import { Aviso } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { registosDaIntegracao } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INT-010 · «Qué ocurrió en la integración» (atlas p. 263)
 *
 * ── O registo é a primeira coisa que alguém abre quando algo falha ────────
 *
 * E é onde as credenciais aparecem sem ninguém as ter posto lá: no cabeçalho de
 * autorização que se copiou «para o caso de ser útil». Por isso o corpo passa
 * pela redacção **antes** de chegar à base — o que aqui se mostra já não tinha
 * segredos quando foi gravado.
 *
 * ── E diz QUEM chamou, pelo identificador da chave ────────────────────────
 *
 * Nunca pelo valor. Daqui a um ano alguém vai perguntar quem fez uma alteração,
 * e «uma chave de API» não é resposta.
 */
export default async function RegistosDeIntegracao({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const registos = await comEscopoDoPedido(sessao,
    (db) => registosDaIntegracao(db, sessao.contexto.organizationId));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INT-010">{s.registos}</h1>
        </div>
      </div>

      <p className="bo-campo__ajuda" data-teste="sem-segredos">{s.semSegredos}</p>

      {registos.length === 0 ? (
        <div data-teste="sem-registos">
          <Aviso tom="info" titulo={s.registos}>{s.semRegistos}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="registos">
          {registos.map((r: {
            id: string; accao: string; resultado: string; ocorridoEm: Date;
            chave: { id: string; nome: string; prefixo: string } | null;
          }) => (
            <li key={r.id} data-teste="registo">
              <span>{r.accao} · {r.resultado}</span>
              <p className="bo-campo__ajuda" data-teste="quem-chamou">
                {s.quemChamou}:{' '}
                {/* O nome e o prefixo. O valor da chave não existe deste lado. */}
                {r.chave ? `${r.chave.nome} (${r.chave.prefixo}…)` : '—'}
                {' · '}{formatarDataHora(r.ocorridoEm, idioma)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
