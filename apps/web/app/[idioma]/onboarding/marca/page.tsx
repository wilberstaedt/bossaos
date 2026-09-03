import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { Aviso, Botao, Campo } from '@bossaos/ui';
import { IDIOMAS, mensagensDe, NOME_DO_IDIOMA, type Idioma } from '@bossaos/i18n';
import { actorDoPedido, organizacoesDoActor } from '../../../../src/sessao.ts';
import { CampoPorEscolher } from '../../../../src/componentes/CampoPorEscolher.tsx';

export const dynamic = 'force-dynamic';

/**
 * ONB-002 · "Tu primera marca" (atlas p. 29, passo 2 de 10)
 *
 * O **idioma principal** começa por escolher, e é o campo desta tela onde a
 * omissão faria mais estrago: escolher espanhol porque a primeira fixture é
 * espanhola publica a carta de um restaurante brasileiro em espanhol, e ninguém
 * repara até um cliente ligar.
 *
 * A organização vem da filiação de quem está a preencher, não do endereço — é a
 * regra do `tenant.ts`: a URL selecciona o contexto, não o autentica.
 */
export default async function PrimeiraMarca({
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
  // Sem organização não há marca a criar. Volta ao passo 1 em vez de mostrar um
  // formulário que não tem onde gravar.
  if (!activa) redirect(`/${idioma}/onboarding/organizacao`);

  return (
    <div className="bo-pagina">
      <form method="post" action={`/api/org/${activa.slug}/marcas`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="chave" value={randomUUID()} />

        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{a.passo.replace('{n}', '2')}</p>
            <h1>{a.marca.titulo}</h1>
          </div>
          <Botao type="submit">{a.marca.accao}</Botao>
        </div>

        {erro ? <Aviso tom="perigo" titulo={a.marca.titulo} urgente>{m.comum.tenteOutraVez}</Aviso> : null}

        <div className="bo-forma__grelha">
          <Campo rotulo={a.marca.nomePublico} name="nome" required />
          <Campo rotulo={a.marca.identificador} name="slug" required
                 ajuda={a.org.identificadorAjuda} pattern="[a-z0-9-]+" />
          <Campo rotulo={a.marca.descricao} name="descricao" />
          <CampoPorEscolher
            rotulo={a.marca.idioma}
            name="idiomaPrincipal"
            opcoes={IDIOMAS}
            valor={null}
            rotuloVazio={a.porEscolher}
            ajuda={IDIOMAS.map((i) => `${i} · ${NOME_DO_IDIOMA[i]}`).join(' · ')}
          />
        </div>

        <p className="bo-planos__nota">{a.guardadoNoAmbito}</p>
      </form>
    </div>
  );
}
