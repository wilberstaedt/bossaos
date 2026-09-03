import { redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Seletor } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { actorDoPedido } from '../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ONB-009 · Invita a tu equipo
 *
 * Nona de dez, e a única do arranque que o E04 entrega — as outras nove são de
 * etapas que ainda não chegaram, e desenhá-las agora seria inventar um caminho
 * que ninguém percorre.
 *
 * O papel VAI no corpo aqui: é quem convida a escolher. O que não pode acontecer
 * é ser lido outra vez na aceitação — e não é: `aceitarConvite` não o recebe.
 */
export default async function ConvidarEquipa({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px', display: 'grid', gap: 32 }}>
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.convidarEquipa.passo}</p>
          <h1>{m.convidarEquipa.titulo}</h1>
        </div>
        <Botao>{m.convidarEquipa.accao}</Botao>
      </div>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <Campo rotulo={m.convidarEquipa.email} name="email" type="email" />
        <Seletor rotulo={m.convidarEquipa.funcao} name="papel" defaultValue="WAITER">
          {['OWNER', 'ORG_ADMIN', 'VENUE_MANAGER', 'HOST', 'WAITER', 'KITCHEN', 'CASHIER'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Seletor>
        <Campo rotulo={m.convidarEquipa.unidade} name="unidade" />
        <Campo rotulo={m.convidarEquipa.adicionar} defaultValue={m.convidarEquipa.outraPessoa} readOnly />
        <Campo rotulo={m.convidarEquipa.estado} defaultValue={m.convidarEquipa.naoEnviado} readOnly />
      </div>

      <Aviso tom="info" titulo={m.convidarEquipa.nota} />
    </div>
  );
}
