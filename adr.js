/* ============ ADR EXPLORER ============
   Architecture Decision Records with category filters. */
(function(){
"use strict";

var ADRS = [
  {n:'ADR-001', cat:'Platform', title:'Managed search over pgvector / dedicated vector DB',
   status:'ACCEPTED',
   context:'The incident-intelligence platform needed hybrid dense + BM25 retrieval with per-document ACL filtering, on a corpus updated continuously from ~12 enterprise systems.',
   decision:'Build on a managed search service (Azure AI Search) with a hybrid dense + keyword index.',
   alternatives:['pgvector on Postgres — simpler ops and one less system, but weaker hybrid ranking and no managed SLA at our scale.','A dedicated vector database — best-in-class ANN search, but keyword + ACL filtering would be bolted on, and it is another stateful system to run.'],
   verdict:'Managed search won on hybrid maturity, ACL filtering at query time, and ops cost. Revisit trigger: corpus growth past ~100M vectors or a cost curve that bends against us.'},
  {n:'ADR-002', cat:'Retrieval', title:'GraphRAG vs flat chunking',
   status:'ACCEPTED',
   context:'The corpus is entity-dense (policies reference claims, claims reference tickets). Multi-hop questions like "which policy change caused this ticket spike?" defeat flat retrieval.',
   decision:'Ship flat chunking with rich metadata first; add a knowledge-graph layer (Neo4j) for the multi-hop slice where eval shows flat fails.',
   alternatives:['Full GraphRAG from day one — best multi-hop answers, but months of entity-extraction and graph-tuning before any user value.','Flat chunking forever — ships fast, but silently fails the relationship questions that matter most.'],
   verdict:'Sequencing beats purity: flat chunking delivered value in weeks, the graph layer targets exactly the queries eval proves flat cannot answer.'},
  {n:'ADR-003', cat:'Governance', title:'Guardrails at the gateway vs the model layer',
   status:'ACCEPTED',
   context:'Multiple models serve behind one platform — flagships for reasoning, small models for drafts and classification. Policy must cover all of them.',
   decision:'Enforce guardrails at the gateway: one policy service for PII redaction, injection defense and content safety, applied to every model.',
   alternatives:['Model-layer guardrails — per-model tuning and system prompts; flexible, but every new model re-opens the policy question.','Client-side filtering — cheapest, and completely unenforceable.'],
   verdict:'Gateway won: change a rule once, it covers every model. Model-layer controls remain only for model-specific behavior, never as the policy boundary.'},
  {n:'ADR-004', cat:'Retrieval', title:'Hybrid retrieval vs vector-only',
   status:'ACCEPTED',
   context:'Incident responders search by concept ("outage like last Tuesday") and by exact identifier ("INC-48213", error codes). Dense vectors handle the first; they fumble the second.',
   decision:'Hybrid dense + BM25 with reciprocal rank fusion, wide recall (top-40), then a cross-encoder rerank to top-8.',
   alternatives:['Vector-only — simpler pipeline, measurably worse on IDs, codes and quoted phrases.','Keyword-only — precise on identifiers, blind to paraphrase and concept match.'],
   verdict:'The funnel is deliberate: cheap wide recall, expensive precision only on finalists. Eval confirmed the hybrid beats either alone on our golden set.'},
  {n:'ADR-005', cat:'Retrieval', title:'RAG vs fine-tuning for enterprise knowledge',
   status:'ACCEPTED',
   context:'The corpus changes daily (policies, claims, legal matters). Answers need citations and must respect per-document access controls.',
   decision:'Default to RAG. Fine-tuning is reserved for stable behavior — tone, format, domain reasoning patterns — never for facts.',
   alternatives:['Fine-tune on the corpus — bakes knowledge into weights, but goes stale on day one, cannot cite, and cannot respect ACLs.','RAG + tuned model — the composition we actually use where behavior tuning earns its keep.'],
   verdict:'Retrieval respects permissions naturally; weights do not. Prototype both against the eval set when in doubt — evidence, not doctrine.'},
  {n:'ADR-006', cat:'Platform', title:'MCP vs point-to-point API integrations',
   status:'ACCEPTED',
   context:'N enterprise systems × M agents. Every point-to-point integration multiplied auth models, contracts and audit gaps.',
   decision:'One MCP tool registry: standardized contracts, OAuth2/OIDC identity per call, least-privilege scopes, full audit trail.',
   alternatives:['Point-to-point REST integrations — fastest for the first system, linear cost for every one after.','A bespoke agent SDK — maximum control, and a framework only we maintain forever.'],
   verdict:'MCP won on reuse: agents learn capabilities once, new systems plug in behind the same contract. The registry is platform work with no demo value — until the third integration takes an afternoon.'},
  {n:'ADR-007', cat:'Agents', title:'Single agent vs orchestrated multi-agent',
   status:'ACCEPTED',
   context:'Triage workflows span systems: research the knowledge base, extract from documents, act on tickets. One agent doing all three blurs its tool boundaries.',
   decision:'Orchestrated multi-agent: planner + router + specialist agents (research read-only, extraction schema-validated, action least-privilege) with an independent critic.',
   alternatives:['Single agent with all tools — simpler to build, but one compromised or confused step has every capability at once.','Hardcoded workflow DAG — deterministic and cheap, brittle the moment a task deviates from the script.'],
   verdict:'Orchestration for multi-system work, single agent for single-system tasks. The critic is a different model configuration — correlated failures are the enemy.'},
  {n:'ADR-008', cat:'Governance', title:'Autonomous actions vs human-in-the-loop',
   status:'ACCEPTED',
   context:'Agents can read tickets, draft summaries — and close tickets, send notifications, escalate. The last three have consequences.',
   decision:'Human-in-the-loop gates on consequential actions. The gate applies to actions, not answers: reads flow, writes above a risk threshold wait for approval.',
   alternatives:['Fully autonomous — fastest, and one bad afternoon away from an incident of its own.','Human approval on everything — safe, and so slow nobody uses the system.'],
   verdict:'Risk tiers keep the gate surgical. Approvers see the plan, the evidence and the diff — never a bare "approve?" button.'}
];

var CATS = ['All','Retrieval','Agents','Governance','Platform'];
var grid = document.getElementById('adrGrid');
var filtersEl = document.getElementById('adrFilters');
if (!grid || !filtersEl) return;

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

function renderFilters(active){
  filtersEl.innerHTML = '';
  CATS.forEach(function(c){
    var b = document.createElement('button');
    b.className = 'adr-filter mono' + (c === active ? ' active' : '');
    b.textContent = c;
    b.setAttribute('aria-pressed', c === active ? 'true' : 'false');
    b.addEventListener('click', function(){ renderFilters(c); renderGrid(c); });
    filtersEl.appendChild(b);
  });
}

function card(a){
  var d = document.createElement('article');
  d.className = 'glass adr-card reveal visible';
  d.innerHTML =
    '<div class="adr-top"><span class="mono adr-num">' + esc(a.n) + '</span>' +
    '<span class="mono adr-cat">' + esc(a.cat) + '</span>' +
    '<span class="mono adr-status">' + esc(a.status) + '</span></div>' +
    '<h3>' + esc(a.title) + '</h3>' +
    '<button class="adr-toggle mono" aria-expanded="false">+ context · alternatives · verdict</button>' +
    '<div class="adr-body"><div class="adr-inner">' +
    '<h4 class="mono">CONTEXT</h4><p>' + esc(a.context) + '</p>' +
    '<h4 class="mono">DECISION</h4><p class="adr-dec">' + esc(a.decision) + '</p>' +
    '<h4 class="mono">ALTERNATIVES CONSIDERED</h4><ul>' +
      a.alternatives.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') +
    '</ul>' +
    '<h4 class="mono">VERDICT</h4><p>' + esc(a.verdict) + '</p>' +
    '</div></div>';
  var t = d.querySelector('.adr-toggle'), body = d.querySelector('.adr-body');
  var label = t.textContent;
  t.addEventListener('click', function(){
    var open = d.classList.toggle('open');
    t.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.style.maxHeight = open ? (body.scrollHeight + 'px') : '0px';
    t.textContent = open ? '\u2212 collapse' : label;
  });
  return d;
}

function renderGrid(cat){
  grid.innerHTML = '';
  ADRS.filter(function(a){ return cat === 'All' || a.cat === cat; })
      .forEach(function(a){ grid.appendChild(card(a)); });
}

renderFilters('All');
renderGrid('All');
})();
