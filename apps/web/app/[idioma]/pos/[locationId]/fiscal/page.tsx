import { mensagensDe, formatarHora, type Idioma } from '@bossaos/i18n';
import { conectorFiscal, eDocumentoFiscal, filaFiscal } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { carregarTpv } from '../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-020 · «Documentos fiscais» (atlas)
 *
 * ── O que este ecrã diz, e a distinção que ele existe para fazer ──────────
 *
 * «Um PDF bonito não é um documento fiscal.» Aqui isso é visível: só a linha
 * **aceite, com número do fornecedor**, aparece como documento. Tudo o resto —
 * pendente, enviado, rejeitado — traz por palavras que **não** é.
 *
 * E a rejeição traz o **motivo**, porque quem a tem de corrigir precisa de saber
 * o quê. Uma rejeição sem motivo é um beco.
 */
export default async function DocumentosFiscais({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).fiscalE24;
  const { unidade, sessao } = await carregarTpv(idioma, locationId);
  const fila = await comEscopoDoPedido(sessao, (db) => filaFiscal(db, unidade.id));
  const conector = await comEscopoDoPedido(sessao, (db) => conectorFiscal(db, unidade.id));
  const rotulo: Record<string, string> = {
    PENDENTE: t.pendente, ENVIADO: t.enviado, ACEITE: t.aceite,
    REJEITADO: t.rejeitado, ANULADO: t.anulado,
  };

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="POS-020">{t.fiscal}</h1>
        </div>
      </div>
      {!conector?.activo && <p data-teste="emissao-bloqueada">{t.emissaoBloqueada}</p>}
      <p data-teste="por-confirmar">{t.porConfirmar}</p>
      <p data-teste="quantos">{fila.length}</p>
      {fila.length === 0 ? <p data-teste="sem-documentos">{t.semDocumentos}</p> : (
        <ul className="bo-lista" data-teste="documentos">
          {fila.map((d) => (
            <li key={d.id}>
              <span data-teste="estado-documento">{rotulo[d.estado]}</span>
              <span>{formatarHora(d.criadoEm, idioma)}</span>
              {eDocumentoFiscal(d) ? (
                <>
                  <span data-teste="e-documento">{t.eDocumento}</span>
                  <span data-teste="numero">{d.numeroProvedor}</span>
                </>
              ) : (
                <span data-teste="nao-e-documento">{t.naoEDocumento}</span>
              )}
              {d.motivoRejeicao && (
                <span data-teste="motivo-rejeicao">{t.motivo}: {d.motivoRejeicao}</span>
              )}
              {d.corrigeId && <span data-teste="corrige">{t.corrigeO}</span>}
            </li>
          ))}
        </ul>
      )}
      <a className="bo-botao" data-seccao="fiscal-config"
         href={`/${idioma}/pos/${locationId}/fiscal/configuracao`}>{t.configuracao}</a>
    </div>
  );
}
