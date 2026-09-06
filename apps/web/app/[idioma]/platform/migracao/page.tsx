import { redirect } from 'next/navigation';
import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { actorDoPedido } from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-019 · «Herramientas de migración» (atlas p. 249)
 *
 * ── A tela que declara o que NÃO faz, e é a decisão certa ─────────────────
 *
 * Ferramentas de migração movem os dados de um cliente — importam de outro
 * sistema, exportam para outro, copiam entre organizações. É o poder mais
 * destrutivo que a plataforma pode ter, e a única acção deste projecto que pode
 * apagar o trabalho de uma casa inteira sem ninguém de lá tocar em nada.
 *
 * Não a construí. Não porque seja difícil, mas porque **não há aqui o que ela
 * precisa**: um formato de origem verificado, um plano de reversão, e alguém que
 * assine o que vai acontecer antes de acontecer.
 *
 * Construir os botões agora e deixar a reversão «para depois» seria a mesma
 * escolha que o E24 recusou com o gateway e o E27 com os envios — e aqui o custo
 * de errar não é um envio perdido: é a casa de alguém.
 *
 * O que fica é o que é verdadeiro: a regra que qualquer ferramenta destas terá
 * de cumprir, escrita antes de haver ferramenta.
 */
export default async function FerramentasDeMigracao({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.painel}</p>
          <h1 data-tela="PLAT-019">{s.migracao}</h1>
        </div>
      </div>

      <div data-teste="migracao-aviso">
        <Aviso tom="aviso" titulo={s.migracao}>{s.migracaoAviso}</Aviso>
      </div>

      {/* Não há botões. A pendência está declarada no E33.md, e esta tela
          di-lo em vez de mostrar acções que não existem. */}
      <p className="bo-campo__ajuda" data-teste="sem-ferramentas">
        {s.semModelos}
      </p>
    </div>
  );
}
