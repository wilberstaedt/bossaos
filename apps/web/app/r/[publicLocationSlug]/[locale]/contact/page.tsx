import { notFound } from 'next/navigation';
import { sitePublico, temaPublico } from '@bossaos/db';
import { paginaDoSite } from '@bossaos/domain';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Aviso } from '@bossaos/ui';
import { MolduraDoSite } from '../../../../../src/componentes/SitePublico.tsx';
import { obterBase } from '../../../../../src/servidor.ts';

/**
 * PUB-005 · «Te esperamos en Oropesa» — contacto e o formulário (atlas p. 12)
 *
 * ── O aceite 2 vive aqui e na rota que recebe o envio ─────────────────────
 *
 * > *«Lead válido guarda-se uma vez; falha real não mostra sucesso.»*
 *
 * Três decisões desta página servem esse aceite:
 *
 * 1. **O formulário é um `POST` normal, sem JavaScript.** Quem chega por QR está
 *    num telemóvel com a rede do restaurante. Um envio por `fetch` que falhe na
 *    rede não tem sítio para dizer que falhou, e o ecrã fica como estava — que se
 *    lê como enviado.
 * 2. **O resultado vem no ENDEREÇO**, por redireccionamento. O estado é
 *    partilhável, sobrevive a um recarregar, e o servidor decide o que dizer —
 *    não há caminho por onde o cliente veja "obrigado" sem o servidor o ter
 *    escrito depois de a gravação ter corrido.
 * 3. **Há um estado de ERRO desenhado.** Se não houvesse, a única saída de uma
 *    falha era mostrar o formulário outra vez, e um formulário limpo depois de
 *    submeter lê-se como sucesso.
 *
 * A rota que grava está em `/api/publico/lead` e **não** aqui debaixo: o E09
 * mede que nenhuma rota sob `/r/` exporta um verbo de escrita, porque o endereço
 * do QR é de leitura. A regra continua a valer e é este ficheiro que o mostra.
 */
export const dynamic = 'force-dynamic';

const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;

export default async function ContactoPublico({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
  searchParams: Promise<{ enviado?: string; erro?: string }>;
}) {
  const { publicLocationSlug, locale } = await params;
  const procura = await searchParams;
  const idioma: Idioma = (IDIOMAS as readonly string[]).includes(locale)
    ? (locale as Idioma) : 'es-ES';
  const s = mensagensDe(idioma).sitioE10;

  const prisma = obterBase();
  const servida = await sitePublico(prisma, publicLocationSlug);
  // O tema tem de chegar à página. Ver `publico_tema` e a régua do E12: o ataque
  // é ler a cor que o NAVEGADOR calcula, e não a que o CSS declara.
  const tema = await temaPublico(prisma, publicLocationSlug);
  if (!servida) notFound();

  const pagina = paginaDoSite(servida.site, 'CONTACTO');
  if (!pagina) notFound();

  const contacto = pagina.contacto;
  const enviado = procura.enviado === '1';
  const repetido = procura.enviado === 'repetido';
  const falhou = procura.erro === 'gravacao';
  const invalido = procura.erro === 'campos';

  return (
    <MolduraDoSite
      slug={publicLocationSlug} idioma={idioma} unidade={servida.unidade}
      marca={servida.marca} site={servida.site} tema={tema} actual="CONTACTO" caminho="/contact"
    >
      <section className="bo-publico__heroi">
        <h1>{pagina.titulo ?? s.contacto}</h1>
      </section>

      {pagina.corpo ? (
        <div className="bo-publico__texto">
          {pagina.corpo.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </div>
      ) : null}

      {contacto ? (
        <dl className="bo-publico__contacto">
          {contacto.morada ? (<><dt>{s.morada}</dt><dd>{contacto.morada}</dd></>) : null}
          {contacto.telefone ? (
            <><dt>{s.telefoneRotulo}</dt>
              <dd><a href={`tel:${contacto.telefone.replace(/\s/g, '')}`}>{contacto.telefone}</a></dd></>
          ) : null}
          {contacto.email ? (
            <><dt>{s.emailRotulo}</dt>
              <dd><a href={`mailto:${contacto.email}`}>{contacto.email}</a></dd></>
          ) : null}
        </dl>
      ) : null}

      <section aria-labelledby="escrevanos">
        <h2 id="escrevanos">{s.escrevaNos}</h2>

        {/* ── Os quatro desfechos, e nenhum deles é ambíguo ────────────────
            Sucesso e duplicado dizem coisas diferentes porque SÃO coisas
            diferentes; a falha diz explicitamente que **nada foi guardado**,
            que é a informação de que a pessoa precisa para voltar a tentar. */}
        {enviado ? <Aviso tom="sucesso" titulo={s.obrigado}>{s.obrigadoTexto}</Aviso> : null}
        {repetido ? <Aviso tom="info" titulo={s.obrigado}>{s.jaRecebemos}</Aviso> : null}
        {falhou ? <Aviso tom="perigo" titulo={s.erroAoEnviar}>{s.erroTexto}</Aviso> : null}
        {invalido ? <Aviso tom="aviso" titulo={s.erroAoEnviar}>{s.campoObrigatorio}</Aviso> : null}

        {enviado || repetido ? null : (
          <form method="post" action="/api/publico/lead" className="bo-publico__formulario">
            <input type="hidden" name="slug" value={publicLocationSlug} />
            <input type="hidden" name="idioma" value={idioma} />

            <div className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="nome">{s.nome}</label>
              <input className="bo-campo__controlo" id="nome" name="nome" required
                     autoComplete="name" maxLength={200} />
            </div>
            <div className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="email">{s.email}</label>
              {/* `type="email"` e não `text`: no telemóvel muda o teclado, e a
                  verificação a sério é a do servidor — a do navegador é conforto,
                  não garantia. */}
              <input className="bo-campo__controlo" id="email" name="email" type="email" required
                     autoComplete="email" maxLength={320} />
            </div>
            <div className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="telefone">{s.telefone}</label>
              <input className="bo-campo__controlo" id="telefone" name="telefone"
                     autoComplete="tel" inputMode="tel" maxLength={40} />
            </div>
            <div className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="mensagem">{s.mensagem}</label>
              <textarea id="mensagem" name="mensagem" required maxLength={4000} />
            </div>

            <p><button type="submit" className="bo-botao bo-botao--primario">{s.enviar}</button></p>
          </form>
        )}
      </section>
    </MolduraDoSite>
  );
}
