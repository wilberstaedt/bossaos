"""Gera a pagina de aprovacao visual a partir das capturas dos mestres.

Existe como GUIAO e nao como ficheiro escrito a mao porque a pagina tem de ser
regerada de cada vez que uma captura muda - e o dia 07/09 mostrou porque: a
correccao da barra lateral entrou e a pagina que o Matheus tinha no telemovel
continuou a mostrar o defeito de que ele se tinha queixado.

Recusa-se a gerar se alguma captura for ANTERIOR a fonte mais recente do
produto. Exclui `next-env.d.ts` e o que mais a construcao gera: um ficheiro que
o build escreve faz toda a prova parecer velha em cada corrida, e uma guarda
permanentemente vermelha e uma guarda ignorada.
"""
import json, base64, html, collections, os, glob, sys, subprocess, time

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(RAIZ, 'docs/visual/rv100/2026-09-06_e953a87/evidence/masters')
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '/tmp/telas-mestre.html'

# A mecânica saiu daqui para `frescura_do_produto.py`, e não por arrumação: a
# guarda das capturas de marketing precisava da MESMA pergunta, e uma segunda
# cópia dela seria a duplicação que este repositório passou o dia a fechar.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from frescura_do_produto import mais_recente_do_produto as _mais_recente  # noqa: E402
from frescura_do_produto import mtimes_reescritos as _reescritos  # noqa: E402
from frescura_do_produto import porque_e_que_o_produto_e_mais_recente as _porque  # noqa: E402

def mais_recente_do_produto():
    return _mais_recente(RAIZ)

# ── O carimbo, que e a metade que faltava a esta pagina ─────────────────────
#
# A guarda de frescura desta pagina FUNCIONA: recusa-se a gerar se alguma
# captura for anterior a fonte mais recente do produto. Medido a 08/09, recusou
# mesmo - codigo 1, zero ficheiros.
#
# O que ela nao pode fazer e defender a pagina DEPOIS de gerada. Ela corre no
# instante em que a pagina nasce; a pagina vive num link permanente muito para
# alem desse instante. Medido a 08/09: a versao publicada as 16h29 de 07/09
# tinha 19 commits ao produto por cima dela - o redesenho inteiro - e continuava
# a afirmar, no topo, ser posterior a ultima alteracao ao produto.
#
# Uma guarda de frescura pode recusar-se a NASCER velha. Nao se pode recusar a
# SER LIDA velha. E envelhece a mentir para o lado errado: nao fica em silencio,
# fica a afirmar frescura.
#
# A cura e dar ao leitor a conta que eu tive de fazer com `git log`: dizer que
# commit foi capturado. A pagina irma `Sete blocos e uma sala` ja o fazia - «do
# commit b52fc14» - e nao foi trazida para aqui. Uma pratica que vive so na
# pagina onde alguem se lembrou dela nao e uma pratica.
#
# Se o commit nao se puder obter, NAO se inventa nem se omite: diz-se que nao se
# sabe. Um carimbo ausente e um leitor avisado; um carimbo falso e pior do que
# nenhum.
def commit_capturado():
    try:
        r = subprocess.run(['git', '-C', RAIZ, 'rev-parse', '--short', 'HEAD'],
                           capture_output=True, text=True, check=True)
        return r.stdout.strip() or None
    except Exception:
        return None

L = []
def anda(o):
    if isinstance(o, dict):
        if 'ficheiro' in o: L.append(o)
        for v in o.values(): anda(v)
    elif isinstance(o, list):
        for v in o: anda(v)
anda(json.load(open(os.path.join(D, 'mestres.json'))))

# ── Antes de comparar datas, perguntar se as datas querem dizer alguma coisa ──
#
# Isto comparava `mtime` de captura contra `mtime` de fonte, e num `clone` ou
# `worktree` fresco o git escreve TUDO no mesmo instante. Medido a 07/09 num
# worktree deste repositório: a janela inteira do checkout foi de **0,067 s**.
#
# E o que saía daqui não era um verde falso — era uma RECUSA falsa: «25 capturas
# anteriores à fonte mais recente do produto», um número tirado de 67 ms de
# ordem de escrita do git. Pior, dois worktrees independentes deram o MESMO 25,
# porque o git escreve por ordem estável.
#
# **Ruído determinista é pior do que ruído.** Reproduz-se, parece uma medição, e
# sobrevive à verificação de quem desconfiar e correr outra vez.
#
# A resposta honesta num sítio onde as datas foram reescritas não é «recuso» nem
# «aprovo» — é NÃO MEDI. O canário vive na peça partilhada; aqui só se pergunta.
if _reescritos(RAIZ):
    print("NAO MEDI: as datas de ficheiro desta copia foram reescritas por um")
    print("          checkout, e a frescura das capturas mede-se por elas.")
    print("          Corre isto onde as capturas sao produzidas.")
    sys.exit(2)

