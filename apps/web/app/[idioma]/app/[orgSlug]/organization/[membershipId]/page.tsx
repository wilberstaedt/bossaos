import { notFound } from 'next/navigation';
import { Aviso, Botao, Campo, Estado } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { pessoasEAcessos } from '@bossaos/db';
import { decidirLeitura, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-008 · a ficha de uma pessoa
 *
 * O par outra vez, agora numa página: a pertença de outro inquilino não chega
 * aqui como "encontrada e proibida" — chega como `null`, porque a consulta corre
 * com escopo. `decidirLeitura` transforma isso em **ausência**, que é
 * indistinguível de não existir.
 */
export default async function FichaDePessoa({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; membershipId: string }>;
}) {
  const { idioma, orgSlug, membershipId } = await params;
  const m = mensagensDe(idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();
  if (exigirAccao(sessao.concessoes, 'equipa.ler')) notFound();

  const pessoas = await comEscopoDoPedido(sessao,
    (db) => pessoasEAcessos(db, sessao.contexto.organizationId));
  const r = decidirLeitura({
    encontrado: pessoas.find((p) => p.id === membershipId) ?? null,
    concessoes: sessao.concessoes,
    accao: 'equipa.ler',
  });
  if (r.tipo !== 'ok') notFound();

  const pessoa = r.valor;
  const podeGerir = !exigirAccao(sessao.concessoes, 'equipa.gerir');

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.pessoas.colunaUtilizador}</p>
          <h1>{pessoa.user.nome || pessoa.user.email}</h1>
        </div>
        {/* "Guardar acceso" saiu: não existe caminho que guarde a função de uma
            pessoa. Revogar existe e funciona; guardar não. */}
      </div>

      <Aviso tom="info" titulo={m.pessoa.accao}>{m.comum.papelPelaPlataforma}</Aviso>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <Campo rotulo={m.pessoa.email} defaultValue={pessoa.user.email} readOnly />
        <Campo rotulo={m.pessoa.funcao} defaultValue={pessoa.roleAssignments.map((x) => x.papel).join(', ') || '—'} readOnly />
        <Campo rotulo={m.pessoa.organizacao} defaultValue={orgSlug} readOnly />
        <Campo
          rotulo={m.pessoa.estado}
          defaultValue={pessoa.estado === 'ACTIVO' ? m.pessoa.activo : m.pessoa.revogado}
          readOnly
        />
        <Campo rotulo={m.pessoa.pin} defaultValue={m.pessoa.reporPin} readOnly ajuda={m.pessoa.pinNaE13} />
      </div>

      <Aviso tom="info" titulo={m.pessoa.nota} />

      {/* STATE-014 aparece aqui quando a acção é sensível: revogar acesso pede
          confirmação de identidade. A tela existe; ligá-la à reautenticação real
          é o que fica declarado como pendência. */}
      <Estado
        sobrancelha={m.confirmarIdentidade.sobrancelha}
        titulo={m.confirmarIdentidade.titulo}
        emCartao
        factos={[
          { rotulo: m.confirmarIdentidade.rotuloAccao, valor: m.pessoas.revogar },
          { rotulo: m.confirmarIdentidade.rotuloMotivo, valor: m.confirmarIdentidade.valorMotivo },
          { rotulo: m.confirmarIdentidade.rotuloValidade, valor: m.confirmarIdentidade.valorValidade },
        ]}
        accaoSecundaria={<Botao tom="secundario">{m.comum.voltar}</Botao>}
        accaoPrincipal={<Botao tom="perigo" disabled={!podeGerir}>{m.confirmarIdentidade.accao}</Botao>}
      />
    </div>
  );
}
