/* ═══════════════════════════════════════════════════════
   📊 CLASS SCORES — Mrs. Wright's copy of the Base Ten site (11/16/2026)
   Marcos: "create a version for my grade partner similar to how my wife had with heat map and everything data wise".
   Mrs. Olivera's Class Scores (sbac-5th-add-subtract-fractions-fiab/app.js), for this site's four parts:
   - Working now: who is in the middle of a part, the question they are on, how many right so far, how long ago
     (the site saves after every answer);
   - Scores: one row per student; each part = 1st try → latest try, how many tries, the best (a test retake is a try);
   - Question heat map: a part · 1st try or latest try; one row per student who finished it, one column per question
     (1–15, the real IAB's order); ✓ right, ✗ missed; the bottom row = % of those students who got it right
     (green ≥ 80 · yellow ≥ 60 · orange ≥ 40 · red below);
   - ⭐ Top 3 / 🔁 Bottom 3: the questions the most / the fewest students got right (a tie goes to the earlier question).
   Read from Mrs. Wright's Corner with her PIN ('scores'); nothing is written. A True/False table miss is saved per wrong
   row ("A12.2"): that question counts as missed. Every version of a part asks the same kind of question at each spot
   (the same ids, new numbers), so a column is one spot whichever version a student had; the tests show their questions
   in a mixed order, and the columns still follow the question numbers.
   Uses script.js: app, SHEET_URL, FORMS, FORM_NAMES, gameKey, isScored, skillOf, formatMathText, SHARE_MODE,
   givenTeacherPin / rememberTeacherPin / TEACHER_PIN_KEY.
═══════════════════════════════════════════════════════ */
(function () {
  const SCORES_WAIT_MS = 25000;
  const NOW_SLACK_MS = 60000;   // a try's last "in progress" save can reach the sheet just after its finish
  const PART_OF = {};
  FORMS.forEach(f => { PART_OF[gameKey(f)] = f; });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);

  let classList = [];
  let heatPart = 'W';
  let heatMode = 'latest';
  let loadToken = 0;

  const atOf = r => Date.parse(r.at || '') || 0;                          // when her sheet got the row
  const finishOf = r => Date.parse(r.finishedAt || '') || atOf(r);        // when the student finished
  const keyOf = name => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const spotsOf = part => (window['FORM_' + part] || []).filter(isScored); // version 1: ids + the example question
  const heatClass = pct => (pct >= 80 ? 'h-hi' : pct >= 60 ? 'h-mid' : pct >= 40 ? 'h-low' : 'h-bad');

  // "[A12.2] (Skill) … (picked: True) | [A03] …" → the questions missed: { A12, A03 }
  function missedOf(wrongQuestions) {
    return new Set(String(wrongQuestions || '').split(' | ')
      .map(e => (/^\[([A-Z]\d+)(?:\.\d+)?\]/.exec(e.trim()) || [])[1])
      .filter(Boolean));
  }

  /* One entry per student (names matched without case or extra spaces); per part: every finished try (oldest first),
     the first, the latest and the best, and "now" = a try still going (unless one was finished after it). */
  function groupStudents(rowsByPart) {
    const students = {};
    FORMS.forEach(part => (rowsByPart[part] || []).forEach(r => {
      const k = keyOf(r.name);
      if (!k) return;
      const st = students[k] || (students[k] = { name: tidyName(r.name), parts: {} });   // shown the way the site writes a name
      const c = st.parts[part] || (st.parts[part] = { bySession: {}, tries: [], now: null });
      if (r.done) {
        if (Number(r.total) > 0) c.bySession[r.sessionId || ('row' + Object.keys(c.bySession).length)] = r;   // a save sent twice counts once
      } else if (!c.now || atOf(r) > atOf(c.now)) c.now = r;
    }));
    Object.keys(students).forEach(k => {
      const st = students[k];
      Object.keys(st.parts).forEach(part => {
        const c = st.parts[part];
        c.tries = Object.keys(c.bySession).map(id => {
          const r = c.bySession[id];
          return Object.assign({}, r, { pct: Math.round(Number(r.score) / Number(r.total) * 100), missed: missedOf(r.wrongQuestions), retake: /Retake/.test(r.form || '') });
        }).sort((a, b) => finishOf(a) - finishOf(b));
        c.first = c.tries[0] || null;
        c.latest = c.tries[c.tries.length - 1] || null;
        c.best = c.tries.reduce((b, t) => (!b || t.pct > b.pct ? t : b), null);
        const lastSaved = c.tries.reduce((m, t) => Math.max(m, atOf(t)), 0);
        if (c.now && c.tries.length && atOf(c.now) <= lastSaved + NOW_SLACK_MS) c.now = null;
        if (!c.tries.length && !c.now) delete st.parts[part];
      });
      if (!Object.keys(st.parts).length) delete students[k];
    });
    return Object.values(students).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  function ago(ms) {
    const mins = Math.round((Date.now() - ms) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    if (mins < 24 * 60) return `${Math.round(mins / 60)} hr ago`;
    return new Date(ms).toLocaleDateString();
  }
  const when = ms => `${new Date(ms).toLocaleDateString()} at ${new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  const pctHTML = t => `<span class="cs-pct ${heatClass(t.pct)}">${t.pct}%</span>`;
  // numbers only: a row's "on" comes from a student's computer (never shown as written)
  const onText = r => {
    const q = Math.floor(Number(r.on && r.on.q)), of = Math.floor(Number(r.on && r.on.of));
    return q > 0 && of > 0 ? `question ${q} of ${of}` : 'just started';
  };

  function cellHTML(c) {
    if (!c) return '<span class="cs-none">—</span>';
    const n = c.tries.length;
    const done = !n ? ''
      : n === 1 ? `<b>${pctHTML(c.first)}</b><span>1 try${c.first.retake ? ' (retake)' : ''}</span>`
      : `<b>${pctHTML(c.first)} → ${pctHTML(c.latest)}</b><span>${n} tries · best ${c.best.pct}%</span>`;
    const now = c.now ? `<span class="cs-now">▶ on ${onText(c.now)}</span>` : '';
    return done + now;
  }

  function classHTML() {
    const working = [];
    let finished = 0, last = 0;
    classList.forEach(st => FORMS.forEach(part => {
      const c = st.parts[part];
      if (!c) return;
      finished += c.tries.length;
      c.tries.forEach(t => { last = Math.max(last, finishOf(t)); });
      if (c.now) working.push({ name: st.name, part, r: c.now });
    }));
    working.sort((a, b) => atOf(b.r) - atOf(a.r));
    const sum = `<p class="cs-sum"><b>${classList.length}</b> ${classList.length === 1 ? 'student' : 'students'} · <b>${finished}</b> finished ${finished === 1 ? 'try' : 'tries'} · <b>${working.length}</b> working now${last ? ` · last finished ${when(last)}` : ''}</p>`;
    const workingHTML = working.length ? `<h3 class="cs-h">Working now <span>saved after every answer · ↻ Refresh to update</span></h3>
      <ul class="cs-working">${working.map(w => `<li><b>${esc(w.name)}</b> · ${FORM_NAMES[w.part]} · on ${onText(w.r)} · ${Number(w.r.score) || 0} right so far <span class="cs-ago">${ago(atOf(w.r))}</span></li>`).join('')}</ul>` : '';
    const table = `<div class="cs-wrap"><table class="cs-table"><thead><tr><th scope="col">Student</th>${FORMS.map(f => `<th scope="col">${FORM_NAMES[f]}</th>`).join('')}</tr></thead>
      <tbody>${classList.map(st => `<tr><th scope="row">${esc(st.name)}</th>${FORMS.map(f => `<td>${cellHTML(st.parts[f])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return `${sum}${workingHTML}
      <h3 class="cs-h">Scores <span>1st try → latest try · ▶ = working on it now</span></h3>
      ${table}
      <h3 class="cs-h">Question heat map</h3>
      <div class="cs-tabs" role="group" aria-label="Which try">
        <button type="button" class="cs-tab" data-mode="first">1st try</button>
        <button type="button" class="cs-tab" data-mode="latest">Latest try</button>
      </div>
      <div class="cs-tabs" role="group" aria-label="Which part">${FORMS.map(f => `<button type="button" class="cs-tab" data-heat="${f}">${FORM_NAMES[f]}</button>`).join('')}</div>
      <div id="cs-heat"></div>`;
  }

  function heatHTML(part) {
    const spots = spotsOf(part);
    const done = classList.filter(st => st.parts[part] && st.parts[part].tries.length).map(st => {
      const t = heatMode === 'first' ? st.parts[part].first : st.parts[part].latest;
      return { name: st.name, t };
    });
    if (!done.length) return `<p class="cs-msg">No one has finished ${FORM_NAMES[part]} yet.</p>`;
    const stats = spots.map((q, i) => {
      const right = done.filter(d => !d.t.missed.has(q.id)).length;
      return { q, i, right, pct: Math.round(right / done.length * 100) };
    });
    const heads = spots.map((q, i) => `<th scope="col" title="${esc(q.id)}">${i + 1}</th>`).join('');
    const body = done.map(d => `<tr><th scope="row">${esc(d.name)}${d.t.retake ? ' <span class="cs-tag">retake</span>' : ''}</th>${spots.map((q, i) => (d.t.missed.has(q.id)
      ? `<td class="h-miss" title="${esc(d.name)} · question ${i + 1}: missed">✗</td>`
      : `<td class="h-ok" title="${esc(d.name)} · question ${i + 1}: right">✓</td>`)).join('')}<td class="h-score">${pctHTML(d.t)}</td></tr>`).join('');
    const foot = `<tr><th scope="row">% right</th>${stats.map(s => `<td class="${heatClass(s.pct)}">${s.pct}</td>`).join('')}<td></td></tr>`;
    // most right first for the top 3, fewest right first for the bottom 3; a tie goes to the earlier question
    const top = stats.slice().sort((a, b) => b.right - a.right || a.i - b.i).slice(0, 3);
    const bottom = stats.slice().sort((a, b) => a.right - b.right || a.i - b.i).slice(0, 3);
    const rankHTML = list => `<ol class="cs-rank">${list.map(s => `<li><div class="cs-rank-head"><b>Question ${s.i + 1}</b>
      <span class="cs-pill ${heatClass(s.pct)}">${s.right} of ${done.length} right · ${s.pct}%</span></div>
      <div class="cs-q"><i>${esc(skillOf(s.q.id) || '')}:</i> ${formatMathText(s.q.q)}</div></li>`).join('')}</ol>`;
    const versions = Array.isArray(window['FORM_' + part + '_V']) && window['FORM_' + part + '_V'].length > 1;
    return `<p class="cs-legend">${FORM_NAMES[part]} · each student's <b>${heatMode === 'first' ? '1st try' : 'latest try'}</b> · <span class="h-ok">✓</span> right · <span class="h-miss">✗</span> missed · bottom row = % of the ${done.length} ${done.length === 1 ? 'student' : 'students'} who got it right</p>
      <div class="cs-wrap"><table class="cs-heat"><thead><tr><th scope="col">Student</th>${heads}<th scope="col">Score</th></tr></thead>
      <tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>
      <div class="cs-rank-grid">
        <div class="cs-rank-box"><h4>⭐ Top 3 questions <span>most students right</span></h4>${rankHTML(top)}</div>
        <div class="cs-rank-box"><h4>🔁 Bottom 3 questions <span>reteach these first</span></h4>${rankHTML(bottom)}</div>
      </div>
      ${versions ? `<p class="cs-note">Each version of the ${FORM_NAMES[part]} asks the same kind of question at each number, with new numbers. The questions shown are from version 1.</p>`
        : `<p class="cs-note">${FORM_NAMES[part]} shows its questions in a mixed order. The columns follow the question numbers.</p>`}`;
  }

  function showHeat(part) {
    heatPart = part;
    document.querySelectorAll('#class-screen [data-heat]').forEach(b => { const on = b.dataset.heat === part; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.querySelectorAll('#class-screen [data-mode]').forEach(b => { const on = b.dataset.mode === heatMode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $('cs-heat').innerHTML = heatHTML(part);
  }

  function load(pin) {
    const body = $('cs-body'), token = ++loadToken;
    $('cs-when').textContent = '';
    body.innerHTML = '<p class="cs-msg">⏳ Loading class scores…</p>';
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctl) ctl.abort(); }, SCORES_WAIT_MS);
    fetch(SHEET_URL, { method: 'POST', body: JSON.stringify({ action: 'scores', pin }), signal: ctl ? ctl.signal : undefined })
      .then(r => r.json())
      .then(d => {
        if (token !== loadToken) return;
        if (!d || d.ok !== true) {
          if (d && (d.error === 'Wrong PIN' || d.error === 'Locked')) { try { sessionStorage.removeItem(TEACHER_PIN_KEY); } catch (e) {} }
          body.innerHTML = `<p class="cs-msg cs-err">${d && d.error === 'Locked' ? '🔒 Too many wrong PINs. Wait 10 minutes, then press ↻ Refresh.'
            : d && d.error === 'Wrong PIN' ? '❌ The score sheet did not take that PIN. Press ↻ Refresh to type it again.'
            : "The score sheet sent back something unexpected. Press ↻ Refresh."}</p>`;
          return;
        }
        const rowsByPart = {};
        Object.keys(d.games || {}).forEach(k => { if (PART_OF[k]) rowsByPart[PART_OF[k]] = d.games[k] || []; });
        classList = groupStudents(rowsByPart);
        $('cs-when').textContent = `From Mrs. Wright's Corner (Google Sheets) at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        if (!classList.length) {
          body.innerHTML = '<p class="cs-msg">No work yet. Scores show up here as soon as students start answering.</p>';
          return;
        }
        body.innerHTML = classHTML();
        const hasFinished = p => classList.some(st => st.parts[p] && st.parts[p].tries.length);
        if (!hasFinished(heatPart)) heatPart = FORMS.find(hasFinished) || heatPart;
        showHeat(heatPart);
      })
      .catch(() => {
        if (token !== loadToken) return;
        body.innerHTML = "<p class=\"cs-msg cs-err\">📶 Couldn't reach Mrs. Wright's Corner. Check the internet, then press ↻ Refresh.</p>";
      })
      .finally(() => clearTimeout(timer));
  }

  /* 📊 Class Scores: her PIN (given at Teacher Access in this tab, or asked now), then the sheet. A guest view (share.js)
     has no Class Scores: names and scores stay with Mrs. Wright. */
  app.openClassScores = function () {
    if (SHARE_MODE) return;
    const pin = givenTeacherPin();
    if (!pin) {
      this.showPinModal('📊 Class Scores', 'Enter the Teacher PIN.', p => { rememberTeacherPin(p); this.openClassScores(); });
      return;
    }
    stopActiveSpeech();
    this.show('class-screen');
    load(pin);
  };

  document.addEventListener('click', e => {
    const screen = $('class-screen');
    if (!screen || !screen.contains(e.target)) return;
    const h = e.target.closest('[data-heat]');
    if (h) { showHeat(h.dataset.heat); return; }
    const m = e.target.closest('[data-mode]');
    if (m) { heatMode = m.dataset.mode; showHeat(heatPart); }
  });

  // the guest view (share.js) has no Class Scores card
  if (SHARE_MODE) { const card = $('t-class'); if (card) card.remove(); }

  window.ClassScores = { groupStudents, missedOf };   // for site-tests
})();
