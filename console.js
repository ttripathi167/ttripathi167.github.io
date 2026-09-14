/* Architect-console easter egg: a tiny fake terminal.
 * Backtick toggles the overlay (when not typing in a form field); Escape closes.
 * All output is fixed strings — nothing is invented. */
(function () {
  'use strict';

  var overlay = document.getElementById('termOverlay');
  var out     = document.getElementById('termOut');
  var input   = document.getElementById('termIn');
  var closeBtn = document.getElementById('termClose');

  if (!overlay || !out || !input) return;

  var bannerShown = false;

  function line(className, text) {
    var div = document.createElement('div');
    div.className = 'term-line ' + className;
    div.textContent = text;
    out.appendChild(div);
  }

  function printLines(lines, className) {
    lines.forEach(function (l) { line(className || 'term-ok', l); });
  }

  function scrollBottom() {
    out.scrollTop = out.scrollHeight;
  }

  function openTerm() {
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    if (!bannerShown) {
      line('term-ok', 'architect-console v1.0 · portfolio of Vaishnavi Patel — type `help`');
      bannerShown = true;
    }
    input.focus();
    scrollBottom();
  }

  function closeTerm() {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-open');
  }

  function isTypingTarget(e) {
    var t = e.target;
    if (!t || !t.tagName) return false;
    var tag = t.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeTerm();
      return;
    }
    if (e.key !== '`') return;
    if (isTypingTarget(e)) return;
    e.preventDefault();
    var hidden = overlay.getAttribute('aria-hidden') === 'true';
    if (hidden) openTerm();
    else closeTerm();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeTerm);
  }

  var HELP = [
    'arch     — list the 4 lab architectures',
    'metrics  — key outcome metrics',
    'stack    — technical stack',
    'contact  — how to reach Vaishnavi Patel',
    'whoami   — who this console belongs to',
    'lab      — scroll to the lab section',
    'clear    — clear the console',
    'help     — show this list'
  ];

  var ARCH = [
    'Production RAG Pipeline       -> press play in the lab',
    'Multi-Agent Agentic System    -> press play in the lab',
    'Enterprise GenAI Platform     -> press play in the lab',
    'GraphRAG - Knowledge Graph    -> press play in the lab'
  ];

  var METRICS = [
    '+35% knowledge retrieval',
    '−25% incident resolution time',
    '99.9% availability',
    '−30% audit findings'
  ];

  var STACK = [
    'LLM frameworks, Claude Agent SDK, Python/FastAPI, MCP,',
    'Neo4j/GraphRAG, Kubernetes, Docker/Terraform, Azure/AWS/GCP,',
    'Databricks/PySpark, Snowflake, LLMOps'
  ];

  function handle(raw) {
    var cmd = (raw || '').trim().toLowerCase();

    if (cmd === 'help') {
      printLines(HELP);
      return;
    }
    if (cmd === 'arch') {
      printLines(ARCH);
      return;
    }
    if (cmd === 'metrics') {
      printLines(METRICS);
      return;
    }
    if (cmd === 'stack') {
      printLines(STACK);
      return;
    }
    if (cmd === 'contact') {
      printLines([
        'email    vaishnavikrishnakantt@gmail.com',
        'phone    +1 203-215-1561',
        'linkedin linkedin.com/in/vaishnavi-patel-a7785b325'
      ]);
      return;
    }
    if (cmd === 'whoami') {
      printLines(['Vaishnavi Patel — Generative AI Solution Architect / Gen AI Lead']);
      return;
    }
    if (cmd === 'lab') {
      var lab = document.getElementById('lab');
      closeTerm();
      if (lab) lab.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (cmd === 'clear') {
      out.innerHTML = '';
      return;
    }
    if (cmd === '') return;
    line('term-ok', 'unknown command — try `help`');
  }

  input.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var cmd = input.value;
    line('term-echo', cmd);
    handle(cmd);
    input.value = '';
    scrollBottom();
  });
})();
