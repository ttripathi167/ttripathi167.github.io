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
const cv = document.getElementById('aurora'), ctx = cv.getContext('2d');
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
function drawAurora(t){
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
  // particles
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

/* ---------- Typing effect ---------- */
const phrases = ["RAG & AI Agents","MCP & Integration Architecture","LLMOps / AgentOps","Responsible AI"];
const typedEl = document.getElementById('typed');
let pi=0, ci=0, del=false;
(function type(){
  const word = phrases[pi];
  typedEl.textContent = word.slice(0, ci);
  let delay = del ? 38 : 75;
  if(!del && ci === word.length){ delay = 1500; del = true; }
  else if(del && ci === 0){ del = false; pi = (pi+1)%phrases.length; delay = 420; }
  else ci += del ? -1 : 1;
  setTimeout(type, delay);
})();

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
},{threshold:0.12});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ---------- Animated counters ---------- */
function animateCount(el){
  const target = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.decimals||'0',10);
  const suf = el.dataset.suffix||'';
  const dur = 1600, t0 = performance.now();
  (function tick(t){
    const p = Math.min((t-t0)/dur, 1);
    const eased = 1-Math.pow(1-p,3);
    el.textContent = (target*eased).toFixed(dec) + suf;
    if(p<1) requestAnimationFrame(tick); else el.textContent = target.toFixed(dec)+suf;
  })(t0);
}
const cio = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting){ animateCount(e.target); cio.unobserve(e.target); } });
},{threshold:0.5});
document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

/* ---------- Custom cursor glow (desktop) ---------- */
const glow = document.getElementById('cursorGlow');
let gx=innerWidth/2, gy=innerHeight/2, tx=gx, ty=gy;
addEventListener('pointermove', e => { tx=e.clientX; ty=e.clientY; }, {passive:true});
(function follow(){
  gx += (tx-gx)*0.08; gy += (ty-gy)*0.08;
  glow.style.transform = `translate(${gx-260}px,${gy-260}px)`;
  requestAnimationFrame(follow);
})();

/* ---------- Skills tabs ---------- */
const skillData = [
  {tab:"Agentic AI & Orchestration", desc:"Planning, routing, tool-calling and memory architectures for production agents.",
   pills:["Agentic AI","Agent Orchestration","Tool Calling","Multi-Agent Systems","Planning & Routing","Agent Memory","Human-in-the-Loop","MCP (Model Context Protocol)"]},
  {tab:"Claude & Context Engineering", desc:"Model selection, prompting and context design for reliable LLM systems.",
   pills:["Anthropic Claude","Azure OpenAI","Prompt Engineering","Context Engineering","Structured Output","Function Calling","Chain-of-Thought Reasoning"]},
  {tab:"RAG & Enterprise Knowledge", desc:"Retrieval pipelines that ground answers in enterprise truth.",
   pills:["RAG Architecture","Hybrid Search (dense + BM25)","Vector DBs","Embeddings","Semantic Chunking","Cross-Encoder Reranking","Azure AI Search","Knowledge Graphs / Ontology"]},
  {tab:"Tools, MCP & Integration", desc:"Connecting agents to the systems where work actually happens.",
   pills:["MCP Servers & Tools","REST APIs","API Development","FastAPI","Python / Flask","Enterprise Integration","Webhooks","SSO / OAuth2 / OIDC"]},
  {tab:"LLMOps / AgentOps / Eval", desc:"Evaluation-driven operations: telemetry, regression testing, continuous improvement.",
   pills:["LLMOps","AgentOps","Eval Datasets","Groundedness Testing","Hallucination-Risk Testing","Trace Telemetry","CI/CD for AI","Latency Regression Tests"]},
  {tab:"Security, Responsible AI & Governance", desc:"Guardrails and compliance baked into the architecture, not bolted on.",
   pills:["Responsible AI","AI Guardrails","RBAC","Data Privacy","Audit Logging","Compliance","Red-Teaming","Model Risk Management"]},
  {tab:"Cloud & Engineering Leadership", desc:"Shipping and leading at enterprise scale.",
   pills:["AWS","Azure","Docker","Terraform","GitHub Actions","Azure DevOps","Microservices","Team Leadership (~6 engineers)"]}
];
const tabsEl = document.getElementById('skillTabs'), panel = document.getElementById('skillsPanel');
skillData.forEach((s,i) => {
  const b = document.createElement('button');
  b.className = 'tab' + (i===0 ? ' active' : '');
  b.textContent = s.tab; b.setAttribute('role','tab');
  b.addEventListener('click', () => {
    tabsEl.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    b.classList.add('active'); renderSkill(s);
  });
  tabsEl.appendChild(b);
});
function renderSkill(s){
  panel.innerHTML = '';
  const h = document.createElement('h3'); h.textContent = s.tab;
  const p = document.createElement('p'); p.textContent = s.desc;
  const wrap = document.createElement('div'); wrap.className = 'pills';
  s.pills.forEach(pl => {
    const sp = document.createElement('span'); sp.className='pill'; sp.textContent = pl;
    wrap.appendChild(sp);
  });
  panel.append(h,p,wrap);
}
renderSkill(skillData[0]);

/* ---------- Copy code button ---------- */
document.getElementById('copyBtn').addEventListener('click', function(){
  const txt = document.getElementById('codeBlock').innerText;
  navigator.clipboard.writeText(txt).then(() => {
    this.textContent = 'copied ✓'; setTimeout(() => this.textContent = 'copy', 1600);
  }).catch(() => { this.textContent = 'select manually'; });
});

/* ---------- Contact form → mailto ---------- */
document.getElementById('contactForm').addEventListener('submit', function(e){
  e.preventDefault();
  const name = document.getElementById('cfName').value.trim();
  const email = document.getElementById('cfEmail').value.trim();
  const msg = document.getElementById('cfMsg').value.trim();
  const subject = encodeURIComponent('Portfolio inquiry from ' + name);
  const body = encodeURIComponent(msg + '\n\n— ' + name + ' (' + email + ')');
  location.href = 'mailto:vaishnavikrishnakantt@gmail.com?subject=' + subject + '&body=' + body;
});
})();
