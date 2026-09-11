/* ============ VAISHNAVI PATEL · PORTFOLIO INTERACTIONS ============ */
(function(){
"use strict";

/* ---------- Sticky nav ---------- */
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), {passive:true});

/* ---------- Hamburger ---------- */
const ham = document.getElementById('hamburger'), links = document.getElementById('navLinks');
ham.addEventListener('click', () => {
  ham.classList.toggle('open'); links.classList.toggle('open');
});
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  ham.classList.remove('open'); links.classList.remove('open');
}));

/* ---------- Aurora + particle canvas ---------- */
const cv = document.getElementById('aurora');
if (cv) {
  const ctx = cv.getContext('2d');
  let W, H, blobs = [], parts = [];
  function sizeCanvas(){
    const r = cv.parentElement.getBoundingClientRect();
    W = cv.width = r.width; H = cv.height = r.height;
  }
  function initBlobs(){
    const colors = [[139,92,246],[34,211,238],[52,211,153]];
    blobs = colors.map((c,i) => ({
      x: W*(0.25+0.25*i), y: H*0.38, r: Math.min(W,H)*(0.28+0.06*i),
      c, t: Math.random()*Math.PI*2, sp: 0.0006+Math.random()*0.0006
    }));
  }
  function initParts(){
    parts = Array.from({length: Math.min(110, W/12)}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      vx: (Math.random()-.5)*0.35, vy: (Math.random()-.5)*0.35,
      r: Math.random()*1.8+0.4, tw: Math.random()*Math.PI*2
    }));
  }
  function drawAurora(){
    ctx.clearRect(0,0,W,H);
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#05070d'); g.addColorStop(1,'#0a0f1a');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation = 'lighter';
    blobs.forEach((b,i) => {
      b.t += b.sp*16;
      const x = b.x + Math.cos(b.t + i*2)*90, y = b.y + Math.sin(b.t*0.8 + i)*60;
      const rg = ctx.createRadialGradient(x,y,0,x,y,b.r);
      rg.addColorStop(0, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},0.20)`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x,y,b.r,0,7); ctx.fill();
    });
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.tw += 0.03;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      ctx.fillStyle = `rgba(160,220,255,${0.25+0.35*Math.abs(Math.sin(p.tw))})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(drawAurora);
  }
  function boot(){
    sizeCanvas(); initBlobs(); initParts(); requestAnimationFrame(drawAurora);
  }
  boot();
  addEventListener('resize', () => { sizeCanvas(); initBlobs(); initParts(); });
  document.addEventListener('visibilitychange', () => { if(!document.hidden) boot(); });
}

/* ---------- Reveal on scroll (with no-JS/no-IO fallback: content visible by default in HTML) ---------- */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
  },{threshold:0.12});
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('visible'));
}

/* ---------- Counters: final values are already in the HTML; animate only as enhancement ---------- */
function formatCount(el, v){
  const dec = parseInt(el.dataset.decimals || '0', 10);
  const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
  return pre + v.toFixed(dec) + suf;
}
function animateCount(el){
  const target = parseFloat(el.dataset.count);
  if (isNaN(target)) return;
  const dur = 1500, t0 = performance.now();
  (function tick(t){
    const p = Math.min((t - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = formatCount(el, target * eased);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = formatCount(el, target);
  })(t0);
}
const counters = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window) {
  const cio = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ animateCount(e.target); cio.unobserve(e.target); } });
  },{threshold:0.4});
  counters.forEach(el => cio.observe(el));
}
/* no-IO fallback: HTML already shows final values — nothing to do */

/* ---------- Custom cursor glow (desktop) ---------- */
const glow = document.getElementById('cursorGlow');
if (glow && matchMedia('(hover:hover)').matches) {
  let gx=innerWidth/2, gy=innerHeight/2, tx=gx, ty=gy;
  addEventListener('pointermove', e => { tx=e.clientX; ty=e.clientY; }, {passive:true});
  (function follow(){
    gx += (tx-gx)*0.08; gy += (ty-gy)*0.08;
    glow.style.transform = `translate(${gx-260}px,${gy-260}px)`;
    requestAnimationFrame(follow);
  })();
}

/* ---------- Diagram tooltips + click-to-case-study ---------- */
const tip = document.getElementById('diagramTip');
function showTip(text, x, y){
  if (!tip) return;
  tip.textContent = text;
  tip.classList.add('show');
  const pad = 16, w = tip.offsetWidth, h = tip.offsetHeight;
  let lx = x + pad, ly = y + pad;
  if (lx + w > innerWidth - pad) lx = x - w - pad;
  if (ly + h > innerHeight - pad) ly = y - h - pad;
  tip.style.left = lx + 'px'; tip.style.top = ly + 'px';
}
function hideTip(){ if (tip) tip.classList.remove('show'); }

function openCase(id){
  const card = document.getElementById(id);
  if (!card) return;
  card.scrollIntoView({behavior:'smooth', block:'start'});
  setTimeout(() => {
    if (!card.classList.contains('open')) {
      const head = card.querySelector('.case-head');
      if (head) head.click();
    }
  }, 450);
}

document.querySelectorAll('.dnode').forEach(n => {
  const text = n.getAttribute('data-tip') || '';
  n.addEventListener('pointerenter', e => { if (text) showTip(text, e.clientX, e.clientY); });
  n.addEventListener('pointermove', e => { if (text) showTip(text, e.clientX, e.clientY); });
  n.addEventListener('pointerleave', hideTip);
  n.addEventListener('click', () => {
    const c = n.getAttribute('data-case');
    if (c) openCase(c);
  });
  n.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const c = n.getAttribute('data-case');
      if (c) openCase(c);
    }
  });
});
document.querySelectorAll('.deep-link').forEach(b => {
  b.addEventListener('click', () => openCase(b.getAttribute('data-case')));
});

/* ---------- Touch toggles for hover-reveal cards ---------- */
document.querySelectorAll('.glance-card, .astep').forEach(card => {
  card.addEventListener('click', () => card.classList.toggle('open'));
});

/* ---------- Contact form → mailto ---------- */
const cform = document.getElementById('contactForm');
if (cform) cform.addEventListener('submit', function(e){
  e.preventDefault();
  const name = document.getElementById('cfName').value.trim();
  const email = document.getElementById('cfEmail').value.trim();
  const msg = document.getElementById('cfMsg').value.trim();
  const subject = encodeURIComponent('Portfolio inquiry from ' + name);
  const body = encodeURIComponent(msg + '\n\n— ' + name + ' (' + email + ')');
  location.href = 'mailto:vaishnavikrishnakantt@gmail.com?subject=' + subject + '&body=' + body;
});
})();

/* ---------- Case study / Q&A accordion ---------- */
(function(){
"use strict";
document.querySelectorAll('.case').forEach(function(card){
  var head = card.querySelector('.case-head');
  var body = card.querySelector('.case-body');
  var toggle = card.querySelector('.case-toggle');
  if (!head || !body) return;
  var closedLabel = toggle ? toggle.textContent : '';
  head.addEventListener('click', function(){
    var open = card.classList.toggle('open');
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.style.maxHeight = open ? (body.scrollHeight + 'px') : '0px';
    if (toggle) toggle.textContent = open ? '\u2212 collapse' : closedLabel;
  });
});
})();
