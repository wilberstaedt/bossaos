import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';

/**
 * O tratamento de dados do formulário de demo.
 *
 * ── Isto NÃO é uma política de privacidade, e o nome diz isso ─────────────
 *
 * Uma política de privacidade nomeia um responsável pelo tratamento, fixa
 * prazos de conservação e descreve um procedimento para exercer direitos.
 * **Nenhuma dessas três coisas está decidida neste repositório**, e inventá-las
 * seria pôr um texto com efeito legal por cima de decisões que ninguém tomou —
 * numa página que existe precisamente para dizer a verdade sobre dados
 * pessoais.
 *
 * A autorização escrita do Matheus (`00_AUTORIZACAO.md`) destrava pendências
 * **dele**. Um texto legal não é uma pendência dele: é responsabilidade de quem
 * responde por ela, e o `11_OPEN_FINDINGS.md` já classifica o RV100-011 como
 * `fora-do-alcance-da-autorizacao` por esta razão exacta.
 *
 * ── O que esta página é, então ────────────────────────────────────────────
 *
 * A descrição do que o sistema **faz**, escrita para poder ser conferida contra
 * o código. Cada afirmação tem onde ser verificada:
 *
 *   «recolhe-se isto»       → os campos do formulário em `demo/page.tsx` e as
 *                             colunas de `demo_requests` no `schema.prisma`;
 *   «não conseguimos ler»   → `REVOKE ALL ON demo_requests FROM bossaos_app`, na
 *                             migração `20260904150000_e10_pedidos_de_demo`;
 *   «marcaste e ficou com data» → a restrição `demo_consentimento_datado`, que
 *                             recusa consentimento sem data E data sem
 *                             consentimento;
 *   «sem cookies de análise» → medido pela `rv100-demo.spec.ts`, e não afirmado.
 *
 * E o último bloco diz o que falta, com essas palavras. **Uma página de dados
 * pessoais que finge estar completa é pior do que a ausência dela** — que é o
 * mesmo raciocínio pelo qual a `MolduraMkt` se recusou a ligar a rotas que não
 * existiam.
 *
 * ── Porque é que esta rota não muda os 396 ────────────────────────────────
 *
 * O §12.5 rastreia os IDs da `COBERTURA_TELAS.csv`, e a cobertura conta IDs e
 * não ficheiros de rota. Esta página não recebe ID novo: é o destino de uma
 * ligação do MKT-007, e o guarda continua a validar 396 de 396.
 */
export const dynamic = 'force-static';

const BLOCOS = [
  ['privacidadeRecolha', 'privacidadeRecolhaTexto'],
  ['privacidadeUso', 'privacidadeUsoTexto'],
  ['privacidadeLeitura', 'privacidadeLeituraTexto'],
  ['privacidadeMarketing', 'privacidadeMarketingTexto'],
] as const;

export default async function Privacidade({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/demo" sufixo="/privacy">
      <section className="bo-mkt__heroi">
        <h1>{k.privacidadeTitulo}</h1>
        <p className="bo-publico__texto">{k.privacidadeTexto}</p>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="t-tratamento">
        <h2 id="t-tratamento">{k.privacidadeTitulo}</h2>
        <div className="bo-mkt__grelha">
          {BLOCOS.map(([titulo, texto]) => (
            <article className="bo-mkt__cartao" key={titulo}>
              <h3>{k[titulo]}</h3>
              <p>{k[texto]}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── O que falta, dito por extenso e não escondido ────────────────────
          Este bloco é o mais importante da página. Um aviso de tratamento de
          dados sem responsável, sem prazo e sem procedimento de direitos está
          incompleto — e a escolha honesta entre completá-lo com invenção e
          declarar a falta é a segunda. Fica em destaque e não em rodapé. */}
      <section className="bo-mkt__seccao" aria-labelledby="t-pendente">
        <h2 id="t-pendente">{k.privacidadePendente}</h2>
        <p className="bo-mkt__destaque">{k.privacidadePendenteTexto}</p>
        <p className="bo-mkt__chamada">
          <a className="bo-botao bo-botao--secundario" href={`/${idioma}/demo`}>{k.pedirDemo}</a>
        </p>
      </section>
    </MolduraMkt>
  );
}
