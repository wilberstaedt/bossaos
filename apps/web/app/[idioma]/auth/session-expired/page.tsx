import Link from 'next/link';
import { Estado } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';

export const dynamic = 'force-static';

/**
 * AUTH-009 · Tu sesión se ha pausado
 *
 * É um **estado de rota**, e o CSV di-lo. Reusa o componente `Estado` do E02 —
 * a mesma família de STATE-001 a 016, e por isso a mesma forma e a mesma
 * acessibilidade sem os reescrever.
 *
 * "Borrador conservado en este dispositivo": a reautenticação preserva o
 * rascunho local **da mesma identidade** e não o revela a outro operador
 * (E04, respeitar 3). Quem volta é quem estava.
 */
export default async function SessaoPausada({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);

  return (
    <Estado
      sobrancelha={m.sessaoPausada.sobrancelha}
      titulo={m.sessaoPausada.titulo}
      situacao={{
        tom: 'perigo',
        titulo: m.sessaoPausada.situacao,
        detalhe: m.sessaoPausada.situacaoDetalhe,
      }}
      factos={[
        { rotulo: m.sessaoPausada.rotuloEstado, valor: m.sessaoPausada.valorEstado },
        { rotulo: m.sessaoPausada.rotuloRascunho, valor: m.sessaoPausada.valorRascunho },
        { rotulo: m.sessaoPausada.rotuloAcesso, valor: m.sessaoPausada.valorAcesso },
      ]}
      accaoPrincipal={
        <Link className="bo-botao bo-botao--primario" href={`/${idioma}/auth/login`}>
          {m.sessaoPausada.accao}
        </Link>
      }
    />
  );
}
