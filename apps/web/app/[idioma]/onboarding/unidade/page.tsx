import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { Aviso, Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMarcas } from '@bossaos/db';
import { actorDoPedido, comEscopoDoPedido, organizacoesDoActor, resolverPedido } from '../../../../src/sessao.ts';
import { CampoPorEscolher } from '../../../../src/componentes/CampoPorEscolher.tsx';
import { fusos, MOEDAS } from '../../../../src/componentes/opcoes.ts';

export const dynamic = 'force-dynamic';

/**
 * ONB-003 · "Tu primer restaurante" (atlas p. 30, passo 3 de 10)
 *
 * ── Moeda e fuso, e porque é que continuam vazios ──────────────────────────
 *
 * A organização já tem uma moeda e um fuso. A tentação óbvia é herdá-los aqui —
 * e a herança silenciosa é o mesmo defeito com outro nome: uma cadeia com sede
 * em Espanha pode abrir em Lisboa, e a unidade fica em EUR/Madrid sem ninguém
 * ter olhado. Se herdar, herda porque alguém carregou.
 *
 * O atlas escreve a morada como *"Dirección pendiente de confirmar"*. É um
 * estado, não um texto: guarda-se `null` e mostra-se "por confirmar". Guardar a
 * frase seria ficar com um restaurante cuja rua se chama "pendiente de
 * confirmar".
 */
export default async function PrimeiraUnidade({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ org?: string; erro?: string }>;
}) {
  const { idioma } = await params;
  const { org, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const a = m.arranque;

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);
  const minhas = await organizacoesDoActor(actor.id);
  const activa = minhas.find((o) => o.slug === org) ?? minhas.find((o) => o.estado === 'ACTIVO');
  if (!activa) redirect(`/${idioma}/onboarding/organizacao`);

  const sessao = await resolverPedido(activa.slug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);
  const marcas = await comEscopoDoPedido(sessao, (db) => listarMarcas(db));
  // Sem marca não há unidade: a referência é composta e a base recusa.
  if (marcas.length === 0) redirect(`/${idioma}/onboarding/marca`);

  return (
    <div className="bo-pagina">
      <form method="post" action={`/api/org/${activa.slug}/unidades`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="chave" value={randomUUID()} />
        <input type="hidden" name="brandId" value={marcas[0]!.id} />

        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{a.passo.replace('{n}', '3')}</p>
            <h1>{a.unidade.titulo}</h1>
          </div>
          <Botao type="submit">{a.unidade.accao}</Botao>
        </div>

        {erro ? <Aviso tom="perigo" titulo={a.unidade.titulo} urgente>{m.comum.tenteOutraVez}</Aviso> : null}

        <div className="bo-forma__grelha">
          <Campo rotulo={a.unidade.nome} name="nome" required />
          <Campo rotulo={a.marca.identificador} name="slug" required pattern="[a-z0-9-]+" />
          <Campo rotulo={a.unidade.morada} name="morada" placeholder={a.porConfirmar} />
          <Campo rotulo={a.unidade.localidade} name="localidade" />
          <Campo rotulo={a.unidade.contacto} name="contactoEmail" type="email" />
          <CampoPorEscolher rotulo={a.unidade.fuso} name="fuso" opcoes={fusos()}
                            valor={null} rotuloVazio={a.porEscolher} />
          <CampoPorEscolher rotulo={a.unidade.moeda} name="moeda" opcoes={MOEDAS}
                            valor={null} rotuloVazio={a.porEscolher} />
        </div>

        <p className="bo-planos__nota">{a.guardadoNoAmbito}</p>
      </form>
    </div>
  );
}
