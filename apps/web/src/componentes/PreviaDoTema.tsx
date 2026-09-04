import { variaveisDoTema, type TemaPublico } from '@bossaos/ui';

/**
 * A prévia de um tema, desenhada com as MESMAS classes da carta pública.
 *
 * ── Porque é que isto não é um desenho novo ───────────────────────────────
 *
 * A régua do E12 diz que o aceite é «o tema **efectivamente** aplicado», e que
 * uma tela que mostre a cor guardada no formulário mostra o que se escreveu e não
 * o que se aplica. Uma prévia com marcação própria tem exactamente esse defeito
 * com mais passos: fica bonita, e diverge da carta a sério no dia em que alguém
 * mudar `.bo-publico__produto` e não se lembrar de vir aqui.
 *
 * Por isso o miolo usa `bo-publico`, `bo-publico__produto`, `bo-publico__preco` e
 * `bo-botao--primario` — os mesmos nomes que a página que o cliente vê. Se a
 * carta mudar, isto muda com ela.
 *
 * ── E as variáveis são as mesmas três que o público recebe ────────────────
 *
 * `variaveisDoTema` é a única função que transforma um tema em CSS, e é ela que
 * a rota pública chama. Duas funções a fazer isto dariam o mesmo resultado até
 * ao dia em que uma delas mudasse — e nesse dia a prévia prometia uma cor e a
 * carta servia outra.
 */
export function PreviaDoTema({
  tema, unidade, marca, pratos, verCarta, largura = 'escritorio',
}: {
  tema: TemaPublico;
  unidade: string;
  marca: string;
  /** Nome e preço já formatados. Formatar aqui exigiria o idioma e não é deste componente. */
  pratos: readonly { nome: string; preco: string; descricao?: string }[];
  verCarta: string;
  largura?: 'movel' | 'escritorio';
}) {
  return (
    <div className={`bo-previa bo-previa--${largura}`}>
      <div className="bo-publico" style={variaveisDoTema(tema) as React.CSSProperties}>
        <header className="bo-publico__cabecalho">
          <p className="bo-estado__sobrancelha">{marca}</p>
          <h2>{unidade}</h2>
        </header>
        <section>
          <ul className="bo-publico__lista">
            {pratos.map((p) => (
              <li key={p.nome} className="bo-publico__produto">
                <a href="#previa">
                  <span className="bo-publico__nome">{p.nome}</span>
                  <span className="bo-publico__preco">{p.preco}</span>
                </a>
                {p.descricao ? <p className="bo-publico__descricao">{p.descricao}</p> : null}
              </li>
            ))}
          </ul>
        </section>
        <p>
          {/* O botão primário é o sítio onde a cor primária carrega texto por
              cima. É por isso que ele está na prévia: é o par que o cálculo de
              contraste bloqueia, e vê-lo aqui é ver a regra a funcionar. */}
          <a className="bo-botao bo-botao--primario" href="#previa">{verCarta}</a>
        </p>
      </div>
    </div>
  );
}
