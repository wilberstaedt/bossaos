import { redirect } from 'next/navigation';
import { Aviso, Campo, Seletor } from '@bossaos/ui';
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
        {/* "Enviar invitaciones" saiu: não há `<form>` nesta página e a API de
            convites recebe JSON. O botão não tinha por onde enviar nada. */}
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

      {/* A nota anterior dizia «Los cambios se guardan en la unidad y el ámbito
          indicados». Não se guarda nada: esta página não tem `<form>`. Era a
          mesma falta do botão, escrita em prosa — e a prosa engana mais, porque
          ninguém a testa. */}
      <Aviso tom="info" titulo={m.convidarEquipa.titulo}>{m.comum.convitePorApi}</Aviso>
    </div>
  );
}
