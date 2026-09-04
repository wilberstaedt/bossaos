import { redirect } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarDispositivos, listarUnidades } from '@bossaos/db';
import {
  actorDoPedido, comEscopoDoPedido, organizacoesDoActor, resolverPedido,
} from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * AUTH-002 · «Identifica tu turno» (atlas p. 23)
 *
 * ── O que um PIN é, e o que ele NÃO é ────────────────────────────────────
 *
 * «PIN curto sozinho não autentica na internet nem concede privilégio de owner»
 * (E13, respeitar 1). Este ecrã vive **dentro de um dispositivo já confiável**:
 * quatro dígitos são dez mil possibilidades, e o que os torna suficientes é o
 * aparelho ter passado por pareamento e aprovação de gerência.
 *
 * Por isso a página exige sessão. Não é uma porta de entrada — é a troca de quem
 * está ao serviço no tablet que já está ligado.
 *
 * ── E a recusa por revogação diz-se com as palavras certas ───────────────
 *
 * `dispositivo_revogado` não se lê como «PIN errado». A diferença não é
 * cosmética: com a segunda, quem tem o aparelho continua a tentar.
 */
export default async function TurnoPorPin({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.salaE13;

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);
  const organizacoes = await organizacoesDoActor(actor.id);
  const primeira = organizacoes[0];
  if (!primeira) redirect(`/${idioma}/auth/organizations`);

  const sessao = await resolverPedido(primeira.slug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const { dispositivos, unidades, filiacaoId } = await comEscopoDoPedido(sessao, async (db) => {
    const us = await listarUnidades(db);
    const todos = await Promise.all(us.map((u) => listarDispositivos(db, u.id)));
    const filiacao = await db.membership.findFirst({
      where: { userId: actor.id }, select: { id: true },
    });
    return { unidades: us, dispositivos: todos.flat(), filiacaoId: filiacao?.id ?? '' };
  });

  // Só os que podem receber um turno. Um revogado na lista era um convite a
  // tentar — e a tentativa seria recusada, mas depois de a pessoa escrever o PIN.
  const utilizaveis = dispositivos.filter((d) => d.estado === 'ACTIVO');
  const erro = typeof busca.erro === 'string' ? busca.erro : null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{primeira.nome}</p>
          <h1>{s.turno}</h1>
        </div>
      </div>

      {busca.turno ? <Aviso tom="sucesso" titulo={s.turno}>{actor.email}</Aviso> : null}
      {erro === 'pin_errado' ? (
        <Aviso tom="perigo" urgente titulo={s.pin}>
          {s.pinErrado.replace('{n}', String(busca.restantes ?? '?'))}
        </Aviso>
      ) : null}
      {erro === 'bloqueado' ? <Aviso tom="perigo" urgente titulo={s.pin}>{s.pinBloqueado}</Aviso> : null}
      {erro === 'dispositivo_revogado' ? (
        <Aviso tom="perigo" urgente titulo={s.revogado}>{s.dispositivoRevogado}</Aviso>
      ) : null}
      {erro === 'dispositivo_pendente' ? (
        <Aviso tom="aviso" titulo={s.pendente}>{s.dispositivoPendente}</Aviso>
      ) : null}
      {erro === 'sem_pin' ? <Aviso tom="aviso" titulo={s.pin}>{s.semPin}</Aviso> : null}

      {utilizaveis.length === 0 || unidades.length === 0 ? (
        <Aviso titulo={s.dispositivos}>{s.semDispositivos}</Aviso>
      ) : (
        <Cartao titulo={s.turno}>
          <form method="post" action={`/api/org/${primeira.slug}/turno`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="membershipId" value={filiacaoId} />
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="deviceId">{s.dispositivos}</label>
              <select className="bo-campo__controlo" id="deviceId" name="deviceId"
                      defaultValue={typeof busca.dispositivo === 'string' ? busca.dispositivo : utilizaveis[0]?.id}
                      required>
                {utilizaveis.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome} · {d.estacao}</option>
                ))}
              </select>
            </span>
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="pin">{s.pin}</label>
              {/* `type="password"` com `inputMode="numeric"`: esconde-se de quem
                  está ao lado no balcão, e abre o teclado numérico no tablet. */}
              <input className="bo-campo__controlo" id="pin" name="pin" type="password"
                     inputMode="numeric" autoComplete="off" required />
            </span>
            <p className="bo-campo__ajuda">{s.pinAjuda}</p>
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--primario" type="submit">{s.accaoEntrar}</button>
            </div>
          </form>
        </Cartao>
      )}
    </div>
  );
}
