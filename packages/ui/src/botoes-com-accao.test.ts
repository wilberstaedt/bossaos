import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');
const WEB = join(RAIZ, 'apps', 'web');

/**
 * Um botão que promete uma acção tem de a fazer.
 *
 * ── Porque é que esta guarda existe ────────────────────────────────────────
 *
 * `<Botao>` sem atributo nenhum rende `type="button"` sem manipulador, sem
 * formulário à volta e sem destino: **não faz nada**. O rótulo diz *«Invitar
 * persona»*, *«Crear flag»*, *«Enviar invitaciones»* — e ao carregar não
 * acontece coisa nenhuma.
 *
 * A revisão do marco E11 encontrou **doze** assim em ecrãs de produto. Não é um
 * adiamento: é um defeito. Quem carrega num botão que anuncia uma acção e não vê
 * nada conclui que o produto está avariado, e tem razão — e ao contrário de um
 * erro, isto não deixa rasto nenhum para alguém encontrar depois.
 *
 * ── As vitrinas são a excepção, e é uma excepção com endereço ─────────────
 *
 * `/interno/catalogo` e `/interno/estruturas` são as vitrinas de componentes do
 * E02: existem para **mostrar a forma** de um botão, não para agir. Um botão
 * inerte ali é o conteúdo da página.
 *
 * A excepção é pelo CAMINHO e não por uma lista de ficheiros: uma vitrina nova
 * fica coberta, e um ecrã de produto novo **não** — que é o sentido certo, porque
 * é do lado do produto que o defeito custa.
 */

/** Só estas duas pastas podem ter botões inertes, e sabe-se porquê. */
const VITRINAS = /^app\/\[idioma\]\/interno\//;

function ficheirosDaWeb(): string[] {
  const encontrados: string[] = [];
  const visitar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      if (nome === 'node_modules' || nome === '.next' || nome.startsWith('.')) continue;
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) visitar(caminho);
      else if (/\.tsx$/.test(nome)) encontrados.push(caminho);
    }
  };
  visitar(join(WEB, 'app'));
  visitar(join(WEB, 'src'));
  return encontrados;
}

/**
 * `<Botao>` exactamente — abertura sem um único atributo.
 *
 * Deliberadamente estreito. Um `<Botao tom="perigo">` também pode ser inerte, e
 * essa família fica de fora **de propósito**: é o que a revisão delimitou, e
 * alargar a guarda sem alargar a correcção deixava-a vermelha no dia em que
 * nasceu — que é como as guardas morrem.
 */
const INERTE = /<Botao>/g;

/**
 * Apaga comentários e deixa as quebras de linha no sítio.
 *
 * ── Isto não estava aqui, e a guarda apanhou-me a mim ─────────────────────
 *
 * A primeira versão limpava comentário linha a linha. O comentário que eu
 * escrevi ao retirar um dos doze botões **atravessa três linhas** e menciona a
 * etiqueta no meio — e a guarda acusou-o. É a mesma família do detector que
 * acusava `parseFloat` dentro do comentário a explicar que não se usa
 * `parseFloat`, e escrevi-a a explicar exactamente isso.
 *
 * A lição que fica: um detector que casa TEXTO tem de apagar os comentários
 * primeiro, e apagá-los como blocos — não como linhas.
 */
function semComentarios(fonte: string): string {
  return fonte
    // Blocos `/* … */`, incluindo os JSX `{/* … */}`. O `[\s\S]` atravessa
    // linhas; substitui-se por quebras para os números de linha não escorregarem.
    .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (t, antes) => antes + ' '.repeat(t.length - antes.length));
}

function inertesForaDasVitrinas(): { ficheiro: string; linha: number; texto: string }[] {
  const maus: { ficheiro: string; linha: number; texto: string }[] = [];
  for (const ficheiro of ficheirosDaWeb()) {
    const relativo = relative(WEB, ficheiro).split('\\').join('/');
    if (VITRINAS.test(relativo)) continue;
    const linhas = semComentarios(readFileSync(ficheiro, 'utf8')).split('\n');
    linhas.forEach((linha, i) => {
      if (INERTE.test(linha)) {
        maus.push({ ficheiro: relativo, linha: i + 1, texto: linha.trim().slice(0, 80) });
      }
      INERTE.lastIndex = 0;
    });
  }
  return maus;
}

describe('nenhum botão de produto promete uma acção que não faz', () => {
  it('não há `<Botao>` inerte fora das vitrinas de componentes', () => {
    const maus = inertesForaDasVitrinas();
    assert.deepEqual(
      maus.map((m) => `${m.ficheiro}:${m.linha} ${m.texto}`),
      [],
      'estes botões rendem type="button" sem manipulador, sem formulário e sem destino',
    );
  });

  it('e as vitrinas continuam a tê-los — senão a guarda não está a olhar para nada', () => {
    // O controlo anti-verde-vazio. Sem este caso, a varredura podia estar a
    // devolver zero ficheiros e o teste de cima passava na mesma.
    const vitrinas = ficheirosDaWeb()
      .map((f) => relative(WEB, f).split('\\').join('/'))
      .filter((f) => VITRINAS.test(f));
    assert.ok(vitrinas.length >= 2, `só ${vitrinas.length} vitrinas — a varredura partiu-se?`);

    const inertesNasVitrinas = vitrinas.reduce((total, f) => {
      const encontrados = readFileSync(join(WEB, f), 'utf8').match(INERTE);
      return total + (encontrados?.length ?? 0);
    }, 0);
    assert.ok(
      inertesNasVitrinas > 0,
      'as vitrinas deixaram de ter botões inertes — ou mudaram, ou o padrão deixou de casar',
    );
  });

  it('CONTROLO NEGATIVO: a varredura reconhece um inerte plantado num ecrã real', () => {
    // Planta-se em memória, não no disco: uma guarda que só se prova mexendo em
    // ficheiros deixa lixo quando falha a meio.
    const linha = '        <Botao>{m.pessoas.accao}</Botao>';
    const semComentario = linha.replace(/\/\/.*$/, '');
    assert.ok(INERTE.test(semComentario), 'o padrão deixou de reconhecer um botão inerte');
    INERTE.lastIndex = 0;

    // E o par: as formas que a revisão NÃO delimitou continuam de fora, e isso é
    // uma decisão e não um descuido.
    assert.ok(!INERTE.test('<Botao tom="secundario">{m.comum.voltar}</Botao>'));
    INERTE.lastIndex = 0;
    // E um comentário SOBRE um botão inerte não conta como um — nem quando
    // atravessa linhas, que foi o caso que me apanhou.
    const comentado = semComentarios('{/* Era um <Botao> sem\n manipulador */}\n<div/>');
    assert.ok(!INERTE.test(comentado), 'um comentário multi-linha ainda é acusado');
    INERTE.lastIndex = 0;
    assert.equal(inertesForaDasVitrinas().length, 0);
  });
});
