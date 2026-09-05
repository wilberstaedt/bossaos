import { redirect } from 'next/navigation';
import { listarUnidades } from '@bossaos/db';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import {
  actorDoPedido, comEscopoDoPedido, organizacoesDoActor, resolverPedido,
} from '../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-001 · «Entra en tu caja» (atlas) — **a porta do módulo**.
 *
 * ── Porque é que esta tela mudou de sítio ─────────────────────────────────
 *
 * Nasceu em `/pos/[locationId]/operador` a dizer quem está na caixa. Só que para
 * lá chegar já era preciso saber a unidade, e por isso o módulo inteiro não
 * tinha entrada: as 19 telas ligavam-se entre si e **faltava a primeira**.
 * Ninguém com sessão iniciada chegava ao TPV sem escrever o endereço à mão.
 *
 * «Uma tela provada a que ninguém chega é uma tela que não existe.» O contrato
 * `portas-e-navegacao.md` diz isto por palavras, e foi escrito **antes** desta
 * etapa, depois de o E21 ter reprovado o marco do Restaurant exactamente por
 * aqui. Um módulo novo nascer sem porta seria a mesma pedra, uma etapa a seguir.
 *
 * ── E a porta implica a escolha de unidade ────────────────────────────────
 *
 * «Não há navegação para um módulo dentro de uma unidade sem um sítio onde a
 * unidade se escolha.» Quem tem três restaurantes tem de dizer em qual está
 * antes de a caixa fazer sentido. É esta a tela onde o diz.
 */
export default async function EntradaDoTpv({
  params,
}: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const organizacoes = await organizacoesDoActor(actor.id);
  const entradas: { id: string; nome: string; organizacao: string }[] = [];
  for (const org of organizacoes) {
    const sessao = await resolverPedido(org.slug);
    if (!sessao.ok) continue;
    const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
    for (const u of unidades as { id: string; nome: string }[]) {
      entradas.push({ id: u.id, nome: u.nome, organizacao: org.slug });
    }
  }

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{actor.nome ?? actor.email}</p>
          <h1 data-tela="POS-001">{t.abrirCaixa}</h1>
        </div>
      </div>
      <p data-teste="quemEsta">{t.quemEsta}</p>
      <p data-teste="operador-nome">{actor.nome ?? actor.email}</p>
      <p data-teste="quantas-unidades">{entradas.length}</p>
      {entradas.length === 0 ? <p data-teste="sem-unidades">{t.nada}</p> : (
        <ul className="bo-lista" data-teste="unidades">
          {entradas.map((u) => (
            <li key={u.id}>
              <a className="bo-botao" data-seccao="entrar-no-tpv"
                 href={`/${idioma}/pos/${u.id}`}>{u.nome}</a>
              <span>{u.organizacao}</span>
            </li>
          ))}
        </ul>
      )}
      <p data-teste="sem-provedor">{t.semProvedor}</p>
    </div>
  );
}
