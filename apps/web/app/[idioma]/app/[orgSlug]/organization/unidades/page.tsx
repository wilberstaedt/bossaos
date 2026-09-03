import { redirect } from 'next/navigation';
import { Aviso, Botao, Etiqueta, Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { aberturaAgora, contarUnidades, estadoComercial, podeCapacidade } from '@bossaos/db';
import { paraRelogio } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-004 · "Tus restaurantes" (atlas p. 41)
 *
 * ── A coluna "Horario" diz três coisas, não duas ───────────────────────────
 *
 * O atlas mostra "13:00 - 16:00" e "Hoy · 13:20" na mesma coluna, o que é
 * ilustrativo. Aqui a coluna diz o que se sabe **agora**: aberto até uma hora,
 * fechado, ou **sem horário configurado**. A terceira é a que interessa a quem
 * está a montar o restaurante, e é a que qualquer implementação apagaria.
 *
 * O contador de equipa do atlas ("8 personas") não está aqui: as pessoas
 * atribuídas a uma unidade contam-se por `RoleAssignment`, e quem não tem papel
 * de unidade nenhum é da organização inteira — somá-los daria um número que não
 * quer dizer nada. Fica declarado em vez de inventado.
 */
export default async function UnidadesDaOrganizacao({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
  searchParams: Promise<{ erro?: string; arquivada?: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const { erro, arquivada } = await searchParams;
  const m = mensagensDe(idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const lista = await db.location.findMany({
      select: { id: true, nome: true, archivedAt: true },
      orderBy: [{ archivedAt: 'asc' }, { nome: 'asc' }],
    });
    const estado = await estadoComercial(db, sessao.contexto.organizationId);
    const aberturas = new Map<string, string>();
    for (const u of lista) {
      if (u.archivedAt) continue;
      const a = await aberturaAgora(db, u.id);
      aberturas.set(
        u.id,
        a.estado === 'aberto' ? m.horarios.abertoAte.replace('{hora}', paraRelogio(a.ateMin))
        : a.estado === 'fechado' ? m.horarios.fechadoAgora
        : m.horarios.desconhecido,
      );
    }
    return {
      lista, aberturas,
      podeCriar: podeCapacidade(estado, {
        capacidade: 'unidades', intencao: 'criar', usoActual: await contarUnidades(db),
      }).permitido,
    };
  });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.unidades.sobrancelha}</p>
          <h1>{m.unidades.titulo}</h1>
        </div>
        <Botao disabled={!dados.podeCriar}>{m.unidades.accao}</Botao>
      </div>

      {erro === 'ultima_unidade' ? (
        <Aviso tom="aviso" titulo={m.unidades.accaoArquivar} urgente>{m.unidades.ultimaUnidade}</Aviso>
      ) : null}
      {arquivada ? <Aviso tom="sucesso" titulo={m.comum.guardado} /> : null}

      <Tabela
        legenda={m.unidades.titulo}
        colunas={[
          { chave: 'nome', rotulo: m.unidades.colunaEstabelecimento },
          { chave: 'estado', rotulo: m.unidades.colunaEstado },
          { chave: 'horario', rotulo: m.unidades.colunaHorario },
        ]}
        linhas={dados.lista.map((u) => ({
          id: u.id,
          nome: u.nome,
          estado: u.archivedAt ? m.unidades.arquivada : m.unidades.activa,
          horario: u.archivedAt ? '—' : (dados.aberturas.get(u.id) ?? m.horarios.desconhecido),
        }))}
        celula={(linha, coluna) =>
          coluna.chave === 'nome'
            ? <a href={`/${idioma}/app/${orgSlug}/organization/unidades/${linha.id}`}>{linha.nome}</a>
            : coluna.chave === 'estado'
              ? <Etiqueta tom={linha.estado === m.unidades.activa ? 'sucesso' : 'neutro'}>{linha.estado}</Etiqueta>
              : linha[coluna.chave]}
        vazio={m.plataforma.semRegistos}
      />
      <p className="bo-planos__nota">
        {m.plataforma.registosMostrados.replace('{n}', formatarNumero(dados.lista.length, idioma))}
      </p>
    </div>
  );
}
