import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Etiqueta, Seletor } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { aberturaAgora, lerHorario } from '@bossaos/db';
import { paraRelogio, type DiaDaSemana } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

const DIAS: DiaDaSemana[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * ORG-006 · "Horarios de apertura" (atlas p. 43)
 *
 * ── Cada dia tem um selector de ESTADO, e é o coração desta tela ────────────
 *
 * O atlas desenha sete dias com horas ao lado e um ponto colorido. A forma que
 * falta lá é a que decide tudo: **um dia por configurar não é um dia fechado**.
 * Se a tela só tivesse campos de hora, deixá-los vazios teria de significar
 * alguma coisa — e qualquer significado que se lhe desse estaria a inventar.
 *
 * Por isso cada dia começa com "sem configuração", e fechar é uma escolha que se
 * faz. São três estados no ecrã porque são três no modelo e três no motor.
 *
 * ── Dois serviços por dia, e o segundo pode passar da meia-noite ───────────
 *
 * É o que o atlas mostra à sexta: `13:00 - 16:00 / 20:00 - 23:00`. Escrever
 * `20:00 - 01:00` funciona — a rota soma o dia quando o fim é menor que o
 * início, uma vez, e nunca mais.
 *
 * O ponto colorido do atlas não é copiado como só-cor: o estado vai em texto na
 * etiqueta. É a regra do E02 — cor sozinha não diz nada a quem não a distingue.
 */
export default async function HorariosDaUnidade({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationId: string }>;
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug, locationId } = await params;
  const { guardado, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const h = m.horarios;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidade = await db.location.findFirst({
      where: { id: locationId, archivedAt: null }, select: { nome: true, fuso: true },
    });
    if (!unidade) return null;
    return {
      unidade,
      horario: await lerHorario(db, locationId),
      abertura: await aberturaAgora(db, locationId),
    };
  });
  if (!dados) notFound();

  const { unidade, horario, abertura } = dados;
  const semana = 'semFuso' in horario ? {} : horario.semana;
  const excepcoes = 'semFuso' in horario ? [] : horario.excepcoes;

  const agora =
    abertura.estado === 'aberto' ? h.abertoAte.replace('{hora}', paraRelogio(abertura.ateMin))
    : abertura.estado === 'fechado' ? h.fechadoAgora
    : abertura.motivo === 'sem_fuso' ? h.semFuso
    : h.desconhecido;

  return (
    <div className="bo-pagina">
      <form method="post" action={`/api/org/${orgSlug}/unidades/${locationId}/horarios`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />

        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{h.sobrancelha} · {unidade.nome}</p>
            <h1>{h.titulo}</h1>
          </div>
          <Botao type="submit" disabled={!unidade.fuso}>{h.accao}</Botao>
        </div>

        {guardado ? <Aviso tom="sucesso" titulo={m.comum.guardado} /> : null}
        {erro ? <Aviso tom="perigo" titulo={h.titulo} urgente>{h.erroIntervalo}</Aviso> : null}
        {unidade.fuso ? null : <Aviso tom="aviso" titulo={h.agora}>{h.semFuso}</Aviso>}

        <p className="bo-planos__actual">
          {h.agora}: <strong>{agora}</strong>
          {unidade.fuso ? ` · ${unidade.fuso}` : ''}
        </p>

        <div className="bo-plataforma__lista">
          {DIAS.map((d) => {
            const estado = semana[d];
            const tipo = estado?.tipo ?? 'por_configurar';
            const intervalos = estado?.tipo === 'aberto' ? estado.intervalos : [];
            const rotuloDia = (h as unknown as Record<string, string>)[`dia${d}`]!;
            return (
              <Cartao key={d} className="bo-horario__dia">
                <div className="bo-horario__cabecalho">
                  <span className="bo-tema__rotulo">{rotuloDia}</span>
                  <Etiqueta tom={tipo === 'aberto' ? 'sucesso' : tipo === 'fechado' ? 'neutro' : 'aviso'}>
                    {tipo === 'aberto' ? h.aberto : tipo === 'fechado' ? h.fechado : h.porConfigurar}
                  </Etiqueta>
                </div>
                <Seletor rotulo={rotuloDia} name={`estado${d}`} defaultValue={tipo}>
                  <option value="por_configurar">{h.porConfigurar}</option>
                  <option value="fechado">{h.fechado}</option>
                  <option value="aberto">{h.aberto}</option>
                </Seletor>
                <div className="bo-horario__intervalos">
                  {[1, 2].map((n) => (
                    <div key={n} className="bo-horario__par">
                      <Campo rotulo={`${h.de} ${n}`} name={`inicio${d}_${n}`} type="text"
                             inputMode="numeric" placeholder="13:00"
                             defaultValue={intervalos[n - 1] ? paraRelogio(intervalos[n - 1]!.inicioMin) : ''} />
                      <Campo rotulo={`${h.ate} ${n}`} name={`fim${d}_${n}`} type="text"
                             inputMode="numeric" placeholder="16:00"
                             defaultValue={intervalos[n - 1] ? paraRelogio(intervalos[n - 1]!.fimMin) : ''} />
                    </div>
                  ))}
                </div>
              </Cartao>
            );
          })}
        </div>

        <Cartao titulo={h.excepcoes}>
          {excepcoes.length === 0 ? (
            <p className="bo-uso__nota">{h.semExcepcoes}</p>
          ) : (
            <ul className="bo-planos__lista">
              {excepcoes.map((e) => (
                <li key={e.data} className="bo-planos__item">
                  {formatarData(new Date(`${e.data}T00:00:00Z`), idioma)} · {e.motivo} ·{' '}
                  {e.estado.tipo === 'fechado' ? h.fechado : h.aberto}
                </li>
              ))}
            </ul>
          )}
          <div className="bo-forma__grelha">
            <Campo rotulo={h.excepcaoData} name="excepcaoData" type="date" />
            <Campo rotulo={h.excepcaoMotivo} name="excepcaoMotivo" />
          </div>
        </Cartao>

        {/* A frase que esta tela existe para dizer. */}
        <p className="bo-planos__nota">{h.nota}</p>
      </form>
    </div>
  );
}
