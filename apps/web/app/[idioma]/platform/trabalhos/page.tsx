import { redirect } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, obterPrisma, trabalhosDaPlataforma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-014 · «Trabajos y colas» (atlas p. 244)
 *
 * ── «Tentar de novo» é o botão perigoso de qualquer produto ───────────────
 *
 * Aqui não é: reprocessar cria a **tentativa seguinte**, com identidade própria
 * e restrição única na base. Reprocessar duas vezes o mesmo trabalho não produz
 * dois efeitos — e é por isso que o botão pode existir sem medo.
 *
 * Quem carrega em «tentar de novo» é sempre quem não sabe se a primeira passou.
 */
export default async function TrabalhosDaPlataforma({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  // Pela função do motor. A tela não repete a consulta.
  const trabalhos = await comIdentidade(prisma, actor.id,
    (db) => trabalhosDaPlataforma(db));

  const rotulo = (estado: string): string => {
    const v = (s as unknown as Record<string, unknown>)[`trabalho${estado}`];
    return typeof v === 'string' ? v : estado;
  };

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.painel}</p>
          <h1 data-tela="PLAT-014">{s.trabalhos}</h1>
        </div>
      </div>

      <p className="bo-campo__ajuda" data-teste="reprocessar-ajuda">{s.reprocessarAjuda}</p>

      {trabalhos.length === 0 ? (
        <div data-teste="sem-trabalhos">
          <Aviso tom="sucesso" titulo={s.trabalhos}>{s.semTrabalhos}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="trabalhos">
          {trabalhos.map((t: {
            id: string; tipo: string; alvo: string; tentativa: number;
            estado: string; erro: string | null; criadoEm: Date;
          }) => (
            <li key={t.id} data-teste="trabalho">
              <span className="bo-identificador">{t.tipo}</span>{' '}
              <Etiqueta tom={
                t.estado === 'CONCLUIDO' ? 'sucesso'
                  : t.estado === 'FALHOU' ? 'perigo' : 'neutro'
              }>{rotulo(t.estado)}</Etiqueta>
              <p className="bo-campo__ajuda bo-identificador">
                {t.alvo} · {t.tentativa} · {formatarDataHora(t.criadoEm, idioma)}
              </p>
              {t.erro ? <p className="bo-campo__ajuda">{t.erro}</p> : null}
              {t.estado === 'FALHOU' ? (
                <form method="post" action={`/api/plataforma/trabalhos/${t.id}/reprocessar`}>
                  <button className="bo-botao" type="submit" data-teste="reprocessar">
                    {s.reprocessar}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
