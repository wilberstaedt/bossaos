import type { Page } from '@playwright/test';

export const LARGURAS = [360, 390, 768, 1280, 1440] as const;
export const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;

export const PAGINAS = [
  { nome: 'inicio', caminho: '' },
  { nome: 'catalogo', caminho: '/interno/catalogo' },
  { nome: 'estrutura-admin', caminho: '/interno/estruturas/admin' },
  { nome: 'estrutura-publica', caminho: '/interno/estruturas/publica' },
  { nome: 'estrutura-staff', caminho: '/interno/estruturas/staff' },
  { nome: 'estrutura-kds', caminho: '/interno/estruturas/kds' },
] as const;

/** A página transborda horizontalmente? Um pixel de folga para arredondamentos. */
export async function transbordaNaHorizontal(pagina: Page): Promise<number> {
  return pagina.evaluate(() => {
    const d = document.documentElement;
    return Math.max(0, d.scrollWidth - d.clientWidth - 1);
  });
}

/** Elementos cujo rectângulo sai da largura visível — conteúdo inalcançável. */
export async function elementosForaDoEcra(pagina: Page): Promise<string[]> {
  return pagina.evaluate(() => {
    const largura = document.documentElement.clientWidth;
    const fora: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('a, button, input, select, h1, h2, td, th')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      // Só conta o que ultrapassa mesmo, não o que roda dentro de um contentor
      // com rolagem própria — uma tabela larga com `overflow-x` é alcançável.
      let rolavel = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (s.overflowX === 'auto' || s.overflowX === 'scroll') { rolavel = true; break; }
      }
      if (rolavel) continue;
      if (r.right > largura + 1 || r.left < -1) {
        fora.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.textContent ?? '').trim().slice(0, 40)}" [${Math.round(r.left)}, ${Math.round(r.right)}] > ${largura}`);
      }
    }
    return fora;
  });
}

