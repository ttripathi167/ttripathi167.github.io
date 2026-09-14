/* ============ ARCHITECTURE LAB ============
   Interactive animated blueprints: packets flow along edges,
   "Play request lifecycle" steps through stages with narration,
   clicking a component opens its design brief. */
(function(){
"use strict";

var NS = 'http://www.w3.org/2000/svg';
var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- DATA ---------------- */
var LABS = [
/* ===== LAB 1: Production RAG ===== */
{
  id: 'rag', tab: 'Production RAG', title: 'Production RAG Pipeline',
  sub: 'Answers grounded in enterprise truth — every claim cited, every trace logged.',
  rows: [['ingest'],['parse'],['chunk'],['embed'],['store'],['qembed'],['retrieve'],['rerank'],['assemble'],['guard'],['reason'],['answer'],['eval']],
  edges: [['ingest','parse'],['parse','chunk'],['chunk','embed'],['embed','store'],
          ['store','qembed'],['qembed','retrieve'],['retrieve','rerank'],
          ['rerank','assemble'],['assemble','guard'],['guard','reason'],
          ['reason','answer'],['answer','eval']],
  nodes: {
    ingest: {label:'Source Ingest', sub:'~12 enterprise systems',
      what:'Connectors pull documents from enterprise systems — tickets, policies, wikis, claims — and normalize them into a single ingestion stream.',
      decisions:['Change-data-capture over nightly dumps: answers stay fresh without paying for full re-indexes.','Source metadata (owner, date, ACL) travels with every document, so retrieval can be authorization-aware later.'],
      tradeoffs:['CDC vs batch: batch is simpler to operate, but stale answers erode trust faster than any model upgrade ever could.'],
      stack:['Python','FastAPI','Docker']},
    parse: {label:'Document Intelligence', sub:'layout-aware parsing',
      what:'PDFs, tickets and wikis are parsed with their structure intact — tables, headings and sections survive into the index.',
      decisions:['Layout-aware parsing: in operations and legal content, meaning lives in structure — naive text splitting destroys it.','OCR fallback for scanned documents so nothing silently drops out of the corpus.'],
      tradeoffs:['Heavier parse cost than plain text splitting — paid gladly, because structure is what makes a passage retrievable.'],
      stack:['Python','Docker']},
    chunk: {label:'Semantic Chunking', sub:'+ metadata',
      what:'Documents are split into meaning-sized chunks, each tagged with source, date and owner for filtering and citations.',
      decisions:['Semantic windows with overlap, tuned against an eval set — not chosen by vibes.','Metadata on every chunk enables ACL filtering and per-claim citations downstream.'],
      tradeoffs:['Bigger chunks carry more context but noisier retrieval; smaller chunks are precise but fragmented. The eval set arbitrates.'],
      stack:['Python','LLM frameworks']},
    embed: {label:'Embeddings', sub:'dense vectors',
      what:'Chunks become dense vectors that capture meaning for semantic search.',
      decisions:['Embedding model versions are pinned and versioned — upgrades trigger a re-embed pipeline, never a silent drift.','GPU batch embedding for backfills; online path stays lean.'],
      tradeoffs:['Larger embedding models recall better but cost more per token — switching requires beating the incumbent on the eval set.'],
      stack:['Python','GPU/data-center infra']},
    store: {label:'Vector Store', sub:'Azure AI Search',
      what:'A hybrid index holding dense vectors alongside a BM25 keyword index, with ACL filters applied at query time.',
      decisions:['Hybrid index (dense + BM25): semantic match for concepts, keyword precision for incident IDs and error codes.','ACL filters at query time — users only ever retrieve what they are allowed to see.'],
      tradeoffs:['Managed search vs self-hosted vector DB: managed won on hybrid maturity, ops cost and SLA. Revisited if the corpus outgrows it.'],
      stack:['Azure AI Search','Azure']},
    qembed: {label:'Query Understanding', sub:'rewrite + embed',
      what:'The user question is rewritten, expanded and classified before it ever touches the index.',
      decisions:['Query expansion for ambiguous operational queries — the model asks itself what the user probably means.','A classifier routes simple lookups past the heavy pipeline entirely.'],
      tradeoffs:['An extra LLM call adds latency — paid only when ambiguity is detected, skipped for crisp queries.'],
      stack:['Claude','Azure OpenAI']},
    retrieve: {label:'Hybrid Retrieval', sub:'dense + BM25',
      what:'Vector search and keyword search run in parallel and their rankings are fused into one recall set.',
      decisions:['Reciprocal rank fusion of dense + BM25 rankings — no hand-tuned weights to rot.','Wide recall (top-40): precision is the reranker\u2019s job, not retrieval\u2019s.'],
      tradeoffs:['Wider recall costs rerank compute — the funnel shape is deliberate, not accidental.'],
      stack:['Azure AI Search','Python']},
    rerank: {label:'Reranking', sub:'cross-encoder',
      what:'A cross-encoder re-scores the 40 candidates so the best 8 passages win, especially on ambiguous queries.',
      decisions:['Rerank only finalists — quality where it matters, cost where it is cheap.','The rerank model is eval-gated like everything else in the pipeline.'],
      tradeoffs:['Adds a few hundred milliseconds for measurably better citation precision — the tradeoff every production RAG system should make explicitly.'],
      stack:['Python','GPU/data-center infra']},
    assemble: {label:'Context Assembly', sub:'citations attached',
      what:'Winning passages are assembled into a prompt with a citation attached to each — and a hard token budget.',
      decisions:['One citation per claim, not per answer — traceability at the finest grain that matters.','Token budgets cap context; overflow triggers summarization, never silent truncation.'],
      tradeoffs:['Strict budgets vs ever-longer context windows: budgets keep latency and cost predictable in production.'],
      stack:['Python','FastAPI']},
    guard: {label:'Guardrails', sub:'input + output',
      what:'Policy filters screen the request on the way in and the draft on the way out — PII, injection, and policy violations.',
      decisions:['PII redaction happens before the model ever sees the text — not after.','Prompt-injection and jailbreak probes run in CI and are enforced at runtime.'],
      tradeoffs:['Gateway-level vs model-layer guardrails: gateway — one policy enforced for every model behind it.'],
      stack:['Python','LLMOps']},
    reason: {label:'Claude Reasoning', sub:'cited context only',
      what:'The model reasons strictly over the cited passages — it may say "I don\u2019t know" but it may not invent.',
      decisions:['System prompt constrains the model to retrieved context; abstention beats hallucination.','Model routing by task: small models for drafts and classification, flagship for reasoning.'],
      tradeoffs:['Routing adds orchestration complexity — it pays for itself in cost per query within weeks.'],
      stack:['Anthropic Claude','Azure OpenAI','Claude Agent SDK']},
    answer: {label:'Grounded Response', sub:'every claim cited',
      what:'The final answer ships with citations a human can click — and a confidence signal when the evidence is thin.',
      decisions:['Every claim traceable to a source chunk, surfaced in the UI next to the claim.','Low-confidence answers say so explicitly instead of sounding certain.'],
      tradeoffs:['Citations add verbosity — they also add the trust that makes people actually use the system.'],
      stack:['FastAPI','Python']},
    eval: {label:'Eval + Telemetry', sub:'regression gates',
      what:'Every trace feeds eval datasets; prompt, model or retrieval changes must pass regression before release.',
      decisions:['Golden Q&A set plus LLM-judged groundedness runs on every change.','Production traces become tomorrow\u2019s eval cases — the loop never closes.'],
      tradeoffs:['Maintaining evals is real, unglamorous work — it is also what makes releases safe enough to ship weekly.'],
      stack:['LLMOps','Python','Databricks/PySpark']}
  },
  stages: [
    {nodes:['ingest'], title:'INGEST', text:'Connectors stream documents from ~12 enterprise systems, carrying owner, date and ACL metadata with every file.'},
    {nodes:['parse'], title:'PARSE', text:'Layout-aware parsing preserves tables and sections — the structure that makes a passage useful later.'},
    {nodes:['chunk'], title:'CHUNK', text:'Semantic chunks are cut and tagged with metadata, ready for filtering and citation.'},
    {nodes:['embed','store'], title:'EMBED + INDEX', text:'Chunks become dense vectors in a hybrid index — dense for meaning, BM25 for exact codes and IDs.'},
    {nodes:['qembed'], title:'QUERY UNDERSTANDING', text:'Your question is rewritten and expanded; simple lookups skip the heavy machinery entirely.'},
    {nodes:['retrieve'], title:'RETRIEVE', text:'Dense and keyword search run in parallel, fused into a 40-candidate recall set.'},
    {nodes:['rerank'], title:'RERANK', text:'A cross-encoder re-scores the finalists — the best 8 passages win.'},
    {nodes:['assemble'], title:'ASSEMBLE', text:'Passages are packed into a budgeted prompt, one citation per claim.'},
    {nodes:['guard'], title:'GUARDRAILS', text:'PII is redacted and policy filters screen the request before the model sees it.'},
    {nodes:['reason'], title:'REASON', text:'Claude reasons strictly over cited passages — abstention allowed, invention forbidden.'},
    {nodes:['answer'], title:'ANSWER', text:'The grounded answer ships with clickable citations and an honest confidence signal.'},
    {nodes:['eval'], title:'EVAL LOOP', text:'The full trace is logged and feeds the eval datasets that gate the next release.'}
  ]
},
/* ===== LAB 2: Multi-Agent Agentic System ===== */
{
  id: 'agents', tab: 'Multi-Agent System', title: 'Multi-Agent Agentic System',
  sub: 'Work that spans steps and systems — planned, executed through tools, verified, and gated where it matters.',
  rows: [['user'],['gateway'],['planner'],['router'],['research','extract','act'],['tools'],['critic'],['hitl'],['execute'],['audit']],
  edges: [['user','gateway'],['gateway','planner'],['planner','router'],
          ['router','research'],['router','extract'],['router','act'],
          ['research','tools'],['extract','tools'],['act','tools'],
          ['tools','critic'],['critic','hitl'],['hitl','execute'],['execute','audit'],
          {f:'critic', t:'planner', cls:'revise', label:'revise'}],
  nodes: {
    user: {label:'User / Trigger', sub:'chat · ITSM · events',
      what:'Work enters in natural language — a chat message, a ticket event, or a scheduled trigger.',
      decisions:['Events and chat share one entry contract, so agents react to state changes the same way they answer questions.','Every request carries identity from the first hop — agents never act anonymously.'],
      tradeoffs:['One entry point vs native integrations everywhere: one front door keeps auth and audit in a single place.'],
      stack:['FastAPI','Python']},
    gateway: {label:'AI Gateway', sub:'OAuth2 · RBAC · rate-limit',
      what:'The front door: authentication, authorization, rate limiting and audit logging for every request.',
      decisions:['OAuth2/OIDC identity on every call — agents act as someone, with scopes, not as a god-mode service account.','Rate limits and budgets enforced here, before any token is spent.'],
      tradeoffs:['A gateway is a hop of latency — it buys a single place to enforce every policy you will ever need.'],
      stack:['FastAPI','Python','OAuth2/OIDC']},
    planner: {label:'Planner', sub:'decomposes the goal',
      what:'Breaks the goal into an explicit task graph before any tool is touched — no tool calls on vibes.',
      decisions:['Explicit plan objects that can be inspected, logged and approved — planning is a reviewable artifact.','Plans are re-generated when the world changes mid-run, not patched blindly.'],
      tradeoffs:['Planning costs an LLM call up front — it saves far more in wasted tool calls and wrong turns.'],
      stack:['Claude Agent SDK','Anthropic Claude']},
    router: {label:'Router', sub:'picks the strategy',
      what:'Chooses which specialist agents to engage and in what order — parallel where possible, sequential where dependencies demand it.',
      decisions:['Strategy selection is explicit and logged — you can see why the router chose three agents instead of one.','Falls back to a single-agent path for simple tasks instead of orchestrating for sport.'],
      tradeoffs:['A router is another component to maintain — it earns its keep the first time it avoids a 12-step plan for a 1-step question.'],
      stack:['Claude Agent SDK','Python']},
    research: {label:'Research Agent', sub:'knowledge + search',
      what:'Gathers evidence from the knowledge base and enterprise sources — read-only, heavily cited.',
      decisions:['Read-only tools only: this agent can look at everything and change nothing.','Every finding carries its source — the critic will check.'],
      tradeoffs:['Constraining tools per agent adds design work — it shrinks the blast radius of every mistake.'],
      stack:['MCP','RAG','Python']},
    extract: {label:'Extraction Agent', sub:'docs → structured',
      what:'Turns documents into structured data the rest of the system can reason over.',
      decisions:['Schema-validated outputs — if the extraction does not parse, it does not proceed.','Confidence scores travel with extracted fields.'],
      tradeoffs:['Strict schemas reject edge cases — that is the point; silent bad data is worse than a loud failure.'],
      stack:['Python','Anthropic Claude']},
    act: {label:'Action Agent', sub:'acts via MCP tools',
      what:'The only agent allowed to change enterprise state — and only through MCP tools, within scoped permissions.',
      decisions:['All actions go through MCP tool contracts — no direct database or API access, ever.','Least-privilege scopes per session: it can close the tickets in this task, not every ticket in the system.'],
      tradeoffs:['Tool contracts are slower to build than direct calls — they are also the reason the system is auditable.'],
      stack:['MCP','Python','FastAPI']},
    tools: {label:'MCP Tool Registry', sub:'standard contracts',
      what:'The catalog of capabilities agents may call — versioned, permissioned, and audited per invocation.',
      decisions:['One registry, one contract shape: agents learn capabilities once and reuse them across systems.','Tool versions are pinned per deployment — a connector upgrade never surprises a running agent.'],
      tradeoffs:['Building the registry is platform work with no demo value — until the third integration takes an afternoon instead of a month.'],
      stack:['MCP','FastAPI','Python']},
    critic: {label:'Critic / Verifier', sub:'scores each step',
      what:'An independent pass scores every plan step and tool result for correctness, groundedness and policy compliance.',
      decisions:['The critic is a different model configuration than the actor — correlated failures are the enemy.','Failed steps loop back to the planner with the critique attached, up to a bounded retry count.'],
      tradeoffs:['A critic roughly doubles token cost per task — it is cheaper than one wrong consequential action.'],
      stack:['Anthropic Claude','LLMOps']},
    hitl: {label:'Human Approval', sub:'high-risk gates',
      what:'Consequential actions pause here for explicit human authorization — the gate applies to actions, not answers.',
      decisions:['Risk tiers decide what pauses: reads flow, writes above a threshold wait.','Approvers see the plan, the evidence and the diff — not a bare "approve?" button.'],
      tradeoffs:['Humans are the slowest component in the loop — so the gate is surgical, not a blanket over everything.'],
      stack:['FastAPI','Python']},
    execute: {label:'Execution', sub:'systems updated',
      what:'Approved actions run against enterprise systems — each one logged with its full trace.',
      decisions:['Idempotent tool design: retries are safe because repeating an action changes nothing twice.','Execution receipts are written before success is reported — no phantom completions.'],
      tradeoffs:['Idempotency is design discipline, not a framework feature — it has to be built into every tool.'],
      stack:['MCP','Python','Docker']},
    audit: {label:'Audit + Telemetry', sub:'traces · eval feed',
      what:'Every action, decision and score is logged — feeding audit trails today and eval datasets tomorrow.',
      decisions:['Full traces, not just outcomes: the "why" is what auditors and debuggers both need.','Trace streams feed regression datasets, so the next release is tested against real behavior.'],
      tradeoffs:['Trace volume is real storage cost — sampled aggressively for routine reads, complete for consequential actions.'],
      stack:['LLMOps','Databricks/PySpark','Snowflake']}
  },
  stages: [
    {nodes:['user'], title:'TRIGGER', text:'A responder asks in natural language — or a ticket event fires. Identity travels with the request.'},
    {nodes:['gateway'], title:'GATEWAY', text:'Auth, scopes and rate limits are enforced before a single token is spent.'},
    {nodes:['planner'], title:'PLAN', text:'The planner decomposes the goal into an explicit, reviewable task graph.'},
    {nodes:['router'], title:'ROUTE', text:'The router picks the strategy: which specialists, in what order, where parallel is safe.'},
    {nodes:['research','extract','act'], title:'SPECIALISTS', text:'Research gathers evidence (read-only), extraction structures documents, the action agent prepares scoped tool calls.'},
    {nodes:['tools'], title:'TOOLS', text:'Every capability runs through versioned MCP tool contracts — no direct system access.'},
    {nodes:['critic'], title:'CRITIC', text:'An independent critic scores each step; failures loop back to the planner with the critique attached.'},
    {nodes:['hitl'], title:'HUMAN GATE', text:'Consequential actions pause for a human who sees the plan, the evidence and the diff.'},
    {nodes:['execute'], title:'EXECUTE', text:'Approved actions run idempotently against enterprise systems.'},
    {nodes:['audit'], title:'AUDIT', text:'The full trace is logged — audit trail today, regression dataset tomorrow.'}
  ]
},
/* ===== LAB 3: GenAI Platform (Azure/AWS) ===== */
{
  id: 'platform', tab: 'GenAI Platform', title: 'Enterprise GenAI Platform',
  sub: 'One platform every AI workload runs on — model access, guardrails, retrieval, eval and cost, as a service.',
  rows: [['clients'],['apigw'],['modelgw'],['guard'],['registry','vectors','evalci'],['observe'],['cost']],
  edges: [['clients','apigw'],['apigw','modelgw'],['modelgw','guard'],
          ['guard','registry'],['guard','vectors'],['guard','evalci'],
          ['registry','observe'],['vectors','observe'],['evalci','observe'],
          ['observe','cost']],
  nodes: {
    clients: {label:'Clients', sub:'apps · copilots · agents',
      what:'Every consumer of AI — copilots, agents, batch jobs — talks to one platform API instead of wiring models directly.',
      decisions:['One SDK and one API shape for all consumers — onboarding a new team takes hours, not sprints.','Client identity and use-case tags travel with every call for chargeback and audit.'],
      tradeoffs:['A platform team becomes a dependency — mitigated with SLAs, status pages and self-serve onboarding.'],
      stack:['Python','FastAPI','REST APIs']},
    apigw: {label:'API Gateway', sub:'auth · throttling · audit',
      what:'Authentication, per-tenant throttling and request logging at the edge of the platform.',
      decisions:['Per-tenant quotas prevent one runaway workload from starving the rest.','Every request logged with tenant, model and token counts — the raw material for FinOps.'],
      tradeoffs:['Gateway features vs simplicity: throttling and quotas are configured per tenant, not hardcoded.'],
      stack:['Azure','AWS','OAuth2/OIDC']},
    modelgw: {label:'Model Gateway', sub:'Azure OpenAI · Bedrock',
      what:'A single routing layer over Azure OpenAI, Bedrock and other providers — with failover and model versioning.',
      decisions:['Provider abstraction with failover: an outage or price change never requires client rewrites.','Model versions pinned per workload; upgrades are deliberate, eval-gated events.'],
      tradeoffs:['Abstraction leaks provider-specific features — exposed via escape hatches, not by breaking the abstraction.'],
      stack:['Azure','AWS','GCP/Vertex AI']},
    guard: {label:'Policy + Guardrails', sub:'one policy, every model',
      what:'Content safety, PII handling and injection defenses enforced once — covering every model behind the gateway.',
      decisions:['Centralized policy service: change a rule once, it applies to every model and workload.','PII redaction before inference; safety classifiers on the way out.'],
      tradeoffs:['Central policy can feel rigid to teams — override paths exist but require security sign-off.'],
      stack:['Python','LLMOps']},
    registry: {label:'Model Registry', sub:'versions · approvals',
      what:'Every model version registered with its eval results, approval state and rollout status.',
      decisions:['No model serves traffic without a registry entry and passing evals — the registry is the source of truth.','Canary rollouts with automatic rollback on SLO breach.'],
      tradeoffs:['Process overhead per model change — the price of never shipping a regression to production users.'],
      stack:['LLMOps','Kubernetes','Docker']},
    vectors: {label:'Retrieval Services', sub:'vector · graph · search',
      what:'Managed retrieval primitives — vector search, knowledge graphs and hybrid search — as platform services.',
      decisions:['Retrieval offered as a service so product teams never run their own vector infrastructure.','Hybrid (dense + keyword) and graph retrieval composed per use case.'],
      tradeoffs:['Shared retrieval means shared tuning — per-tenant indexes where isolation or performance demands it.'],
      stack:['Azure AI Search','Neo4j/GraphRAG','Python']},
    evalci: {label:'Eval CI Gates', sub:'quality · cost · safety',
      what:'Every prompt, model or retrieval change runs quality, safety and cost regression tests in CI before release.',
      decisions:['Latency, token and groundedness budgets enforced as build failures — not discovered in production.','Safety probes (injection, jailbreak) run on every change, not quarterly.'],
      tradeoffs:['CI eval suites take minutes — slow enough to notice, fast enough that nobody bypasses them.'],
      stack:['LLMOps','Python','GitHub Actions']},
    observe: {label:'Observability', sub:'traces · tokens · SLOs',
      what:'Distributed traces, token accounting and quality signals for every request the platform serves.',
      decisions:['Trace-per-request with token and cost attribution — every team sees what its AI actually costs.','Quality signals (thumbs-down, critic scores) stream back into eval datasets.'],
      tradeoffs:['Full tracing is heavy — sampled for routine traffic, complete for high-risk workloads.'],
      stack:['LLMOps','Databricks/PySpark','Snowflake']},
    cost: {label:'FinOps Controls', sub:'budgets · routing',
      what:'Budgets, model routing and caching keep the platform affordable as usage scales.',
      decisions:['Small-model-first routing with escalation on low confidence — most queries never need the flagship model.','Response caching for repeated queries; budgets alert before they bite.'],
      tradeoffs:['Routing adds complexity to debug — every routing decision is logged with its reason.'],
      stack:['Azure','AWS','LLMOps']}
  },
  stages: [
    {nodes:['clients'], title:'CLIENTS', text:'Apps, copilots and agents call one platform API — identity and use-case tags attached.'},
    {nodes:['apigw'], title:'EDGE', text:'The API gateway authenticates, throttles per tenant, and logs every request.'},
    {nodes:['modelgw'], title:'MODEL GATEWAY', text:'Requests route across Azure OpenAI, Bedrock and others — with failover and pinned versions.'},
    {nodes:['guard'], title:'GUARDRAILS', text:'One policy service screens every request and response, whatever model serves it.'},
    {nodes:['registry','vectors','evalci'], title:'PLATFORM SERVICES', text:'Models come from the registry, context from retrieval services, and every change passed CI eval gates to get here.'},
    {nodes:['observe'], title:'OBSERVE', text:'Traces, tokens and quality signals stream in — attributed per tenant, per workload.'},
    {nodes:['cost'], title:'FINOPS', text:'Budgets, routing and caching keep the whole thing affordable at scale.'}
  ]
},
/* ===== LAB 4: GraphRAG / Knowledge Graph ===== */
{
  id: 'graphrag', tab: 'GraphRAG', title: 'GraphRAG · Knowledge Graph',
  sub: 'When answers need relationships, not just passages — entities, communities and traversals over the corpus.',
  rows: [['sources'],['extract'],['graph'],['communities'],['gquery'],['hybrid'],['llm'],['provenance']],
  edges: [['sources','extract'],['extract','graph'],['graph','communities'],
          ['communities','gquery'],['gquery','hybrid'],['hybrid','llm'],['llm','provenance']],
  nodes: {
    sources: {label:'Enterprise Sources', sub:'docs · tickets · wikis',
      what:'The raw corpus — documents, tickets and wikis that hide entity relationships flat chunking cannot see.',
      decisions:['Sources are versioned: the graph rebuilds incrementally as documents change.','Provenance links from every entity back to its source chunk.'],
      tradeoffs:['Incremental updates add pipeline complexity — full rebuilds are simpler but stale between runs.'],
      stack:['Python','Docker']},
    extract: {label:'Entity Extraction', sub:'entities + relations',
      what:'LLM-powered extraction pulls entities and their relationships from every document into a typed schema.',
      decisions:['A constrained entity schema keeps the graph queryable — free-form extraction becomes a swamp.','Extraction runs with confidence scores; low-confidence edges are flagged, not silently kept.'],
      tradeoffs:['Extraction is the most expensive build step — batched and cached, never on the query path.'],
      stack:['Anthropic Claude','Python','LLM frameworks']},
    graph: {label:'Knowledge Graph', sub:'Neo4j',
      what:'Entities and relationships stored as a queryable graph — the corpus as a network, not a pile of chunks.',
      decisions:['Neo4j for traversals the vector index cannot express: "what depends on this?" is a graph question.','Schema governance: new entity types go through review, keeping the graph coherent.'],
      tradeoffs:['A graph is another system to operate — justified only where relationships carry the answer.'],
      stack:['Neo4j/GraphRAG','Python']},
    communities: {label:'Community Detection', sub:'summaries per cluster',
      what:'Dense clusters of entities are detected and summarized — giving the retriever a map of the whole corpus.',
      decisions:['Community summaries answer "what is this area about?" without reading every document.','Hierarchical communities: coarse summaries for breadth, entity detail for depth.'],
      tradeoffs:['Community detection runs offline on graph changes — queries read precomputed summaries, never compute them live.'],
      stack:['Neo4j/GraphRAG','Python']},
    gquery: {label:'Graph Query', sub:'traversal + vector',
      what:'The question becomes a graph traversal: find relevant entities, walk their relationships, gather evidence.',
      decisions:['Two-hop default traversal depth — tuned on eval; deeper walks add noise faster than signal.','Vector similarity seeds the traversal: the graph walk starts from the right neighborhood.'],
      tradeoffs:['Traversal depth is the precision/recall knob of GraphRAG — exposed as a parameter, not a constant.'],
      stack:['Neo4j/GraphRAG','Python']},
    hybrid: {label:'Hybrid Retrieval', sub:'graph + dense',
      what:'Graph evidence and dense-vector passages are fused — relationships plus raw text, ranked together.',
      decisions:['Graph paths for multi-hop reasoning, dense passages for verbatim detail — each where it wins.','Fusion weights learned from the eval set, not hand-tuned.'],
      tradeoffs:['Two retrieval systems means two failure modes — each is monitored and eval-gated independently.'],
      stack:['Neo4j/GraphRAG','Azure AI Search']},
    llm: {label:'LLM Reasoning', sub:'Claude over evidence',
      what:'The model reasons over graph paths and passages together, with the subgraph available for citation.',
      decisions:['Retrieved graph paths are serialized as evidence the model can quote — not hidden in embeddings.','The model is instructed to prefer graph evidence for relationship questions, passages for verbatim ones.'],
      tradeoffs:['Serialized graphs eat context — paths are pruned to the entities that actually support the answer.'],
      stack:['Anthropic Claude','Claude Agent SDK']},
    provenance: {label:'Answer + Provenance', sub:'cited subgraph',
      what:'The answer ships with its supporting subgraph — users can see the chain of relationships behind every claim.',
      decisions:['Provenance is visual, not just textual: the relevant subgraph renders alongside the answer.','Every entity in the answer links back to its source document.'],
      tradeoffs:['Rendering subgraphs costs UI work — it is also what makes GraphRAG answers believable.'],
      stack:['FastAPI','Python']}
  },
  stages: [
    {nodes:['sources'], title:'SOURCES', text:'Documents, tickets and wikis — versioned, with provenance links from day one.'},
    {nodes:['extract'], title:'EXTRACT', text:'Entities and relationships are pulled into a typed schema, with confidence scores.'},
    {nodes:['graph'], title:'GRAPH', text:'The corpus becomes a network in Neo4j — queryable by relationship, not just keyword.'},
    {nodes:['communities'], title:'COMMUNITIES', text:'Dense clusters are detected and summarized — a map of the whole corpus, precomputed offline.'},
    {nodes:['gquery'], title:'TRAVERSE', text:'Your question seeds a graph walk: find the entities, follow two hops of relationships.'},
    {nodes:['hybrid'], title:'FUSE', text:'Graph evidence and dense passages fuse — relationships plus verbatim detail, ranked together.'},
    {nodes:['llm'], title:'REASON', text:'Claude reasons over paths and passages, preferring graph evidence for relationship questions.'},
    {nodes:['provenance'], title:'PROVENANCE', text:'The answer arrives with its supporting subgraph — every claim traceable.'}
  ]
}
];


/* ---------------- ENGINE ---------------- */
var svg = document.getElementById('labSvg');
var tabsEl = document.getElementById('labTabs');
var playBtn = document.getElementById('labPlay');
var resetBtn = document.getElementById('labReset');
var stepEl = document.getElementById('labStep');
var narrEl = document.getElementById('labNarr');
var panel = document.getElementById('labPanel');
var panelClose = document.getElementById('labPanelClose');
if (!svg) return;

var NW = 300, NH = 64, ROW_H = 112, TOP = 46, W = 1000;
var cur = 0, playing = false, stepTimer = null, stepIdx = 0;
var nodeEls = {}, edgePaths = [], packets = [], oneShots = [];
var rafId = null, lastT = 0;

function el(name, attrs, parent) {
  var n = document.createElementNS(NS, name);
  for (var k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

function layout(lab) {
  var pos = {}, rows = lab.rows, H = TOP * 2 + rows.length * ROW_H;
  rows.forEach(function(row, r){
    var n = row.length, total = n * NW + (n - 1) * 60;
    var x0 = (W - total) / 2, y = TOP + r * ROW_H;
    row.forEach(function(id, i){
      pos[id] = { x: x0 + i * (NW + 60), y: y, cx: x0 + i * (NW + 60) + NW / 2 };
    });
  });
  return { pos: pos, H: H };
}

function render() {
  var lab = LABS[cur], L = layout(lab);
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + L.H);
  svg.setAttribute('aria-label', lab.title + ' — interactive architecture diagram');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  nodeEls = {}; edgePaths = []; packets = []; oneShots = [];
  stopLoop();

  var defs = el('defs', {}, svg);
  var g = el('linearGradient', {id:'labGrad', x1:'0', y1:'0', x2:'1', y2:'0'}, defs);
  el('stop', {offset:'0', 'stop-color':'#8b5cf6'}, g);
  el('stop', {offset:'1', 'stop-color':'#22d3ee'}, g);
  var mk = el('marker', {id:'labArrow', viewBox:'0 0 10 10', refX:'9', refY:'5', markerWidth:'7', markerHeight:'7', orient:'auto-start-reverse'}, defs);
  el('path', {d:'M0,0 L10,5 L0,10 z', fill:'#22d3ee'}, mk);

  // edges
  lab.edges.forEach(function(e){
    var f, t, cls = '';
    if (Array.isArray(e)) { f = e[0]; t = e[1]; }
    else { f = e.f; t = e.t; cls = e.cls || ''; }
    var a = L.pos[f], b = L.pos[t];
    if (!a || !b) return;
    var x1 = a.cx, y1 = a.y + NH, x2 = b.cx, y2 = b.y;
    var d = 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + 44) + ' ' + x2 + ',' + (y2 - 44) + ' ' + x2 + ',' + y2;
    var p = el('path', {'class': ('lab-edge' + (cls ? ' ' + cls : '')), d: d, fill: 'none', stroke: 'url(#labGrad)',
      'stroke-width': '1.8', 'marker-end': 'url(#labArrow)'}, svg);
    edgePaths.push({path: p, from: f, to: t, len: p.getTotalLength()});
  });

  // nodes
  Object.keys(lab.nodes).forEach(function(id){
    var n = lab.nodes[id], P = L.pos[id];
    var grp = el('g', {'class': 'lab-node', tabindex: '0', role: 'button',
      'aria-label': n.label + ' — ' + n.sub + '. Activate for design brief.',
      'data-node': id}, svg);
    el('rect', {x: P.x, y: P.y, width: NW, height: NH, rx: '12'}, grp);
    var t1 = el('text', {x: P.cx, y: P.y + 27, 'class': 'lab-t'}, grp);
    t1.textContent = n.label;
    var t2 = el('text', {x: P.cx, y: P.y + 47, 'class': 'lab-sub'}, grp);
    t2.textContent = n.sub;
    nodeEls[id] = grp;
    grp.addEventListener('click', function(){ openPanel(id); });
    grp.addEventListener('keydown', function(ev){
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openPanel(id); }
    });
  });

  // ambient packets
  if (!reduced) {
    edgePaths.forEach(function(ep, i){
      for (var k = 0; k < 2; k++) {
        var c = el('circle', {r: '4.5', 'class': 'lab-packet'}, svg);
        packets.push({c: c, ep: ep, t: (i * 0.37 + k * 0.5) % 1,
          speed: (55 + Math.random() * 45) / ep.len});
      }
    });
    startLoop();
  }
  setNarr('READY', 'Choose a blueprint above and press play — or click any component to inspect it.');
}

/* ---------- animation loop ---------- */
function startLoop(){
  if (rafId || reduced) return;
  lastT = performance.now();
  var tick = function(t){
    var dt = Math.min((t - lastT) / 1000, 0.1); lastT = t;
    packets.forEach(function(pk){
      pk.t = (pk.t + pk.speed * dt) % 1;
      var pt = pk.ep.path.getPointAtLength(pk.t * pk.ep.len);
      pk.c.setAttribute('cx', pt.x); pk.c.setAttribute('cy', pt.y);
    });
    for (var i = oneShots.length - 1; i >= 0; i--) {
      var s = oneShots[i];
      s.t += dt / s.dur;
      if (s.t >= 1) { s.c.parentNode && s.c.parentNode.removeChild(s.c); oneShots.splice(i, 1); continue; }
      var p2 = s.ep.path.getPointAtLength(s.t * s.ep.len);
      s.c.setAttribute('cx', p2.x); s.c.setAttribute('cy', p2.y);
      s.c.setAttribute('r', 5 + 4 * Math.sin(s.t * Math.PI));
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}
function stopLoop(){ if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

/* ---------- narration + play ---------- */
function setNarr(step, text){
  stepEl.textContent = step; narrEl.textContent = text;
}
function clearActive(){
  Object.keys(nodeEls).forEach(function(id){ nodeEls[id].classList.remove('lab-active'); });
}
function stopPlay(){
  playing = false; stepIdx = 0;
  if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
  playBtn.textContent = '\u25B6 Play request lifecycle';
}
function showStep(){
  var lab = LABS[cur], st = lab.stages[stepIdx];
  clearActive();
  st.nodes.forEach(function(id){ if (nodeEls[id]) nodeEls[id].classList.add('lab-active'); });
  setNarr('STEP ' + (stepIdx + 1) + '/' + lab.stages.length + ' · ' + st.title, st.text);
  // hero pulse along edges from previous step's nodes to this step's nodes
  if (!reduced && stepIdx > 0) {
    var prev = lab.stages[stepIdx - 1].nodes;
    edgePaths.forEach(function(ep){
      if (prev.indexOf(ep.from) !== -1 && st.nodes.indexOf(ep.to) !== -1) {
        var c = el('circle', {r: '6', 'class': 'lab-hero'}, svg);
        oneShots.push({c: c, ep: ep, t: 0, dur: 1.4});
      }
    });
  }
  stepIdx++;
  if (stepIdx < lab.stages.length) {
    stepTimer = setTimeout(showStep, 2600);
  } else {
    stepTimer = setTimeout(function(){
      setNarr('LIFECYCLE COMPLETE', lab.title + ': request traveled end to end. Click any component for its design brief, or press play to run it again.');
      stopPlay();
    }, 2600);
  }
}
playBtn.addEventListener('click', function(){
  if (playing) { stopPlay(); clearActive(); setNarr('PAUSED', 'Press play to run the lifecycle again, or reset.'); return; }
  playing = true; stepIdx = 0;
  playBtn.textContent = '\u23F8 Pause';
  showStep();
});
resetBtn.addEventListener('click', function(){
  stopPlay(); clearActive();
  setNarr('READY', 'Choose a blueprint above and press play — or click any component to inspect it.');
});

/* ---------- side panel ---------- */
function openPanel(id){
  var lab = LABS[cur], n = lab.nodes[id];
  if (!n) return;
  document.getElementById('labPanelKicker').textContent = lab.title.toUpperCase() + ' · COMPONENT';
  document.getElementById('labPanelTitle').textContent = n.label;
  document.getElementById('labPanelSub').textContent = n.sub;
  document.getElementById('labPanelWhat').textContent = n.what;
  document.getElementById('labPanelDecisions').innerHTML =
    n.decisions.map(function(d){ return '<li>' + esc(d) + '</li>'; }).join('');
  document.getElementById('labPanelTradeoffs').innerHTML =
    n.tradeoffs.map(function(d){ return '<li>' + esc(d) + '</li>'; }).join('');
  document.getElementById('labPanelStack').innerHTML =
    n.stack.map(function(s){ return '<span class="pill">' + esc(s) + '</span>'; }).join('');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  panelClose.focus();
}
function closePanel(){
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
}
panelClose.addEventListener('click', closePanel);
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePanel(); });

/* ---------- tabs ---------- */
LABS.forEach(function(lab, i){
  var b = document.createElement('button');
  b.className = 'lab-tab mono' + (i === 0 ? ' active' : '');
  b.setAttribute('role', 'tab');
  b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
  b.textContent = lab.tab;
  b.addEventListener('click', function(){
    if (cur === i) return;
    cur = i; stopPlay(); clearActive(); closePanel();
    tabsEl.querySelectorAll('.lab-tab').forEach(function(x, xi){
      x.classList.toggle('active', xi === i);
      x.setAttribute('aria-selected', xi === i ? 'true' : 'false');
    });
    render();
  });
  tabsEl.appendChild(b);
});

render();
})();
