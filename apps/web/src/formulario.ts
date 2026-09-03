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
  return NextResponse.redirect(new URL(`${url.pathname}${url.search}`, 'http://interno').toString().replace('http://interno', ''), 303);
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
