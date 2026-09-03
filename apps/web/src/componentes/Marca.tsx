import Image from 'next/image';
import wordmark from '../../../../brand/logoname.png';
import icone from '../../../../brand/logoicon.png';

/**
 * A marca, nas duas formas que existem (ADR 0001, decisão 2).
 *
 *   wordmark  onde há largura e a marca precisa de ser LIDA — cabeçalho da
 *             administração, página pública, rodapé.
 *   ícone     onde o espaço é quadrado ou pequeno — favicon, KDS, avatar.
 *
 * O D01 do pacote original mandava usar só o wordmark porque o símbolo estava
 * em aberto. Já não está: as duas peças foram entregues a 03/09 e são
 * definitivas. Ambas são PNG; o vector continua em falta e está declarado como
 * dependência externa.
 */
export function Wordmark({ altura = 28 }: { altura?: number }) {
  return (
    <Image
      src={wordmark}
      alt="BossaOS"
      height={altura}
      width={Math.round((2137 / 736) * altura)}
      priority
      style={{ height: altura, width: 'auto' }}
    />
  );
}

export function Icone({ lado = 32 }: { lado?: number }) {
  return (
    <Image
      src={icone}
      alt="BossaOS"
      height={lado}
      width={lado}
      style={{ height: lado, width: lado }}
    />
  );
}

/**
 * A palavra, sem imagem.
 *
 * Sobre a lateral escura da administração o PNG do wordmark tem bordas
 * semi-transparentes e ruído de rasterização (ADR 0001, decisão 4) — em texto
 * fica limpo, escala com o zoom e é seleccionável. Volta a ser imagem quando
 * houver SVG.
 */
export function MarcaEscrita() {
  return <span>BossaOS</span>;
}
