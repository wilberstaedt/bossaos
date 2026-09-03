'use client';

import { useState } from 'react';
import { Aviso, Botao, Campo, Seletor } from '@bossaos/ui';

/**
 * Formulários de acesso.
 *
 * Falam com a biblioteca de autenticação pela API dela. **Nenhum deles trata de
 * senhas** — não há aqui hash, comparação nem geração de token, e é assim que o
 * E04 manda.
 *
 * O navegador põe o cabeçalho `Origin` sozinho em pedidos da mesma origem, e a
 * biblioteca recusa mutações sem ele. Isso apareceu ao escrever a prova, que não
 * o enviava.
 */

type Estado = 'parado' | 'a-enviar' | 'erro' | 'feito';

interface TextosDeEntrada {
  email: string; senha: string; idioma: string; manterSessao: string;
  soNesteDispositivo: string; accao: string; esqueci: string;
  erroCredenciais: string; erroAbuso: string;
}

export function FormaEntrar({ textos, hrefRecuperar, idiomas }: {
  textos: TextosDeEntrada;
  hrefRecuperar: string;
  idiomas: ReadonlyArray<{ valor: string; rotulo: string }>;
}) {
  const [estado, setEstado] = useState<Estado>('parado');
  const [erro, setErro] = useState('');

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado('a-enviar');
    setErro('');
    const dados = new FormData(e.currentTarget);
    const r = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: dados.get('email'), password: dados.get('senha') }),
    });
    if (r.ok) {
      setEstado('feito');
      window.location.assign(dados.get('proximo') ? String(dados.get('proximo')) : './organizations');
      return;
    }
    // 429 e 401 dizem coisas diferentes a quem está à frente do ecrã: uma pede
    // paciência, a outra pede outra senha. Achatá-las faz a pessoa repetir.
    setErro(r.status === 429 ? textos.erroAbuso : textos.erroCredenciais);
    setEstado('erro');
  }

  return (
    <form onSubmit={submeter} style={{ display: 'grid', gap: 24 }}>
      <h1>{textos.accao === 'Entrar' ? textos.accao : textos.accao}</h1>
      {erro ? <Aviso tom="perigo" urgente titulo={erro} /> : null}
      <Campo rotulo={textos.email} name="email" type="email" required autoComplete="email" />
      <Campo rotulo={textos.senha} name="senha" type="password" required autoComplete="current-password" />
      <Seletor rotulo={textos.idioma} name="idioma" defaultValue={idiomas[0]?.valor}>
        {idiomas.map((i) => (
          <option key={i.valor} value={i.valor}>{i.rotulo}</option>
        ))}
      </Seletor>
      <Seletor rotulo={textos.manterSessao} name="manter" defaultValue="dispositivo">
        <option value="dispositivo">{textos.soNesteDispositivo}</option>
      </Seletor>
      <Botao type="submit" aCarregar={estado === 'a-enviar'} largo>{textos.accao}</Botao>
      <a href={hrefRecuperar}>{textos.esqueci}</a>
    </form>
  );
}

export function FormaRecuperar({ textos }: {
  textos: { titulo: string; email: string; entrega: string; enlaceUnico: string;
            vigencia: string; quinzeMinutos: string; accao: string; enviado: string; nota: string };
}) {
  const [estado, setEstado] = useState<Estado>('parado');

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado('a-enviar');
    const dados = new FormData(e.currentTarget);
    await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: dados.get('email'),
        redirectTo: `${window.location.origin}${window.location.pathname.replace('forgot-password', 'reset-password')}`,
      }),
    });
    // A mesma resposta exista ou não a conta. Dizer "esse email não existe"
    // transforma o formulário num verificador de quem está registado.
    setEstado('feito');
  }

  if (estado === 'feito') {
    return (
      <>
        <h1>{textos.titulo}</h1>
        <Aviso tom="sucesso" titulo={textos.enviado}>{textos.nota}</Aviso>
      </>
    );
  }

  return (
    <form onSubmit={submeter} style={{ display: 'grid', gap: 24 }}>
      <h1>{textos.titulo}</h1>
      <Campo rotulo={textos.email} name="email" type="email" required autoComplete="email" />
      <Campo rotulo={textos.entrega} defaultValue={textos.enlaceUnico} readOnly />
      <Campo rotulo={textos.vigencia} defaultValue={textos.quinzeMinutos} readOnly />
      <Botao type="submit" aCarregar={estado === 'a-enviar'} largo>{textos.accao}</Botao>
      <p className="bo-campo__ajuda">{textos.nota}</p>
    </form>
  );
}

export function FormaNovaSenha({ textos, token }: {
  textos: { titulo: string; nova: string; repetir: string; sessoesAnteriores: string;
            fecharAoGuardar: string; accao: string; naoCoincidem: string; nota: string };
  token: string;
}) {
  const [estado, setEstado] = useState<Estado>('parado');
  const [erro, setErro] = useState('');

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    if (dados.get('nova') !== dados.get('repetir')) {
      setErro(textos.naoCoincidem);
      setEstado('erro');
      return;
    }
    setEstado('a-enviar');
    const r = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ newPassword: dados.get('nova'), token }),
    });
    if (r.ok) { window.location.assign('./login'); return; }
    setErro(textos.naoCoincidem);
    setEstado('erro');
  }

  return (
    <form onSubmit={submeter} style={{ display: 'grid', gap: 24 }}>
      <h1>{textos.titulo}</h1>
      {erro ? <Aviso tom="perigo" urgente titulo={erro} /> : null}
      <Campo rotulo={textos.nova} name="nova" type="password" required autoComplete="new-password" />
      <Campo rotulo={textos.repetir} name="repetir" type="password" required autoComplete="new-password" />
      {/* A biblioteca fecha as outras sessões ao repor a senha. O campo é
          informativo: mostra o que vai acontecer, não deixa escolher o
          contrário — a senha antiga deixou de valer para toda a gente. */}
      <Campo rotulo={textos.sessoesAnteriores} defaultValue={textos.fecharAoGuardar} readOnly />
      <Botao type="submit" aCarregar={estado === 'a-enviar'} largo>{textos.accao}</Botao>
      <p className="bo-campo__ajuda">{textos.nota}</p>
    </form>
  );
}

export function FormaMfa({ textos }: {
  textos: { titulo: string; codigo: string; metodo: string; aplicacao: string;
            alternativa: string; codigoRecuperacao: string; accao: string; erro: string; nota: string };
}) {
  const [estado, setEstado] = useState<Estado>('parado');
  const [erro, setErro] = useState('');

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado('a-enviar');
    const dados = new FormData(e.currentTarget);
    const r = await fetch('/api/auth/two-factor/verify-totp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: String(dados.get('codigo')).replace(/\s/g, '') }),
    });
    if (r.ok) { window.location.assign('./organizations'); return; }
    setErro(textos.erro);
    setEstado('erro');
  }

  return (
    <form onSubmit={submeter} style={{ display: 'grid', gap: 24 }}>
      <h1>{textos.titulo}</h1>
      {erro ? <Aviso tom="perigo" urgente titulo={erro} /> : null}
      <Campo
        rotulo={textos.codigo}
        name="codigo"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
      />
      <Campo rotulo={textos.metodo} defaultValue={textos.aplicacao} readOnly />
      <Campo rotulo={textos.alternativa} defaultValue={textos.codigoRecuperacao} readOnly />
      <Botao type="submit" aCarregar={estado === 'a-enviar'} largo>{textos.accao}</Botao>
      <p className="bo-campo__ajuda">{textos.nota}</p>
    </form>
  );
}
