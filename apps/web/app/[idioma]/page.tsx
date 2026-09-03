import Link from 'next/link';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Cartao, EstruturaPublica } from '@bossaos/ui';
import { Wordmark } from '../../src/componentes/Marca.tsx';

export const dynamic = 'force-static';

/**
 * Página pública, no estado que o E02 deve deixá-la.
 *
 * Não é a landing comercial: essa é a família MKT e entra no E10. Aqui só se
 * prova que a estrutura pública monta, segue o tema e diz onde estão as coisas —
 * o E02 proíbe em voz alta gerar rotas de módulos que ainda não existem.
 */
export default async function Pagina({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);

  return (
    <EstruturaPublica
      marca={<Wordmark />}
      rotuloSaltar={m.comum.saltarParaConteudo}
      assinatura={m.comum.asinatura}
    >
      <h1>BossaOS</h1>
      <p style={{ maxWidth: '60ch', color: 'var(--bo-texto-secundario)', marginTop: 16 }}>
        {m.catalogo.descricao}
      </p>

      <div style={{ marginTop: 32, display: 'grid', gap: 16, maxWidth: 560 }}>
        <Cartao variante="contornado" titulo={m.catalogo.titulo}>
          <p style={{ color: 'var(--bo-texto-secundario)', marginBottom: 16 }}>
            {m.catalogo.avisoDemo}
          </p>
          <Link className="bo-botao bo-botao--primario" href={`/${idioma}/interno/catalogo`}>
            {m.catalogo.titulo}
          </Link>
        </Cartao>
      </div>
    </EstruturaPublica>
  );
}
