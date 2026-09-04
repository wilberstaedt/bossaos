import { listarZonas } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { CabecalhoDoStaff, textosDoStaff } from '../../../../../src/staff/PecasDoStaff.tsx';
import { EscolhaDeZona } from '../../../../../src/staff/EscolhaDeZona.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-002 · «¿En qué zona estás?» (atlas p. 161)
 *
 * A escolha fica no aparelho, particionada pela mesma chave da fila. A razão
 * está em `EscolhaDeZona.tsx`, e é a regra 1 do contrato em ponto pequeno.
 */
export default async function ZonasDoStaff({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = textosDoStaff(idioma);
  const { sessao, unidade, particao } = await carregarStaff(idioma, locationId);
  const zonas = await comEscopoDoPedido(sessao, (db) => listarZonas(db, unidade.id));

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.zonas} tela="STAFF-002" actual="/zonas" />
      <EscolhaDeZona
        particao={particao}
        zonas={zonas.map((z: { id: string; nome: string }) => ({ id: z.id, nome: z.nome }))}
        m={{ escolherZona: s.escolherZona, zonaEscolhida: s.zonaEscolhida,
             zonaNoAparelho: s.zonaNoAparelho, semZonas: s.semZonas }}
      />
    </div>
  );
}
