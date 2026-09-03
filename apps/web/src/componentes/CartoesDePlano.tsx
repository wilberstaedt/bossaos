import { Botao, Cartao, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { DESTAQUES } from './planos.ts';

export interface PlanoDoCatalogo {
  codigo: string;
  nome: string;
  promessa: string;
  capacidades: ReadonlyArray<{ capacidade: string; quota: number | null }>;
}

/**
 * Os três cartões de plano (ONB-004, ORG-010, ORG-014, PLAT-011).
 *
 * Uma grelha, quatro telas. O atlas desenha-a igual nas quatro e a única coisa
 * que muda é a sobrancelha, o título e a acção do topo — copiá-la quatro vezes
 * seria garantir que daqui a três etapas há quatro versões dela.
 *
 * **Não há preços, e isso não é uma omissão.** O atlas escreve "Precio según
 * propuesta" nos três cartões, o prompt do E05 diz "não invente mensalidades" e
 * o catálogo na base não tem coluna de preço. Um número aqui seria inventado, e
 * um número inventado num cartão de plano é uma promessa comercial.
 */
export function CartoesDePlano({
  idioma, catalogo, planoActual,
}: {
  idioma: Idioma;
  catalogo: readonly PlanoDoCatalogo[];
  planoActual?: string | null;
}) {
  const m = mensagensDe(idioma);
  return (
    <>
      <div className="bo-planos">
        {catalogo.map((plano) => {
          const destaques = DESTAQUES[plano.codigo] ?? [];
          const actual = planoActual === plano.codigo;
          return (
            <Cartao
              key={plano.codigo}
              variante={actual ? 'contornado' : 'elevado'}
              className="bo-planos__cartao"
            >
              {actual ? (
                <p className="bo-planos__destaque">
                  <Etiqueta tom="sucesso">{m.planos.destaque}</Etiqueta>
                </p>
              ) : null}
              <h3 className="bo-planos__nome">{plano.nome}</h3>
              <p className="bo-planos__promessa">{plano.promessa}</p>
              <ul className="bo-planos__lista">
                {destaques.map((d) => (
                  <li key={`${d.chave}-${d.plano ?? ''}`} className="bo-planos__item">
                    {/* O visto é decorativo: quem não o vê já lê a linha inteira. */}
                    <span className="bo-planos__visto" aria-hidden="true">✓</span>
                    <span>
                      {(m.planos.destaques as Record<string, string>)[d.chave]?.replace(
                        '{plano}', d.plano ?? '',
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="bo-planos__preco">{m.planos.preco}</p>
              <Botao tom={actual ? 'primario' : 'secundario'}>{m.planos.conhecer}</Botao>
            </Cartao>
          );
        })}
      </div>
      <p className="bo-planos__nota">{m.planos.nota}</p>
    </>
  );
}
