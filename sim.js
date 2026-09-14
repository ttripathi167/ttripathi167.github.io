/* RAG simulator + agent-loop visualizer for the lab section.
 * Purely illustrative: no retrieval, tools, models, or network calls run here.
 * Everything is synthesized in the browser with timers. */
(function () {
  'use strict';

  var reduced = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms, null); });
  }

  /* ---------------- RAG simulator ---------------- */

  var ragStages = [
    { name: 'Embed query',    min: 120, max: 320,  detail: 'query → dense vector' },
    { name: 'Hybrid retrieve', min: 180, max: 450,  detail: 'dense + BM25 → 40 candidates' },
    { name: 'Rerank',         min: 200, max: 520,  detail: 'cross-encoder → top 8 passages' },
    { name: 'Generate',       min: 900, max: 2200, detail: 'reasoning over cited passages' }
  ];

  var ragQuery  = document.getElementById('ragQuery');
  var ragRun    = document.getElementById('ragRun');
  var ragStagesOl = document.getElementById('ragStages');
  var ragAnswer = document.getElementById('ragAnswer');

  function keywords(query) {
    return query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(function (w) { return w.length > 3; })
      .filter(function (w, i, a) { return a.indexOf(w) === i; })
      .slice(0, 3);
  }

  function padDoc(i) {
    return ('00' + (142 + i * 37)).slice(-4);
  }

  async function runRag() {
    var q = (ragQuery.value || '').trim();
    if (!q) { ragQuery.focus(); return; }
    ragRun.disabled = true;
    ragStagesOl.innerHTML = '';
    ragAnswer.innerHTML = '';

    var scale = reduced ? 0.35 : 1;
    var frag = document.createDocumentFragment();
    var lis = ragStages.map(function (s) {
      var li = el('li', 'sim-stage');
      li.appendChild(el('span', 'sim-spinner', null));
      li.appendChild(el('span', 'sim-name', s.name));
      li.appendChild(el('span', 'sim-detail mono', s.detail));
      frag.appendChild(li);
      return li;
    });
    ragStagesOl.appendChild(frag);

    for (var i = 0; i < ragStages.length; i++) {
      var s = ragStages[i];
      var li = lis[i];
      var t0 = performance.now();
      li.classList.add('is-running');
      var wait = Math.round(rand(s.min, s.max) * scale);
      await sleep(wait);
      var elapsed = Math.round(performance.now() - t0);
      li.classList.remove('is-running');
      li.classList.add('is-done');
      var name = li.querySelector('.sim-name');
      var detail = li.querySelector('.sim-detail');
      name.textContent = '✓ ' + s.name;
      detail.textContent = s.detail + ' · ' + elapsed + ' ms';
    }

    var kws = keywords(q);
    if (kws.length === 0) kws = ['result'];

    var refs = kws.slice(0, 3).map(function (kw, i) {
      return el('li', 'sim-ref mono',
        'doc_' + padDoc(i) + ' · policy-manual.pdf — "…' + kw + '…" [' + (i + 1) + ']');
    });

    var answer = document.createDocumentFragment();
    answer.appendChild(el('p', 'sim-note', 'Illustrative mock output — no model was called.'));
    answer.appendChild(el('p', null,
      'Based on 3 retrieved passages (reranked from 40 candidates), here is what the corpus ' +
      'says about "' + q + '": ' +
      'the cited passages describe the current handling guidance, the responsible owners, ' +
      'and the escalation path for this topic [1][2]. ' +
      'Confidence: high on cited claims.'));
    var ol = el('ol', 'sim-refs');
    refs.forEach(function (r) { ol.appendChild(r); });
    answer.appendChild(ol);
    ragAnswer.appendChild(answer);

    ragRun.disabled = false;
    ragRun.focus();
  }

  if (ragRun && ragStagesOl && ragAnswer) {
    ragRun.addEventListener('click', runRag);
    ragQuery.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runRag();
    });
  }

  /* ---------------- Agent-loop visualizer ---------------- */

  var agentRun     = document.getElementById('agentRun');
  var agentStatus  = document.getElementById('agentStatus');
  var agentStages  = document.getElementById('agentStages');
  var agentVerdict = document.getElementById('agentVerdict');

  var SCALE = 2.5; // scale ~ms values down so a full run lands in ~4–6 s
  var TOOLS = [
    { name: 'search_kb',     ms: 640 },
    { name: 'get_ticket',    ms: 410 },
    { name: 'draft_summary', ms: 900 }
  ];
  var MAX_ITERS = 4;
  var THRESHOLD = 0.85;

  function setStatus(text) {
    if (agentStatus) agentStatus.textContent = text;
  }

  function liHeader(text) {
    return el('li', 'sim-header mono', text);
  }

  function liPlan(step, text) {
    return el('li', 'sim-plan', 'plan step ' + step + ': ' + text);
  }

  function liTool(toolName, ms) {
    return el('li', 'sim-tool mono', toolName + ' · ' + ms + ' ms');
  }

  function liCritic(score) {
    return el('li', 'sim-critic mono', 'critic → ' + score.toFixed(2));
  }

  async function runAgent() {
    if (!agentRun) return;
    agentRun.disabled = true;
    agentStages.innerHTML = '';
    agentVerdict.innerHTML = '';
    var scale = reduced ? 0.35 : 1;

    agentStages.appendChild(liHeader('ILLUSTRATIVE SIMULATION — no real tools run here.'));

    setStatus('planning');
    var plans = [
      'triage the incoming request and restate the objective',
      'gather context from the knowledge base and the ticket system',
      'draft a summary and submit it for critic review'
    ];
    for (var p = 0; p < plans.length; p++) {
      agentStages.appendChild(liPlan(p + 1, plans[p]));
      await sleep(Math.round(220 * scale));
    }

    var stepCount = plans.length;
    var toolCount = 0;
    var iter, score = 0;
    var done = false;

    for (iter = 1; iter <= MAX_ITERS && !done; iter++) {
      setStatus('executing · iteration ' + iter);
      for (var t = 0; t < TOOLS.length; t++) {
        var tool = TOOLS[t];
        stepCount++;
        toolCount++;
        var ms = Math.round(tool.ms / SCALE * scale);
        var li = liTool('#' + stepCount + ' ' + tool.name, ms);
        agentStages.appendChild(li);
        await sleep(ms);
      }

      setStatus('critic review · iteration ' + iter);
      stepCount++;
      score = rand(0.68, 0.97);
      agentStages.appendChild(liCritic(score));
      await sleep(Math.round(500 * scale));

      if (score >= THRESHOLD) done = true;
    }

    setStatus('done');
    var verdict;
    if (done) {
      verdict = 'STOP — critic score ' + score.toFixed(2) + ' ≥ ' + THRESHOLD +
        ' after ' + iter + ' iteration' + (iter === 1 ? '' : 's') + ' · ' +
        stepCount + ' steps · ' + toolCount + ' tool calls — plan approved for execution (simulated)';
    } else {
      verdict = 'STOP — max iterations (' + MAX_ITERS + ') reached → escalated to a human reviewer (simulated)';
    }
    agentVerdict.appendChild(el('p', 'sim-verdict', verdict));

    agentRun.disabled = false;
    agentRun.focus();
  }

  if (agentRun && agentStages && agentVerdict) {
    agentRun.addEventListener('click', runAgent);
  }
})();
