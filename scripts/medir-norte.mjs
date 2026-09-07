// ── Fita métrica da revisão do North Star ───────────────────────────────────
//
// Mede uma página contra as catorze especificações numéricas do §3.2 e §4 do
// `NORTH_STAR_VISUAL_V2.md`. Uso: `node scripts/medir-norte.mjs <url>`
//
// ISTO NAO E UMA GUARDA. Mede e relata; não recusa nada, não devolve código de
// saída com significado, e não entra no `validar-no-commit`. A guarda que fecha
// o portão da Fase 2 é do JR e mede a página que ele construir. Isto é a fita
// métrica de quem revê — e quem revê não assina o que constrói.
//
// ── Calibrado, e é por isso que se pode acreditar nele ──────────────────────
//
// Apontado a 08/09 00h55 à landing em produção, cujos valores eu já tinha
// medido à mão uma hora antes. Devolveu os mesmos: H1 52, H1 móvel 34, H2 26,
// lead 16, cabeçalho 102, logótipo 145, herói 759, captura 588, 13 secções,
// 7103 px em secretária e 10 689 no telemóvel.
//
// Um instrumento novo aponta-se primeiro a um sujeito de resposta conhecida.
// Hoje enganei-me várias vezes por não o fazer.
// Uso: node medir-norte.mjs <url>
import { chromium } from '@playwright/test';
const URL = process.argv[2];
const ALVO = {
  h1_sec:[68,76], h1_mov:[42,48], h2_sec:[44,56], lead_sec:[19,22], corpo:[16,18],
  cabecalho:[72,80], logo:[145,165], heroi:[760,null], captura:[650,null],
  raio:[14,24], blocos:[null,8], altura_sec:[4500,5500],
};
const b = await chromium.launch();
const out = {};
for (const [w,h,k] of [[1440,900,'sec'],[390,844,'mov']]) {
  const p = await b.newPage({ viewport:{width:w,height:h} });
  await p.goto(URL, { waitUntil:'networkidle' });
  await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,80));}scrollTo(0,0);});
  await p.waitForTimeout(900);
  out[k] = await p.evaluate(() => {
    const px = e => e ? Math.round(parseFloat(getComputedStyle(e).fontSize)) : null;
    const h1 = document.querySelector('h1');
    const h2 = [...document.querySelectorAll('h2')].map(px).filter(Boolean);
    const cab = document.querySelector('header');
    const logo = document.querySelector('header img, header svg');
    const corpos={}; for (const e of document.querySelectorAll('p,li')) { const t=px(e); if(t) corpos[t]=(corpos[t]||0)+1; }
    const raios={}; for (const e of document.querySelectorAll('div,article,section,a,button')) { const r=getComputedStyle(e).borderTopLeftRadius; if(r&&r!=='0px') raios[r]=(raios[r]||0)+1; }
    const capturas=[...document.querySelectorAll('img')].map(i=>Math.round(i.getBoundingClientRect().width)).filter(x=>x>200);
    const fundos=new Set([...document.querySelectorAll('section')].map(s=>getComputedStyle(s).backgroundColor));
    return { h1:px(h1), h2:h2.length?[Math.min(...h2),Math.max(...h2)]:null,
      lead:px(h1?.parentElement?.querySelector('p')),
      corpo:Object.entries(corpos).sort((a,b)=>b[1]-a[1])[0],
      cabecalho:cab?Math.round(cab.getBoundingClientRect().height):null,
      logo:logo?Math.round(logo.getBoundingClientRect().width):null,
      heroi:h1?.closest('section')?Math.round(h1.closest('section').getBoundingClientRect().height):null,
      captura:capturas.length?Math.max(...capturas):0,
      raios:Object.entries(raios).sort((a,b)=>b[1]-a[1]).slice(0,3),
      blocos:document.querySelectorAll('section').length, altura:document.body.scrollHeight,
      fundos:fundos.size };
  });
  await p.close();
}
const j=(v,[lo,hi])=>{ if(v==null) return '?'; if(lo!=null&&v<lo) return `ABAIXO (${lo})`; if(hi!=null&&v>hi) return `ACIMA (${hi})`; return 'cumpre'; };
const L=[
 ['H1 secretaria',out.sec.h1,ALVO.h1_sec],['H1 telemovel',out.mov.h1,ALVO.h1_mov],
 ['H2 secretaria (min)',out.sec.h2?.[0],ALVO.h2_sec],['Lead secretaria',out.sec.lead,ALVO.lead_sec],
 ['Corpo mais usado',out.sec.corpo?[+out.sec.corpo[0]]:[null],ALVO.corpo],
 ['Cabecalho',out.sec.cabecalho,ALVO.cabecalho],['Logo',out.sec.logo,ALVO.logo],
 ['Heroi altura',out.sec.heroi,ALVO.heroi],['Captura maior',out.sec.captura,ALVO.captura],
 ['Blocos (section)',out.sec.blocos,ALVO.blocos],['Altura secretaria',out.sec.altura,ALVO.altura_sec],
];
for (const [n,v0,a] of L) { const v=Array.isArray(v0)?v0[0]:v0; console.log(`  ${n.padEnd(22)} ${String(v).padStart(6)}   alvo ${String(a[0]??'-')}-${a[1]??'-'}   ${j(v,a)}`); }
console.log(`  ${'Fundos distintos'.padEnd(22)} ${String(out.sec.fundos).padStart(6)}   alvo >=3          ${out.sec.fundos>=3?'cumpre':'ABAIXO'}`);
console.log(`  ${'Altura telemovel'.padEnd(22)} ${String(out.mov.altura).padStart(6)}`);
console.log(`  raios: ${out.sec.raios.map(r=>r[0]+'x'+r[1]).join(' ')}`);
await b.close();
