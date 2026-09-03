import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MarcaEscrita } from '../../../src/componentes/Marca.tsx';

/**
 * Moldura das telas de acesso (AUTH-001 a AUTH-009).
 *
 * O painel escuro com a marca sai abaixo de 1024 px: num telemóvel ele comeria
 * o ecrã e o que ali interessa é entrar. É o mesmo critério da acção repetida no
 * topo, no E02 — o atlas é referência de hierarquia, não de composição fixa.
 *
 * A palavra em texto e não o PNG: sobre o verde o ficheiro tem bordas
 * semi-transparentes e ruído de rasterização (ADR 0001, decisão 4).
 */
export default async function LayoutDeAcesso({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ idioma: string }>;
}) {
  const { idioma } = await params;
  const m = mensagensDe(idioma as Idioma);

  return (
    <div className="bo-auth">
      <aside className="bo-auth__lado bo-inverso">
        <div className="bo-auth__marca">
          <MarcaEscrita />
        </div>
        <p className="bo-auth__lema">
          {m.marca.tagline1}
          <em>{m.marca.tagline2}</em>
        </p>
        <p className="bo-auth__rodape">
          {m.marca.rodape1}
          <br />
          {m.marca.rodape2}
        </p>
      </aside>
      <main className="bo-auth__conteudo" id="conteudo">
        <div className="bo-auth__forma">{children}</div>
      </main>
    </div>
  );
}
