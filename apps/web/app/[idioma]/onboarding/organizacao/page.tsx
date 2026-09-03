import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { Aviso, Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { CampoPorEscolher } from '../../../../src/componentes/CampoPorEscolher.tsx';
import { fusos, MOEDAS, PAISES } from '../../../../src/componentes/opcoes.ts';

export const dynamic = 'force-dynamic';

/**
 * ONB-001 · "Crea tu organización" (atlas p. 28, passo 1 de 10)
 *
 * ── O que esta tela NÃO faz, e é a razão de ela existir assim ───────────────
 *
 * O atlas desenha os campos preenchidos: España, Europe/Madrid, EUR. São dados
 * de demonstração — o próprio atlas o diz no topo — e copiá-los como valores
 * iniciais seria pôr o primeiro restaurante brasileiro em Espanha, a pagar em
 * euros, sem ninguém ter carregado em nada.
 *
 * País, fuso e moeda começam **por escolher**, e é `CampoPorEscolher` que o
 * garante: a primeira opção é vazia. Um `<select>` sem opção vazia escolhe
 * sozinho a primeira da lista.
 *
 * ── A chave escondida ──────────────────────────────────────────────────────
 *
 * Gerada quando a página é servida, e é o que faz carregar duas vezes em "Criar
 * organização" criar uma só. Não é decoração: é o aceite 1, e vive aqui porque
 * é aqui que o pedido nasce.
 */
export default async function CriarOrganizacao({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { idioma } = await params;
  const { erro } = await searchParams;
  const m = mensagensDe(idioma);
  const a = m.arranque;

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  return (
    <div className="bo-pagina">
      <form method="post" action="/api/onboarding/organizacao" className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="chave" value={randomUUID()} />

        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{a.passo.replace('{n}', '1')}</p>
            <h1>{a.org.titulo}</h1>
          </div>
          <Botao type="submit">{a.org.accao}</Botao>
        </div>

        {erro ? <Aviso tom="perigo" titulo={a.org.titulo} urgente>{m.comum.tenteOutraVez}</Aviso> : null}

        <div className="bo-forma__grelha">
          <Campo rotulo={a.org.nomeComercial} name="nome" required />
          <Campo rotulo={a.org.nomeLegal} name="slug" required
                 ajuda={a.org.identificadorAjuda} pattern="[a-z0-9-]+" />
          <CampoPorEscolher rotulo={a.org.pais} name="pais" opcoes={PAISES}
                            valor={null} rotuloVazio={a.porEscolher} />
          <CampoPorEscolher rotulo={a.org.fuso} name="fuso" opcoes={fusos()}
                            valor={null} rotuloVazio={a.porEscolher} />
          <CampoPorEscolher rotulo={a.org.moeda} name="moedaPadrao" opcoes={MOEDAS}
                            valor={null} rotuloVazio={a.porEscolher} />
          <Campo rotulo={a.org.responsavel} name="responsavel" />
        </div>

        <p className="bo-planos__nota">{a.guardadoNoAmbito}</p>
      </form>
    </div>
  );
}
