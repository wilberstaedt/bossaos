import { NextResponse } from 'next/server';

/**
 * Formulários que funcionam sem JavaScript.
 *
 * As telas do E06 **criam coisas** — não são vistas. Um `<form method="post">`
 * a apontar para uma rota da API é a forma mais simples de isso funcionar, e a
 * única que continua a funcionar quando o JavaScript falha: num tablet velho de
 * cozinha, numa rede de restaurante, no primeiro dia de alguém.
 *
 * A resposta é **303 e não 200**: sem ela, o navegador fica na URL da API a
 * mostrar JSON, e um F5 repete o `POST`. Com 303, o F5 recarrega a página de
 * destino. (A idempotência protege contra a repetição de qualquer maneira — mas
 * proteger-se e depois provocar o problema é trabalho a dobrar.)
 */
export function voltarPara(destino: string, extra: Record<string, string> = {}): NextResponse {
  const url = new URL(destino, 'http://interno');
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  const relativo = `${url.pathname}${url.search}`;

  // ── Isto devolvia 500 em TODAS as submissões de formulário do produto ────
  //
  // A versão anterior chamava `NextResponse.redirect(relativo, 303)`. O Next
  // exige um URL **absoluto** e atira `URL is malformed` — logo cada `<form>`
  // que a pessoa submetia recebia 500 em vez do redireccionamento. Trinta e sete
  // rotas passavam por aqui.
  //
  // Nunca foi apanhado porque **nenhuma prova submetia formulário**: as provas
  // por HTTP mandam JSON, e o caminho JSON destas rotas responde
  // `NextResponse.json` sem passar por esta função. É a falha 4 do marco escrita
  // em código — provar a peça não prova o caminho, e o caminho da pessoa era o
  // que faltava.
  //
  // O cabeçalho `Location` relativo é válido em HTTP desde o RFC 7231 §7.1.2 e é
  // o que os navegadores resolvem contra o pedido. Não se constrói um absoluto
  // porque isso obrigaria a adivinhar o anfitrião — e adivinhar o anfitrião a
  // partir de um cabeçalho que o cliente controla é como se abrem redirecções
  // abertas.
  return new NextResponse(null, { status: 303, headers: { location: relativo } });
}

/** Lê um campo de texto. Vazio é `undefined`, **nunca** cadeia vazia. */
export function texto(dados: FormData, campo: string): string | undefined {
  const v = dados.get(campo);
  if (typeof v !== 'string') return undefined;
  const limpo = v.trim();
  // Uma cadeia vazia guardada é indistinguível de "a pessoa escreveu nada de
  // propósito". `undefined` é o que quer dizer "não mexeu"; para apagar há
  // `null`, e quem apaga carrega num botão que o diz.
  return limpo === '' ? undefined : limpo;
}

/** Lê um campo que pode ser explicitamente esvaziado. */
export function textoOuNulo(dados: FormData, campo: string): string | null | undefined {
  const v = dados.get(campo);
  if (typeof v !== 'string') return undefined;
  return v.trim() === '' ? null : v.trim();
}