/** Controlos abaixo do alvo mínimo de toque. */
export async function alvosPequenos(pagina: Page, minimo: number): Promise<string[]> {
  return pagina.evaluate((min) => {
    const maus: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('a[href], button, input, select, [role="tab"]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const estilo = getComputedStyle(el);
      if (estilo.visibility === 'hidden' || estilo.display === 'none') continue;
      // Ligações dentro de um parágrafo de texto corrido estão isentas na
      // WCAG 2.2 e não são alvos de toque no sentido do padrão interno.
      if (el.tagName === 'A' && el.closest('p')) continue;
      if (r.height < min - 0.5 || r.width < min - 0.5) {
        maus.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)} < ${min}`);
      }
    }
    return maus;
  }, minimo);
}

/**
 * Contraste do texto contra o fundo efectivo.
 *
 * "Fundo efectivo" porque quase todos os elementos são transparentes: sobe-se a
 * árvore até encontrar quem pinte. Sem isso, mediria-se tudo contra
 * `rgba(0,0,0,0)` e daria verde em qualquer lado — que é o modo mais comum de
 * esta verificação não verificar nada.
 */
export async function textosComPoucoContraste(pagina: Page): Promise<string[]> {
  return pagina.evaluate(() => {
    function canais(cor: string): [number, number, number, number] {
      const m = cor.match(/rgba?\(([^)]+)\)/);
      if (!m?.[1]) return [0, 0, 0, 0];
      const p = m[1].split(',').map((v) => parseFloat(v.trim()));
      return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
    }
    function luminancia(rgb: [number, number, number]): number {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function razao(a: [number, number, number], b: [number, number, number]): number {
      const la = luminancia(a);
      const lb = luminancia(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }
    function fundoEfectivo(el: Element): [number, number, number] {
      for (let p: Element | null = el; p; p = p.parentElement) {
        const [r, g, b, a] = canais(getComputedStyle(p).backgroundColor);
        if (a > 0.95) return [r, g, b];
      }
      return [255, 255, 255];
    }

    const maus: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('p, span, a, button, h1, h2, h3, td, th, dt, dd, label, li, code')) {
      const texto = (el.textContent ?? '').trim();
      if (!texto) continue;
      // Só folhas de texto: um <div> que contém tudo mediria a cor do pai.
      if (el.querySelector('p, span, a, button, h1, h2, h3, td, th, dt, dd, label, li, code')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const estilo = getComputedStyle(el);
      if (estilo.visibility === 'hidden' || parseFloat(estilo.opacity) < 0.99) continue;

      const [cr, cg, cb, ca] = canais(estilo.color);
      if (ca < 0.99) continue;
      const tamanho = parseFloat(estilo.fontSize);
      const peso = parseInt(estilo.fontWeight, 10) || 400;
      // WCAG: 18,66 px negrito ou 24 px normal já são "texto grande".
      const grande = tamanho >= 24 || (tamanho >= 18.66 && peso >= 700);
      const limiar = grande ? 3 : 4.5;

      const valor = razao([cr, cg, cb], fundoEfectivo(el));
      if (valor < limiar) {
        maus.push(`"${texto.slice(0, 40)}" ${valor.toFixed(2)}:1 < ${limiar} (${Math.round(tamanho)}px/${peso})`);
      }
    }
    return maus;
  });
}

/**
 * Contraste de INDICADORES DE ESTADO, medido na página construída.
 *
 * A verificação de texto não chega aqui: um sublinhado de 3 px não tem texto
 * nenhum, e foi assim que o sublinhado do separador activo passou por todas as
 * verificações do E02 a 2,77:1. A WCAG 1.4.11 pede 3:1 a partes visuais que são
 * necessárias para identificar o estado de um componente.
 *
 * Mede só elementos que DIZEM que carregam estado (`aria-selected`,
 * `aria-current`, `aria-checked`, `aria-invalid`) e só as bordas e contornos que
 * são mesmo visíveis — largura acima de zero e cor opaca. Uma borda transparente
 * no separador inactivo não é indicador de nada.
 */
export async function indicadoresDeEstadoComPoucoContraste(pagina: Page): Promise<string[]> {
  return pagina.evaluate(() => {
    function canais(cor: string): [number, number, number, number] {
      const m = cor.match(/rgba?\(([^)]+)\)/);
      if (!m?.[1]) return [0, 0, 0, 0];
      const p = m[1].split(',').map((v) => parseFloat(v.trim()));
      return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
    }
    function luminancia(rgb: [number, number, number]): number {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function razao(a: [number, number, number], b: [number, number, number]): number {
      const la = luminancia(a);
      const lb = luminancia(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }
    function fundoEfectivo(el: Element | null): [number, number, number] {
      for (let p: Element | null = el; p; p = p.parentElement) {
        const [r, g, b, a] = canais(getComputedStyle(p).backgroundColor);
        if (a > 0.95) return [r, g, b];
      }
      return [255, 255, 255];
    }

    const LADOS = ['Top', 'Right', 'Bottom', 'Left'] as const;
    const maus: string[] = [];
    const comEstado = document.querySelectorAll<HTMLElement>(
      '[aria-selected="true"], [aria-current]:not([aria-current="false"]), [aria-checked="true"], [aria-invalid="true"]',
    );

    for (const el of comEstado) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const estilo = getComputedStyle(el);
      // O fundo por trás: o do próprio elemento se o tiver, senão o do pai.
      const [, , , alfaProprio] = canais(estilo.backgroundColor);
      const fundo = alfaProprio > 0.95 ? fundoEfectivo(el) : fundoEfectivo(el.parentElement);

      const rotulo = `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 24)}"`;

      for (const lado of LADOS) {
        const largura = parseFloat(estilo.getPropertyValue(`border-${lado.toLowerCase()}-width`));
        if (!(largura > 0)) continue;
        const cor = estilo.getPropertyValue(`border-${lado.toLowerCase()}-color`);
        const [cr, cg, cb, ca] = canais(cor);
        if (ca < 0.95) continue;
        const valor = razao([cr, cg, cb], fundo);
        if (valor < 3) {
          maus.push(`${rotulo} · borda ${lado.toLowerCase()} ${cor} sobre rgb(${fundo.join(', ')}) = ${valor.toFixed(2)}:1 < 3`);
        }
      }

      // Um fundo próprio pode ser o sinal de estado — mas só se MUDAR com o
      // estado. A primeira versão media qualquer fundo e acusou um campo
      // inválido por ser branco sobre a areia: só que o campo válido também é
      // branco, e o que marca o erro ali é a borda vermelha. O que não muda com
      // o estado não é indicador de estado.
      //
      // Procura-se um irmão da mesma classe no estado contrário; se o fundo for
      // igual ao dele, não é sinal. Sem irmão para comparar, não se afirma nada:
      // acusar por suspeita seria trocar um falso negativo por um falso positivo.
      if (alfaProprio > 0.95 && el.className) {
        const iguais = Array.from(
          document.querySelectorAll<HTMLElement>(`${el.tagName.toLowerCase()}.${el.className.trim().split(/\s+/).join('.')}`),
        );
        const contrario = iguais.find((outro) => {
          if (outro === el) return false;
          return (
            outro.getAttribute('aria-selected') === 'false' ||
            outro.getAttribute('aria-checked') === 'false' ||
            outro.getAttribute('aria-invalid') === null ||
            outro.getAttribute('aria-current') === null
          );
        });
        if (contrario) {
          const meu = getComputedStyle(el).backgroundColor;
          const dele = getComputedStyle(contrario).backgroundColor;
          if (meu !== dele) {
            const [br, bg, bb] = canais(meu);
            const atras = fundoEfectivo(el.parentElement);
            const valor = razao([br, bg, bb], atras);
            if (valor < 3) {
              maus.push(`${rotulo} · fundo ${meu} (muda com o estado) sobre rgb(${atras.join(', ')}) = ${valor.toFixed(2)}:1 < 3`);
            }
          }
        }
      }
    }
    return maus;
  });
}
