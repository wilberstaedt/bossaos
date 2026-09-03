import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Seletor } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { deMenorParaTexto } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-019 · editar grupo de opções (atlas p. 71)
 *
 * As três combinações que o motor recusa — máximo abaixo do mínimo, obrigatório
 * com mínimo zero, máximo acima do número de opções — **não são validadas aqui**.
 * São validadas em `validarGrupo`, no domínio, chamado pela rota antes de
 * escrever; e a base tem o mesmo `CHECK` por baixo.
 *
 * Este ecrã só as mostra quando voltam. É de propósito: uma validação que só
 * existe no formulário protege quem usa o formulário, e mais ninguém.
 */
export default async function EditarGrupo({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; groupId: string }>;
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug, groupId } = await params;
  const { guardado, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const grupo = await comEscopoDoPedido(sessao, (db) =>
    db.modifierGroup.findFirst({
      where: { id: groupId },
      select: {
        id: true, nome: true, obrigatorio: true, minimo: true, maximo: true,
        destino: true, version: true,
        opcoes: {
          where: { archivedAt: null },
          select: { id: true, nome: true, ordem: true, precoMenor: true, moeda: true },
          orderBy: { ordem: 'asc' },
        },
      },
    }),
  );
  if (!grupo) notFound();

  return (
    <div className="bo-pagina">
      <form method="post" action={`/api/org/${orgSlug}/opcoes/${groupId}`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="versao" value={grupo.version} />

        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{c.sobrancelhaOpcoes}</p>
            <h1>{c.tituloEditarGrupo}</h1>
          </div>
          <Botao type="submit">{c.accaoGuardarGrupo}</Botao>
        </div>

        {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}
        {/* A mensagem vem do domínio: diz QUAL das três regras caiu. */}
        {erro ? <Aviso tom="perigo" titulo={c.accaoGuardarGrupo} urgente>{erro}</Aviso> : null}

        <div className="bo-forma__grelha">
          <Campo rotulo={c.nome} name="nome" defaultValue={grupo.nome} required />
          <Seletor rotulo={c.eleicao} name="obrigatorio" defaultValue={grupo.obrigatorio ? '1' : '0'}>
            <option value="0">{c.opcional}</option>
            <option value="1">{c.obrigatoria}</option>
          </Seletor>
          <Campo rotulo={c.minimo} name="minimo" type="number" min={0} defaultValue={String(grupo.minimo)} />
          {/* Vazio quer dizer SEM TECTO, e não zero. O rótulo di-lo. */}
          <Campo rotulo={`${c.maximo} (${c.semTecto})`} name="maximo" type="number" min={0}
                 defaultValue={grupo.maximo === null ? '' : String(grupo.maximo)} />
          {/* Guardado no E07, consumido pelo KDS no E16. */}
          <Campo rotulo={c.destino} name="destino" defaultValue={grupo.destino ?? ''} />
        </div>

        <Cartao>
          <h2 className="bo-planos__nome">{c.opcoes}</h2>
          {grupo.opcoes.map((o) => (
            <div key={o.id} className="bo-forma__grelha">
              <Campo rotulo={c.nome} name={`opcao:${o.id}`} defaultValue={o.nome} />
              {/* Unidades mínimas de volta ao texto que a pessoa escreveu:
                  `String(250)` mostrava "250" onde ela tinha escrito "2,50". */}
              <Campo rotulo={c.preco} name={`preco:${o.id}`} type="text" inputMode="decimal"
                     defaultValue={o.precoMenor === null || o.moeda === null
                       ? '' : deMenorParaTexto(o.precoMenor, o.moeda)} />
              <Campo rotulo="ISO 4217" name={`moeda:${o.id}`} maxLength={3} defaultValue={o.moeda ?? ''} />
            </div>
          ))}
          <div className="bo-forma__grelha">
            <Campo rotulo={c.nome} name="nova" />
          </div>
        </Cartao>
      </form>
    </div>
  );
}
