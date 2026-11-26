/* ═══════════════════════════════════════════════════════
   📊 CLASS SCORES — Mrs. Wright's copy of the Base Ten site (11/16/2026)
   Marcos: "create a version for my grade partner similar to how my wife had with heat map and everything data wise".
   Mrs. Olivera's Class Scores (sbac-5th-add-subtract-fractions-fiab/app.js), for this site's four parts:
   - Working now: who is in the middle of a part, the question they are on, how many right so far, how long ago
     (the site saves after every answer); a box per question (tap one: that student's question, pick and right answer,
     Marcos 11/23) and the misses so far, one question a line;
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
  // the rows' order (asked 11/25: "the scores on the right should be sortable"): 'name' A–Z, or by score. Tap Score:
  // highest first, tap again: lowest first; tap Student: back to A–Z. Kept through the 20-second updates and the part tabs.
  let heatSort = 'name';
  const SORTS = { 'score-down': (a, b) => b.t.pct - a.t.pct, 'score-up': (a, b) => a.t.pct - b.t.pct };
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
  /* Where a student is (Marcos 11/23: "on question 15 of 33" counted the Warm-Up's 18 lesson screens): "on question 7
     of 15" — the questions only, like the boxes — or "in the lesson before question 7 of 15". A row's "on" is the screen
     in the whole part (lessons too: the site saves it to pick up on any computer); a part whose screens are its own
     (the Warm-Up: the same lesson places in every version) is counted through. Numbers only: a row's "on" comes from a
     student's computer (never shown as written). */
  const onText = (r, part) => {
    const q = Math.floor(Number(r.on && r.on.q)), of = Math.floor(Number(r.on && r.on.of));
    if (!(q > 0 && of > 0)) return 'just started';
    const bank = window['FORM_' + part] || [], total = bank.filter(isScored).length;
    if (!keepsOrder(part) || of !== bank.length || of === total || q > of) return `on question ${q} of ${of}`;
    const before = bank.slice(0, q - 1).filter(isScored).length;   // the questions before this screen
    return isScored(bank[q - 1]) ? `on question ${before + 1} of ${total}` : `in the lesson before question ${before + 1} of ${total}`;
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
  function liveAnswers(r, part) {
    const out = {};
    (Array.isArray(r.answers) ? r.answers : []).forEach(a => { if (Array.isArray(a) && a[0]) out[String(a[0])] = Number(a[1]) ? 1 : 0; });
    missedOf(r.wrongQuestions).forEach(id => { out[id] = 0; });   // a miss is a miss (a table's wrong row too)
    return Object.assign({}, inOrderRights(r, part) || {}, out);   // what was saved wins
  }
  /* 🟩 RIGHT ANSWERS WORKED OUT (Marcos 11/23: "shouldnt the box be green for correct and white if they havent answered it
     yet"). A try saved before 11/21 kept only its misses. The Warm-Up and the Practice go in order (script.js keepsOrder)
     and no question can be skipped, so the questions answered are the first (score + questions missed): each of them not
     missed was right. Only when every miss and every saved answer falls inside those (else null: the row shows only what
     was saved). The tests are shuffled: null. { id: 1 } for each right one. */
  function inOrderRights(r, part) {
    if (!keepsOrder(part)) return null;
    const ids = spotsOf(part).map(q => q.id);
    const n = liveScore(r).answered;
    if (n > ids.length) return null;
    const first = new Set(ids.slice(0, n));
    const saved = (Array.isArray(r.answers) ? r.answers : []).map(a => String(a && a[0]));
    if ([...missedOf(r.wrongQuestions), ...saved].some(id => !first.has(id))) return null;
    const missed = missedOf(r.wrongQuestions), out = {};
    ids.slice(0, n).forEach(id => { if (!missed.has(id)) out[id] = 1; });
    return out;
  }
  // Is an empty box surely "not answered yet"? Yes when the answers were saved, or worked out in order
  const liveKnown = w => savedAnswers(w.r) || inOrderRights(w.r, w.part) !== null;
  /* 📊 SCORE SO FAR (Marcos 11/23: "there's no score so far like a percentage"): right ÷ the questions answered so far,
     not ÷ all 15 (his dashboard's rule, 11/18). The site adds 1 to the score for each question right and saves each
     question missed, so answered = score + questions missed — the same for a try begun before 11/21 (no answers saved),
     after, or both (picked up again after 11/21). The list's order uses the same share. */
  function liveScore(r) {
    const right = Math.max(0, Math.floor(Number(r.score)) || 0);
    return { right, answered: right + missedOf(r.wrongQuestions).size };
  }
  function liveShare(r) {
    const s = liveScore(r);
    return s.answered ? s.right / s.answered : 1;
  }
  function soFarHTML(r) {
    const s = liveScore(r);
    if (!s.answered) return 'no answers yet';
    const pct = Math.round(s.right / s.answered * 100);
    return `${s.right} of ${s.answered} right so far <span class="cs-pct ${heatClass(pct)}" title="Right out of the questions answered so far">${pct}%</span>`;
  }
  /* 🔎 TAP A BOX (Marcos 11/23: "im suppose to be able to click on them", on Mrs. Wright's Working now): every box is a
     button. It opens a box right under that student's row, like the heat map's ✓ / ✗ do for a finished try: a ✗ = the
     question the student saw, what they picked, the named mistake, the right answer; a ✓ = got it right; an empty box =
     not answered yet (a TEST try begun before 11/21 saved only its misses, so there a right answer may be empty too). */
  const liveKey = w => `${keyOf(w.name)}|${w.part}`;
  let workingList = [];   // the Working now list on the screen: { name, part, r }
  let liveOpen = null;    // the open box: { key, q } (q = 0-based question)
  const savedAnswers = r => Array.isArray(r.answers) && r.answers.length > 0;
  function liveStrip(w) {
    const a = liveAnswers(w.r, w.part), k = esc(liveKey(w));
    return `<span class="cs-strip" role="group" aria-label="${esc(w.name)}: each question so far. Tap one to see it.">${spotsOf(w.part).map((q, i) => {
      const x = a[q.id];
      return `<button type="button" class="cs-sq ${x == null ? 'sq-wait' : x ? 'sq-ok' : 'sq-miss'}" data-live="${k}" data-q="${i}" aria-expanded="false" title="${esc(w.name)} · question ${i + 1}: ${x == null ? 'not answered yet' : x ? 'right' : 'wrong'}"><i>${i + 1}</i>${x == null ? '' : x ? '✓' : '✗'}</button>`;
    }).join('')}</span><div class="cs-qbox cs-livebox" data-live-box="${k}" hidden></div>`;
  }
  // The box for question i (0-based) of one student working now
  function liveBoxHTML(w, i) {
    const q = spotsOf(w.part)[i];
    const x = liveAnswers(w.r, w.part)[q.id];
    const first = String(w.name).split(' ')[0];
    const many = versionsOf(w.part).length > 1;
    const mine = parseMisses(w.r.wrongQuestions).filter(e => e.id === q.id);
    const who = x === 0
      ? (mine.some(e => e.picked)
        ? `<div class="cs-student no"><p><b>${esc(w.name)}</b> ✗ missed it <span>(working now)</span></p>${mine.map(e => missHTML(w.part, e, first)).join('')}</div>`
        : `<div class="cs-student no"><p><b>${esc(w.name)}</b> ✗ missed it <span>(working now)</span> · no answer saved for this question.</p></div>`)
      : x === 1
        ? `<div class="cs-student ok"><p><b>${esc(w.name)}</b> ✓ got it right <span>(working now)</span></p></div>`
        : liveKnown(w)
          ? `<div class="cs-student wait"><p><b>${esc(w.name)}</b> has not answered it yet.</p></div>`
          : `<div class="cs-student wait"><p><b>${esc(w.name)}</b>: no ✗ saved for this question.</p><p class="cs-old-try">This try began before the site saved right answers, so it may be right or not answered yet.</p></div>`;
    return `<div class="cs-qbox-head"><b>Question ${i + 1}</b><span class="cs-qbox-skill">${esc(skillOf(q.id) || '')}</span>
        <button type="button" class="cs-qbox-x" data-live-close aria-label="Close question ${i + 1}">✕</button></div>
      ${who}
      <div class="cs-qbox-ask"><p class="cs-qbox-label">${many ? 'Version 1 of this question' : 'The question'}</p>
        <p class="key-ask">${formatMathText(q.q)}</p>${q.pic && window.M2V ? `<div class="key-pic cs-qbox-pic">${M2V.picHTML(q.pic)}</div>` : ''}${app._keyAnswerHTML(q)}</div>`;
  }
  // Open the box for one student's question i, or close it when that one is already open
  function toggleLive(key, i) {
    liveOpen = liveOpen && liveOpen.key === key && liveOpen.q === i ? null : { key, q: i };
    drawLive();
  }
  // Show the open box (if its student is still working now) under that student; mark its button
  function drawLive() {
    const w = liveOpen ? workingList.find(x => liveKey(x) === liveOpen.key) : null;
    if (!w || !spotsOf(w.part)[liveOpen.q]) liveOpen = null;
    document.querySelectorAll('#class-screen .cs-livebox').forEach(box => {
      const on = !!liveOpen && box.dataset.liveBox === liveOpen.key;
      box.innerHTML = on ? liveBoxHTML(w, liveOpen.q) : '';
      box.hidden = !on;
    });
    document.querySelectorAll('#class-screen .cs-sq[data-live]').forEach(b => {
      const on = !!liveOpen && b.dataset.live === liveOpen.key && b.dataset.q === String(liveOpen.q);
      b.classList.toggle('on', on);
      b.setAttribute('aria-expanded', String(on));
    });
  }
  /* The misses so far, easy to read (Marcos 11/23): one question a line, in the IAB's order; a True/False table's wrong
     rows each on their own line ("Row 2: …"); what the student picked and the right answer after each. */
  function liveMissed(w) {
    const spots = spotsOf(w.part).map(q => q.id);
    const byId = {};
    parseMisses(w.r.wrongQuestions).forEach(e => { (byId[e.id] = byId[e.id] || []).push(e); });
    const ids = Object.keys(byId).sort((x, y) => spots.indexOf(x) - spots.indexOf(y));
    if (!ids.length) return '';
    const says = e => {
      const right = rightOf(questionOf(w.part, e), e);
      return `${e.row ? `<span class="lm-row">Row ${e.row}:</span> ` : ''}<span class="lm-q">${formatMathText(e.q)}</span>`
        + `${e.picked ? ` <span class="lm-pick">✗ picked <b>${formatMathText(e.picked)}</b></span>` : ''}`
        + `${right ? ` <span class="lm-right">✓ right answer <b>${formatMathText(right)}</b></span>` : ''}`;
    };
    return `<div class="cs-live-miss"><p class="lm-h">Missed so far:</p><ol class="lm-list">${ids.map(id => `<li><b class="lm-n">${spots.indexOf(id) + 1}.</b><span class="lm-lines">${byId[id].map(e => `<span class="lm-line">${says(e)}</span>`).join('')}</span></li>`).join('')}</ol></div>`;
  }

  function cellHTML(c, part) {
    if (!c) return '<span class="cs-none">—</span>';
    const n = c.tries.length;
    const done = !n ? ''
      : n === 1 ? `<b>${pctHTML(c.first)}</b><span>1 try${c.first.retake ? ' (retake)' : ''}</span>`
      : `<b>${pctHTML(c.first)} → ${pctHTML(c.latest)}</b><span>${n} tries · best ${c.best.pct}%</span>`;
    const now = c.now ? `<span class="cs-now">▶ ${onText(c.now, part)}</span>` : '';
    return done + now;
  }

  /* 🔎 A STUDENT'S SCORE (Marcos 11/25: "in the spirit of everything being clickable… their individual scores"): a score
     is a button; it opens a box right under that student's row: each try of that part, 1st try first (its %, right out
     of how many, when, how long) with a ✓ / ✗ box per question (tap one: what the student picked, the named mistake,
     the right answer, the question), and a try being worked on now with its boxes so far. One box at a time; tap the
     score again (or ✕) to close it. The 20-second update keeps it open (found by the student's name and the part). */
  let scOpen = null;   // { key: keyOf(name), part, take: a try's index or null, q: a question or null }
  function scCellHTML(st, part, inner) {
    if (!st.parts[part]) return `<td>${inner}</td>`;
    return `<td><button type="button" class="cs-cell" data-sc="${esc(keyOf(st.name))}" data-scset="${part}" aria-expanded="false" title="${esc(st.name)} · ${esc(FORM_NAMES[part])}: tap to see each try">${inner}</button></td>`;
  }
  const scTries = c => c.tries.concat(c.now ? [c.now] : []);   // groupStudents keeps the tries in finish order
  // ✓ / ✗ / not yet for one question of one try: a finished try's misses; a try going on now: what it saved so far
  function scMark(part, r, q, now) {
    if (!now) return r.missed.has(q.id) ? 'miss' : 'ok';
    const x = liveAnswers(r, part)[q.id];
    return x == null ? 'wait' : x ? 'ok' : 'miss';
  }
  const scTryName = k => (k === 0 ? '1st try' : `Try ${k + 1}`);
  function scBoxHTML(st, part) {
    const c = st.parts[part];
    const tries = scTries(c).map((r, k) => {
      const now = r === c.now;
      const line = now
        ? `<b>▶ Working on it now</b> · ${onText(r, part)} · ${soFarHTML(r)}`
        : `<b>${scTryName(k)}</b>${r.retake ? ' (retake)' : ''} · ${pctHTML(r)} · ${Number(r.score) || 0} of ${Number(r.total) || spotsOf(part).length} right · ${when(finishOf(r))} · ${timeText(r.elapsed)}`;
      const strip = spotsOf(part).map((q, i) => {
        const m = scMark(part, r, q, now);
        return `<button type="button" class="cs-sq sc-qb sq-${m}" data-sctake="${k}" data-q="${i}" aria-expanded="false" title="Question ${i + 1}: ${m === 'ok' ? 'right' : m === 'miss' ? 'wrong' : 'not answered yet'}"><i>${i + 1}</i>${m === 'ok' ? '✓' : m === 'miss' ? '✗' : ''}</button>`;
      }).join('');
      return `<div class="sc-take${now ? ' sc-now' : ''}"><p class="sc-line">${line}</p>
        <span class="cs-strip" role="group" aria-label="${esc(st.name)}: each question. Tap one to see it.">${strip}</span>
        <div class="cs-qbox sc-q" data-sc-q="${k}" hidden></div></div>`;
    }).join('');
    return `<div class="cs-qbox-head"><b>${esc(st.name)}</b><span class="cs-qbox-skill">${esc(FORM_NAMES[part])}</span>
        <button type="button" class="cs-qbox-x" data-scclose aria-label="Close ${esc(st.name)}'s ${esc(FORM_NAMES[part])}">✕</button></div>${tries}`;
  }
  // the box for question i of one try: the heat map's answer box (the pick, the named mistake, the right answer) and the
  // question as the Working-now box shows it; a try going on now: the Working-now box itself
  function scQHTML(st, part, r, k, i, now) {
    const live = liveBoxHTML({ name: st.name, part, r }, i);
    if (now) return live.replace('data-live-close', 'data-scqclose');
    const q = spotsOf(part)[i];
    const asked = live.slice(live.indexOf('<div class="cs-qbox-ask">'));
    return `<div class="cs-qbox-head"><b>Question ${i + 1}</b><span class="cs-qbox-skill">${esc(skillOf(q.id) || '')}</span>
        <button type="button" class="cs-qbox-x" data-scqclose aria-label="Close question ${i + 1}">✕</button></div>
      ${studentHTML(part, q, { name: st.name, t: r }).split(`<span>(${tryWord()})</span>`).join(`<span>(${scTryName(k).toLowerCase()})</span>`)}${asked}`;
  }
  function drawSc() {
    const st = scOpen ? classList.find(x => keyOf(x.name) === scOpen.key) : null;
    const c = st ? st.parts[scOpen.part] : null;
    if (!c) scOpen = null;
    const tries = scOpen ? scTries(c) : [];
    if (scOpen && scOpen.take != null && !(tries[scOpen.take] && spotsOf(scOpen.part)[scOpen.q])) scOpen = { ...scOpen, take: null, q: null };
    // the box is a row of its own right under the student's row, there only while it is open (the table keeps one row per student)
    document.querySelectorAll('#cs-body .cs-sc-row').forEach(row => row.remove());
    const under = scOpen ? [...document.querySelectorAll('#cs-body .cs-cell')].find(b => b.dataset.sc === scOpen.key) : null;
    const tr = under ? under.closest('tr') : null;
    if (tr) {
      const row = document.createElement('tr');
      row.className = 'cs-sc-row';
      row.dataset.scRow = scOpen.key;
      row.innerHTML = `<td colspan="${tr.children.length}"><div class="cs-qbox cs-scbox" role="region" aria-live="polite">${scBoxHTML(st, scOpen.part)}</div></td>`;
      tr.after(row);
    }
    document.querySelectorAll('#cs-body .cs-cell').forEach(b => {
      const on = Boolean(scOpen) && b.dataset.sc === scOpen.key && b.dataset.scset === scOpen.part;
      b.classList.toggle('on', on);
      b.setAttribute('aria-expanded', String(on));
    });
    if (!scOpen || scOpen.take == null) return;
    const box = document.querySelector(`#cs-body .sc-q[data-sc-q="${scOpen.take}"]`);
    if (box) { box.innerHTML = scQHTML(st, scOpen.part, tries[scOpen.take], scOpen.take, scOpen.q, tries[scOpen.take] === c.now); box.hidden = false; }
    document.querySelectorAll('#cs-body .sc-qb').forEach(b => {
      const on = b.dataset.sctake === String(scOpen.take) && b.dataset.q === String(scOpen.q);
      b.classList.toggle('on', on);
      b.setAttribute('aria-expanded', String(on));
    });
  }
  function toggleSc(key, part) {
    scOpen = scOpen && scOpen.key === key && scOpen.part === part ? null : { key, part, take: null, q: null };
    drawSc();
  }
  function toggleScQ(take, q) {
    if (!scOpen) return;
    const same = scOpen.take === take && scOpen.q === q;
    scOpen = { ...scOpen, take: same ? null : take, q: same ? null : q };
    drawSc();
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
    workingList = working;
    const sum = `<p class="cs-sum"><b>${classList.length}</b> ${classList.length === 1 ? 'student' : 'students'} · <b>${finished}</b> finished ${finished === 1 ? 'try' : 'tries'} · <b>${working.length}</b> working now${last ? ` · last finished ${when(last)}` : ''}</p>`;
    const workingHTML = working.length ? `<h3 class="cs-h">Working now <span>saved after every answer · lowest share right first · updates by itself every 20 seconds</span></h3>
      <p class="cs-hint">🔎 Tap a numbered box to see that question: what the student picked and the right answer.</p>
      <ul class="cs-working">${working.map(w => `<li><b>${esc(w.name)}</b> · ${FORM_NAMES[w.part]} · ${onText(w.r, w.part)} · ${soFarHTML(w.r)} <span class="cs-ago">${ago(atOf(w.r))}</span>${liveStrip(w)}${liveMissed(w)}</li>`).join('')}</ul>` : '';
    const table = `<div class="cs-wrap"><table class="cs-table"><thead><tr><th scope="col">Student</th>${FORMS.map(f => `<th scope="col">${FORM_NAMES[f]}</th>`).join('')}</tr></thead>
      <tbody>${classList.map(st => `<tr><th scope="row">${esc(st.name)}</th>${FORMS.map(f => scCellHTML(st, f, cellHTML(st.parts[f]))).join('')}</tr>`).join('')}</tbody></table></div>`;
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
    if (SORTS[heatSort]) done.sort(SORTS[heatSort]);   // a new list (classList stays A–Z); equal scores stay A–Z
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
    // the bottom row's % opens the same box as the question number at the top (asked 11/25)
    const foot = `<tr><th scope="row">% right</th>${stats.map(s => `<td class="${heatClass(s.pct)}"><button type="button" class="h-pbtn" data-q="${s.i}" aria-expanded="false" aria-label="Question ${s.i + 1}: ${s.pct}% right. Show what everyone picked." title="Question ${s.i + 1} · ${s.right} of ${done.length} right · tap to see what everyone picked">${s.pct}</button></td>`).join('')}<td></td><td></td><td></td></tr>`;
    // Student and Score are buttons that set the rows' order; aria-sort says which order is on
    const sortHead = (key, label, on) => `<th scope="col" class="h-sorth"${on ? ` aria-sort="${on}"` : ''}><button type="button" class="h-sort${on ? ' on' : ''}" data-sort="${key}" title="${key === 'name' ? 'Sort by name, A to Z' : 'Sort by score (tap again to flip)'}">${label}<span class="h-arrow" aria-hidden="true">${on === 'descending' ? ' ▼' : on === 'ascending' ? ' ▲' : key === 'name' ? '' : ' ↕'}</span></button></th>`;
    const scoreOn = heatSort === 'score-down' ? 'descending' : heatSort === 'score-up' ? 'ascending' : null;
    // most right first for the top 3, fewest right first for the bottom 3; a tie goes to the earlier question
    const top = stats.slice().sort((a, b) => b.right - a.right || a.i - b.i).slice(0, 3);
    const bottom = stats.slice().sort((a, b) => a.right - b.right || a.i - b.i).slice(0, 3);
    const rankHTML = list => `<ol class="cs-rank">${list.map(s => `<li><button type="button" class="cs-rank-btn h-qbtn" data-q="${s.i}" aria-expanded="false" aria-controls="cs-qbox" title="Question ${s.i + 1} · tap to see what students picked"><span class="cs-rank-head"><b>Question ${s.i + 1}</b>
      <span class="cs-pill ${heatClass(s.pct)}">${s.right} of ${done.length} right · ${s.pct}%</span></span>
      <span class="cs-q"><i>${esc(skillOf(s.q.id) || '')}:</i> ${formatMathText(s.q.q)}</span>
      <span class="cs-rank-more">🔎 What students picked</span></button></li>`).join('')}</ol>`;
    const versions = versionsOf(part).length > 1;
    return `<p class="cs-legend">${FORM_NAMES[part]} · each student's <b>${heatMode === 'first' ? '1st try' : 'latest try'}</b> · <span class="h-ok">✓</span> right · <span class="h-miss">✗</span> missed · bottom row = % of the ${done.length} ${done.length === 1 ? 'student' : 'students'} who got it right</p>
      <p class="cs-hint">🔎 Tap a ✓ or ✗ to see what that student picked. Tap a question number or its % to see what everyone picked. Tap Score to sort by score (again to flip; tap Student for A–Z).</p>
      <div class="cs-wrap"><table class="cs-heat"><thead><tr>${sortHead('name', 'Student', heatSort === 'name' ? 'ascending' : null)}${heads}${sortHead('score', 'Score', scoreOn)}<th scope="col">Time</th><th scope="col">Left the page</th></tr></thead>
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
    stdCols = cols;
    // every box, every standard and every % is a button: it opens the box under this map (asked 11/25)
    const body = done.map((d, si) => `<tr><th scope="row">${esc(d.name)}</th>${cols.map((c, ci) => {
      const s = score(d, c);
      const what = `${esc(d.name)} · ${esc(c.std)}: ${s.right} of ${s.of} right`;
      return `<td class="${heatClass(s.pct)}"><button type="button" class="sk-cell" data-c="${ci}" data-s="${si}" aria-expanded="false" aria-controls="cs-stdbox" aria-label="${what}. Show the answers." title="${what} · tap to see the answers">${s.right}/${s.of}</button></td>`;
    }).join('')}</tr>`).join('');
    const foot = cols.map((c, ci) => {
      const pct = Math.round(done.reduce((n, d) => n + score(d, c).right, 0) / (done.length * c.ids.length) * 100);
      return `<td class="${heatClass(pct)}"><button type="button" class="sk-pbtn" data-c="${ci}" aria-expanded="false" aria-controls="cs-stdbox" aria-label="${esc(c.std)}: ${pct}% right. Show its questions." title="${esc(c.std)} · tap to see its questions">${pct}</button></td>`;
    }).join('');
    return `<h3 class="cs-h cs-std-h">📐 Standards heat map <span>${FORM_NAMES[part]} · each student's ${tryWord()} · right out of that standard's questions</span></h3>
      <p class="cs-hint">🔎 Tap a box to see that student's answers in that standard. Tap a standard or its % to see its questions.</p>
      <div class="cs-wrap"><table class="cs-stdmap"><thead><tr><th scope="col">Student</th>${cols.map((c, ci) => `<th scope="col" title="${esc(c.words)}"><button type="button" class="sk-head" data-c="${ci}" aria-expanded="false" aria-controls="cs-stdbox">${esc(c.std)}<span class="cs-std-name">${esc(c.name)}</span><span class="cs-std-q">Q${c.ns.join(', ')}</span></button></th>`).join('')}</tr></thead>
      <tbody>${body}</tbody><tfoot><tr><th scope="row">% right</th>${foot}</tr></tfoot></table></div>
      <div id="cs-stdbox" class="cs-qbox cs-stdbox" role="region" aria-live="polite" hidden></div>
      <ul class="cs-std-list">${cols.map(c => `<li><b>${esc(c.std)} · ${esc(c.name)}</b> <span class="cs-std-qs">(questions ${c.ns.join(', ')})</span>
        <span class="cs-std-words">${esc(c.words)}</span>
        <span class="cs-std-skills">Skills: ${c.skills.map(esc).join(' · ')}</span></li>`).join('')}</ul>`;
  }

  /* The standards map's box (asked 11/25: "wouldn't it be helpful that all these be clickable?"). A student's box → that
     student's answer on each question of that standard (the question, the right answer, what they picked). A standard or
     its % → its questions, each with its % right and its most-picked wrong answer; a question's number opens its box under
     the heat map (what everyone picked). One box at a time; tap the same thing again to close it. Kept through the
     20-second updates and the sort. */
  let stdCols = [];     // the map's columns as drawn: { std, name, words, skills, ns: question numbers, ids }
  let stdOpen = null;   // the open box: { c: column, who: a student's name, or '' for the whole standard }
  const stdScore = (d, c) => { const right = c.ids.filter(id => !d.t.missed.has(id)).length; return { right, of: c.ids.length, pct: Math.round(right / c.ids.length * 100) }; };
  const stdGroup = c => { const right = heatDone.reduce((n, d) => n + stdScore(d, c).right, 0), of = heatDone.length * c.ids.length; return { right, of, pct: Math.round(right / of * 100) }; };
  // the question as the box under the heat map shows it: its words, its picture, the right answer
  function stdAskHTML(q) {
    const many = versionsOf(heatPart).length > 1;
    const pic = q.pic && window.M2V ? `<div class="key-pic cs-qbox-pic">${M2V.picHTML(q.pic)}</div>` : '';
    return `<div class="cs-qbox-ask"><p class="cs-qbox-label">${many ? 'Version 1 of this question' : 'The question'}</p>
      <p class="key-ask">${formatMathText(q.q)}</p>${pic}${app._keyAnswerHTML(q)}</div>`;
  }
  function stdBoxHTML(c, d) {
    const col = stdCols[c];
    const title = `<span class="cs-qbox-skill">${esc(col.std)}${col.name ? ` · ${esc(col.name)}` : ''}</span>`;
    const x = '<button type="button" class="cs-qbox-x" data-stdclose aria-label="Close">✕</button>';
    if (d) {
      const s = stdScore(d, col);
      return `<div class="cs-qbox-head"><b>${esc(d.name)}</b>${title}<span class="cs-pill ${heatClass(s.pct)}">${s.right} of ${s.of} right · ${s.pct}%</span>${x}</div>
        ${col.ns.filter(n => heatStats[n - 1]).map(n => {
          const q = heatStats[n - 1].q;
          return `<div class="cs-std-q1"><h5>Question ${n}</h5>${studentHTML(heatPart, q, d)}${stdAskHTML(q)}</div>`;
        }).join('')}`;
    }
    const g = stdGroup(col);
    const line = n => {
      const s = heatStats[n - 1];
      if (!s) return '';
      const { list, most } = wrongPicks(heatPart, s.q);
      const tops = most >= 2 ? list.filter(w => w.names.length === most) : [];
      return `<li class="sk-line"><button type="button" class="cs-std-openq" data-q="${n - 1}" aria-controls="cs-qbox" title="Question ${n}: tap to see what everyone picked">${n}</button>
        <div class="sk-line-body"><span class="cs-pill ${heatClass(s.pct)}">${s.right} of ${heatDone.length} right · ${s.pct}%</span>
        <span class="sk-sum"><i>${esc(skillOf(s.q.id) || '')}:</i> ${formatMathText(s.q.q)}</span>
        <span class="sk-top">${tops.length ? `<b>Most-picked wrong answer:</b> ${tops.map(w => `${w.e.row ? `Row ${w.e.row}: ` : ''}${formatMathText(w.e.picked)}`).join(' <i>or</i> ')} <span class="sk-n">(${most} students${tops.length > 1 ? ' each' : ''})</span>` : 'No wrong answer was picked by 2 or more students.'}</span></div></li>`;
    };
    return `<div class="cs-qbox-head"><b>Standard</b>${title}<span class="cs-pill ${heatClass(g.pct)}">${g.right} of ${g.of} answers right · ${g.pct}%</span>${x}</div>
      <p class="cs-note sk-hint">Tap a question's number to see what everyone picked.</p>
      <ul class="sk-lines">${col.ns.map(line).join('')}</ul>`;
  }
  // draw the box for stdOpen (or close it), and mark what is open
  function drawStd() {
    const box = $('cs-stdbox');
    if (!box) return;
    const d = stdOpen && stdOpen.who ? heatDone.find(x => x.name === stdOpen.who) : null;
    if (stdOpen && (!stdCols[stdOpen.c] || (stdOpen.who && !d))) stdOpen = null;   // that column or student is not on the map now
    document.querySelectorAll('#cs-heat .sk-cell, #cs-heat .sk-head, #cs-heat .sk-pbtn').forEach(b => {
      const cell = b.classList.contains('sk-cell');
      const on = Boolean(stdOpen) && Number(b.dataset.c) === stdOpen.c && (cell ? Boolean(d) && heatDone[Number(b.dataset.s)] === d : !stdOpen.who);
      b.classList.toggle('on', on);
      b.setAttribute('aria-expanded', String(on));
    });
    box.innerHTML = stdOpen ? stdBoxHTML(stdOpen.c, d) : '';
    box.hidden = !stdOpen;
  }
  // a box (si = a student's row) or a standard / % (si = null): open it, or close it when that one is open
  function toggleStd(c, si) {
    const who = si == null ? '' : heatDone[si].name;
    stdOpen = stdOpen && stdOpen.c === c && stdOpen.who === who ? null : { c, who };
    drawStd();
  }
  // a question's number in the standards box: open that question's box under the heat map (never close it) and go there
  function openQ(i) {
    const box = $('cs-qbox');
    if (!box || !heatStats[i]) return;
    if (box.hidden || box.dataset.q !== String(i) || box.dataset.s) toggleQ(i, null);
    box.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
  function wrongPicks(part, q) {
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
    return { many, right, blank, list, most };
  }
  function picksHTML(part, q) {
    const { many, right, blank, list, most } = wrongPicks(part, q);
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
    document.querySelectorAll('#cs-heat .h-qbtn, #cs-heat .h-pbtn, #cs-heat .h-cell').forEach(b => {   // the number and its % open the same box
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
    document.querySelectorAll('#cs-heat .h-qbtn, #cs-heat .h-pbtn, #cs-heat .h-cell').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-expanded', 'false'); });
  }

  // keepBox: the box to open again after drawing (undefined = the one open now, when the part stays the same)
  function showHeat(part, keepBox) {
    const keep = keepBox !== undefined ? keepBox : (part === heatPart ? openBox() : null);
    if (part !== heatPart) stdOpen = null;   // another part: other questions
    heatPart = part;
    document.querySelectorAll('#class-screen [data-heat]').forEach(b => { const on = b.dataset.heat === part; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.querySelectorAll('#class-screen [data-mode]').forEach(b => { const on = b.dataset.mode === heatMode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $('cs-heat').innerHTML = heatHTML(part);
    drawStd();
    reopenQ(keep);
  }
  function reopenQ(keep) {   // a question's box again; a student's box only while that student is still on the map
    if (!keep || !heatStats[keep.q]) return;
    if (keep.name == null) { toggleQ(keep.q, null); return; }
    const row = heatDone.findIndex(x => x.name === keep.name);
    if (row >= 0) toggleQ(keep.q, row);
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
    box.hidden = csWaiting || !classList.length;
  }
  function fixName() {
    if (SHARE_MODE) return;   // a guest view writes nothing to her sheet
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
        csWaiting = !classList.length;
        if (csWaiting) {
          Object.entries(sampleGames()).forEach(([k, rows]) => { if (PART_OF[k]) rowsByPart[PART_OF[k]] = rows; });
          classList = groupStudents(rowsByPart);
        }
        $('cs-sample').hidden = !csWaiting;
        $('cs-sample').textContent = csWaiting ? WAIT_NOTE : SAMPLE_NOTE;
        fillFix();
        $('cs-when').textContent = `From Mrs. Wright's Corner (Google Sheets) · updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })} · updates by itself every 20 seconds`;
        autoNext(pin);
        if (!classList.length) {
          body.innerHTML = '<p class="cs-msg">No work yet. Scores show up here as soon as students start answering.</p>';
          return;
        }
        if (!quiet) { liveOpen = null; stdOpen = null; }   // ↻ Refresh or a new visit starts closed; the 20-second update keeps the open boxes
        if (!quiet) scOpen = null;   // a score's box too: ↻ Refresh starts closed; the 20-second update keeps it
        body.innerHTML = classHTML();
        drawLive();
        drawSc();
        const hasFinished = p => classList.some(st => st.parts[p] && st.parts[p].tries.length);
        if (!hasFinished(heatPart)) { heatPart = FORMS.find(hasFinished) || heatPart; stdOpen = null; }
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

  /* 📊 Class Scores, the teacher's one screen: her PIN (given at Teacher Access in this tab, or asked now), then the
     sheet. The teacher/admin guest (share.js) gets the same screen with invented students: nothing is read from her
     sheet or sent to it (11/23, like the reading sites); a student guest gets no teacher screen. */
  app.openClassScores = function () {
    if (SHARE_MODE) {
      if (!window.SHARE_TEACHER) return;
      stopActiveSpeech();
      this.show('class-screen');
      pickFor = null;
      drawPick();
      showSample();
      return;
    }
    const pin = givenTeacherPin();
    if (!pin) {
      this.showPinModal('📊 Class Scores', 'Enter the Teacher PIN.', p => { rememberTeacherPin(p); this.openClassScores(); });
      return;
    }
    stopActiveSpeech();
    this.show('class-screen');
    pickFor = null;
    drawPick();
    load(pin);
  };

  /* 👀 TRY IT · ✅ ANSWER KEY on Class Scores (Marcos 11/23: the reading sites' page, "The first two"): a box under the
     bar — a part, a version, then go. The pick is the Teacher screen's own (one pick for both). The key opened from here
     says "← Class Scores" and goes back here; opened from the Teacher screen it says "← Teacher screen". */
  let pickFor = null;   // 'try' | 'key' | null (the box shut)
  function drawPick() {
    const box = $('cs-pick');
    if (!box) return;
    ['try', 'key'].forEach(w => {
      const b = $('cs-' + w);
      if (b) { b.setAttribute('aria-expanded', String(pickFor === w)); b.classList.toggle('on', pickFor === w); }
    });
    box.hidden = !pickFor;
    if (!pickFor) { box.innerHTML = ''; return; }
    const t = app._teacherPick(), count = versionCount(t.form), label = esc(app._teachLabel(t.form, t.version));
    const btn = (on, text, data) => `<button type="button" class="t-pick${on ? ' on' : ''}" ${data} aria-pressed="${on}">${text}</button>`;
    box.innerHTML = `<p class="cs-pick-h"><b>${pickFor === 'try' ? '👀 Try it as a student' : '✅ Answer key'}:</b> pick a part${count > 1 ? ' and a version' : ''}.</p>
      <div class="t-row" role="group" aria-label="Part">${TEACH_PARTS.map(f => btn(f === t.form, `${formOpen(f) ? '' : '🔒 '}${FORM_NAMES[f]}`, `data-cs-part="${f}"`)).join('')}</div>
      ${count > 1 ? `<div class="t-row" role="group" aria-label="Version">${Array.from({ length: count }, (_, i) => i + 1).map(v => btn(v === t.version, `Version ${v}`, `data-cs-ver="${v}"`)).join('')}</div>` : ''}
      <p class="cs-pick-now" id="cs-picked">${label} · ${formOpen(t.form) ? 'open to students' : '🔒 closed to students'}</p>
      <button type="button" class="cs-pick-go" data-cs-go>${pickFor === 'try' ? `👀 Try it: ${label}` : `✅ Open the key: ${label}`}</button>`;
  }
  app.csPick = function (what) { pickFor = pickFor === what ? null : what; drawPick(); };


  document.addEventListener('click', e => {
    const screen = $('class-screen');
    if (!screen || !screen.contains(e.target)) return;
    const part = e.target.closest('[data-cs-part]');
    if (part) { app.teacherPick({ form: part.dataset.csPart }); drawPick(); return; }
    const ver = e.target.closest('[data-cs-ver]');
    if (ver) { app.teacherPick({ version: Number(ver.dataset.csVer) }); drawPick(); return; }
    if (e.target.closest('[data-cs-go]')) {
      const go = pickFor;
      pickFor = null;
      drawPick();
      if (go === 'key') app.teacherKey(); else app.teacherTry();
      return;
    }
    // a student's score (11/25): its box of tries; a ✓ / ✗ in it opens that question; ✕ closes
    const scb = e.target.closest('.cs-cell');
    if (scb) { toggleSc(scb.dataset.sc, scb.dataset.scset); return; }
    const scq = e.target.closest('.sc-qb');
    if (scq) { toggleScQ(Number(scq.dataset.sctake), Number(scq.dataset.q)); return; }
    if (e.target.closest('[data-scqclose]')) { scOpen = scOpen && { ...scOpen, take: null, q: null }; drawSc(); return; }
    if (e.target.closest('[data-scclose]')) { scOpen = null; drawSc(); return; }
    const sq = e.target.closest('.cs-sq[data-live]');
    if (sq) { toggleLive(sq.dataset.live, Number(sq.dataset.q)); return; }
    if (e.target.closest('[data-live-close]')) { liveOpen = null; drawLive(); return; }
    const h = e.target.closest('[data-heat]');
    if (h) { showHeat(h.dataset.heat); return; }
    const m = e.target.closest('[data-mode]');
    if (m) { heatMode = m.dataset.mode; showHeat(heatPart); return; }
    const so = e.target.closest('#cs-heat [data-sort]');
    if (so) {   // Score: highest first, then lowest first, then highest again; Student: A–Z. The open boxes stay open.
      heatSort = so.dataset.sort === 'name' ? 'name' : heatSort === 'score-down' ? 'score-up' : 'score-down';
      showHeat(heatPart);
      return;
    }
    // the standards map (11/25): a box, a standard or its % opens its box; a question's number in it opens that question
    if (e.target.closest('[data-stdclose]')) { stdOpen = null; drawStd(); return; }
    const sk = e.target.closest('.sk-cell, .sk-head, .sk-pbtn');
    if (sk) { toggleStd(Number(sk.dataset.c), sk.classList.contains('sk-cell') ? Number(sk.dataset.s) : null); return; }
    const oq = e.target.closest('.cs-std-openq');
    if (oq) { openQ(Number(oq.dataset.q)); return; }
    const cell = e.target.closest('.h-cell');
    if (cell) { toggleQ(Number(cell.dataset.q), Number(cell.dataset.s)); return; }
    const qb = e.target.closest('.h-qbtn, .h-pbtn');
    if (qb) {
      toggleQ(Number(qb.dataset.q), null);
      if (qb.classList.contains('cs-rank-btn') && !$('cs-qbox').hidden) $('cs-qbox').scrollIntoView({ block: 'nearest' });   // a Top 3 / Bottom 3 question (11/25: the whole question taps)
      return;
    }
    if (e.target.closest('[data-qclose]')) { closeQ(); return; }
    if (e.target.closest('#cs-fix-go')) fixName();
  });

  /* 👀 The teacher/admin guest's Class Scores (Marcos 11/23, like the reading sites' guest view): invented students
     ("… Sample"), the same on every visit, from version 1's own questions — each miss picks the mistake the question itself
     names (its slips), so the tap boxes and the heat map show real picks. Built here; never read from her sheet or sent
     to it. No ✏️ Fix a name (it writes to her sheet). */
  // her own class with no work yet (asked 11/25: "Until her 1st score"): the same sample class with its bar, until her
  // students' first saved answer comes in on an update; then her real class, and the sample is gone
  let csWaiting = false;
  const SAMPLE_NOTE = ($('cs-sample') || {}).textContent || '';
  const WAIT_NOTE = "Sample data · Your class has no scores yet, so these are made-up students to show you what this page will look like. They disappear as soon as your students' scores start showing up.";
  const SAMPLE_NAMES = ['Ava', 'Ben', 'Cara', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana'].map(n => `${n} Sample`);
  function sampleGames() {
    const now = Date.now(), min = 60000, stamp = ms => new Date(ms).toISOString();
    const pickOf = q => { const s = Object.keys(q.slips || {})[0]; return s != null ? s : qType(q) === 'mc' ? (q.choices || []).find(c => c !== q.answer) : null; };
    const missable = part => spotsOf(part).filter(q => (qType(q) === 'mc' || qType(q) === 'entry') && pickOf(q) != null);
    const miss = q => missEntry({ id: q.id, q: q.q, yourAnswer: pickOf(q), correct: q.answer });
    const missesFor = (part, i, n) => { const m = missable(part); return Array.from({ length: n }, (_, k) => m[(i * 3 + k * 2) % m.length]).filter((q, k, a) => a.indexOf(q) === k); };
    const row = (part, i, x) => Object.assign({ name: SAMPLE_NAMES[i], form: FORM_NAMES[part], total: spotsOf(part).length, tabSwitches: 0 }, x);
    const done = (part, i, n, minsAgo, secs) => {
      const qs = missesFor(part, i, n), tot = spotsOf(part).length, end = now - minsAgo * min;
      return row(part, i, { sessionId: `S-${part}-${i}-${minsAgo}`, score: tot - qs.length, percent: Math.round((tot - qs.length) / tot * 100), done: true,
        wrongQuestions: qs.map(miss).join(' | '), elapsed: secs, startedAt: stamp(end - secs * 1000), finishedAt: stamp(end), at: stamp(end), on: null, answers: null });
    };
    // working now: the first `answered` questions, `wrong` of them missed; "on" = the next screen, lessons counted, as the site saves it
    const going = (part, i, answered, wrong, minsAgo) => {
      const spots = spotsOf(part), bank = window['FORM_' + part] || [], asked = spots.slice(0, answered);
      const missed = new Set(asked.filter(q => missable(part).includes(q)).slice(0, wrong).map(q => q.id));
      return row(part, i, { sessionId: `S-${part}-${i}-now`, score: asked.filter(q => !missed.has(q.id)).length, percent: 0, done: false,
        wrongQuestions: asked.filter(q => missed.has(q.id)).map(miss).join(' | '), elapsed: 0, startedAt: stamp(now - (minsAgo + 12) * min), finishedAt: '',
        at: stamp(now - minsAgo * min), on: { q: (answered ? bank.indexOf(asked[answered - 1]) : -1) + 2, of: bank.length },
        answers: asked.map(q => [q.id, missed.has(q.id) ? 0 : 1]) });
    };
    const games = {}, put = (part, r) => { (games[gameKey(part)] = games[gameKey(part)] || []).push(r); };
    const wMiss = [5, 7, 3, 9, 4, 6, 2, 8], wMiss2 = [2, 3, null, 4, null, 2, null, null];
    SAMPLE_NAMES.forEach((_, i) => {
      put('W', done('W', i, wMiss[i], 60 * 24 * 3 + i * 7, 900 + i * 60));
      if (wMiss2[i] != null) put('W', done('W', i, wMiss2[i], 60 * 24 * 2 + i * 5, 700 + i * 40));
      if (i < 6) put('P', done('P', i, [3, 5, 1, 6, 2, 4][i], 60 * 24 + i * 9, 800 + i * 50));
      if (i < 4) put('A', done('A', i, [2, 4, 1, 3][i], 90 + i * 11, 1100 + i * 70));
    });
    put('P', going('P', 6, 6, 2, 1));   // Gus: on question 7 of 15 in the Practice
    put('W', going('W', 7, 6, 2, 2));   // Hana: in the lesson before question 7 of 15 in the Warm-Up
    return games;
  }
  function showSample() {
    clearTimeout(autoTimer);
    ++loadToken;                       // nothing from her sheet can land here
    $('cs-sample').hidden = false;
    $('cs-fix').hidden = true;
    $('cs-when').textContent = 'Sample data · nothing is read from or sent to her sheet';
    const games = sampleGames(), rowsByPart = {};
    Object.keys(games).forEach(k => { if (PART_OF[k]) rowsByPart[PART_OF[k]] = games[k]; });
    classList = groupStudents(rowsByPart);
    liveOpen = null;
    $('cs-body').innerHTML = classHTML();
    drawLive();
    drawSc();
    const hasFinished = p => classList.some(st => st.parts[p] && st.parts[p].tries.length);
    if (!hasFinished(heatPart)) heatPart = FORMS.find(hasFinished) || heatPart;
    showHeat(heatPart);
  }
  // the teacher/admin guest card says what the teacher's screen holds (share.js draws it)
  if (SHARE_MODE) {
    window.SHARE_CARDS = Object.assign({}, window.SHARE_CARDS, { teacher: [
      ['📊', 'Class scores', 'Sample students: who is working now, each pick, the heat map.'],
      ['👀', 'Try it as a student', 'Any part, start to score. ⏩ skips the waits.'],
      ['✅', 'Answer key', 'Every question, the right answer and why. Printable.'],
      ['🖥️', 'Slide Mode', 'The lesson, big, one step at a time, for the board. Never the scored questions.']
    ] });
  }

  window.ClassScores = { groupStudents, missedOf, parseMisses, questionOf };   // for site-tests
})();