produto = mais_recente_do_produto()
velhas = [e for e in L if os.stat(os.path.join(RAIZ, e['ficheiro'])).st_mtime < produto]
if velhas:
    print(f"RECUSO: {len(velhas)} captura(s) anteriores a fonte mais recente do produto.")
    for e in velhas[:6]: print('   ', os.path.basename(e['ficheiro']))

    # Antes de mandar recapturar, dizer O QUE ficou mais recente - e se mudou
    # mesmo. Uma recusa que so diz «esta velho» manda gastar um build inteiro,
    # e a 08/09 a causa foi um formatador a gravar dois ficheiros por cima com
    # o mesmo texto.
    _novos = _porque(RAIZ, max(os.stat(os.path.join(RAIZ, e['ficheiro'])).st_mtime for e in L))
    if _novos:
        print()
        print("O que ficou mais recente que a ULTIMA captura:")
        _tocados = 0
        for _rel, _m, _mudou in _novos:
            _q = time.strftime('%H:%M:%S', time.localtime(_m))
            if _mudou is True:   _et = 'MUDOU (tem alteracoes por commitar)'
            elif _mudou is False: _et = 'so o mtime - o conteudo e o do commit'; _tocados += 1
            else:                 _et = 'nao sei se mudou (sem git)'
            print(f"    {_q}  {_rel}  <- {_et}")
        if _tocados == len(_novos):
            print()
            print("NENHUM deles mudou de conteudo: foram gravados por cima iguais.")
            print("Recapturar NAO cura isto - a comparacao e por data de ficheiro,")
            print("e o produto que as capturas mostram continua a ser o mesmo.")
            print("Ver docs/reviews/ACHADO-FRESCURA-TOCA-NO-MTIME.md")
            sys.exit(1)
    print("Recaptura antes de mostrar isto a alguem.")
    sys.exit(1)
print(f"frescura: {len(L)}/{len(L)} capturas posteriores a fonte mais recente do produto")

NOMES = {'M01': ('Landing, desktop', 'A página que o cliente encontra primeiro, a 1440 de largura.'),
 'M02': ('Landing, telemóvel', 'A mesma página a 390 — onde a maior parte das visitas chega.'),
 'M03': ('Backoffice', 'Onde se administra: unidades, catálogo, equipa.'),
 'M04': ('Staff, sala', 'O ecrã de quem toma o pedido de pé e com uma mão.'),
 'M05': ('KDS, cozinha', 'A tela de parede. Capturada a 1920×1080, o tamanho que a página promete.'),
 'M06': ('Carta pública', 'O que quem se senta à mesa lê depois de apontar ao código.')}
EST = {'principal': 'principal', 'erro': 'erro', 'denied': 'sem acesso', 'vazio': 'vazio',
       'offline': 'sem rede', 'principal-secundario': 'ecrã secundário'}
LING = {'es-ES': 'ES', 'pt-BR': 'PT', 'en': 'EN'}

por = collections.OrderedDict()
for e in L: por.setdefault(e['id'], []).append(e)
b64 = lambda p: base64.b64encode(open(os.path.join(RAIZ, p), 'rb').read()).decode()

sec, n = [], 0
for mid in sorted(por):
    nome, desc = NOMES.get(mid, (mid, ''))
    cart = []
    for e in sorted(por[mid], key=lambda x: (x['estado'] != 'principal', x['estado'], x['lingua'])):
        n += 1
        est = EST.get(e['estado'], e['estado'])
        f = [f"<span class='f'><b>{LING.get(e['lingua'], e['lingua'])}</b></span>",
             f"<span class='f'>{html.escape(str(e['viewport']))}</span>",
             f"<span class='f'>HTTP {e.get('codigo', '—')}</span>"]
        if e.get('caracteres') is not None: f.append(f"<span class='f'>{e['caracteres']} car.</span>")
        cart.append(f"""<figure class="cap" id="c{n}">
      <a class="lupa" href="#c{n}" aria-label="Ampliar">&#9974;</a><a class="fecha" href="#topo" aria-label="Reduzir">&times;</a>
      <img src="data:image/png;base64,{b64(e['ficheiro'])}" alt="{html.escape(nome)} — {html.escape(est)} — {e['lingua']}" loading="lazy">
      <figcaption><span class="est">{html.escape(est)}</span><span class="rota">{html.escape(e.get('rota') or '')}</span>
        <span class="facts">{''.join(f)}</span></figcaption></figure>""")
    sec.append(f"""<section id="{mid}"><header class="sh"><span class="num">{mid}</span>
    <h2>{html.escape(nome)}</h2><p>{html.escape(desc)}</p></header>
    <div class="fita">{''.join(cart)}</div></section>""")

