import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { algumEnderecoInterno, classificarIp, lerIpv4, validarUrlDeBusca } from './enderecos.ts';

const recusa = (url: string) => {
  const r = validarUrlDeBusca(url);
  assert.equal(r.ok, false, `${url} devia ser recusado`);
  return r.ok ? '' : r.erro;
};
const aceita = (url: string) => {
  const r = validarUrlDeBusca(url);
  assert.equal(r.ok, true, `${url} devia ser aceite`);
  return r;
};

describe('1. As formas de escrever 127.0.0.1 sem escrever 127.0.0.1', () => {
  it('decimal, octal, hexadecimal e forma curta chegam todas ao mesmo sítio', () => {
    // Cada uma destas passou por um sistema real que só comparava a cadeia com
    // "127.0.0.1". O `connect()` do sistema operativo aceita-as todas.
    for (const forma of ['127.0.0.1', '2130706433', '0177.0.0.1', '0x7f.0x0.0x0.0x1', '127.1', '127.0.1']) {
      assert.equal(classificarIp(forma), 'loopback', `${forma} não foi reconhecido`);
    }
    assert.equal(lerIpv4('2130706433'), lerIpv4('127.0.0.1'));
    assert.equal(lerIpv4('127.1'), lerIpv4('127.0.0.1'));
  });

  it('IPv6, e o IPv4 embrulhado em IPv6', () => {
    assert.equal(classificarIp('::1'), 'loopback');
    assert.equal(classificarIp('[::1]'), 'loopback');
    // `::ffff:10.0.0.1` É 10.0.0.1. Classificar isto como IPv6 público é o
    // bypass mais silencioso da lista.
    assert.equal(classificarIp('::ffff:10.0.0.1'), 'privado');
    assert.equal(classificarIp('::ffff:127.0.0.1'), 'loopback');
    assert.equal(classificarIp('fd00::1'), 'privado');
    assert.equal(classificarIp('fe80::1'), 'ligacao_local');
  });

  it('169.254.169.254 — o serviço de metadados da nuvem', () => {
    // Não é um endereço interno qualquer: é o que devolve credenciais de
    // produção a quem lhe perguntar de dentro da máquina.
    assert.equal(classificarIp('169.254.169.254'), 'ligacao_local');
    assert.equal(recusa('http://169.254.169.254/latest/meta-data/'), 'destino_interno');
  });

  it('as três gamas privadas, e o par que impede o exagero', () => {
    for (const p of ['10.0.0.1', '172.16.0.1', '172.31.255.254', '192.168.1.1']) {
      assert.equal(classificarIp(p), 'privado', p);
    }
    // 172.32.x.x NÃO é privado — a gama acaba em 172.31. Uma implementação que
    // recusasse "172." inteiro bloqueava endereços públicos a sério.
    assert.equal(classificarIp('172.32.0.1'), 'publico');
    assert.equal(classificarIp('11.0.0.1'), 'publico');
    assert.equal(classificarIp('193.168.1.1'), 'publico');
    assert.equal(classificarIp('8.8.8.8'), 'publico');
  });
});

describe('2. O que o URL diz antes de haver resolução', () => {
  it('só http e https', () => {
    // Cada um destes já foi caminho de leitura de ficheiros locais numa
    // biblioteca de busca de imagens.
    for (const u of ['file:///etc/passwd', 'gopher://x/', 'data:text/html,<script>', 'ftp://x/']) {
      assert.equal(recusa(u), 'esquema_nao_permitido', u);
    }
    assert.equal(aceita('https://exemplo.example/a.png').ok, true);
  });

  it('credenciais no URL enganam quem o lê a olho', () => {
    assert.equal(recusa('http://interno.local@exemplo.example/'), 'credenciais_no_url');
  });

  it('nomes que resolvem para dentro sem passar pelo DNS público', () => {
    assert.equal(recusa('http://localhost:3000/'), 'nome_local');
    assert.equal(recusa('http://LOCALHOST/'), 'nome_local');
    // O ponto final é DNS legal e passa por uma comparação de cadeias ingénua.
    assert.equal(recusa('http://localhost./'), 'nome_local');
    assert.equal(recusa('http://metadata.google.internal/'), 'nome_local');
    assert.equal(recusa('http://caixa.local/'), 'nome_local');
    assert.equal(recusa('http://api.internal/'), 'nome_local');
  });

  it('um nome público passa a FORMA, e fica POR RESOLVER — não aceite', () => {
    // A distinção que carrega esta função: um nome público pode resolver para
    // 127.0.0.1. Isso não se vê aqui, e dizer que sim seria mentir.
    const r = aceita('https://cdn.exemplo.example/foto.jpg');
    assert.equal(r.ok && r.porResolver, true);
  });

  it('um IP público literal não precisa de resolução', () => {
    const r = aceita('https://8.8.8.8/a.png');
    assert.equal(r.ok && r.porResolver, false);
  });

  it('lixo não é um URL', () => {
    assert.equal(recusa('não é um url'), 'url_invalido');
  });
});

describe('3. Depois de resolver, pergunta-se outra vez', () => {
  it('basta UM endereço interno para recusar', () => {
    // Um nome que resolve para dois endereços, um público e um interno: o
    // sistema operativo pode escolher qualquer um, e um proxy que funciona
    // metade das vezes é um proxy.
    const r = algumEnderecoInterno(['93.184.216.34', '10.0.0.5']);
    assert.equal(r.interno, true);
    assert.equal(r.interno && r.classe, 'privado');
  });

  it('só endereços públicos passam — é o par', () => {
    assert.equal(algumEnderecoInterno(['93.184.216.34', '8.8.8.8']).interno, false);
  });

  it('o que não se consegue classificar conta como interno', () => {
    // O lado seguro de "não sei" aqui é recusar. Aceitar o desconhecido é
    // precisamente o hábito que esta função existe para não ter.
    assert.equal(algumEnderecoInterno(['isto-não-é-um-ip']).interno, true);
  });
});
