import { Estado } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';

/**
 * STATE-013 · "Esta unidad está archivada" (atlas p. 399)
 *
 * Componente e não página, como o STATE-006: aparece **na rota que executa a
 * acção**, e a acção é qualquer uma sobre uma unidade que já não opera.
 *
 * Os quatro factos são os do atlas, e nenhum é decorativo:
 * **Historial: disponible con permiso** — arquivar não apaga;
 * **Operación nueva: desactivada** — arquivar impede;
 * e a acção diz o que fazer a seguir, que é escolher outra unidade.
 */
export function UnidadeArquivada({
  idioma, unidade, hrefUnidades,
}: {
  idioma: Idioma;
  unidade: string;
  hrefUnidades: string;
}) {
  const m = mensagensDe(idioma);
  const a = m.arquivada;
  return (
    <Estado
      sobrancelha={a.sobrancelha}
      titulo={a.titulo}
      situacao={{ tom: 'aviso', titulo: a.situacaoTitulo, detalhe: a.situacaoDetalhe }}
      factos={[
        { rotulo: a.unidade, valor: unidade },
        { rotulo: a.historial, valor: a.disponivelComPermissao },
        { rotulo: a.operacaoNova, valor: a.desactivada },
        { rotulo: a.accao, valor: a.escolherActiva },
      ]}
      accaoPrincipal={
        <a className="bo-botao bo-botao--primario" href={hrefUnidades}>{a.botao}</a>
      }
      accaoNoTopo
    />
  );
}