# O carimbo: que commit foi capturado e quando. Ver o comentario longo acima.
_h = commit_capturado()
_pngs = glob.glob(os.path.join(D, '*.png'))
_quando = time.strftime('%d/%m/%Y as %Hh%M', time.localtime(max(os.path.getmtime(f) for f in _pngs))) if _pngs else None
if _h and _quando:
    carimbo = (f'Capturas de <strong>{_quando}</strong>, do commit <code>{_h}</code>. '
               'Se o produto avancou desde esse commit, estas imagens ficaram para tras — '
               'a garantia la em cima valia no instante em que esta pagina foi gerada, e nao se defende sozinha depois disso.')
else:
    carimbo = ('<strong>Nao sei de que commit sao estas capturas</strong> — o carimbo nao pôde ser lido. '
               'Trate esta pagina como de idade desconhecida ate alguem o confirmar.')

nav = ''.join(f'<a href="#{m}">{m}</a>' for m in sorted(por))
open(SAIDA, 'w', encoding='utf-8').write(f"""<title>Telas-mestre BossaOS</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@500;600;700&family=Noto+Sans:wght@400;500&display=swap">
<style>
:root{{--base:#F7F4EC;--suave:#E9EFEC;--elev:#FFF;--tinta:#102E35;--sec:#51666A;--borda:#D7DEDA;
--acento:#F5664D;--t:'Rubik',system-ui,sans-serif;--c:'Noto Sans',system-ui,sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--base:#0C2126;--suave:#123037;--elev:#16383F;
--tinta:#EDF3F1;--sec:#9FB4B6;--borda:#24474F}}}}
:root[data-theme="dark"]{{--base:#0C2126;--suave:#123037;--elev:#16383F;--tinta:#EDF3F1;--sec:#9FB4B6;--borda:#24474F}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--base);color:var(--tinta);font-family:var(--c);line-height:1.55;-webkit-text-size-adjust:100%}}
.wrap{{max-width:940px;margin:0 auto;padding:0 18px 72px}}
header.top{{padding:34px 0 20px;border-bottom:1px solid var(--borda)}}
.eyebrow{{font-family:var(--t);font-weight:600;font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--acento);margin:0 0 10px}}
h1{{font-family:var(--t);font-weight:700;font-size:clamp(27px,6.5vw,40px);line-height:1.12;margin:0 0 12px;text-wrap:balance}}
.lede{{margin:0 0 10px;color:var(--sec);max-width:60ch}}
nav.idx{{position:sticky;top:0;z-index:5;background:var(--base);border-bottom:1px solid var(--borda);
display:flex;gap:6px;overflow-x:auto;padding:10px 0;margin-bottom:8px;scrollbar-width:none}}
nav.idx::-webkit-scrollbar{{display:none}}
nav.idx a{{flex:0 0 auto;font-family:var(--t);font-weight:600;font-size:13px;text-decoration:none;color:var(--sec);
border:1px solid var(--borda);border-radius:999px;padding:7px 14px;min-height:34px;display:inline-flex;align-items:center}}
nav.idx a:hover,nav.idx a:focus-visible{{color:var(--tinta);border-color:var(--acento)}}
section{{padding:30px 0;border-bottom:1px solid var(--borda)}}
.sh{{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:baseline;margin-bottom:16px}}
.num{{font-family:var(--t);font-weight:700;font-size:13px;color:var(--acento);letter-spacing:.05em;grid-row:1/3}}
.sh h2{{font-family:var(--t);font-weight:600;font-size:20px;margin:0}}
.sh p{{margin:0;color:var(--sec);font-size:14.5px;grid-column:2}}
.fita{{display:flex;gap:14px;overflow-x:auto;padding-bottom:10px;align-items:flex-start}}
.cap{{position:relative;flex:0 0 min(84vw,340px);margin:0;background:var(--elev);border:1px solid var(--borda);border-radius:16px;overflow:hidden}}
.cap img{{display:block;width:100%;height:auto;border-bottom:1px solid var(--borda)}}
.cap .lupa,.cap .fecha{{position:absolute;top:9px;right:9px;z-index:2;text-decoration:none;background:rgba(16,46,53,.86);
color:#fff;border-radius:999px;min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;font-size:16px}}
.cap .fecha{{display:none;background:var(--acento);color:#12100E;font-size:20px}}
.cap:target{{flex-basis:100%;border-color:var(--acento)}}
.cap:target img{{width:auto;max-width:none}}
.cap:target .lupa{{display:none}}
.cap:target .fecha{{display:flex;position:sticky;left:calc(100% - 45px);float:right}}
figcaption{{padding:11px 13px 13px;display:flex;flex-direction:column;gap:5px}}
.est{{font-family:var(--t);font-weight:600;font-size:14px}}
.rota{{font-size:12px;color:var(--sec);word-break:break-all;font-variant-numeric:tabular-nums}}
.facts{{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}}
.f{{font-size:11.5px;color:var(--sec);background:var(--suave);border-radius:999px;padding:3px 9px;font-variant-numeric:tabular-nums}}
.limites{{background:var(--suave);border:1px solid var(--borda);border-radius:16px;padding:20px;margin:28px 0 0}}
.limites h2{{font-family:var(--t);font-weight:600;font-size:17px;margin:0 0 10px}}
.limites ul{{margin:0;padding-left:19px}}.limites li{{margin-bottom:9px}}.limites li:last-child{{margin-bottom:0}}
.selo{{margin-top:26px;border-left:3px solid var(--acento);padding:2px 0 2px 15px}}
.carimbo{{margin:22px 0 0;font-size:13px;color:var(--sec);line-height:1.6;border-top:1px solid var(--borda);padding-top:14px}}
.selo p{{margin:0 0 7px}}.selo p:last-child{{margin:0}}
strong{{font-weight:600}}
@media (max-width:520px){{.cap{{flex-basis:88vw}}}}
</style>
<div class="wrap" id="topo">
<header class="top">
<p class="eyebrow">RV100 · secção 7 · condição de paragem</p>
<h1>Telas-mestre, à espera do teu olho</h1>
<p class="lede">Seis mestres, {n} capturas, três línguas. Todas tiradas do build que se publica, e todas
<strong>posteriores à última alteração ao produto</strong> — esta página recusa-se a gerar se assim não for.</p>
<p class="lede"><strong>Toca na lupa de cada captura para a ver em tamanho real</strong> — abre ali mesmo, e arrastas para a percorrer.
As do backoffice e da landing são de 1440 e 1920 de largura: dentro do cartão não se julgam.</p>
<p class="lede">A <strong>barra lateral do backoffice foi refeita</strong> depois do teu reparo: catorze ícones distintos onde havia um repetido,
grupos, o item aceso a seguir a rota, e o trocador já não mostra o teu email.</p>
</header>
<nav class="idx">{nav}</nav>
{''.join(sec)}
<div class="limites"><h2>O que este ecrã não consegue decidir</h2><ul>
<li><strong>Legibilidade à distância do KDS.</strong> O M05 é uma tela de parede a 1920×1080. No telemóvel vês composição e hierarquia, não se se lê do outro lado da cozinha.</li>
<li><strong>«Clara» não se mede por contagem.</strong> Da sala à comanda são três saltos de ecrã e a cozinha não navega. Se isso é <em>claro</em> é juízo teu.</li>
<li><strong>Os grupos custaram alcance.</strong> Com as três famílias, três dos catorze itens ficam abaixo da dobra a 900 px — estão lá e a lista rola, mas antes viam-se todos. É troca de desenho, e é tua.</li>
</ul></div>
<div class="selo"><p><strong>PRONTO PARA APROVAÇÃO VISUAL HUMANA.</strong></p>
<p>Só tu podes registar a aprovação. Silêncio, ausência de comentário ou aprovação minha não libertam nada —
e se reprovares alguma, ajusto os mestres e volto a apresentar o conjunto afectado inteiro, não só a peça.</p></div>
<p class="carimbo">{carimbo}</p>
</div>""")
print(f"escrito {SAIDA}: {os.path.getsize(SAIDA)/1024/1024:.2f} MB · {n} capturas · {len(por)} mestres")
