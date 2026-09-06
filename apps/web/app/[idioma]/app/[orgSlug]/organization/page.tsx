import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Aviso, Etiqueta, Tabela } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarConvites, pessoasEAcessos } from '@bossaos/db';
import { exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-007 · Personas y accesos
 *
 * A lista sai com escopo de inquilino. Quem não pode gerir equipa nem vê o
 * botão de convidar — e se pedir a rota à mão, a API recusa na mesma: o menu é
 * conveniência, a decisão é do servidor.
 */
export default async function PessoasEAcessos({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();
  if (exigirAccao(sessao.concessoes, 'equipa.ler')) notFound();

  const podeGerir = !exigirAccao(sessao.concessoes, 'equipa.gerir');

  const { pessoas, convites } = await comEscopoDoPedido(sessao, async (db) => ({
    pessoas: await pessoasEAcessos(db, sessao.contexto.organizationId),
    convites: podeGerir ? await listarConvites(db) : [],
  }));

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      {/* A cobrança do SaaS: o que a casa NOS paga. O que ela factura aos
          clientes dela está no financeiro, e as duas não somam. */}
      <a className="bo-lista__ligacao" data-seccao="ORG-011"
         href={`/${idioma}/app/${orgSlug}/organization/cobranca`}>
        {m.integracoesE32.cobranca}
      </a>
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.navegacao.equipa}</p>
          <h1>{m.pessoas.titulo}</h1>
        </div>
        {/* "Invitar persona" saiu: nenhum ecrã do produto cria um convite hoje —
            só a API. Um botão que anuncia a acção e não a faz é pior do que a
            ausência dele, porque quem carrega conclui que o produto avariou. */}
      </div>

      <Aviso tom="info" titulo={m.pessoas.accao}>{m.comum.convitePorApi}</Aviso>

      <Tabela
        legenda={m.pessoas.titulo}
        colunas={[
          { chave: 'nome', rotulo: m.pessoas.colunaUtilizador },
          { chave: 'papel', rotulo: m.pessoas.colunaFuncao },
          { chave: 'ambito', rotulo: m.pessoas.colunaAmbito },
          { chave: 'estado', rotulo: m.pessoa.estado },
        ]}
        linhas={pessoas.map((p) => ({
          id: p.id,
          nome: p.user.nome || p.user.email,
          papel: p.roleAssignments.map((r) => r.papel).join(', ') || '—',
          ambito: p.roleAssignments.some((r) => r.locationId) ? m.pessoa.unidades : m.pessoa.organizacao,
          estado: p.estado,
        }))}
        celula={(linha, coluna) =>
          coluna.chave === 'nome' ? (
            <Link href={`/${idioma}/app/${orgSlug}/organization/${linha.id}`}>{linha.nome}</Link>
          ) : coluna.chave === 'estado' ? (
            <Etiqueta tom={linha.estado === 'ACTIVO' ? 'sucesso' : 'perigo'}>
              {linha.estado === 'ACTIVO' ? m.pessoa.activo : m.pessoa.revogado}
            </Etiqueta>
          ) : (
            String(linha[coluna.chave] ?? '')
          )
        }
      />
      <p className="bo-campo__ajuda">
        {m.pessoas.registosMostrados.replace('{n}', String(pessoas.length))}
      </p>

      {podeGerir && convites.length > 0 ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <h2>{m.pessoas.convitesPendentes}</h2>
          <Tabela
            legenda={m.pessoas.convitesPendentes}
            colunas={[
              { chave: 'email', rotulo: m.convidarEquipa.email },
              { chave: 'papel', rotulo: m.convidarEquipa.funcao },
              { chave: 'expira', rotulo: m.recuperar.vigencia },
            ]}
            linhas={convites.map((c) => ({
              id: c.id,
              email: c.email,
              papel: c.papel,
              expira: formatarDataHora(c.expiresAt, idioma),
            }))}
          />
        </div>
      ) : null}

      {!podeGerir ? <Aviso tom="info" titulo={m.pessoa.nota} /> : null}
    </div>
  );
}
