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
   - 🔎 WHAT EACH STUDENT PICKED (Marcos 11/18, from the reading sites): every ✓ / ✗ and every question number is a
     button. A ✗ opens that student's own question (a Warm-Up or Practice version has its own numbers), what they
     picked, the named mistake when the pick is one the site knows (the same "Did not regroup" the student heard), and
     the right answer. A question number opens what everyone picked: who got it right, each wrong answer with how
     many picked it and who (the wrong answer most picked is marked when 2 or more picked it).
   - ✏️ FIX A NAME (Marcos 11/18, from the reading sites): a student who typed their name wrong shows up as another
     student; with her PIN, her sheet moves every row of that name to the right name (her sheet's 'rename').
   - 🔄 updates by itself every 20 seconds while it shows; 📐 a standards heat map (4.NBT.2 …); ⏱ each try's time and how
     many times the student left the page (Marcos 11/18: "as many teacher access options and data as possible").
   Read from Mrs. Wright's Corner with her PIN ('scores'). Only ✏️ Fix a name writes, and only the Student column.
   A True/False table miss is saved per wrong row ("A12.2"): that question counts as missed. Every version of a part
   asks the same kind of question at each spot (the same ids, new numbers), so a column is one spot whichever version a
   student had; the tests show their questions in a mixed order, and the columns still follow the question numbers.
   Uses script.js: app, SHEET_URL, FORMS, FORM_NAMES, gameKey, isScored, skillOf, formatMathText, qType, normEntry,
   missText, tidyName, nameProblem, SHARE_MODE, givenTeacherPin / rememberTeacherPin / TEACHER_PIN_KEY.
═══════════════════════════════════════════════════════ */
(function () {
  const SCORES_WAIT_MS = 25000;
  const AUTO_MS = 20000;        // 🔄 Class Scores asks her sheet again this often while it is showing (like the reading sites)
  const NOW_SLACK_MS = 60000;   // a try's last "in progress" save can reach the sheet just after its finish
  let autoTimer = null;
  const PART_OF = {};
  FORMS.forEach(f => { PART_OF[gameKey(f)] = f; });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);

  let classList = [];
  let heatPart = 'W';
  let heatMode = 'latest';
  let loadToken = 0;
  let heatDone = [];    // the showing heat map's students: { name, t } (t = the try shown, with its misses)
  let heatStats = [];   // the showing heat map's per-question numbers

  const atOf = r => Date.parse(r.at || '') || 0;                          // when her sheet got the row
  const finishOf = r => Date.parse(r.finishedAt || '') || atOf(r);        // when the student finished
  const keyOf = name => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const spotsOf = part => (window['FORM_' + part] || []).filter(isScored); // version 1: ids + the example question
  const versionsOf = part => {
    const v = window['FORM_' + part + '_V'];
    return Array.isArray(v) && v.length ? v : [window['FORM_' + part] || []];
  };
  const heatClass = pct => (pct >= 80 ? 'h-hi' : pct >= 60 ? 'h-mid' : pct >= 40 ? 'h-low' : 'h-bad');

  // "[A12.2] (Skill) … (picked: True) | [A03] …" → the questions missed: { A12, A03 }
  function missedOf(wrongQuestions) {
    return new Set(String(wrongQuestions || '').split(' | ')
      .map(e => (/^\[([A-Z]\d+)(?:\.\d+)?\]/.exec(e.trim()) || [])[1])
      .filter(Boolean));
  }
  /* Each miss in words: "[A12.2] (Skill) row text (picked: False) (right: True)" → { id: 'A12', row: 2, q, picked,
     right }. A miss saved before 11/18 has no "(right: …)"; one with nothing picked has no "(picked: …)". */
  function parseMisses(wrongQuestions) {
    return String(wrongQuestions || '').split(' | ').map(entry => {
      const m = /^\[([A-Z]\d+)(?:\.(\d+))?\]\s*(?:\([^)]*\)\s*)?([\s\S]*)$/.exec(entry.trim());
      if (!m) return null;
      let rest = m[3], picked = '', right = '';
      const r = /\s?\(right: ([\s\S]*)\)$/.exec(rest);
      if (r) { right = r[1]; rest = rest.slice(0, r.index); }
      const p = /\s?\(picked: ([\s\S]*)\)$/.exec(rest);
      if (p) { picked = p[1]; rest = rest.slice(0, p.index); }
      return { id: m[1], row: m[2] ? Number(m[2]) : 0, q: rest.trim(), picked, right };
    }).filter(Boolean);
  }
  /* The question a miss was on: the version whose words match what the student saw (a Warm-Up or Practice version has
     its own numbers). { q, v } (v = 1–4), or null when no version matches (the site's questions changed since). */
  function questionOf(part, e) {
    const vs = versionsOf(part);
    for (let v = 0; v < vs.length; v++) {
      const q = (vs[v] || []).find(x => x.id === e.id);
      if (!q) continue;
      const text = e.row ? (q.rows && q.rows[e.row - 1] ? q.rows[e.row - 1].text : null) : q.q;
      if (text != null && missText(text) === e.q) return { q, v: v + 1 };
    }
    return null;
  }
  // The mistake the site names for this pick (a typed number or a choice it knows), as the student heard it
  function slipTag(found, e) {
    const q = found && found.q;
    if (!q || !q.slips || !e.picked || e.row) return '';
    const key = qType(q) === 'entry' ? normEntry(e.picked) : Object.keys(q.slips).find(k => missText(k) === e.picked);
    const s = key != null ? q.slips[key] : null;
    return s && s.tag ? s.tag : '';
  }
  // The right answer to a miss: saved with it since 11/18, else the matching version's
  function rightOf(found, e) {
    if (e.right) return e.right;
    const q = found && found.q;
    if (!q) return '';
    if (e.row) return q.rows[e.row - 1] ? String(q.rows[e.row - 1].answer) : '';
    if (qType(q) === 'ms') return q.options.filter(o => o.right).map(o => o.text).join(' / ');
    return String(q.answer == null ? '' : q.answer);
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
          return Object.assign({}, r, { pct: Math.round(Number(r.score) / Number(r.total) * 100), missed: missedOf(r.wrongQuestions),
            misses: parseMisses(r.wrongQuestions), retake: /Retake/.test(r.form || '') });
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
  const tryWord = () => (heatMode === 'first' ? '1st try' : 'latest try');
  // ⏱ a try's seconds on the site's own clock (it runs while the student is on that part) → words. Numbers only:
  // a row comes from a student's computer. Her sheet keeps a missing time as 0, and no finished try takes 0 seconds → "—".
  const blank = v => v === '' || v == null;
  const timeText = s => {
    const n = Math.floor(Number(s));
    if (blank(s) || !isFinite(n) || n <= 0) return '—';
    if (n < 60) return 'under 1 min';
    const m = Math.round(n / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr ${m % 60} min`;
  };
  const leftText = v => {
    const n = Math.floor(Number(v));
    return blank(v) || !isFinite(n) || n < 0 ? '—' : String(n);
  };

  /* 📍 RIGHT NOW (Marcos 11/21: "All six", from his dashboard): for a student in the middle of a part — a ✓ / ✗ box per
     question in the IAB's order (her sheet hands over the answers so far; a row from before 11/21 has none, so only its
     misses show ✗), the questions missed so far in the words the student saw, and the share right so far. */
  function liveAnswers(r) {
    const out = {};
    (Array.isArray(r.answers) ? r.answers : []).forEach(a => { if (Array.isArray(a) && a[0]) out[String(a[0])] = Number(a[1]) ? 1 : 0; });
    missedOf(r.wrongQuestions).forEach(id => { out[id] = 0; });   // a miss is a miss (a table's wrong row too)
    return out;
  }
  function liveShare(r) {
    const a = Object.values(liveAnswers(r));
    const right = a.length && Array.isArray(r.answers) && r.answers.length ? a.filter(Boolean).length : Number(r.score) || 0;
    const answered = Array.isArray(r.answers) && r.answers.length ? a.length : right + missedOf(r.wrongQuestions).size;
    return answered ? right / answered : 1;
  }
  function liveStrip(w) {
    const a = liveAnswers(w.r);
    return `<span class="cs-strip" aria-label="Each question so far">${spotsOf(w.part).map((q, i) => {
      const x = a[q.id];
      return `<span class="cs-sq ${x == null ? 'sq-wait' : x ? 'sq-ok' : 'sq-miss'}" title="Question ${i + 1}: ${x == null ? 'not answered yet' : x ? 'right' : 'wrong'}"><i>${i + 1}</i>${x == null ? '' : x ? '✓' : '✗'}</span>`;
    }).join('')}</span>`;
  }
  function liveMissed(w) {
    const spots = spotsOf(w.part).map(q => q.id);
    const byId = {};
    parseMisses(w.r.wrongQuestions).forEach(e => { (byId[e.id] = byId[e.id] || []).push(e.q); });
    const ids = Object.keys(byId).sort((x, y) => spots.indexOf(x) - spots.indexOf(y));
    return ids.length ? `<p class="cs-live-miss">Missed: ${ids.map(id => `<b>${spots.indexOf(id) + 1}.</b> ${esc(byId[id].join(' / '))}`).join(' · ')}</p>` : '';
  }

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
    working.sort((a, b) => liveShare(a.r) - liveShare(b.r) || atOf(b.r) - atOf(a.r));   // 📍 the lowest share right first (11/21)
    const sum = `<p class="cs-sum"><b>${classList.length}</b> ${classList.length === 1 ? 'student' : 'students'} · <b>${finished}</b> finished ${finished === 1 ? 'try' : 'tries'} · <b>${working.length}</b> working now${last ? ` · last finished ${when(last)}` : ''}</p>`;
    const workingHTML = working.length ? `<h3 class="cs-h">Working now <span>saved after every answer · lowest share right first · updates by itself every 20 seconds</span></h3>
      <ul class="cs-working">${working.map(w => `<li><b>${esc(w.name)}</b> · ${FORM_NAMES[w.part]} · on ${onText(w.r)} · ${Number(w.r.score) || 0} right so far <span class="cs-ago">${ago(atOf(w.r))}</span>${liveStrip(w)}${liveMissed(w)}</li>`).join('')}</ul>` : '';
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
    heatDone = done;
    if (!done.length) { heatStats = []; return `<p class="cs-msg">No one has finished ${FORM_NAMES[part]} yet.</p>`; }
    const stats = spots.map((q, i) => {
      const right = done.filter(d => !d.t.missed.has(q.id)).length;
      return { q, i, right, pct: Math.round(right / done.length * 100) };
    });
    heatStats = stats;
    const heads = spots.map((q, i) => `<th scope="col"><button type="button" class="h-qbtn" data-q="${i}" aria-expanded="false" title="What everyone picked on question ${i + 1}">${i + 1}</button></th>`).join('');
    const body = done.map((d, si) => `<tr><th scope="row">${esc(d.name)}${d.t.retake ? ' <span class="cs-tag">retake</span>' : ''}</th>${spots.map((q, i) => {
      const miss = d.t.missed.has(q.id);
      return `<td class="${miss ? 'h-miss' : 'h-ok'}"><button type="button" class="h-cell" data-s="${si}" data-q="${i}" aria-expanded="false" title="${esc(d.name)} · question ${i + 1}: ${miss ? 'missed' : 'right'}">${miss ? '✗' : '✓'}</button></td>`;
    }).join('')}<td class="h-score">${pctHTML(d.t)}</td><td class="h-time">${timeText(d.t.elapsed)}</td><td class="h-left">${leftText(d.t.tabSwitches)}</td></tr>`).join('');
    const foot = `<tr><th scope="row">% right</th>${stats.map(s => `<td class="${heatClass(s.pct)}">${s.pct}</td>`).join('')}<td></td><td></td><td></td></tr>`;
    // most right first for the top 3, fewest right first for the bottom 3; a tie goes to the earlier question
    const top = stats.slice().sort((a, b) => b.right - a.right || a.i - b.i).slice(0, 3);
    const bottom = stats.slice().sort((a, b) => a.right - b.right || a.i - b.i).slice(0, 3);
    const rankHTML = list => `<ol class="cs-rank">${list.map(s => `<li><div class="cs-rank-head"><b>Question ${s.i + 1}</b>
      <span class="cs-pill ${heatClass(s.pct)}">${s.right} of ${done.length} right · ${s.pct}%</span></div>
      <div class="cs-q"><i>${esc(skillOf(s.q.id) || '')}:</i> ${formatMathText(s.q.q)}</div>
      <button type="button" class="cs-rank-picks h-qbtn" data-q="${s.i}" aria-expanded="false">🔎 What students picked</button></li>`).join('')}</ol>`;
    const versions = versionsOf(part).length > 1;
    return `<p class="cs-legend">${FORM_NAMES[part]} · each student's <b>${heatMode === 'first' ? '1st try' : 'latest try'}</b> · <span class="h-ok">✓</span> right · <span class="h-miss">✗</span> missed · bottom row = % of the ${done.length} ${done.length === 1 ? 'student' : 'students'} who got it right</p>
      <p class="cs-hint">🔎 Tap a ✓ or ✗ to see what that student picked. Tap a question number to see what everyone picked.</p>
      <div class="cs-wrap"><table class="cs-heat"><thead><tr><th scope="col">Student</th>${heads}<th scope="col">Score</th><th scope="col">Time</th><th scope="col">Left the page</th></tr></thead>
      <tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>
      <p class="cs-note">⏱ Time = minutes on the site's clock for that try. Left the page = how many times the student switched to another tab or window during it.</p>
      <div id="cs-qbox" class="cs-qbox" hidden></div>
      <div class="cs-rank-grid">
        <div class="cs-rank-box"><h4>⭐ Top 3 questions <span>most students right</span></h4>${rankHTML(top)}</div>
        <div class="cs-rank-box"><h4>🔁 Bottom 3 questions <span>reteach these first</span></h4>${rankHTML(bottom)}</div>
      </div>
      ${standardsHTML(part, done, spots)}
      ${versions ? `<p class="cs-note">Each version of the ${FORM_NAMES[part]} asks the same kind of question at each number, with new numbers. The questions shown are from version 1.</p>`
        : `<p class="cs-note">${FORM_NAMES[part]} shows its questions in a mixed order. The columns follow the question numbers.</p>`}`;
  }

  /* ── 📐 STANDARDS HEAT MAP (Marcos 11/18: "as many teacher access options and data as possible") ── one column per
     standard (4.NBT.2 …, from data/skills.js), each student's right out of that standard's questions on the try shown;
     the bottom row = % right of all those answers. Each standard says what it is (Marcos 11/18: "do the standards say
     what they are or their skill" → "Yes, add them"): a short name in its column, and under the map its official words
     (thecorestandards.org, read 11/18) and the skills of its questions. A skill here is nearly one question (12 skills,
     15 questions), so the skills are listed under their standard, not given their own columns. */
  const STD_INFO = {
    '4.NBT.2': ['Read, write and compare big numbers', 'Read and write multi-digit whole numbers using base-ten numerals, number names, and expanded form. Compare two multi-digit numbers based on meanings of the digits in each place, using >, =, and < symbols to record the results of comparisons.'],
    '4.NBT.3': ['Round to any place', 'Use place value understanding to round multi-digit whole numbers to any place.'],
    '4.NBT.4': ['Add and subtract big numbers', 'Fluently add and subtract multi-digit whole numbers using the standard algorithm.'],
    '4.NBT.5': ['Multiply', 'Multiply a whole number of up to four digits by a one-digit whole number, and multiply two two-digit numbers, using strategies based on place value and the properties of operations.'],
    '4.NBT.6': ['Divide', 'Find whole-number quotients and remainders with up to four-digit dividends and one-digit divisors, using strategies based on place value, the properties of operations, and/or the relationship between multiplication and division.']
  };
  function standardsHTML(part, done, spots) {
    const S = window.SKILL_STANDARDS || {};
    const stdOf = q => S[skillOf(q.id)] || '';
    const cols = [...new Set(spots.map(stdOf).filter(Boolean))].sort().map(std => ({
      std,
      name: (STD_INFO[std] || [])[0] || '',
      words: (STD_INFO[std] || [])[1] || '',
      skills: [...new Set(spots.filter(q => stdOf(q) === std).map(q => skillOf(q.id)))],
      ns: spots.map((q, i) => (stdOf(q) === std ? i + 1 : 0)).filter(Boolean),
      ids: spots.filter(q => stdOf(q) === std).map(q => q.id)
    }));
    if (!cols.length) return '';
    const score = (d, c) => {
      const right = c.ids.filter(id => !d.t.missed.has(id)).length;
      return { right, of: c.ids.length, pct: Math.round(right / c.ids.length * 100) };
    };
    const body = done.map(d => `<tr><th scope="row">${esc(d.name)}</th>${cols.map(c => {
      const s = score(d, c);
      return `<td class="${heatClass(s.pct)}" title="${s.right} of ${s.of} right">${s.right}/${s.of}</td>`;
    }).join('')}</tr>`).join('');
    const foot = cols.map(c => {
      const pct = Math.round(done.reduce((n, d) => n + score(d, c).right, 0) / (done.length * c.ids.length) * 100);
      return `<td class="${heatClass(pct)}">${pct}</td>`;
    }).join('');
    return `<h3 class="cs-h cs-std-h">📐 Standards heat map <span>${FORM_NAMES[part]} · each student's ${tryWord()} · right out of that standard's questions</span></h3>
      <div class="cs-wrap"><table class="cs-stdmap"><thead><tr><th scope="col">Student</th>${cols.map(c => `<th scope="col" title="${esc(c.words)}">${esc(c.std)}<span class="cs-std-name">${esc(c.name)}</span><span class="cs-std-q">Q${c.ns.join(', ')}</span></th>`).join('')}</tr></thead>
      <tbody>${body}</tbody><tfoot><tr><th scope="row">% right</th>${foot}</tr></tfoot></table></div>
      <ul class="cs-std-list">${cols.map(c => `<li><b>${esc(c.std)} · ${esc(c.name)}</b> <span class="cs-std-qs">(questions ${c.ns.join(', ')})</span>
        <span class="cs-std-words">${esc(c.words)}</span>
        <span class="cs-std-skills">Skills: ${c.skills.map(esc).join(' · ')}</span></li>`).join('')}</ul>`;
  }

  /* ── 🔎 WHAT EACH STUDENT PICKED ── */
  // One miss: the student's own question (when it differs from the one shown), the pick, the named mistake, the right answer
  function missHTML(part, e, first) {
    const found = questionOf(part, e);
    const many = versionsOf(part).length > 1;
    const right = rightOf(found, e);
    const tag = slipTag(found, e);
    const where = e.row ? `Row ${e.row}${many && found ? ` (version ${found.v})` : ''}:`
      : many ? `The question ${esc(first)} saw${found ? ` (version ${found.v})` : ''}:` : '';
    return `<div class="cs-miss">
      ${where ? `<p class="cs-miss-q"><span>${where}</span> ${formatMathText(e.q)}</p>` : ''}
      <p class="cs-miss-pick">✗ Picked: <b>${e.picked ? formatMathText(e.picked) : '(nothing saved)'}</b>${tag ? ` <span class="cs-slip">${esc(tag)}</span>` : ''}</p>
      ${right ? `<p class="cs-miss-right">✓ Right answer: <b>${formatMathText(right)}</b></p>` : ''}</div>`;
  }
  // One student's answer to the question in the box
  function studentHTML(part, q, d) {
    const first = String(d.name).split(' ')[0];
    if (!d.t.missed.has(q.id)) return `<div class="cs-student ok"><p><b>${esc(d.name)}</b> ✓ got it right <span>(${tryWord()})</span></p></div>`;
    const mine = d.t.misses.filter(e => e.id === q.id);
    if (!mine.some(e => e.picked)) return `<div class="cs-student no"><p><b>${esc(d.name)}</b> ✗ missed it <span>(${tryWord()})</span> · no answer saved for this question.</p></div>`;
    return `<div class="cs-student no"><p><b>${esc(d.name)}</b> ✗ missed it <span>(${tryWord()})</span></p>${mine.map(e => missHTML(part, e, first)).join('')}</div>`;
  }
  // Everyone: who got it right, each wrong answer (how many, who), who missed it with no answer saved
  function picksHTML(part, q) {
    const many = versionsOf(part).length > 1;
    const right = [], blank = [], groups = {};
    heatDone.forEach(d => {
      if (!d.t.missed.has(q.id)) { right.push(d.name); return; }
      const mine = d.t.misses.filter(e => e.id === q.id && e.picked);
      if (!mine.length) { blank.push(d.name); return; }
      mine.forEach(e => {
        // a version's own numbers make its own answer; a typed number counts as one answer however it was typed (6,378 = 6378)
        const found = questionOf(part, e);
        const pick = found && qType(found.q) === 'entry' && normEntry(e.picked) != null ? normEntry(e.picked) : e.picked;
        const key = `${e.row}|${many || e.row ? e.q : ''}|${pick}`;
        const g = groups[key] || (groups[key] = { e, names: [] });
        if (!g.names.includes(d.name)) g.names.push(d.name);
      });
    });
    const list = Object.values(groups).sort((a, b) => b.names.length - a.names.length || a.e.row - b.e.row);
    const most = list.length ? list[0].names.length : 0;
    const isTop = g => most >= 2 && g.names.length === most;
    const tied = list.filter(isTop).length > 1;
    const n = heatDone.length;
    const row = g => {
      const tag = slipTag(questionOf(part, g.e), g.e);
      return `<li class="pk-row${isTop(g) ? ' pk-top' : ''}"><div class="pk-label">✗ ${g.e.row ? `Row ${g.e.row}: ` : ''}picked <b>${formatMathText(g.e.picked)}</b>${tag ? ` <span class="cs-slip">${esc(tag)}</span>` : ''}${isTop(g) ? ` <em>${tied ? 'tied for most-picked wrong answer' : 'most-picked wrong answer'}</em>` : ''}
          ${many || g.e.row ? `<div class="pk-q">${formatMathText(g.e.q)}</div>` : ''}</div>
        <span class="pk-bar" aria-hidden="true"><i style="width:${Math.round(g.names.length / n * 100)}%"></i></span><b class="pk-n">${g.names.length}</b>
        <div class="pk-names">${g.names.map(esc).join(', ')}</div></li>`;
    };
    return `<div class="cs-picks"><h5>What students picked <span>(${n} ${n === 1 ? 'student' : 'students'}, ${tryWord()})</span></h5>
      <p class="pk-right">✓ Right: <b>${right.length}</b>${right.length ? ` · ${right.map(esc).join(', ')}` : ''}</p>
      ${list.length ? `<ul class="pk-list">${list.map(row).join('')}</ul>` : ''}
      ${blank.length ? `<p class="pk-blank">✗ Missed, no answer saved: ${blank.map(esc).join(', ')}</p>` : ''}</div>`;
  }
  // The box under the heat map: question i (0-based) of the showing part; si = the student whose ✓ / ✗ was tapped
  function qBoxHTML(i, si) {
    const s = heatStats[i], q = s.q;
    const d = si == null ? null : heatDone[si];
    const many = versionsOf(heatPart).length > 1;
    return `<div class="cs-qbox-head"><b>Question ${i + 1}</b><span class="cs-qbox-skill">${esc(skillOf(q.id) || '')}</span>
        <span class="cs-pill ${heatClass(s.pct)}">${s.right} of ${heatDone.length} right · ${s.pct}%</span>
        <button type="button" class="cs-qbox-x" data-qclose aria-label="Close question ${i + 1}">✕</button></div>
      ${d ? studentHTML(heatPart, q, d) : ''}
      <div class="cs-qbox-ask"><p class="cs-qbox-label">${many ? 'Version 1 of this question' : 'The question'}</p>
        <p class="key-ask">${formatMathText(q.q)}</p>${q.pic && window.M2V ? `<div class="key-pic cs-qbox-pic">${M2V.picHTML(q.pic)}</div>` : ''}${app._keyAnswerHTML(q)}</div>
      ${picksHTML(heatPart, q)}`;
  }
  // Open the box for question i (and student si), or close it when that one is already open
  function toggleQ(i, si) {
    const box = $('cs-qbox');
    if (!box || !heatStats[i]) return;
    const who = si == null ? '' : String(si);
    const same = !box.hidden && box.dataset.q === String(i) && (box.dataset.s || '') === who;
    if (same) { closeQ(); return; }
    document.querySelectorAll('#cs-heat .h-qbtn, #cs-heat .h-cell').forEach(b => {
      const on = b.dataset.q === String(i) && (b.classList.contains('h-cell') ? b.dataset.s === who : !who);
      b.classList.toggle('on', on);
      b.setAttribute('aria-expanded', String(on));
    });
    box.innerHTML = qBoxHTML(i, si);
    box.dataset.q = String(i);
    box.dataset.s = who;
    box.hidden = false;
  }
  function closeQ() {
    const box = $('cs-qbox');
    if (!box) return;
    box.hidden = true;
    box.dataset.q = '';
    box.dataset.s = '';
    document.querySelectorAll('#cs-heat .h-qbtn, #cs-heat .h-cell').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-expanded', 'false'); });
  }

  function showHeat(part) {
    heatPart = part;
    document.querySelectorAll('#class-screen [data-heat]').forEach(b => { const on = b.dataset.heat === part; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.querySelectorAll('#class-screen [data-mode]').forEach(b => { const on = b.dataset.mode === heatMode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $('cs-heat').innerHTML = heatHTML(part);
  }

  /* ── ✏️ FIX A NAME ── the class's names in a list; the right first and last name (the sign-in's rules: tidied, letters
     only, both needed); her sheet checks her PIN again and moves every row of that name. The panel sits outside the part
     ↻ Refresh redraws, so what she typed stays. */
  function fillFix() {
    const box = $('cs-fix'), sel = $('cs-fix-from');
    if (!box || !sel) return;
    const keep = sel.value;
    sel.innerHTML = `<option value="">Pick a name</option>${classList.map(st => `<option>${esc(st.name)}</option>`).join('')}`;
    if (classList.some(st => st.name === keep)) sel.value = keep;
    box.hidden = !classList.length;
  }
  function fixName() {
    const go = $('cs-fix-go');
    const msg = text => { $('cs-fix-msg').textContent = text; };
    const from = $('cs-fix-from').value;
    const first = tidyName($('cs-fix-first').value), last = tidyName($('cs-fix-last').value);
    if (!from) { msg('Pick the name to fix.'); return; }
    const why = nameProblem(first, 'first') || nameProblem(last, 'last');
    if (why) { msg(why.replace('your', 'the right')); return; }
    const to = `${first} ${last}`;
    if (keyOf(to) === keyOf(from)) { msg('That is the same name.'); return; }
    if (!window.confirm(`Move all of ${from}'s work to ${to}?`)) return;
    const pin = givenTeacherPin();
    if (!pin) { msg('Press ↻ Refresh and type your PIN again.'); return; }
    msg('Moving…');
    go.disabled = true;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctl) ctl.abort(); }, SCORES_WAIT_MS);
    fetch(SHEET_URL, { method: 'POST', body: JSON.stringify({ action: 'rename', pin, from, to }), signal: ctl ? ctl.signal : undefined })
      .then(r => r.json())
      .then(d => {
        if (!d || d.ok !== true) {
          if (d && (d.error === 'Wrong PIN' || d.error === 'Locked')) { try { sessionStorage.removeItem(TEACHER_PIN_KEY); } catch (e) {} }
          msg(d && d.error === 'Locked' ? '🔒 Too many wrong PINs. Wait 10 minutes, then press ↻ Refresh.'
            : d && d.error === 'Wrong PIN' ? '❌ The score sheet did not take your PIN. Press ↻ Refresh to type it again.'
            : d && d.error === 'Bad name' ? 'The score sheet did not take that name. Use letters only, first and last name.'
            : 'The score sheet sent back something unexpected. Nothing was moved.');
          return;
        }
        msg(`Moved ${d.moved} ${d.moved === 1 ? 'row' : 'rows'} from ${from} to ${to}.`);
        $('cs-fix-first').value = '';
        $('cs-fix-last').value = '';
        load(pin);
      })
      .catch(() => msg("📶 Couldn't reach Mrs. Wright's Corner. Check the internet, then try again."))
      .finally(() => { clearTimeout(timer); go.disabled = false; });
  }

  /* 🔄 SELF-UPDATING (Marcos 11/18, like the reading sites): while Class Scores shows, her sheet is asked again every
     20 seconds; a tab in the background waits; leaving Class Scores stops it. */
  function autoNext(pin) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      const screen = $('class-screen');
      if (!screen || screen.classList.contains('hidden')) return;   // she left Class Scores: it stops
      if (document.hidden) { autoNext(pin); return; }               // the tab is in the background: wait
      load(pin, true);
    }, AUTO_MS);
  }
  // The question box that is open (and whose ✓ / ✗ opened it), so an update can open it again
  function openBox() {
    const box = $('cs-qbox');
    if (!box || box.hidden) return null;
    const s = box.dataset.s;
    return { q: Number(box.dataset.q), name: s === '' ? null : (heatDone[Number(s)] || {}).name };
  }

  // quiet = the 20-second update: no "Loading…", the open box, the part, the try and the scroll place stay
  function load(pin, quiet) {
    clearTimeout(autoTimer);
    const body = $('cs-body'), token = ++loadToken;
    if (!quiet) {
      $('cs-when').textContent = '';
      body.innerHTML = '<p class="cs-msg">⏳ Loading class scores…</p>';
    }
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
        const keep = quiet ? openBox() : null, y = window.scrollY;
        const rowsByPart = {};
        Object.keys(d.games || {}).forEach(k => { if (PART_OF[k]) rowsByPart[PART_OF[k]] = d.games[k] || []; });
        classList = groupStudents(rowsByPart);
        fillFix();
        $('cs-when').textContent = `From Mrs. Wright's Corner (Google Sheets) · updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })} · updates by itself every 20 seconds`;
        autoNext(pin);
        if (!classList.length) {
          body.innerHTML = '<p class="cs-msg">No work yet. Scores show up here as soon as students start answering.</p>';
          return;
        }
        body.innerHTML = classHTML();
        const hasFinished = p => classList.some(st => st.parts[p] && st.parts[p].tries.length);
        if (!hasFinished(heatPart)) heatPart = FORMS.find(hasFinished) || heatPart;
        showHeat(heatPart);
        if (keep && heatStats[keep.q]) {
          const si = keep.name == null ? null : heatDone.findIndex(x => x.name === keep.name);
          if (si == null || si >= 0) toggleQ(keep.q, si);
        }
        if (quiet) window.scrollTo(0, y);
      })
      .catch(() => {
        if (token !== loadToken) return;
        if (quiet) {   // the screen stays as it was; the next update tries again
          $('cs-when').textContent = "📶 Couldn't update just now. Trying again in 20 seconds.";
          autoNext(pin);
          return;
        }
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
    if (m) { heatMode = m.dataset.mode; showHeat(heatPart); return; }
    const cell = e.target.closest('.h-cell');
    if (cell) { toggleQ(Number(cell.dataset.q), Number(cell.dataset.s)); return; }
    const qb = e.target.closest('.h-qbtn');
    if (qb) {
      toggleQ(Number(qb.dataset.q), null);
      if (qb.classList.contains('cs-rank-picks') && !$('cs-qbox').hidden) $('cs-qbox').scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.target.closest('[data-qclose]')) { closeQ(); return; }
    if (e.target.closest('#cs-fix-go')) fixName();
  });

  // the guest view (share.js) has no Class Scores card
  if (SHARE_MODE) { const card = $('t-class'); if (card) card.remove(); }

  window.ClassScores = { groupStudents, missedOf, parseMisses, questionOf };   // for site-tests
})();
