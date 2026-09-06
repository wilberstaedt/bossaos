import { redirect } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, obterPrisma, segredosDaPlataforma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-017 · «Plantillas de email y SMS» (atlas p. 247)
 *
 * ── E é aqui que vivem os SEGREDOS, e é aqui que se prova que não saem ────
 *
 * Os modelos e as credenciais dos provedores que os enviam andam juntos na
 * cabeça de quem opera, e por isso andam juntos nesta tela. É o sítio onde é
 * mais tentador mostrar o valor «só para confirmar que está certo» — quem olha é
 * o operador, e parece inofensivo.
 *
 * **Não há coluna para o valor.** O que se mostra é: existe, está configurado no
 * ambiente, e quando foi rodado. O `configurado` lê-se do ambiente no momento —
 * uma coluna que dissesse «está configurado» ficava a mentir no dia em que
 * alguém tirasse a variável.
 */
export default async function ModelosDeMensagem({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const [modelos, segredos] = await Promise.all([
    comIdentidade(prisma, actor.id, (db) =>
      db.campaignTemplate.findMany({
        select: { id: true, nome: true, canal: true }, orderBy: { nome: 'asc' }, take: 50,
      })),
    comIdentidade(prisma, actor.id, (db) => segredosDaPlataforma(db)),
  ]);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.painel}</p>
          <h1 data-tela="PLAT-017">{s.modelos}</h1>
        </div>
      </div>

      {modelos.length === 0 ? (
        <div data-teste="sem-modelos">
          <Aviso tom="info" titulo={s.modelos}>{s.semModelos}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="modelos">
          {modelos.map((m: { id: string; nome: string; canal: string }) => (
            <li key={m.id} data-teste="modelo">
              <span>{m.nome}</span> <Etiqueta tom="neutro">{m.canal}</Etiqueta>
            </li>
          ))}
        </ul>
      )}

      <h2>{s.segredoConfigurado}</h2>
      {/* A frase por palavras, no sítio onde é mais tentador quebrá-la. */}
      <p className="bo-campo__ajuda" data-teste="nunca-se-ve">{s.segredoNuncaSeVe}</p>

      {segredos.length === 0 ? (
        <p data-teste="sem-segredos">{s.semSegredos}</p>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="segredos">
          {segredos.map((g: {
            nome: string; descricao: string; configurado: boolean;
            rodadoEm: Date | null; rodadoPor: string | null;
          }) => (
            <li key={g.nome} data-teste="segredo">
              <span className="bo-identificador">{g.nome}</span>{' '}
              <Etiqueta tom={g.configurado ? 'sucesso' : 'neutro'}>
                {g.configurado ? s.segredoConfigurado : s.segredoEmFalta}
              </Etiqueta>
              <p className="bo-campo__ajuda">{g.descricao}</p>
              {g.rodadoEm ? (
                <p className="bo-campo__ajuda" data-teste="rodado">
                  {s.rodadoEm} {formatarDataHora(g.rodadoEm, idioma)} · {g.rodadoPor}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
