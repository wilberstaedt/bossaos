import { notFound, redirect } from 'next/navigation';
import { Aviso, Cartao, validarTema } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { coresPublicasDoPlano } from '@bossaos/domain';
import { listarUnidades } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../../src/sessao.ts';
import { PreviaDoTema } from '../../../../../../../../../src/componentes/PreviaDoTema.tsx';

export const dynamic = 'force-dynamic';

/**
 * THEME-006 · «Brasa Norte · Tema Restaurant» (atlas p. 384)
 * THEME-007 · «Oliva Bistro · Tema Pro» (atlas p. 385)
 *
 * ── Dois exemplos, e a razão de existirem no mesmo ficheiro ───────────────
 *
 * *«Exercite os exemplos visuais Restaurant e Pro com dados de demonstração sem
 * alterar LP, administração, estados ou operação»* (E12, entregar 5). São dois
 * IDs porque são dois exemplos, e um ficheiro porque a diferença entre eles é a
 * paleta — duas cópias divergiriam no dia em que uma ganhasse um bloco.
 *
 * ── E o que eles mostram é que os dois planos são IGUAIS aqui ─────────────
 *
 * É a coisa que o E12 manda respeitar em primeiro lugar: *«Restaurant e Pro têm
 * a mesma capacidade de cores; não venda tipografia ou layout livre que não foi
 * acordado»*. Se um destes exemplos tivesse um tipo de letra diferente do outro,
 * a tela vendia uma capacidade que não existe — e alguém compraria o Pro por
 * causa dela.
 *
 * A fonte de que os dois planos têm a mesma capacidade é a comercial
 * (`PRECIFICACAO.json`), lida e não repetida por palavras minhas.
 *
 * ── Não tocam em nada ─────────────────────────────────────────────────────
 *
 * Nem leem nem escrevem o tema desta organização. As paletas estão aqui, no
 * ficheiro, porque são conteúdo de demonstração — e passam pela `validarTema`
 * antes de aparecerem, para um exemplo ilegível não ficar a ensinar o contrário
 * do que a página seguinte recusa.
 */

const EXEMPLOS = {
  'brasa-norte': {
    plano: 'RESTAURANT' as const,
    unidade: 'Brasa Norte',
    tema: { primaria: '#7A2E1E', acento: '#C8792C', fundo: '#FBF6F0' },
    pratos: [
      { nome: 'Chuletón de vaca madurada', montanteMenor: 4200 },
      { nome: 'Pimientos de Padrón a la brasa', montanteMenor: 950 },
      { nome: 'Tarta de queso al horno', montanteMenor: 720 },
    ],
  },
  'oliva-bistro': {
    plano: 'PRO' as const,
    unidade: 'Oliva Bistro',
    tema: { primaria: '#22483C', acento: '#9C8B4B', fundo: '#F6F7F3' },
    pratos: [
      { nome: 'Ensalada de hinojo, naranja y aceituna', montanteMenor: 1150 },
      { nome: 'Risotto de setas de temporada', montanteMenor: 1680 },
      { nome: 'Higos con miel y requesón', montanteMenor: 690 },
    ],
  },
} as const;

export default async function ExemploDeTema({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; exemplo: string }>;
}) {
  const { idioma, orgSlug, locationSlug, exemplo } = await params;
  const m = mensagensDe(idioma);
  const t = m.temaE12;

  const escolhido = (EXEMPLOS as Record<string, (typeof EXEMPLOS)[keyof typeof EXEMPLOS] | undefined>)[exemplo];
  if (!escolhido) notFound();

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  // A unidade é validada à mesma — um `locationSlug` que não é desta organização
  // dá ausência. O exemplo não depende dela, mas o endereço não pode servir a
  // quem quer que seja com um slug inventado.
  const unidade = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    return unidades.find((u) => u.slug === locationSlug) ?? null;
  });
  if (!unidade) notFound();

  // Um exemplo que não passasse na regra do produto seria um exemplo a ensinar
  // o contrário do que a tela ao lado recusa.
  const validacao = validarTema(escolhido.tema);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/website/theme`;
  const titulo = escolhido.plano === 'PRO' ? t.exemploPro : t.exemploRestaurant;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{t.exemplos}</p>
          <h1>{titulo}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={base}>{m.comum.voltar}</a>
      </div>

      <Aviso titulo={m.comum.datosDemostracion}>{t.exemploNota}</Aviso>

      <div className="bo-tema">
        <Cartao className="bo-tema__previa" titulo={titulo}>
          <PreviaDoTema
            tema={escolhido.tema} unidade={escolhido.unidade} marca={escolhido.plano}
            pratos={escolhido.pratos.map((p) => ({
              nome: p.nome,
              preco: formatarDinheiro({ montanteMenor: p.montanteMenor, moeda: 'EUR' }, idioma),
            }))}
            verCarta={m.tema.verCarta}
          />
        </Cartao>

        <div className="bo-tema__ficha">
          <dl className="bo-estado__factos">
            <dt>{m.tema.primaria}</dt>
            <dd><code className="bo-tema__valor">{escolhido.tema.primaria.toUpperCase()}</code></dd>
            <dt>{m.tema.acento}</dt>
            <dd><code className="bo-tema__valor">{escolhido.tema.acento.toUpperCase()}</code></dd>
            <dt>{m.tema.fundo}</dt>
            <dd><code className="bo-tema__valor">{escolhido.tema.fundo.toUpperCase()}</code></dd>
            <dt>{t.razao}</dt>
            {/* Os números medidos, e não uma etiqueta a dizer "acessível". O
                acento aparece com o seu, que é baixo de propósito e não bloqueia
                — está explicado em `validarTema` e no manual p. 16. */}
            <dd>
              {validacao.veredictos.map((v) => `${v.token} ${v.razao}:1`).join(' · ')}
            </dd>
            <dt>{m.tema.tipografia}</dt>
            <dd>{m.tema.tipografiaValor}</dd>
            <dt>{t.naoPersonalizavel}</dt>
            <dd>{t.naoPersonalizavelTexto}</dd>
          </dl>

          <p className="bo-campo__ajuda">{t.mesmaCapacidade}</p>

          {/* ── O ecrã e a fonte comercial têm de dizer o mesmo ─────────────
              Este exemplo afirma que o plano personaliza cores. Quem decide isso
              é `PRECIFICACAO.json`. Se um dia a fonte mudar e este ficheiro não,
              o aviso aparece aqui em vez de a tela continuar a vender uma
              capacidade que deixou de existir. */}
          {coresPublicasDoPlano(escolhido.plano) === 'personalizaveis' ? null : (
            <Aviso tom="perigo" urgente titulo={t.naoPersonalizavel}>
              {escolhido.plano}: {t.ajusteExplicacao}
            </Aviso>
          )}

          <nav className="bo-estado__accoes" aria-label={t.exemplos}>
            <a className="bo-botao bo-botao--secundario" href={`${base}/exemplos/brasa-norte`}>
              {t.exemploRestaurant}
            </a>
            <a className="bo-botao bo-botao--secundario" href={`${base}/exemplos/oliva-bistro`}>
              {t.exemploPro}
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
}
