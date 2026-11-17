/* ═══════════════════════════════════════════════════════
   SBAC IAB PRACTICE · NUMBER AND OPERATIONS IN BASE TEN · script.js
   Practice for the SBAC "Number and Operations in Base Ten" Interim Assessment Block (4th grade).
   Engine = a copy of Math Module 4's (math-module-4, 11/13): steps on one start screen, a part banner on
   every question, one open/closed flag per part, read-aloud on everything a student reads.
   THE PARTS (Marcos 11/14: "I want Test Form A and Test Form B but I want a Warm Up and Practice Form
   before them"):
     Step 1  WARM-UP      form W  worked examples the student must hear (the lesson video when there is one,
                                  else the read-aloud worked example), steps (NOT scored), then easier questions;
                                  hints open and read themselves; word help; 4 versions = new numbers on each
                                  retry; unlimited; 70% opens the Practice
     Step 2  PRACTICE     form P  the test's kinds of questions; hints read themselves; word help; 4 versions;
                                  unlimited; a miss is followed by "try one like it" (FORM_X); 70% opens Test Form A
     Step 3  TEST FORM A  form A  one try, right/wrong only (no answer shown, no mistake named), then locked
     Step 4  TEST FORM B  form B  the same, opens once Test Form A is finished (any score)
     A retake of a test needs the Teacher PIN: the SAME form again with a NEW session id; the sheet's form
     column says "Test Form A — Retake" / "Test Form B — Retake". Tests are taken at school only (school-clock.js).
   Every scored question sits at a "spot" 1–15 = the real IAB's item order (tools/SCHEMA.md). Four kinds:
     multiple choice (no type) · type:'entry' (type a number) · type:'grid' (True/False table, one point only
     when every row is right; a miss is saved per wrong row: "A12.2") · type:'ms' (select all that are true,
     one point only for the exact set). Pictures live in visuals.js (the school-store poster: pic.kind 'prices'; the
     area model with partial products: pic.area / explain.area). The question's 🔊 reads both after the question.
   Game keys nbtw-warmup (Warm-Up) / nbtp-practice (Practice) / nbta-test (Test Form A) / nbtb-test (Test Form B),
   storage prefix nbt_, session ids NB-…
   PIN: 9377 (Teacher override)
═══════════════════════════════════════════════════════ */

/* ── CONFIG ─────────────────────────────────────────── */
// Each part opens on its own. false = students locked out of that part;
// Teacher Access still works. Set true to open.
const SHARE_MODE    = !!window.SHARE_MODE;   // set by share.js — a visitor's link, never a student's
const WARM_UP_OPEN  = true;    // Step 1 · Warm-Up — watch, step by step, then easier questions
const PRACTICE_OPEN = true;    // Step 2 · Practice — the hints read themselves aloud
const TEST_A_OPEN   = false;   // Step 3 · Test Form A — one try (a retake needs the Teacher PIN) — opens on his word
const TEST_B_OPEN   = false;   // Step 4 · Test Form B — one try (a retake needs the Teacher PIN) — opens on his word
// THE GATES (70% = PASS_PCT; the best try counts):
//   Warm-Up, Practice   as many times as they like
//   Practice     opens after a Warm-Up with 70% or better; a student who already passed the Practice keeps it open
//   Test Form A  opens after a Practice with 70% or better
//   Test Form B  opens after Test Form A is finished (any score)
// The Teacher PIN lets one student past a gate (Module 4's rule: skipping a step "should need a teacher pin entry").
// Scores are remembered on the device (and on the sheet: spot-sync.js / the 'progress' read at sign-in).
// ANY_ORDER true = no gates at all (every open part can be started).
const ANY_ORDER     = false;
const PASS_PCT      = 70;
const INSTRUCT_SECS = 15;
const READ_SECS     = 12;
const NEXT_SECS     = 8;
// Warm-Up steps are short (one small step of a problem), so their locks are short too
const STEP_READ_SECS = 3;
const STEP_NEXT_SECS = 3;
const STORAGE_KEY   = 'nbt_session_v1';
const SCORES_KEY    = 'nbt_scores_v1';
const RNDQ_SESSION_ID_KEY = 'nbt_session_id_v1';
const newSessionId = () => 'NB-' + Math.random().toString(36).slice(2, 9).toUpperCase();
let SESSION_ID = (() => {
  let id = localStorage.getItem(RNDQ_SESSION_ID_KEY);
  if (!id) { id = newSessionId(); localStorage.setItem(RNDQ_SESSION_ID_KEY, id); }
  return id;
})();

const FORMS = ['W', 'P', 'A', 'B'];   // Warm-Up · Practice · Test Form A · Test Form B (Marcos 11/14)
const isWarmUp = form => form === 'W';
const isPractice = form => form === 'P';
const isTest   = form => form === 'A' || form === 'B';
// The Warm-Up and the Practice teach (answer + why + the worked picture + the mistake named); the tests do not.
const teaches = form => isPractice(form) || isWarmUp(form);
// The Warm-Up and the Practice stay in their order (the IAB's spot order); the tests are shuffled
const keepsOrder = form => isPractice(form) || isWarmUp(form);
// In the Practice and the Warm-Up the hint is open and reads itself aloud when the question appears (Marcos 10/15)
const autoHint = form => isPractice(form) || isWarmUp(form);
/* Only questions count toward the score. A Warm-Up 'watch' (worked example) and 'step' (one step of a
   problem) are teaching, not scored. */
const isScored = q => !!q && !q.kind;
const scoredCount = bank => (bank || []).filter(isScored).length;
// Word help (a button per math word) is a support: the Warm-Up and the Practice have it; the tests do not.
const wordHelp = form => form === 'W' || form === 'P';
// "Try one like it": after a Practice miss, one more question of the same kind from this bank
const TWINS = { P: 'X' };
const FORM_NAMES = { W: 'Warm-Up', P: 'Practice', A: 'Test Form A', B: 'Test Form B' };
const testFlag = form => (form === 'A' ? TEST_A_OPEN : form === 'B' ? TEST_B_OPEN : false);
function formOpen(form) {
  return SHARE_MODE || (isWarmUp(form) ? WARM_UP_OPEN : isPractice(form) ? PRACTICE_OPEN : testFlag(form) && atSchoolNow());
}
const ANY_OPEN = WARM_UP_OPEN || PRACTICE_OPEN || TEST_A_OPEN || TEST_B_OPEN;
/* Sheet / dashboard game key — one per form */
function gameKey(form) {
  return { W: 'nbtw-warmup', P: 'nbtp-practice', A: 'nbta-test', B: 'nbtb-test' }[form];
}

/* ── THE FOUR KINDS OF QUESTION (tools/SCHEMA.md) ────── */
// absent type = multiple choice (choices + answer) · 'entry' · 'grid' · 'ms'
const qType = q => (q && (q.type === 'entry' || q.type === 'grid' || q.type === 'ms') ? q.type : 'mc');
/* A typed number as the answer key keeps it: digits only — commas, spaces and $ removed, leading zeros removed
   ("0" stays "0"). Anything that is not digits after that → null ("Type a number."). */
function normEntry(s) {
  const t = String(s == null ? '' : s).replace(/[,\s$]/g, '');
  if (!/^\d+$/.test(t)) return null;
  return t.replace(/^0+(?=\d)/, '');
}
/* A student's own copy of a question: the choices (multiple choice) or the options (select all) in a new order.
   A True/False table's rows are never shuffled; a typed answer has nothing to shuffle. */
function shuffleQ(q) {
  if (Array.isArray(q.choices) && qType(q) === 'mc') return { ...q, choices: [...q.choices].sort(() => Math.random() - 0.5) };
  if (Array.isArray(q.options) && qType(q) === 'ms') return { ...q, options: [...q.options].sort(() => Math.random() - 0.5) };
  return { ...q };
}
/* Every control a student answers with — the read lock freezes them, Check freezes them for good */
function answerControls() {
  return Array.from(document.querySelectorAll('#answers .answer-btn, #answers .grid-cell, #entry-input'));
}
function lockControl(el, locked) {
  el.disabled = locked;
  el.classList.toggle('locked-choice', locked);
}

/* ── SHEET SUBMISSION ───────────────────────────────── */
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzv8CWv1yyi8NeH04now9UxVL4IZm5yMqqsEGMcgGdrcAOWVB-aSp5siTvSSJXIUpzFMA/exec';

let tabSwitchCount = 0;

/* One saved miss: "[ID] (Skill) question (picked: answer)" — the standard every
   review uses. Skill comes from data/skills.js by question id, so misses restored
   from an older saved attempt still get tagged (a True/False row "A12.2" falls back to its table's "A12").
   " | " separates entries, so it is swapped out of the pick just in case; a stem's line breaks become spaces. */
function skillOf(id) {
  const S = window.SKILLS || {};
  return S[id] || S[String(id).replace(/\.\d+$/, '')];
}
function missEntry(m) {
  const skill  = m.skill || skillOf(m.id) || 'Unsorted';
  const picked = m.yourAnswer == null || m.yourAnswer === '' ? '' :
    ` (picked: ${String(m.yourAnswer).replace(/\s*\|\s*/g, ' / ').replace(/\s+/g, ' ').trim()})`;
  return `[${m.id}] (${skill}) ${String(m.q).replace(/\s*\|\s*/g, ' / ').replace(/\s+/g, ' ').trim()}${picked}`;
}

/* What the sheet's "form" column says: Warm-Up · Practice · Test Form A · Test Form B, and "— Retake" on a
   test taken again with the Teacher PIN */
function formLabel(attempt) {
  return FORM_NAMES[app.currentForm] + (app.isRetake && isTest(app.currentForm) ? ' — Retake' : '');
}
/* The attempt this session will be once it finishes (finished ones on this device + 1). */
function upcomingAttempt() {
  return (getFormAttempts(app.studentName)[app.currentForm] || 0) + 1;
}

function submitScorePartial() {
  const total = scoredCount(app.currentBank);
  const pct = total ? Math.round((app.score / total) * 100) : 0;
  fetch(SHEET_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action:    'submit',
      game:      gameKey(app.currentForm),
      sessionId: SESSION_ID + '-' + (app.currentForm || 'x'),
      name:      app.studentName || 'Unknown',
      form:      formLabel(upcomingAttempt()),
      score:     app.score,
      total:     total,
      percent:   pct,
      status:    `In Progress (Q${app.currentIndex + 1}/${app.currentBank.length})`,
      done:           false,
      elapsed:        app.timerSeconds,
      tabSwitches:    tabSwitchCount,
      wrongQuestions: (app.missedQuestions||[]).map(missEntry).join(' | '),
      startedAt:      app.startedAt || '',
      finishedAt:     app.finishedAt || '',
      // where the student is now, for the dashboard (Marcos 11/5: "i should know what question they are on"). The sheet
      // keeps no status text, only the events, so the item rides at the end of this row's copy of the log (never in app.events).
      events:         JSON.stringify([...(app.events || []), { e: 'on', q: app.currentIndex + 1, of: app.currentBank.length }]),
      timestamp:      new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    })
  }).catch(() => {});
}

function submitScoreFinal() {
  const total = scoredCount(app.currentBank);
  const pct = total ? Math.round((app.score / total) * 100) : 0;
  fetch(SHEET_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action:    'submit',
      game:      gameKey(app.currentForm),
      sessionId: SESSION_ID + '-' + (app.currentForm || 'x') + '-A' + (app.currentAttemptNum || 1),
      name:      app.studentName || 'Unknown',
      form:      formLabel(app.currentAttemptNum),
      attempt:   app.currentAttemptNum || 1,
      score:     app.score,
      total:     total,
      percent:   pct,
      status:    'Complete',
      done:           true,
      elapsed:        app.timerSeconds,
      tabSwitches:    tabSwitchCount,
      wrongQuestions: (app.missedQuestions||[]).map(missEntry).join(' | '),
      startedAt:      app.startedAt || '',
      finishedAt:     app.finishedAt || '',
      events:         JSON.stringify(app.events || []),
      timestamp:      new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    })
  }).catch(() => {});
}

/* ── ROSTER ─────────────────────────────────────────── */
const ROSTER = [
  { name: "Mr. O (Teacher)",           id: "9377" },
  { name: "Avery, Jo'Von",             id: "10053632" },
  { name: "Belasquez Bonilla, Eduin",  id: "10058674" },
  { name: "Castaneda, Kelvin",         id: "10053248" },
  { name: "Chicas-Santos, Allison",    id: "10066737" },
  { name: "Collado, Roniel",           id: "10060249" },
  { name: "Dejesus, Michael",          id: "10049434" },
  { name: "Dock, Fakeem",              id: "10059720" },
  { name: "Douglas, Isaac",            id: "10070979" },
  { name: "Douglas, Iyana",            id: "10070980" },
  { name: "Dumphrey, Christopher",     id: "10060696" },
  { name: "Flores, Kiara",             id: "10052834" },
  { name: "Johnson, Destiny",          id: "10052926" },
  { name: "Jones, Tahji",              id: "10060315" },
  { name: "Lawrence, Eric",            id: "10057451" },
  { name: "Madero, Jovany",            id: "10076374" },
  { name: "Pettway, Lanaura",          id: "10060616" },
  { name: "Polanco Soriano, Thiara",   id: "10060503" },
  { name: "Roberts, Robyn",            id: "10060925" },
  { name: "Rodriguez-Jimenez, Marcos", id: "10048936" },
  { name: "Rojas, Alanie",             id: "10076388" },
  { name: "Sanchez Rodriguez, Johanelyz", id: "10076767" },
  { name: "Vega, Taishmara",           id: "10054043" },
  { name: "Watts, Autumn",             id: "10039032" },
  { name: "Zelaya-Osorto, Nazareth",   id: "10053626" }
];

const GUEST_SLOTS = {
  '937701': 'Guest 1', '937702': 'Guest 2', '937703': 'Guest 3',
  '937704': 'Guest 4', '937705': 'Guest 5', '937706': 'Guest 6',
  '937707': 'Guest 7', '937708': 'Guest 8', '937709': 'Guest 9',
  '937710': 'Guest 10'
};

/* ── BUILD DROPDOWN ─────────────────────────────────── */
(function buildRoster() {
  const sel = document.getElementById('name-select');
  ROSTER.forEach(s => {
    const o = document.createElement('option');
    o.value = s.name; o.textContent = s.name;
    sel.appendChild(o);
  });
  const div = document.createElement('option');
  div.disabled = true; div.textContent = '── Guest Slots ──';
  sel.appendChild(div);
  Object.entries(GUEST_SLOTS).forEach(([code, label]) => {
    const o = document.createElement('option');
    o.value = `GUEST:${code}`; o.textContent = `🙋 ${label}`;
    sel.appendChild(o);
  });
})();

/* ── STATE ──────────────────────────────────────────── */
let loggedInName    = '';
let unlockedForms   = new Set();
let retakeFor       = '';      // the test ('A' or 'B') the Teacher PIN unlocked a retake of; cleared on sign-in and Sign Out
let pinModalCallback = null;
let activeSpeakBtn  = null;
let reviewMode      = false;   // only the tests set these now: the Teacher screen replaced the Manual / Auto-run
let reviewAutoRun   = false;   // pop-ups (the Lab's screen, 10/30) — the site no longer answers for the teacher

/* 🧑‍🏫 THE TEACHER SCREEN (the Lab's screen, Marcos 10/30; Parts of Speech HQ's, 10/28): Teacher Access asks the PIN in
   the page, then ONE screen: a part, a version — any part, nothing passed first. The PIN lasts for this tab
   (sessionStorage) until ✕ Exit teacher. 👀 Try it as a student opens the guest view (share.js: nothing reaches the
   sheet) on ?teach=<PART>.<version>, started the way a first try starts. */
const TEACHER_KEY      = 'nbt_teacher';        // sessionStorage: '1' = the Teacher PIN was given in this tab
const TEACHER_PICK_KEY = 'nbt_teacher_pick';   // sessionStorage: the last part and version picked
const TEACH_PARTS      = ['W', 'P', 'A', 'B'];
const versionCount = id => { const v = window['FORM_' + id + '_V']; return Array.isArray(v) && v.length ? v.length : 1; };
const TEACH = (() => {
  const m = /^([WPAB])\.(\d+)$/.exec(new URLSearchParams(location.search).get('teach') || '');
  return SHARE_MODE && m ? { form: m[1], version: Number(m[2]) } : null;
})();
function teacherUnlocked() { try { return sessionStorage.getItem(TEACHER_KEY) === '1'; } catch (e) { return false; } }

/* ── MATH HELPERS ───────────────────────────────────── */
function frac(n, d) {
  return `<span class="fraction"><span class="frac-top">${n}</span><span class="frac-bottom">${d}</span></span>`;
}
function mixed(w, n, d) {
  return `<span class="mixed-num">${w}<span class="fraction"><span class="frac-top">${n}</span><span class="frac-bottom">${d}</span></span></span>`;
}
/* Text from the data as HTML: < > & shown as written (a stem like "752 > 2 + 50 + 700" is text, never a tag), a line
   break in a stem ("5,162 + 734 = □\nType the sum.") as a line break, fractions stacked */
function formatMathText(raw) {
  if (raw == null || raw === '') return '';
  let s = String(raw).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/\n/g, '<br>');
  s = s.replace(/□/g, '<span class="nb-box">□</span>');   // the box, big enough to see (the class font draws it tiny)
  s = s.replace(/(\d+)\s+(\d+)\/(\d+)/g, (_, w, n, d) => mixed(w, n, d));
  s = s.replace(/(\d+)\/(\d+)/g, (_, n, d) => frac(n, d));
  s = s.replace(/\bx\b/g, '×');
  return s;
}

const ORDINALS = {
  '2':'halves','3':'thirds','4':'fourths','5':'fifths','6':'sixths',
  '7':'sevenths','8':'eighths','9':'ninths','10':'tenths',
  '12':'twelfths','16':'sixteenths','100':'hundredths'
};
const SINGULAR_DENOM = {
  'halves':'half','thirds':'third','fourths':'fourth','fifths':'fifth',
  'sixths':'sixth','sevenths':'seventh','eighths':'eighth','ninths':'ninth',
  'tenths':'tenth','twelfths':'twelfth','sixteenths':'sixteenth','hundredths':'hundredth'
};
function denomToWord(d) { return ORDINALS[d] || `over ${d}`; }
function numToWord(n) {
  const w = ['zero','one','two','three','four','five','six','seven','eight','nine',
             'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen',
             'seventeen','eighteen','nineteen','twenty'];
  return w[parseInt(n)] !== undefined ? w[parseInt(n)] : n;
}
function convertToSpokenText(raw) {
  return raw
    .replace(/\u00a0{2,}/g, ', ')
    .replace(/(\d+)\s+(\d+)\/(\d+)/g, (_, w, n, d) => {
      const dWord = denomToWord(d), nNum = parseInt(n);
      const dFinal = nNum === 1 ? (SINGULAR_DENOM[dWord] || dWord) : dWord;
      return `${w} and ${numToWord(n)} ${dFinal}`;
    })
    .replace(/(\d+)\/(\d+)/g, (_, n, d) => {
      const dWord = denomToWord(d), nNum = parseInt(n);
      const dFinal = nNum === 1 ? (SINGULAR_DENOM[dWord] || dWord) : dWord;
      return `${numToWord(n)} ${dFinal}`;
    })
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/□(?=[?.!,;:])/g, ' blank')                    // the box for the missing number is read "blank" (Marcos 11/14: "blank
    .replace(/□/g, ' blank ')                                // everywhere"): "= □?" is "equals blank?", never "equals blank what?"; "61,4□8" is "61,4 blank 8"
    .replace(/(^|\s)>(?=\s|$)/g, '$1is greater than')
    .replace(/(^|\s)<(?=\s|$)/g, '$1is less than')
    .replace(/(^|\s)\+(?=\s|$)/g, '$1plus')
    .replace(/(^|\s)=(?=\s|$)/g, '$1equals')
    .replace(/\bx\b/g, ' times ')
    .replace(/\s\+\s/g, ' plus ')
    .replace(/\s−\s/g, ' minus ')
    .replace(/(^|\s)\?(?=\s|$)/g, '$1what?');   // a step's "3 × 5 = ?" is asked ("equals what?"), and the "?" lights with "what"
}

/* ── LETTER GRADE ───────────────────────────────────── */
function letterGrade(pct) {
  if (pct >= 97) return 'A+';
  if (pct >= 93) return 'A';
  if (pct >= 90) return 'A-';
  if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';
  if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+';
  if (pct >= 73) return 'C';
  if (pct >= 70) return 'C-';
  if (pct >= 67) return 'D+';
  if (pct >= 63) return 'D';
  if (pct >= 60) return 'D-';
  return 'F';
}

/* ── HELPERS ────────────────────────────────────────── */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getFirstName(name) {
  if (!name) return 'Student';
  if (name.includes(' - ')) return name.split(' - ').pop().trim();
  const parts = name.split(',');
  return parts.length > 1 ? parts[1].trim().split(' ')[0] : name.split(' ')[0];
}

let hlTimer = null;
const liveUtterances = new Set();   // speech in progress, held so its events still arrive
/* ── LISTEN, THEN NEXT (Marcos 10/11: "these should be forced for them to hear like in Science… the kids
   have to hear something before they can move on to the next item") ──
   After a MISS in the Warm-Up or the Practice, the Next button stays hidden until the mistake and
   the right answer have been heard to the end. One big Listen button; stopping early does not count; a
   second tap while it is speaking does nothing. A device that will not speak (no sound started within 4 s,
   or the voice reports an error) gets a wait long enough to read it, then an "I read it" button.
   Same rules and numbers as guide.js in science-starting-and-stopping. Not in the tests (they show no
   answer), not after a right answer, not in the teacher's look.
   What it proves: the audio played to the end. Not that the child listened. */
const LISTEN_START_WAIT = 4000;
const listenDwellMs = words => Math.min(15000, Math.max(3000, words * 450));
let listenJob = null;   // the forced listen now speaking, if any

function stopActiveSpeech() {
  clearTimeout(hlTimer);
  if (listenJob && !listenJob.settled) listenJob.abort();   // cut off before the end → it does not count
  window.speechSynthesis.cancel();
  document.querySelectorAll('.wrd.hl').forEach(e => e.classList.remove('hl'));
  if (activeSpeakBtn) { activeSpeakBtn.textContent = '🔊'; activeSpeakBtn = null; }
}

/* ── HINT BOX (Marcos 10/7) ──
   "The hints should not play automatically. They should be there if
   needed." — still the rule in Practice B. In Practice A and the Warm-Up the hint is open
   and reads itself aloud (Marcos 10/15, see autoHint). Until the student taps 💡 Need a hint?, only that button shows
   and nothing is read. Once opened, the hint has its own 🔊 on the LEFT,
   same toggle as every other speaker (tap to play, tap to stop, tap again
   to restart); every word (including "Hint:") is a span for the highlight.
   The question's 🔊 reads the question only. */
function hintBoxHTML(hint, shown) {
  if (!shown) {
    return `<div class="hint-wrap"><button type="button" class="hint-reveal-btn" ` +
      `aria-label="Show a hint" onclick="event.stopPropagation(); app.showHint()">` +
      `💡 Need a hint?</button></div>`;
  }
  const words = ('Hint: ' + hint).split(/\s+/)
    .map(w => `<span class="wrd">${formatMathText(w)}</span>`).join(' ');
  return `<div class="hint-box"><button type="button" class="speak-btn hint-speak-btn" ` +
    `title="Read the hint aloud" aria-label="Read the hint aloud" ` +
    `onclick="event.stopPropagation(); speakHint(this)">🔊</button>` +
    `<span class="hint-text"><span aria-hidden="true">💡</span> ${words}</span>${videoBtnHTML('hint', '🎬 Show me')}</div>`;
}
// what the Warm-Up's video card says when a part was jumped over (read aloud; recorded with the other lines)
const VIDEO_SKIPPED = 'You skipped a part. Press Play. Watch it all.';
window.MM4_VIDEO_SAYS = ['Press Play. Watch the video to the end.', 'Press Play to watch.', VIDEO_SKIPPED];
/* 🎬 Show me (beside the hint) / 🎬 Watch how (after a miss): the video for this kind of question (Marcos 11/13).
   Practice only (MM4Video.forQuestion); never plays on its own; no glow — it is help, not a step (Marcos 11/4). */
function videoBtnHTML(why, label) {
  const ch = window.MM4Video && typeof app !== 'undefined' ? MM4Video.forQuestion(app.currentQ(), app.currentForm) : null;
  if (!ch) return '';
  return `<button type="button" class="video-show-btn" data-why="${why}" aria-expanded="false" ` +
    `onclick="event.stopPropagation(); app.showVideo('${why}', this)">${label}</button>`;
}

function speakHint(btn) {
  if (activeSpeakBtn === btn) { stopActiveSpeech(); return; }
  stopActiveSpeech();
  const q = app.currentQ();
  if (!q || !q.hint) return;
  const spans = Array.from(btn.parentElement.querySelectorAll('.wrd'));
  activeSpeakBtn = btn;
  btn.textContent = '⏹';
  const u = new SpeechSynthesisUtterance(sayWords(spans, 'Hint: ' + q.hint, ('Hint: ' + q.hint).split(/\s+/)));
  english(u); u.rate = READ_RATE;
  u.onboundary = e => {
    if (e.name !== 'word') return;
    spans.forEach(el => el.classList.remove('hl'));
    lightAt(spans, u.text, e.charIndex);
  };
  u.onend = () => {
    spans.forEach(el => el.classList.remove('hl'));
    if (activeSpeakBtn === btn) { btn.textContent = '🔊'; activeSpeakBtn = null; }
  };
  addHighlightFallback(u, spans);
  window.speechSynthesis.speak(u);
}

/* ── A 🔊 FOR ONE CHOICE, OPTION OR TRUE/FALSE ROW ──
   The same toggle as every speaker (tap to play, tap to stop, tap again to restart). On its first tap the words of
   what it reads become spans, and each one lights as the voice says it (sayWords → lightAt, at READ_RATE in the
   device's English voice — the one path every reading on this site takes, so the recorded-voice harvest finds it). */
function speakButton(title, onSpeak) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'choice-speak-btn';
  b.textContent = '🔊';
  b.title = title;
  b.setAttribute('aria-label', title);
  b.onclick = e => { e.stopPropagation(); onSpeak(); };
  return b;
}
function speakItem(speakBtn, host, text, prefixHTML = '') {
  if (activeSpeakBtn === speakBtn) { stopActiveSpeech(); return; }
  stopActiveSpeech();
  if (!host.querySelector('.wrd')) {
    let html = prefixHTML;
    String(text).split(/(\s+)/).forEach(w => { html += /^\s+$/.test(w) ? w : (w ? `<span class="wrd">${formatMathText(w)}</span>` : ''); });
    host.innerHTML = html.trim();
  }
  const hlSpans = Array.from(host.querySelectorAll('.wrd'));
  activeSpeakBtn = speakBtn;
  speakBtn.textContent = '⏹';
  const u = new SpeechSynthesisUtterance(sayWords(hlSpans, text, String(text).split(/\s+/).filter(Boolean)));
  english(u); u.rate = READ_RATE;
  u.onboundary = e => {
    if (e.name !== 'word') return;
    host.querySelectorAll('.wrd.hl').forEach(el => el.classList.remove('hl'));
    lightAt(hlSpans, u.text, e.charIndex);
  };
  u.onend = () => {
    host.querySelectorAll('.wrd.hl').forEach(el => el.classList.remove('hl'));
    if (activeSpeakBtn === speakBtn) { speakBtn.textContent = '🔊'; activeSpeakBtn = null; }
  };
  addHighlightFallback(u, hlSpans);
  window.speechSynthesis.speak(u);
}

/* ── WORD HELP (Marcos 10/10) ──
   Each math word in the question gets a button under it. Tapping one opens a
   card: what the word means, an example, sometimes a picture, and its own 🔊.
   Nothing opens or speaks on its own. The Warm-Up and the Practice only (see wordHelp) —
   the tests check whether the student knows these words. Every open is logged
   (event "word") so the dashboard can show who needed which word. */
const WORD_MAX = 4;
function wordsIn(q) {
  // the stem, and a True/False table's rows or a select-all's options (their words are read too)
  const parts = [q.q].concat((q.rows || []).map(r => r.text), (q.options || []).map(o => o.text));
  const text = ' ' + parts.map(t => String(t)).join(' ').toLowerCase() + ' ';
  const found = [];
  (window.WORDS || []).forEach(w => {
    let at = -1;
    w.find.forEach(ph => {
      const m = new RegExp('[^a-z]' + ph.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^a-z]').exec(text);
      if (m && (at < 0 || m.index < at)) at = m.index;
    });
    if (at >= 0) found.push({ w, at });
  });
  return found.sort((a, b) => a.at - b.at).slice(0, WORD_MAX).map(x => x.w);
}
function wordChipsHTML(q, openKey) {
  const list = wordsIn(q);
  if (!list.length) return '';
  const chips = list.map(w =>
    `<button type="button" class="word-chip${w.key === openKey ? ' open' : ''}" aria-expanded="${w.key === openKey}" ` +
    `onclick="app.showWord('${w.key}')">${w.word}</button>`).join('');
  const w = list.find(x => x.key === openKey);
  const card = !w ? '' :
    `<div class="word-card" role="note"><button type="button" class="speak-btn word-speak-btn" title="Read this aloud" ` +
    `aria-label="Read the meaning of ${w.word} aloud" onclick="speakWordCard(this)">🔊</button>` +
    `<div class="word-card-text"><div class="word-card-means">${wrapWords('<strong>' + w.word + '</strong> — ' + formatMathText(w.means))}</div>` +
    `<div class="word-card-ex">${wrapWords('<em>Example:</em> ' + formatMathText(w.ex))}</div>` +
    `${w.pic ? M2V.picHTML(w.pic) : ''}</div>` +
    `<button type="button" class="word-close" aria-label="Close" onclick="app.showWord('${w.key}')">✕</button></div>`;
  return `<div class="word-row"><span class="word-label" aria-hidden="true">📖 Word help:</span>${chips}</div>${card}`;
}
function speakWordCard(btn) {
  if (activeSpeakBtn === btn) { stopActiveSpeech(); return; }
  stopActiveSpeech();
  const spans = Array.from(btn.parentElement.querySelectorAll('.word-card-text .wrd')).filter(s => !s.closest('.m2-vis') && /[A-Za-z0-9+=×÷−<>□]/.test(s.textContent));   // a card's picture is not read
  if (!spans.length) return;
  activeSpeakBtn = btn;
  btn.textContent = '⏹';
  // the card's word, then a stop: "times as many. Times as many means …" (the dash on screen is not read)
  const word = Array.from(btn.parentElement.querySelectorAll('.word-card-means strong .wrd')).pop();
  const u = new SpeechSynthesisUtterance(sayWords(spans, spans.map(sp => sp.textContent + (sp === word && !/[.!?:]$/.test(sp.textContent) ? '.' : '')).join(' ')));
  english(u); u.rate = READ_RATE;
  u.onboundary = e => {
    if (e.name !== 'word') return;
    spans.forEach(el => el.classList.remove('hl'));
    lightAt(spans, u.text, e.charIndex);
  };
  u.onend = () => {
    spans.forEach(el => el.classList.remove('hl'));
    if (activeSpeakBtn === btn) { btn.textContent = '🔊'; activeSpeakBtn = null; }
  };
  addHighlightFallback(u, spans);
  window.speechSynthesis.speak(u);
}

/* ── PART BANNER (Marcos 10/8: "I want to be able to know which part the
   students are on") — a big colored label on top of every question:
   the step number and the part's name, one color per part. ── */
const PART_BANNER = { W: ['🔥', 'Step 1 · Warm-Up', 'pb-warm-up'], P: ['🌱', 'Step 2 · Practice', 'pb-practice-a'], A: ['📝', 'Step 3 · Test Form A', 'pb-quiz'], B: ['📝', 'Step 4 · Test Form B', 'pb-quiz'] };
const retakeTag = form => (app.isRetake && isTest(form) ? ' — Retake' : '');
function setPartBanner(form) {
  const el = document.getElementById('part-banner');
  const p = PART_BANNER[form];
  if (!el || !p) return;
  el.className = 'part-banner ' + p[2];
  el.innerHTML = `<span aria-hidden="true">${p[0]}</span> ${p[1]}${retakeTag(form)}` +
    (reviewMode ? ' <span class="pb-teacher">(teacher view)</span>' : '');
}

/* ── HIGHLIGHT FALLBACK ─────────────────────────────
   Some voices (and some browsers) never fire word-boundary
   events, so the highlight would never move. If no boundary
   arrives shortly after speaking starts, step through the
   words on a timer paced by word length and speech rate. */
function addHighlightFallback(u, spans) {
  let fired = false, i = 0, ended = false;
  const prevB = u.onboundary, prevE = u.onend;
  u.onboundary = e => { if (e.name === 'word' && !fired) { fired = true; clearTimeout(hlTimer); } if (prevB) prevB(e); };
  // The end of the speech always stops the highlight, however the voice reports it:
  // a normal end, an error or cancel, or (some Chromebook voices) no event at all,
  // which the watch below catches by seeing the voice go quiet AFTER it started.
  // A voice that never starts is left alone: the page's own no-sound wait handles that.
  const finish = e => {
    if (ended) return;
    ended = true;
    clearInterval(watch);
    clearTimeout(hlTimer);
    spans.forEach(s => s.classList.remove('hl'));
    liveUtterances.delete(u);
    if (prevE) prevE(e || {});
  };
  u.onend = finish;
  u.onerror = finish;
  // Chrome can drop an utterance's events if nothing else holds on to it.
  liveUtterances.add(u);
  let started = false, quietTicks = 0;
  const prevS = u.onstart;
  u.onstart = e => { started = true; if (prevS) prevS(e); };
  const watch = setInterval(() => {
    const voice = window.speechSynthesis;
    if (voice.speaking) { started = true; quietTicks = 0; return; }
    quietTicks = started && !voice.pending ? quietTicks + 1 : 0;
    if (quietTicks >= 2) finish();
  }, 400);
  const step = () => {
    if (fired || ended) return;
    spans.forEach(s => s.classList.remove('hl'));
    if (i >= spans.length) return;
    const w = spans[i++];
    w.classList.add('hl');
    const len = (w.textContent || '').replace(/[^A-Za-z0-9]/g, '').length;
    hlTimer = setTimeout(step, Math.max(280, len * 70 + 120) / (u.rate || 1));
  };
  clearTimeout(hlTimer);
  hlTimer = setTimeout(step, 500);
}

/* ── ATTEMPT TRACKING ───────────────────────────────── */
function getFormAttempts(name) {
  const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
  const counts = { W: 0, P: 0, A: 0, B: 0 };
  scores.filter(s => s.name === name && s.done).forEach(s => {
    if (counts[s.form] !== undefined) counts[s.form]++;
  });
  return counts;
}

/* ── WORK FROM OTHER CHROMEBOOKS (Marcos 11/6: "do option 2") ──
   This device remembers only the tries made on it, so a student who finished three parts on another Chromebook
   was sent back to the Warm-Up. At sign-in the site asks the sheet for this ONE student's finished tries (the
   sheet script's 'progress' read, a POST so the name is not in the address). For each part where the sheet has
   more finished tries than this device, the missing ones are added here, best first — so every lock and each
   test's one try count them. No answer in 8 s, or no network: the site goes on with
   this device's own record, as before. */
const SHEET_WAIT_MS = 8000;
function addSheetTries(name, games) {
  const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
  let added = 0;
  FORMS.forEach(form => {
    const tries = ((games || {})[gameKey(form)] || [])
      .filter(t => Number(t.total) > 0)
      .sort((a, b) => b.score / b.total - a.score / a.total);   // best first: the best score always comes over
    const here = scores.filter(s => s.name === name && s.form === form && s.done).length;
    tries.slice(0, Math.max(0, tries.length - here)).forEach((t, i) => {
      const at = new Date(t.finishedAt), when = isNaN(at) ? new Date() : at;
      scores.push({ name, form, attempt: here + i + 1, score: Number(t.score), total: Number(t.total),
        pct: Math.round(t.score / t.total * 100), elapsed: 0, date: when.toLocaleDateString(),
        time: when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), done: true, fromSheet: true });
      added++;
    });
  });
  if (added) localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  return added;
}
function loadSheetProgress(name) {
  if (SHARE_MODE || !name || /\(Guest\)$/.test(name)) return Promise.resolve(0);
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctl) ctl.abort(); }, SHEET_WAIT_MS);
  return fetch(SHEET_URL, { method: 'POST', body: JSON.stringify({ action: 'progress', name, games: FORMS.map(gameKey) }), signal: ctl ? ctl.signal : undefined })
    .then(r => r.json())
    .then(d => (d && d.name === name ? addSheetTries(name, d.games) : 0))
    .catch(() => 0)
    .finally(() => clearTimeout(timer));
}
let sheetProgressToken = 0;

/* Each test is one try. Once Test Form A (or B) is finished on this device (or on the sheet) its button reads
   "Finished"; a retake needs the Teacher PIN every time. The Warm-Up and the Practice have no limit. */
function testDone(name, form) {
  return isTest(form) && (getFormAttempts(name)[form] || 0) > 0;
}

/* ── THE GATES (see PASS_PCT) ── */
/* This student's best finished attempt at a part on this device, or null */
function bestScore(name, form) {
  const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
  return scores.filter(s => s.name === name && s.form === form && s.done && s.total > 0)
    .reduce((best, s) => (!best || s.score / s.total > best.score / best.total ? s : best), null);
}
function passed(name, form) {
  const best = bestScore(name, form);
  return !!best && best.score / best.total * 100 >= PASS_PCT;
}
/* How many right it takes: 70% of 16 questions = 12 (Warm-Up: 70% of 9 = 7) */
function needFor(form) {
  return Math.ceil(PASS_PCT / 100 * scoredCount(window['FORM_' + form]));
}
/* Why the Warm-Up is not open for this student yet ('' = it is open): it has no gate */
function warmUpWait(name) {
  return '';
}
/* Why the Practice is not open for this student yet ('' = it is open). A student who already passed the
   Practice keeps it. */
function practiceWait(name) {
  if (ANY_ORDER || SHARE_MODE || passed(name, 'P')) return '';
  const a = getFormAttempts(name);
  if (!a.W) return 'Finish the Warm-Up first';
  if (!passed(name, 'W')) return `Get ${needFor('W')} of ${scoredCount(window.FORM_W)} on the Warm-Up first`;
  return '';
}
/* Why Test Form A is not open for this student yet ('' = it is open): 70% on the Practice (best try counts) */
function testAWait(name) {
  if (ANY_ORDER || SHARE_MODE) return '';
  const a = getFormAttempts(name);
  if (a.P === 0) return 'Finish the Practice first';
  if (!passed(name, 'P')) return `Get ${needFor('P')} of ${scoredCount(window.FORM_P)} on the Practice first`;
  return '';
}
/* Why Test Form B is not open for this student yet ('' = it is open): Test Form A finished, any score */
function testBWait(name) {
  if (ANY_ORDER || SHARE_MODE) return '';
  return getFormAttempts(name).A === 0 ? 'Finish Test Form A first' : '';
}
function waitFor(form, name) {
  return form === 'P' ? practiceWait(name) : form === 'A' ? testAWait(name) : form === 'B' ? testBWait(name) : warmUpWait(name);
}

/* A form that is not open yet shows a gray "Not open yet" button. waiting = open but not yet earned: looks locked,
   still tappable so it can explain why (the Teacher PIN lets the student past). done = a finished test: looks
   locked, still tappable so the teacher can give a retake. */
function setFormButton(form, label, sub, waiting, done) {
  const btn = document.getElementById('btn-form-' + form);
  if (!btn) return;
  const open = formOpen(form);
  btn.disabled = !open;
  btn.classList.toggle('locked', !open || !!waiting || !!done);
  btn.innerHTML = !open
    ? `🔒 ${label.replace(/^\S+\s/, '')}<span class="form-btn-sub">${schoolOnly(form) ? 'At school only' : 'Not open yet'}</span>`
    : waiting
      ? `🔒 ${label.replace(/^\S+\s/, '')}<span class="form-btn-sub">${waiting}</span>`
      : done
        ? `🔒 ${label.replace(/^\S+\s/, '')}<span class="form-btn-sub">${done}</span>`
        : `${label}<span class="form-btn-sub">${sub}</span>`;
}

/* The numbers the start screen and the directions say (how many questions, how many to pass) come from the data,
   so they stay right when data/ is made again: <span data-count="W"></span> · <span data-need="P"></span> */
function fillCounts() {
  document.querySelectorAll('[data-count]').forEach(el => { el.textContent = String(scoredCount(window['FORM_' + el.dataset.count])); });
  document.querySelectorAll('[data-need]').forEach(el => { el.textContent = String(needFor(el.dataset.need)); });
}

function applyFormLocks(name) {
  // Warm-Up: no limit. After a try the button shows the best score and what opens the Practice.
  const bestW = bestScore(name, 'W'), nW = scoredCount(window.FORM_W);
  setFormButton('W', '🔥 Warm-Up',
    !bestW ? `watch, then try · ${nW} questions · 💡 hints`
    : passed(name, 'W') ? `✅ Best: ${bestW.score} of ${bestW.total} · do it again any time`
    : `🔁 Best: ${bestW.score} of ${bestW.total} · get ${needFor('W')} to open the Practice`,
    warmUpWait(name));
  // Practice: waits for 70% on the Warm-Up; no limit. After a try the button shows the best score and what opens Test Form A.
  const bestP = bestScore(name, 'P'), nP = scoredCount(window.FORM_P);
  setFormButton('P', '🌱 Practice',
    !bestP ? `${nP} questions · 💡 hints read to you`
    : passed(name, 'P') ? `✅ Best: ${bestP.score} of ${bestP.total} · practice again any time`
    : `🔁 Best: ${bestP.score} of ${bestP.total} · get ${needFor('P')} to open Test Form A`,
    practiceWait(name));
  // The tests: one try each; a finished one waits for the Teacher PIN (then reads "Retake")
  ['A', 'B'].forEach(form => {
    const n = scoredCount(window['FORM_' + form]);
    const done = testDone(name, form);
    const again = done && retakeFor === form;
    setFormButton(form, again ? `🔁 Retake ${FORM_NAMES[form]}` : `📝 ${FORM_NAMES[form]}`,
      again ? `Unlocked by your teacher · ${n} questions · one try` : `${n} questions · one try`,
      done ? '' : waitFor(form, name),
      done && !again ? '✅ Finished · a retake needs your teacher' : '');
  });
}

/* ── SPEAK DIRECTIONS ───────────────────────────────── */
function speakDir(btn) {
  if (activeSpeakBtn === btn) { stopActiveSpeech(); return; }
  stopActiveSpeech();

  const p = btn.closest('.dir-section').querySelector('.dir-text');
  if (!p) return;
  if (!p.querySelector('.wrd')) p.innerHTML = wrapWords(p.innerHTML);

  const spans = Array.from(p.querySelectorAll('.wrd'));
  if (!spans.length) return;

  activeSpeakBtn = btn;
  btn.textContent = '⏹';

  const speechText = spans.map(s => s.textContent).join(' ');
  const u = new SpeechSynthesisUtterance(speechText);
  english(u); u.rate = READ_RATE;

  u.onboundary = e => {
    if (e.name !== 'word') return;
    document.querySelectorAll('.dir-text .wrd.hl').forEach(el => el.classList.remove('hl'));
    lightAt(spans, u.text, e.charIndex);
  };
  u.onend = () => {
    document.querySelectorAll('.dir-text .wrd.hl').forEach(el => el.classList.remove('hl'));
    if (activeSpeakBtn === btn) { btn.textContent = '🔊'; activeSpeakBtn = null; }
  };
  addHighlightFallback(u, spans);
  window.speechSynthesis.speak(u);
}

/* ── READ-ALOUD INTRO SPEAKS ITSELF ─────────────────
   Marcos 10/6: the "Read Aloud is Available!" screen announces itself
   the moment it opens — no reading, no button. The click on "Let's Get
   Started!" is the user gesture the browser needs. The icons are said
   as words, and each word lights up as it is read. Leaving the screen
   (app.show) cancels the speech. */
const INTRO_SAY = { '🔊': 'the speaker button', '⏹': 'the stop button', '—': ',' };
const READ_RATE = 0.82;    // every read-aloud a student taps (Marcos 10/26: "I like the 0.82. It's clear and easy to listen to.")
/* THE SAME VOICE AS QPS (Marcos 10/28, on Parts of Speech HQ: "why can't this site talk like QPS" · "the reading
   speed also sounds different on QPS"; after the fix: "i like the sound and pacing of the read aloud"): every reading
   asks for English and uses the device's own default English voice, picked the way the QPS Literacy Hub picks it
   (qps-literacy-hub/readaloud.js). Asking only for "en-US" let the browser choose a different voice, which sounds
   different at the same 0.82. A device that lists no voices yet still gets English. */
let _enVoice = null;
function englishVoice() {
  if (_enVoice) return _enVoice;
  const all = (window.speechSynthesis && speechSynthesis.getVoices && speechSynthesis.getVoices()) || [];
  const isEn = v => /^en([-_]|$)/i.test((v && v.lang) || ''), us = v => /^en[-_]US$/i.test(v.lang || '');
  _enVoice = all.find(v => v.default && isEn(v)) || all.find(v => us(v) && v.localService) || all.find(us) || all.find(isEn) || null;
  return _enVoice;                         // null until the device lists its voices (Chrome lists them late): asked again next time
}
function english(u) {
  u.lang = 'en-US';
  const v = englishVoice();
  if (v) { try { u.voice = v; } catch (e) { /* a voice the browser won't take: en-US still asks for English */ } }
  return u;
}
const INTRO_RATE = 0.82;   // Marcos 10/6: 0.92 ran ahead of the highlight
let introToken = 0, introTimer = null;
let introMsPerChar = null, introMsPerWord = null;   // learned from this device's voice
function speakReadAloudIntro() {
  stopActiveSpeech();
  clearTimeout(introTimer);
  const screen = document.getElementById('readaloud-screen');
  const els = Array.from(screen.querySelectorAll('.ra-read'));
  els.forEach(el => { if (!el.querySelector('.wrd')) el.innerHTML = wrapWords(el.innerHTML); });
  // One piece per SENTENCE (Marcos 10/6: the end of a long sentence lost its
  // highlight). Each piece = the words to say + the on-screen word each one lights.
  const pieces = [];
  els.forEach(el => {
    let words = [], wordSpan = [];
    const flush = () => { if (words.length) pieces.push({ words, wordSpan }); words = []; wordSpan = []; };
    el.querySelectorAll('.wrd').forEach(sp => {
      const t = sp.textContent.replace(/\uFE0F/g, '').trim();
      const key = t.replace(/[.!?,]+$/, ''), punct = t.slice(key.length);   // "🔊." → icon + "."
      let say = INTRO_SAY[key] != null ? INTRO_SAY[key] + punct : (/[A-Za-z0-9]/.test(t) ? t : '');
      if (!say) return;
      if (say === ',') { if (words.length) words[words.length - 1] += ','; return; }
      if (/^the /.test(say) && /^(every|each)$/i.test(words[words.length - 1] || '')) say = say.slice(4);
      // past-tense "read" ("is read aloud") must sound like "red", not "reed" (Marcos 10/6)
      if (/^read[.!?,]?$/i.test(say) && /^(is|was|are|were|be|been|being)$/i.test(words[words.length - 1] || '')) say = say.replace(/^read/i, 'red');
      say.split(' ').forEach(w => { words.push(w); wordSpan.push(sp); });
      if (/[.!?]$/.test(say)) flush();
    });
    if (words.length && !/[.!?,]$/.test(words[words.length - 1])) words[words.length - 1] += '.';
    flush();
  });
  const factor = (typeof READ_SPEEDS !== 'undefined' && typeof readSpeed !== 'undefined' && READ_SPEEDS[readSpeed]) ? READ_SPEEDS[readSpeed].factor : 1;
  const rate = INTRO_RATE * factor;
  const token = ++introToken;
  const live = () => token === introToken && !screen.classList.contains('hidden');
  const sayPiece = k => {
    if (!live() || k >= pieces.length) return;
    const p = pieces[k];
    const text = p.words.join(' ');
    const starts = []; let pos = 0;
    p.words.forEach(w => { starts.push(pos); pos += w.length + 1; });
    const lit = new Set(p.wordSpan);
    let idx = -1, lastHeard = 0, startedAt = 0, viaVoice = false;
    const mark = j => {
      j = Math.max(0, Math.min(j, p.words.length - 1));
      if (j === idx) return;
      idx = j;
      lit.forEach(sp => sp.classList.remove('hl'));
      p.wordSpan[j].classList.add('hl');
    };
    // Watchdog: when the voice goes quiet about word positions (some voices
    // never report them, Chrome sometimes stops partway), step on at a
    // speaking pace — never past the last word, which stays lit until the end.
    // Pace comes from how long this voice really took on the sentences before
    // (first sentence: a guess), so the highlight keeps up on any voice.
    // (a hair quick on purpose: the last word stays lit until the voice ends, so early is safe, late is not)
    const wordMs = w => introMsPerChar ? 0.92 * (w.length + 1) * introMsPerChar : (120 + w.replace(/[^A-Za-z0-9]/g, '').length * 55) / rate;
    const tick = () => {
      if (!live()) return;
      // while the voice is reporting words it leads; step in only once it has gone quiet
      const base = wordMs(p.words[idx] || ''), quiet = Date.now() - lastHeard;
      const avg = Math.max(base, introMsPerWord || 0);   // a normal pause between reported words is never "quiet"
      if (idx >= 0 && viaVoice && quiet > avg * 1.8) {
        const n = Math.max(1, Math.floor(quiet / avg));   // catch up the words said while it was quiet
        viaVoice = false; mark(idx + n); lastHeard += n * avg;
      } else if (idx >= 0 && !viaVoice && quiet > base) {
        mark(idx + 1); lastHeard = Math.min(Date.now(), lastHeard + base);   // keep exact time between steps
      }
      introTimer = setTimeout(tick, 60);
    };
    const u = new SpeechSynthesisUtterance(text);
    english(u); u.rate = rate;
    u.onstart = () => { startedAt = lastHeard = Date.now(); mark(0); clearTimeout(introTimer); tick(); };
    u.onboundary = e => {
      if (e.name !== 'word') return;
      let j = 0;
      while (j + 1 < starts.length && starts[j + 1] <= e.charIndex) j++;
      mark(j); lastHeard = Date.now(); viaVoice = true;
    };
    u.onend = () => {
      clearTimeout(introTimer);
      const took = Date.now() - startedAt;
      if (startedAt && live() && took > 300) {   // learn the voice's real speed (skip cancelled/odd pieces)
        const perChar = took / (text.length + 1);
        introMsPerChar = introMsPerChar ? (introMsPerChar + perChar) / 2 : perChar;
        const perWord = took / p.words.length;
        introMsPerWord = introMsPerWord ? (introMsPerWord + perWord) / 2 : perWord;
      }
      lit.forEach(sp => sp.classList.remove('hl'));
      if (live()) introTimer = setTimeout(() => sayPiece(k + 1), 250);
    };
    window.speechSynthesis.speak(u);
  };
  sayPiece(0);
}

/* Light the word the voice is on. The voice says where it is in the text (charIndex); it does NOT signal every
   word — Samantha in Chrome gave no signal for "example:" after "For" (measured in Marcos's Chrome 10/28) — so
   moving one word per signal fell further behind with each skipped word ("the highlighting can't keep up").
   A text made by sayWords has its own list of where each word starts; any other spoken text has one token per
   span, joined by single spaces. Gives back the lit span. */
function lightAt(spans, text, charIndex) {
  const said = SAID_AT.get(spans);
  let j = 0, start = 0;
  if (said && said.text === text) said.starts.forEach((st, k) => { if (st <= charIndex) j = k; });
  else String(text).split(' ').forEach((tok, k) => { if (start <= charIndex) j = k; start += tok.length + 1; });
  spans.forEach(sp => sp && sp.classList.remove('hl'));
  if (spans[j]) spans[j].classList.add('hl');
  return spans[j];
}
/* What the voice is told for these spans. The words change on the way to the voice ("3/4" is said "three
   fourths", "?" is said "question mark", "<" before "less than" is not said), so lightAt cannot count tokens in
   it: each word starts where the rest of the text, said from that word on, starts. That list is kept for
   lightAt. raw = the text as written; words = each span's word, as raw has it. */
const SAID_AT = new WeakMap();
function sayWords(spans, raw = spans.map(sp => sp.textContent).join(' '), words = spans.map(sp => sp.textContent)) {
  const text = convertToSpokenText(raw);
  let from = 0;
  const starts = words.map(w => {
    const at = raw.indexOf(w, from);
    if (at < 0) return NaN;   // not in raw as written: never lit, the rest still line up
    from = at + w.length;
    return text.length - convertToSpokenText(' ' + raw.slice(at)).length;
  });
  SAID_AT.set(spans, { text, starts });
  return text;
}
function wrapWords(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  let idx = 0;
  function walk(node) {
    if (node.nodeType === 3) {
      const text = node.textContent.replace(/—/g, ' — ').replace(/  +/g, ' ');
      const words = text.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      words.forEach(part => {
        if (/\S/.test(part)) {
          const sp = document.createElement('span');
          sp.className = 'wrd'; sp.dataset.wi = idx++; sp.textContent = part;
          frag.appendChild(sp);
        } else if (part) {
          frag.appendChild(document.createTextNode(part));
        }
      });
      node.parentNode.replaceChild(frag, node);
    } else {
      [...node.childNodes].forEach(walk);
    }
  }
  walk(tmp);
  return tmp.innerHTML;
}

/* ══════════════════════════════════════════════════════
   APP OBJECT
══════════════════════════════════════════════════════ */
/* ── SESSION EVENT LOG ───────────────────────────────
   start · leave · return · resume · close · finish, each with the
   on-task clock. elapsed is time ON TASK: the timer pauses while the
   page is hidden and counts ticks, so a slept device cannot inflate it. */
function logEvent(kind, extra) {
  if (!app.events) app.events = [];
  app.events.push(Object.assign({
    at: new Date().toISOString(),
    e:  kind,
    q:  (app.currentIndex || 0) + 1,
    on: app.timerSeconds || 0
  }, extra || {}));
  if (app.events.length > 200) app.events.splice(0, app.events.length - 200);
}

/* ── PINNED FORM LABEL (form-label.js) ──────────────────
   A big colored label pinned to the top of the test screens naming
   the form or part this student is on, so Mr. O can read it from
   across the room (Marcos 10/20). show() calls syncFormLabel(). */
const PART_LABEL_COLORS = { 'pb-pre-warm-up': '#9c640c', 'pb-warm-up': '#d35400', 'pb-practice-a': '#1e8449', 'pb-practice-b': '#117a65', 'pb-review': '#2471a3', 'pb-quiz': '#3b2491' };
let formLabelShown = null;   // [form, text, color] — the results screen keeps the label the questions had
function syncFormLabel(screenId) {
  if (!window.FormLabel) return;
  const f = app.currentForm, p = PART_BANNER[f];
  if (!p || !['quiz-screen', 'end-screen'].includes(screenId)) return FormLabel.hide();
  if (screenId === 'end-screen' && formLabelShown && formLabelShown[0] === f + retakeTag(f)) return FormLabel.show(formLabelShown[1], formLabelShown[2]);
  const text = `${p[0]} ${p[1]}${retakeTag(f)}`;
  formLabelShown = [f + retakeTag(f), text, PART_LABEL_COLORS[p[2]] || 'slate'];
  FormLabel.show(text, formLabelShown[2]);
}

const app = {

  /* ── state ── */
  studentName:       '',
  currentForm:       '',
  currentBank:       [],
  currentIndex:      0,
  score:             0,
  streak:            0,
  missedQuestions:   [],
  currentAttemptNum: 1,
  selectedAnswer:    null,    // multiple choice: the choice picked
  gridPicks:         null,    // True/False table: one pick per row ('True' / 'False' / null)
  msPicks:           null,    // select all: the option texts picked
  isRetake:          false,   // a test taken again with the Teacher PIN
  questionLocked:    false,
  timerSeconds:      0,
  timerInterval:     null,
  timerOn:           false,
  instructInterval:  null,
  readInterval:      null,
  nextInterval:      null,

  /* ── screens ── */
  show(id) {
    ['start-screen','readaloud-screen','directions-screen','quiz-screen','end-screen','scoreboard-screen','teacher-screen','key-screen','slide-screen']
      .forEach(s => document.getElementById(s).classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    syncFormLabel(id);
    window.scrollTo(0, 0);   // every new screen starts at the top
    window.speechSynthesis.cancel();
  },

  /* ── INIT ── */
  init() {
    this.show('start-screen');
    document.getElementById('welcome-panel').classList.remove('hidden');
    document.getElementById('student-login-panel').classList.add('hidden');
  },

  /* ── READ ALOUD INTRO ── */
  showReadAloudIntro() {
    if (!SHARE_MODE && (!ANY_OPEN)) return;
    document.getElementById('welcome-panel').classList.add('hidden');
    this.show('readaloud-screen');
    introTimer = setTimeout(speakReadAloudIntro, 150);   // announces itself (show() just cancelled any speech; leaving first cancels this)
    const btn   = document.getElementById('readaloud-btn');
    const fill  = document.getElementById('readaloud-fill');
    const count = document.getElementById('readaloud-count');
    btn.disabled = true; btn.style.opacity = '0.45'; btn.style.cursor = 'not-allowed';
    count.textContent = 6;
    fill.style.transition = 'none';
    fill.style.width = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = 'width 6s linear';
      fill.style.width = '0%';
    }));
    let remaining = 6;
    const iv = setInterval(() => {
      remaining--;
      count.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(iv);
        btn.disabled = false; btn.style.opacity = '1';
        btn.style.cursor = 'pointer'; btn.textContent = "✅ Got It — Show Me the Directions!";
      }
    }, 1000);
  },

  /* ── DIRECTIONS ── */
  showDirections() {
    this.show('directions-screen');
    this.startInstructionsTimer();
  },

  showLogin() {
    if (this.instructInterval) { clearInterval(this.instructInterval); this.instructInterval = null; }
    window.speechSynthesis.cancel();
    document.querySelectorAll('.dir-text .wrd.hl').forEach(e => e.classList.remove('hl'));
    this.studentName = '';
    loggedInName = '';
    document.getElementById('resume-container').classList.add('hidden');
    document.getElementById('form-select-section').classList.add('hidden');
    const loginCard = document.getElementById('login-step-card');
    if (loginCard) loginCard.classList.remove('hidden');
    this.show('start-screen');
    document.getElementById('welcome-panel').classList.add('hidden');
    document.getElementById('student-login-panel').classList.remove('hidden');
    if (SHARE_MODE) this._shareSignIn();
  },

  /* Shared preview: no roster, no student number — straight to the parts. */
  _shareSignIn() {
    loggedInName     = 'Guest';
    this.studentName = 'Guest';
    const loginCard = document.getElementById('login-step-card');
    if (loginCard) loginCard.classList.add('hidden');
    document.getElementById('form-select-section').classList.remove('hidden');
    applyFormLocks(this.studentName);
    this.checkResume();
  },

  /* ── NAME SELECT ── */
  onNameSelect() {
    const val = document.getElementById('name-select').value;
    const pinSec   = document.getElementById('pin-section');
    const guestSec = document.getElementById('guest-name-section');
    document.getElementById('login-error').textContent = '';
    if (!val) { pinSec.classList.add('hidden'); return; }
    pinSec.classList.remove('hidden');
    if (val.startsWith('GUEST:')) {
      guestSec.classList.remove('hidden');
      document.getElementById('pin-label').textContent = '🔒 Enter guest code:';
    } else {
      guestSec.classList.add('hidden');
      document.getElementById('pin-label').textContent = '🔒 Enter your student number:';
    }
    setTimeout(() => document.getElementById('student-pin').focus(), 80);
  },

  /* ── LOGIN ── */
  attemptLogin() {
    const selVal = document.getElementById('name-select').value;
    const pin    = document.getElementById('student-pin').value.trim();
    const errEl  = document.getElementById('login-error');
    errEl.textContent = ''; errEl.style.color = '#c0392b';

    if (!selVal) { errEl.textContent = '⚠️ Please select your name.'; return; }
    if (!pin)    { errEl.textContent = '⚠️ Please enter your student number.'; return; }

    let matched = false, displayName = '';

    if (selVal.startsWith('GUEST:')) {
      const code = selVal.replace('GUEST:', '');
      if (pin === code) {
        const firstName = (document.getElementById('guest-display-name').value || '').trim();
        if (!firstName) { errEl.textContent = '⚠️ Please enter your first name.'; return; }
        matched = true;
        displayName = firstName + ' (Guest)';
      } else {
        errEl.textContent = '❌ Incorrect guest code. Try again.'; return;
      }
    } else {
      const student = ROSTER.find(s => s.name === selVal);
      if (student && student.id === pin) {
        matched = true; displayName = selVal;
      } else {
        errEl.textContent = '❌ Incorrect student number. Try again.'; return;
      }
    }

    if (matched) {
      loggedInName     = displayName;
      this.studentName = displayName;
      document.getElementById('student-pin').value = '';
      document.getElementById('login-error').textContent = '';
      const loginCard = document.getElementById('login-step-card');
      if (loginCard) loginCard.classList.add('hidden');
      document.getElementById('form-select-section').classList.remove('hidden');
      retakeFor = '';           // a PIN unlock never carries over to the next student
      applyFormLocks(displayName);
      this.checkResume();
      this.waitForSheetWork(displayName);
    }
  },

  /* The parts wait a moment while the sheet is asked for this student's work from other Chromebooks */
  waitForSheetWork(name) {
    const section = document.getElementById('form-select-section');
    const token = ++sheetProgressToken;
    section.classList.add('loading-work');
    loadSheetProgress(name).then(added => {
      if (token !== sheetProgressToken) return;           // another student signed in meanwhile
      section.classList.remove('loading-work');
      if (added && loggedInName === name) applyFormLocks(name);
    });
  },

  /* ── ATTEMPT START ── */
  attemptStart(form) {
    if (document.getElementById('form-select-section').classList.contains('loading-work')) return;   // still looking for their work
    if (!this.studentName || !FORMS.includes(form) || !formOpen(form)) return;
    // A test is one try — a finished one needs the Teacher PIN; the PIN unlocks ONE retake (the button then reads
    // "🔁 Retake …" and the student taps it to start: the same form, a new session id, "— Retake" on the sheet)
    if (isTest(form) && testDone(this.studentName, form)) {
      if (retakeFor === form) { retakeFor = ''; this.startSession(form, { retake: true }); return; }
      this.requestRetake(form);
      return;
    }
    // The gates: the Practice waits for 70% on the Warm-Up; Test Form A waits for 70% on the Practice; Test Form B
    // waits for a finished Test Form A. The Teacher PIN lets this one student past.
    const why = waitFor(form, this.studentName);
    if (why) {
      this.showPinModal(
        '📘 Not Yet',
        `${getFirstName(this.studentName)}: ${why.charAt(0).toLowerCase() + why.slice(1)}. ` +
        `Teachers: enter your PIN to let this student start ${form === 'P' ? 'the Practice' : form === 'W' ? 'the Warm-Up' : FORM_NAMES[form]} now.`,
        () => this.startSession(form)
      );
      return;
    }
    this.startSession(form);
  },

  /* ── RETAKE (Teacher PIN) ── */
  requestRetake(form) {
    if (!this.studentName || !isTest(form)) return;
    this.showPinModal(
      '🔑 Allow a Retake',
      `${getFirstName(this.studentName)} has finished ${FORM_NAMES[form]}. Enter Teacher PIN to let ${getFirstName(this.studentName)} take it again.`,
      () => { retakeFor = form; applyFormLocks(this.studentName); }
    );
  },

  /* ── 🧑‍🏫 THE TEACHER SCREEN (see TEACHER_KEY) ── */
  promptTeacherReview() {
    if (teacherUnlocked()) { this.openTeacher(); return; }
    this.showPinModal('🧑‍🏫 Teacher', 'Enter the Teacher PIN.', () => {
      try { sessionStorage.setItem(TEACHER_KEY, '1'); } catch (e) {}
      this.openTeacher();
    });
  },

  _teacherPick() {
    let p = null;
    try { p = JSON.parse(sessionStorage.getItem(TEACHER_PICK_KEY) || 'null'); } catch (e) {}
    const form = p && TEACH_PARTS.includes(p.form) ? p.form : 'W';   // the Warm-Up first
    const version = p && p.version >= 1 && p.version <= versionCount(form) ? p.version : 1;
    return { form, version };
  },

  openTeacher() {
    stopActiveSpeech();
    this._renderTeacher(this._teacherPick());
    this.show('teacher-screen');
  },

  /* A part, a version: one row of buttons each; the picked one is filled in. A new part keeps the version when it has
     one that high (the Test and the Retake have one). */
  teacherPick(change) {
    const t = Object.assign(this._teacherPick(), change);
    if (!(t.version >= 1 && t.version <= versionCount(t.form))) t.version = 1;
    this._renderTeacher(t);
  },

  _renderTeacher(t) {
    try { sessionStorage.setItem(TEACHER_PICK_KEY, JSON.stringify(t)); } catch (e) {}
    const btn = (on, label, change, id) =>
      `<button type="button" class="t-pick${on ? ' on' : ''}" data-id="${id}" aria-pressed="${on}" onclick='app.teacherPick(${JSON.stringify(change)})'>${label}</button>`;
    document.getElementById('t-parts').innerHTML = TEACH_PARTS
      .map(f => btn(f === t.form, `${formOpen(f) ? '' : '🔒 '}${FORM_NAMES[f]}`, { form: f }, f)).join('');
    const count = versionCount(t.form);
    document.getElementById('t-version-row').classList.toggle('hidden', count < 2);
    document.getElementById('t-versions').innerHTML = Array.from({ length: count }, (_, i) => i + 1)
      .map(v => btn(v === t.version, `Version ${v}`, { version: v }, v)).join('');
    document.getElementById('t-picked').textContent =
      `${this._teachLabel(t.form, t.version)} · ${formOpen(t.form) ? 'open to students' : '🔒 closed to students'}`;
  },

  _teachLabel(form, version) {
    return `${FORM_NAMES[form]}${versionCount(form) > 1 ? ' · Version ' + version : ''}`;
  },

  _teachBank(t) {
    const V = window['FORM_' + t.form + '_V'];
    return t.version > 1 && Array.isArray(V) && V[t.version - 1] ? V[t.version - 1] : window['FORM_' + t.form];
  },

  /* 👀 Try it as a student: the guest view, started on this part and version */
  teacherTry() {
    const t = this._teacherPick();
    location.href = `${location.pathname}${window.SHARE_LINK}&teach=${t.form}.${t.version}`;
  },

  /* 🖥️ SLIDE MODE (Marcos 10/30: "This would be good if a kid has a question and i can call them up to my desk or the
     board to answer a question and have the actual lesson to refer to"): the TEACHING only — data/slides.js, worked
     examples whose numbers are on no question (tools/difficulty.js checks). The set-up picture first, one step per
     tap, the worked picture with the last step. Never a scored question. Nothing is saved or sent. */
  teacherSlides() {
    const list = window.SLIDES || [];
    if (!list.length) return;
    this._slides = { list, at: 0, step: 0 };
    this.show('slide-screen');
    document.body.classList.add('slides-active');
    const jump = document.getElementById('sl-jump');
    jump.innerHTML = '';
    list.forEach((sl, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = `${i + 1}. ${sl.title}`; jump.appendChild(o); });
    this._renderSlide();
  },

  _renderSlide() {
    const S = this._slides, sl = S.list[S.at];
    stopActiveSpeech();
    const done = S.step >= sl.steps.length;
    const pic = done ? sl.pic : sl.setup;
    document.getElementById('sl-count').textContent = `Slide ${S.at + 1} of ${S.list.length}`;
    document.getElementById('sl-jump').value = String(S.at);
    document.getElementById('sl-body').innerHTML =
      `<p class="sl-where">👀 Worked example ${S.at + 1} of ${S.list.length}</p><h2 class="sl-h">${formatMathText(sl.title)}</h2>` +
      (pic ? `<div class="sl-pic">${M2V.explainHTML(pic)}</div>` : '') +
      `<ol class="sl-steps">${sl.steps.slice(0, S.step).map((l, i) =>
        `<li class="sl-line${i === S.step - 1 ? ' sl-new' : ''}${done && i === sl.steps.length - 1 ? ' sl-ans' : ''}">${formatMathText(l)}</li>`).join('')}</ol>`;
    const last = S.at + 1 >= S.list.length;
    const next = document.getElementById('sl-next');
    next.disabled = done && last;
    next.textContent = !done ? (S.step === 0 ? '🪜 First step' : S.step === sl.steps.length - 1 ? '✅ Last step' : '🪜 Next step') : last ? '🏁 Last slide' : 'Next slide ▶';
    document.getElementById('sl-back').disabled = S.at === 0 && S.step === 0;
    document.getElementById('sl-prev').disabled = S.at === 0;
    document.getElementById('sl-fwd').disabled = last;
    const newest = document.querySelector('#sl-body .sl-new');
    if (newest) newest.scrollIntoView({ block: 'nearest' }); else window.scrollTo(0, 0);
  },

  slideNext() {
    const S = this._slides;
    if (!S) return;
    if (S.step < S.list[S.at].steps.length) { S.step += 1; this._renderSlide(); return; }
    if (S.at + 1 >= S.list.length) return;
    S.at += 1; S.step = 0;
    this._renderSlide();
  },

  /* Back takes away the last step; at a slide's start it goes to the slide before, all its steps shown */
  slideBack() {
    const S = this._slides;
    if (!S) return;
    if (S.step > 0) { S.step -= 1; this._renderSlide(); return; }
    if (S.at === 0) return;
    S.at -= 1; S.step = S.list[S.at].steps.length;
    this._renderSlide();
  },

  slideGo(i) {
    const S = this._slides;
    if (!S || !(i >= 0 && i < S.list.length)) return;
    S.at = i; S.step = 0;
    this._renderSlide();
  },

  exitSlides() {
    stopActiveSpeech();
    this._slides = null;
    document.getElementById('sl-body').innerHTML = '';
    document.body.classList.remove('slides-active');
    this.openTeacher();
  },

  /* ✅ Answer key: every scored question of the picked part and version, in the data's order, the picture, the right
     answer ✅ — a choice, a typed number, each True/False row's answer, each select-all option ✓ or ✗ — and why with
     the worked picture. A child sees choices and options shuffled (shuffleQ), so the key has no letters. */
  teacherKey() {
    const t = this._teacherPick();
    const qs = this._teachBank(t).filter(isScored);
    const why = q => q.explanation || q.explain
      ? `<div class="key-why">${q.explanation ? `<b>Why:</b> ${formatMathText(q.explanation)}` : ''}${q.explain ? M2V.explainHTML(q.explain) : ''}</div>` : '';
    const kinds = { mc: 'multiple choice', entry: 'type a number', grid: 'True or False table', ms: 'select all that are true' };
    // the paper's own title (Marcos 11/4: "every print version should have a title"): Print hides the bar above,
    // so the printout says which part and version it is
    const html = [`<div class="key-print-head"><h1>SBAC Practice: Base Ten Answer Key — ${this._teachLabel(t.form, t.version)}</h1>` +
      `<p>Smarter Balanced IAB Practice · Number and Operations in Base Ten · Mr. O's 4th Grade · ${qs.length} questions</p></div>`,
      `<p class="key-note">Each child sees the choices (and the select-all options) in a shuffled order, so there are no letters here. The right answer has a ✅. True/False rows stay in this order.</p>`];
    qs.forEach((q, i) => {
      const pic = q.pic && !q.explain ? `<div class="key-pic">${M2V.picHTML(q.pic)}</div>` : '';   // the worked picture under Why shows the same model
      const skill = skillOf(q.id) ? ` · ${skillOf(q.id)}` : '';
      const kind = ` · ${kinds[qType(q)]}`;
      html.push(`<div class="key-q" data-type="${qType(q)}"><p class="key-where">Question ${i + 1} · ${q.id}${kind}${skill}</p>` +
        `<p class="key-ask">${formatMathText(q.q)}</p>${pic}${this._keyAnswerHTML(q)}${why(q)}</div>`);
    });
    document.getElementById('key-title').textContent = `✅ Answer key · ${this._teachLabel(t.form, t.version)}`;
    document.getElementById('key-body').innerHTML = html.join('');
    this.show('key-screen');
    window.scrollTo(0, 0);
  },

  /* The right answer, by kind of question */
  _keyAnswerHTML(q) {
    const type = qType(q);
    if (type === 'entry') {
      const also = (q.accept || []).filter(a => a !== String(q.answer).replace(/[,\s$]/g, ''));
      return `<p class="key-entry key-right">Answer: ${formatMathText(q.answer)} ✅` +
        `${q.digit ? ' <span class="key-small">(a one-digit box)</span>' : ''}</p>` +
        (also.length && !q.digit ? `<p class="key-small">Also accepted: ${also.map(formatMathText).join(', ')}</p>` : '') +
        (q.accept && q.accept.length > 1 && q.digit ? `<p class="key-small">Any of: ${q.accept.map(formatMathText).join(', ')}</p>` : '');
    }
    if (type === 'grid') {
      const cols = q.cols || ['True', 'False'];
      return `<table class="key-grid"><tr><th></th>${cols.map(c => `<th>${formatMathText(c)}</th>`).join('')}</tr>` +
        q.rows.map((r, k) => `<tr><td><span class="key-row-n">${k + 1}.</span> ${formatMathText(r.text)}` +
          `${r.why ? `<div class="key-row-why">${formatMathText(r.why)}</div>` : ''}</td>` +
          cols.map(c => `<td class="${c === r.answer ? 'key-right' : ''}">${c === r.answer ? '✅ ' + formatMathText(c) : ''}</td>`).join('') +
          '</tr>').join('') + '</table>';
    }
    if (type === 'ms') {
      return `<ul class="key-ms">${q.options.map(o =>
        `<li class="${o.right ? 'key-right' : 'key-wrong'}"><span class="key-mark">${o.right ? '✅ true' : '✗ not true'}</span> ` +
        `${formatMathText(o.text)}${o.why ? `<div class="key-row-why">${formatMathText(o.why)}</div>` : ''}</li>`).join('')}</ul>`;
    }
    return `<ul class="key-choices">${q.choices.map(c =>
      `<li class="${c === q.answer ? 'key-right' : ''}">${formatMathText(c)}${c === q.answer ? ' ✅' : ''}</li>`).join('')}</ul>`;
  },

  backToTeacher() {
    stopActiveSpeech();
    if (TEACH) { location.href = `${location.pathname}${window.SHARE_TEACHER ? window.SHARE_LINK : ''}#teacher`; return; }   // a teacher/admin guest keeps the guest link
    this.openTeacher();
  },

  exitTeacher() {
    try { sessionStorage.removeItem(TEACHER_KEY); } catch (e) {}
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    this.exitReviewMode();
  },

  /* A Try-it link: signed in as the guest, one tap to start (the tap also lets the device speak) */
  _teachReady() {
    const t = TEACH;
    if (!(t.version >= 1 && t.version <= versionCount(t.form))) return;
    this._shareSignIn();
    document.getElementById('student-login-panel').classList.add('hidden');
    document.getElementById('welcome-panel').classList.add('hidden');
    document.getElementById('teach-bar').classList.remove('hidden');
    document.body.classList.add('teach-on');
    document.getElementById('teach-what').textContent = this._teachLabel(t.form, t.version);
    document.getElementById('teach-ready').classList.remove('hidden');
  },

  teachStart() {
    document.getElementById('teach-ready').classList.add('hidden');
    this._teachVersion = TEACH.version;
    this.startSession(TEACH.form);
  },

  /* ⏩ Skip the wait: opens what a student is waiting on right now — the read time before the choices, the Listen on a
     worked example or after a miss, the pause before Next, the score screen's lock. Each opens the way waiting it out or
     hearing it to the end does. */
  teacherSkipWait() {
    stopActiveSpeech();
    if (typeof this._readOpen === 'function') this._readOpen();
    if (typeof this._gateOpen === 'function') this._gateOpen();
    if (this.nextInterval) {
      clearInterval(this.nextInterval);
      this.nextInterval = null;
      document.getElementById('next-timer-bar').classList.add('hidden');
      this.soakDone = true;
    }
    if (this.questionLocked && !document.getElementById('quiz-screen').classList.contains('hidden')) this._maybeShowNext();
    if (typeof this._scoreUnlock === 'function') this._scoreUnlock();
  },

  /* Go anywhere in the run (◀ menu ▶). A question skipped is not scored. */
  _teachList() {
    const kind = { mc: '', entry: ' · type a number', grid: ' · True/False', ms: ' · select all' };
    const tag = q => q.kind === 'watch' ? '👀 Watch' : q.kind === 'step' ? '🪜 Step' : `✏️ Question ${q.id}${kind[qType(q)]}`;
    return (this.currentBank || []).map((q, i) => ({ i, label: `${i + 1}. ${tag(q)}${q.title ? ': ' + q.title : ''}` }));
  },

  _teachSync() {
    const list = this._teachList();
    const jump = document.getElementById('teach-jump');
    document.getElementById('teach-bar').classList.add('started');
    if (jump.options.length !== list.length) {
      jump.innerHTML = '';
      list.forEach((it, k) => { const o = document.createElement('option'); o.value = String(k); o.textContent = it.label; jump.appendChild(o); });
    }
    jump.value = String(this.currentIndex);
    document.getElementById('teach-prev').disabled = this.currentIndex <= 0;
    document.getElementById('teach-next').disabled = this.currentIndex >= list.length - 1;
  },

  teachGo(k) {
    if (!(k >= 0 && k < (this.currentBank || []).length)) return;
    stopActiveSpeech();
    if (this.nextInterval) { clearInterval(this.nextInterval); this.nextInterval = null; }
    if (this.readInterval) { clearInterval(this.readInterval); this.readInterval = null; }
    if (document.getElementById('quiz-screen').classList.contains('hidden')) this.show('quiz-screen');
    this.twin = null;
    this.currentIndex = k;
    this.renderQuestion();
  },

  teachStep(d) { this.teachGo(this.currentIndex + d); },

  exitReviewMode() {
    reviewMode    = false;
    reviewAutoRun = false;
    this.stopTimerEngine();
    const banner = document.getElementById('review-mode-banner');
    if (banner) banner.classList.add('hidden');
    this.show('start-screen');
    document.getElementById('welcome-panel').classList.remove('hidden');
    document.getElementById('student-login-panel').classList.add('hidden');
  },

  /* The question on screen: the "try one like it" twin while one is up, else the form's own question */
  currentQ() {
    return this.twin || (this.currentBank && this.currentBank[this.currentIndex]) || null;
  },

  /* TRY ONE LIKE IT — after a miss in the Practice, line up the same kind of question with new numbers (FORM_X: its
     id is the Practice id with X for P). Its choices / options shuffled like any question's. Not in the teacher's auto-run. */
  _offerTwin() {
    const bank = window['FORM_' + TWINS[this.currentForm]];
    const orig = this.currentBank[this.currentIndex];
    if (!this.lastMissed || !bank || !orig || reviewAutoRun) return false;
    const t = bank.find(x => x.id.slice(1) === orig.id.slice(1));
    if (!t) return false;
    this.twin = { ...shuffleQ(t), twinOf: orig.id };
    this.lastMissed = false;
    return true;
  },

  /* The teacher's auto-run: the right answer, for every kind of question */
  _autoAnswer() {
    const q = this.currentQ();
    const type = qType(q);
    if (type === 'entry') {
      const input = document.getElementById('entry-input');
      if (input) { input.value = String((q.accept && q.accept[0]) || q.answer); this._syncConfirm(); }
    } else if (type === 'grid') {
      q.rows.forEach((r, i) => {
        const cell = document.querySelector(`#answers .grid-cell[data-row="${i}"][data-val="${r.answer}"]`);
        if (cell) this._pickRow(i, r.answer, cell);
      });
    } else if (type === 'ms') {
      document.querySelectorAll('#answers .ms-option').forEach(btn => {
        const o = q.options[Number(btn.dataset.i)];
        if (o && o.right && !btn.classList.contains('selected')) this._toggleOption(btn);
      });
    } else {
      document.querySelectorAll('#answers .answer-btn').forEach(btn => {
        if (btn.dataset.answer === q.answer) this._selectChoice(q.answer, btn);
      });
    }
    setTimeout(() => this.confirmAnswer(), 600);
  },

  /* ── START SESSION ── opts.retake = a test taken again with the Teacher PIN: the same form, a new session id */
  startSession(form, opts = {}) {
    this.events = []; this.startedAt = new Date().toISOString();
    this.finishedAt = '';
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RNDQ_SESSION_ID_KEY);
    this.isRetake = !!opts.retake && isTest(form);
    if (this.isRetake) {
      // the first try's rows on the sheet keep their own id; the retake's partial rows must not land on them
      SESSION_ID = newSessionId();
      localStorage.setItem(RNDQ_SESSION_ID_KEY, SESSION_ID);
    }
    tabSwitchCount     = 0;
    const warnBanner = document.getElementById('tab-warning-banner');
    if (warnBanner) warnBanner.classList.add('hidden');
    this.currentForm   = form;
    this.score         = 0;
    this.streak        = 0;
    this.missedQuestions = [];
    this.currentIndex  = 0;
    this.questionLocked = false;   // a finished form leaves it set
    this.twin          = null;
    this.lastMissed    = false;
    this.timerSeconds  = 0;

    // NEW NUMBERS ON A RETRY (Marcos 10/16: "I don't want kids passing just because they remember the answers").
    // FORM_X_V holds the versions (data/form_*.js): try 1 → version 1, try 2 → version 2 … then round again.
    // "Try" = finished tries on this device. Same ids and kinds of question in every version, so the dashboard still
    // compares them question by question; the version rides in the start event. The tests have one version.
    const versions = window['FORM_' + form + '_V'];
    const triesDone = (reviewMode || SHARE_MODE) ? 0 : (getFormAttempts(this.studentName)[form] || 0);
    this.version = Array.isArray(versions) && versions.length ? triesDone % versions.length : 0;
    if (this._teachVersion) { this.version = Math.min(this._teachVersion, versionCount(form)) - 1; this._teachVersion = null; }   // 👀 Try it
    const rawBank = [...(this.version ? versions[this.version] : window['FORM_' + form])];

    // each child's own order of the choices / select-all options (a worked example has none; True/False rows stay put)
    this.currentBank = rawBank.map(shuffleQ);
    // The Warm-Up and the Practice keep their order (the IAB's spot order; the Warm-Up's steps belong in order)
    if (!keepsOrder(form)) shuffle(this.currentBank);

    const banner = document.getElementById('review-mode-banner');
    if (banner) {
      banner.classList.toggle('hidden', !reviewMode);
      const label = banner.querySelector('span');
      if (label) label.textContent = reviewAutoRun
        ? '🔍 Teacher Review Mode — auto-run'
        : '🔍 Teacher Review Mode — tap Next to advance';
    }

    this.show('quiz-screen');
    logEvent('start', Object.assign({ v: this.version + 1 }, this.isRetake ? { retake: true } : {}));
    this.startTimer();
    this.renderQuestion();
    submitScorePartial();   // on the dashboard as In Progress the moment a student starts (Marcos 11/5)
  },

  /* ── RESUME ── */
  checkResume() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const rc = document.getElementById('resume-container');
    const formSelect = document.getElementById('form-select-section');
    if (saved && rc) {
      const data = JSON.parse(saved);
      if (this.studentName && data.studentName === this.studentName) {
        rc.classList.remove('hidden');
        markSchoolResume();   // a test outside the school day: Resume shut
        document.getElementById('resume-detail').textContent =
          `${FORM_NAMES[data.currentForm] || 'Test'}${data.retake ? ' (Retake)' : ''} — Q${Math.min(data.currentIndex + 1, data.currentBank.length)} of ${data.currentBank.length}`;
        if (formSelect) formSelect.classList.add('hidden');
      } else {
        rc.classList.add('hidden');
        if (formSelect && this.studentName) formSelect.classList.remove('hidden');
      }
    } else if (rc) {
      rc.classList.add('hidden');
      if (formSelect && this.studentName) formSelect.classList.remove('hidden');
    }
  },

  resumeSession() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    if (schoolOnly(saved.currentForm)) { markSchoolResume(); return; }   // a test started at school is finished at school
    this.studentName    = saved.studentName;
    this.currentForm    = saved.currentForm;
    this.currentBank    = saved.currentBank;
    this.currentIndex   = saved.currentIndex;
    this.score          = saved.score;
    this.streak         = saved.streak || 0;
    this.missedQuestions = saved.missedQuestions || [];
    this.timerSeconds   = saved.timerSeconds || 0;
    this.events = saved.events || [];
    this.startedAt = saved.startedAt || new Date().toISOString();
    this.version = saved.version || 0;           // the saved questions are already that version's
    this.isRetake = !!saved.retake && isTest(saved.currentForm);
    this.twin = null; this.lastMissed = false;   // a twin is a bonus question — it is not carried across a restart
    logEvent('resume');
    this.show('quiz-screen');
    this.startTimer();
    // Saved right after answering the last question → nothing left to ask
    if (this.currentIndex >= this.currentBank.length) { this._finishSession(); return; }
    this.renderQuestion();
    if (!this.currentIndex) submitScorePartial();   // a student who comes back shows up again right away (later items send their own)
  },

  saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      studentName:     this.studentName,
      currentForm:     this.currentForm,
      currentBank:     this.currentBank,
      currentIndex:    (this.questionLocked || this.twin) ? this.currentIndex + 1 : this.currentIndex, // answered (or on its twin) → resume at the next one
      score:           this.score,
      streak:          this.streak,
      missedQuestions: this.missedQuestions,
      timerSeconds:    this.timerSeconds,
      events: this.events,
      startedAt: this.startedAt,
      version:   this.version || 0,
      retake:    !!this.isRetake
    }));
  },

  discardProgress() {
    this.showPinModal(
      '🗑️ Discard Progress',
      'Enter Teacher PIN to clear the current in-progress session. The student will start fresh.',
      () => {
        localStorage.removeItem(STORAGE_KEY);
        document.getElementById('resume-container').classList.add('hidden');
        applyFormLocks(this.studentName);
        this.checkResume();
      }
    );
  },

  /* ── OVERALL TIMER ── */
  startTimer() {
    this.stopTimerEngine();
    this.timerOn = true;
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this._tickTimer();
      if (this.timerSeconds % 30 === 0) this.saveProgress();
    }, 1000);
  },

  stopTimerEngine() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    this.timerOn = false;
  },

  _tickTimer() {
    const m = String(Math.floor(this.timerSeconds / 60)).padStart(2, '0');
    const s = String(this.timerSeconds % 60).padStart(2, '0');
    const el = document.getElementById('timer-display');
    if (el) el.textContent = `${m}:${s}`;
  },

  /* ── INSTRUCTIONS LOCK (15s) ── */
  startInstructionsTimer() {
    if (this.instructInterval) { clearInterval(this.instructInterval); this.instructInterval = null; }
    const btn   = document.getElementById('ready-btn');
    const fill  = document.getElementById('instruct-fill');
    const count = document.getElementById('instruct-count');
    if (!btn) return;
    if (reviewMode) {
      btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
      btn.textContent = "✅ Got It — Let's Begin!";
      return;
    }
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.cursor  = 'not-allowed';
    if (count) count.textContent = INSTRUCT_SECS;
    if (fill) {
      fill.style.transition = 'none';
      fill.style.width = '100%';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.transition = `width ${INSTRUCT_SECS}s linear`;
        fill.style.width = '0%';
      }));
    }
    let remaining = INSTRUCT_SECS;
    this.instructInterval = setInterval(() => {
      remaining--;
      if (count) count.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(this.instructInterval);
        this.instructInterval = null;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor  = 'pointer';
        btn.textContent   = "✅ Got It — Let's Begin!";
      }
    }, 1000);
  },

  /* ── READING LOCK TIMER (12s) ── every answer control (choices, True/False buttons, select-all options, the number
     box) is locked while the student reads; then they open, and Check shows once the answer is complete */
  startReadTimer() {
    if (this.readInterval) { clearInterval(this.readInterval); this.readInterval = null; }
    const bar   = document.getElementById('reading-timer-bar');
    const fill  = document.getElementById('reading-fill');
    const count = document.getElementById('reading-count');

    if (reviewMode) {
      bar.classList.add('hidden');
      answerControls().forEach(b => lockControl(b, false));
      this.answersOpen = true;
      setTimeout(() => this._autoAnswer(), 300);
      return;
    }

    const secs = this.readSecs || READ_SECS;
    bar.classList.remove('hidden');
    count.textContent = secs;

    // Single CSS transition — truly smooth over full duration
    fill.style.transition = 'none';
    fill.style.width = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = `width ${secs}s linear`;
      fill.style.width = '0%';
    }));

    this.answersOpen = false;
    answerControls().forEach(b => lockControl(b, true));
    this._syncConfirm();

    let remaining = secs;
    const open = () => {
      clearInterval(this.readInterval);
      this.readInterval = null;
      this._readOpen = null;
      bar.classList.add('hidden');
      if (this.questionLocked) return;
      this.answersOpen = true;
      answerControls().forEach(b => lockControl(b, false));
      this._syncConfirm();
      // the number box takes the keyboard (no scroll: the question stays where it is)
      const entry = document.getElementById('entry-input');
      if (entry) { try { entry.focus({ preventScroll: true }); } catch (e) { entry.focus(); } }
    };
    this.readInterval = setInterval(() => {
      remaining--;
      count.textContent = remaining;
      if (remaining <= 0) open();
    }, 1000);
    this._readOpen = open;   // 🧑‍🏫 ⏩ Skip the wait
  },

  /* Is the answer on screen complete? A choice picked · every True/False row picked · at least one option picked ·
     a value typed. Check shows only then (and only once the read lock is over). */
  _answerComplete() {
    const q = this.currentQ();
    if (!q || q.kind === 'watch') return false;
    const type = qType(q);
    if (type === 'grid') return Array.isArray(this.gridPicks) && this.gridPicks.length > 0 && this.gridPicks.every(v => v != null);
    if (type === 'ms') return Array.isArray(this.msPicks) && this.msPicks.length > 0;
    if (type === 'entry') { const el = document.getElementById('entry-input'); return !!el && el.value.trim() !== ''; }
    return this.selectedAnswer != null;
  },
  _syncConfirm() {
    const btn = document.getElementById('confirm-btn');
    if (!btn) return;
    btn.classList.toggle('hidden', !(this.answersOpen && !this.questionLocked && this._answerComplete()));
  },

  /* ── NEXT SOAK TIMER (8s) ── */
  startNextTimer() {
    if (this.nextInterval) { clearInterval(this.nextInterval); this.nextInterval = null; }
    const bar   = document.getElementById('next-timer-bar');
    const fill  = document.getElementById('next-fill');
    const count = document.getElementById('next-count');

    if (reviewMode) {
      bar.classList.add('hidden');
      if (reviewAutoRun) {
        setTimeout(() => this.nextQuestion(), 800);
      } else {
        document.getElementById('next-btn').classList.remove('hidden');
      }
      return;
    }

    const secs = this.nextSecs || NEXT_SECS;
    bar.classList.remove('hidden');
    count.textContent = secs;

    // Single CSS transition — truly smooth over full duration
    fill.style.transition = 'none';
    fill.style.width = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = `width ${secs}s linear`;
      fill.style.width = '0%';
    }));

    let remaining = secs;
    this.nextInterval = setInterval(() => {
      remaining--;
      count.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(this.nextInterval);
        this.nextInterval = null;
        bar.classList.add('hidden');
        this.soakDone = true;
        this._maybeShowNext();
      }
    }, 1000);
  },

  /* ── RENDER QUESTION ── */
  renderQuestion() {
    if (TEACH) this._teachSync();   // 👀 Try it as a student: the bar's menu follows the run
    this._readOpen = null; this._gateOpen = null;
    if (window.MM4Video) MM4Video.close();   // 🎬 a video belongs to its question: going on stops it
    document.getElementById('question-text').classList.remove('vid-wait');
    setPartBanner(this.currentForm);
    const q     = this.currentQ();
    const total = this.currentBank.length;

    document.getElementById('progress-text').textContent = isWarmUp(this.currentForm)
      ? `${q.kind === 'watch' ? '👀 Watch' : q.kind === 'step' ? '🪜 Step by step' : '✏️ Your turn'} · ${this.currentIndex + 1} of ${total}`
      : `Question ${this.currentIndex + 1} of ${total}`;
    this.readSecs = q.kind === 'step' ? STEP_READ_SECS : READ_SECS;
    this.nextSecs = q.kind === 'step' ? STEP_NEXT_SECS : NEXT_SECS;
    // The dashboard hears from a student at every item, the Warm-Up's worked examples included (Marcos 11/5: "people that
    // have started arent showing" — a Warm-Up kid sent nothing until item 6, ~10 minutes in; then "i should know what
    // question they are on"). Item 1 is sent by startSession / resume.
    if (!this.twin && this.currentIndex > 0) submitScorePartial();
    if (q.kind === 'watch') { this._renderWatch(q, total); return; }
    document.getElementById('speak-q-btn').classList.remove('hidden');
    // "Try one like it" strip: shown only while a twin question is up
    const twinNote = document.getElementById('twin-note');
    if (twinNote) twinNote.classList.toggle('hidden', !this.twin);
    document.getElementById('score-text').textContent    = `${getFirstName(this.studentName)} · ${this.score}`;
    document.getElementById('progress-fill').style.width = `${(this.currentIndex / total) * 100}%`;

    this._renderStreak();

    // Question text
    const qtEl = document.getElementById('question-text');
    let qHTML = formatMathText(q.q);
    // Practice B: every question starts with the hint closed. Practice A / Warm-Up: open, and it reads itself (below).
    const sayHint = !!q.hint && autoHint(this.currentForm) && !reviewMode;
    this.hintShown = sayHint;
    if (q.hint) qHTML += hintBoxHTML(q.hint, sayHint);
    qtEl.innerHTML = qHTML;
    // The picture lives outside #question-text, so speakQuestion's
    // word-wrapping never touches it
    document.getElementById('q-visual').innerHTML = M2V.picHTML(q.pic);
    // Word help buttons (not on the tests; the teacher's look at a test shows none either)
    this.mustHear = false;   // set after a miss on a part that teaches (see _armListen)
    this.soakDone = false;
    this.wordOpen = null;
    this._renderWords();

    // Reset feedback / buttons
    const fb = document.getElementById('feedback');
    fb.className = 'feedback-box';
    fb.style.display = 'none';
    fb.textContent = '';

    document.getElementById('confirm-btn').classList.add('hidden');
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('next-timer-bar').classList.add('hidden');

    // Build the answer area: multiple choice, a True/False table, select all, or a number box (tools/SCHEMA.md)
    this.selectedAnswer  = null;
    this.gridPicks       = null;
    this.msPicks         = null;
    this.questionLocked  = false;
    this.answersOpen     = false;
    const wrap = document.getElementById('answers');
    wrap.innerHTML = '';
    const type = qType(q);
    wrap.className = 'options-grid' + (type === 'mc' ? '' : ` ${type}-item`);
    wrap.setAttribute('role', type === 'mc' ? 'radiogroup' : 'group');
    wrap.setAttribute('aria-label', { mc: 'Answer choices', grid: 'True or false, one pick in each row', ms: 'Pick every true one', entry: 'Type your answer' }[type]);
    if (type === 'grid') this._renderGrid(q, wrap);
    else if (type === 'ms') this._renderMulti(q, wrap);
    else if (type === 'entry') this._renderEntry(q, wrap);
    else this._renderChoices(q, wrap);

    this.saveProgress();
    this.startReadTimer();
    if (sayHint) {
      const shownQ = q;
      setTimeout(() => {
        const hb = document.querySelector('#question-text .hint-speak-btn');
        if (hb && this.currentQ() === shownQ && !this.questionLocked && !activeSpeakBtn) speakHint(hb);
      }, 400);
    }
  },

  /* ── MULTIPLE CHOICE (Module 4's, unchanged) ── */
  _renderChoices(q, wrap) {
    q.choices.forEach((text, i) => {
      const row = document.createElement('div');
      row.className = 'answer-row';
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.dataset.answer = text;
      btn.innerHTML = `<strong>${['A','B','C','D'][i]}.</strong>&nbsp;${formatMathText(text)}`;
      btn.onclick = () => this._selectChoice(text, btn);
      // the 🔊 on the LEFT of what it reads; the choice's words light up one by one
      const speakBtn = speakButton('Read this choice aloud', () => speakItem(speakBtn, btn, text, `<strong>${['A','B','C','D'][i]}.</strong>&nbsp;`));
      row.appendChild(speakBtn);
      row.appendChild(btn);
      wrap.appendChild(row);
    });
  },

  /* ── TRUE / FALSE TABLE (type 'grid') ── one big True and one big False button in each row; each row has its own
     🔊. One point only when every row is right (how SBAC scores the IAB's tables). Rows are never shuffled. */
  _renderGrid(q, wrap) {
    const cols = q.cols || ['True', 'False'];
    this.gridPicks = q.rows.map(() => null);
    const table = document.createElement('div');
    table.className = 'tf-grid';
    q.rows.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'tf-row';
      row.dataset.row = String(i);
      const stmt = document.createElement('div');
      stmt.className = 'tf-statement';
      const label = document.createElement('span');
      label.className = 'tf-text';
      label.id = `tf-text-${i}`;
      label.innerHTML = formatMathText(r.text);
      const speakBtn = speakButton('Read this row aloud', () => speakItem(speakBtn, label, r.text));
      const mark = document.createElement('span');
      mark.className = 'tf-mark';
      stmt.append(speakBtn, label, mark);
      const picks = document.createElement('div');
      picks.className = 'tf-picks';
      picks.setAttribute('role', 'group');
      picks.setAttribute('aria-labelledby', label.id);
      cols.forEach(col => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'grid-cell';
        cell.dataset.row = String(i);
        cell.dataset.val = col;
        cell.textContent = col;
        cell.setAttribute('aria-pressed', 'false');
        cell.onclick = () => this._pickRow(i, col, cell);
        picks.appendChild(cell);
      });
      row.append(stmt, picks);
      table.appendChild(row);
    });
    wrap.appendChild(table);
  },

  _pickRow(i, val, cell) {
    if (this.questionLocked || cell.disabled || !this.gridPicks) return;
    this.gridPicks[i] = val;
    document.querySelectorAll(`#answers .grid-cell[data-row="${i}"]`).forEach(c => {
      const on = c === cell;
      c.classList.toggle('selected', on);
      c.setAttribute('aria-pressed', String(on));
    });
    this._syncConfirm();
  },

  /* ── SELECT ALL THAT ARE TRUE (type 'ms') ── the multiple-choice rows with a check box; tap again to take a pick
     back. One point only for the exact set. */
  _renderMulti(q, wrap) {
    this.msPicks = [];
    q.options.forEach((o, i) => {
      const row = document.createElement('div');
      row.className = 'answer-row';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer-btn ms-option';
      btn.dataset.i = String(i);
      btn.dataset.answer = o.text;
      btn.setAttribute('role', 'checkbox');
      btn.setAttribute('aria-checked', 'false');
      btn.innerHTML = `<span class="ms-box" aria-hidden="true"></span><span class="ms-body"><strong>${'ABCDEF'[i]}.</strong>&nbsp;` +
        `<span class="ms-text">${formatMathText(o.text)}</span></span><span class="ms-verdict"></span>`;
      btn.onclick = () => this._toggleOption(btn);
      const speakBtn = speakButton('Read this answer aloud', () => speakItem(speakBtn, btn.querySelector('.ms-text'), o.text));
      row.appendChild(speakBtn);
      row.appendChild(btn);
      wrap.appendChild(row);
    });
  },

  _toggleOption(btn) {
    if (this.questionLocked || btn.disabled || !this.msPicks) return;
    const text = btn.dataset.answer;
    const at = this.msPicks.indexOf(text);
    if (at >= 0) this.msPicks.splice(at, 1); else this.msPicks.push(text);
    const on = at < 0;
    btn.classList.toggle('selected', on);
    btn.setAttribute('aria-checked', String(on));
    this._syncConfirm();
  },

  /* ── TYPE A NUMBER (type 'entry') ── a big number box (one digit when digit: true); Enter = Check. Commas and
     spaces are fine; anything that is not a number gets "Type a number." read aloud — not a try. */
  _renderEntry(q, wrap) {
    const box = document.createElement('div');
    box.className = 'entry-box' + (q.digit ? ' entry-one' : '');
    box.innerHTML = `<label class="entry-label" for="entry-input">${q.digit ? '✏️ One digit:' : '✏️ Your answer:'}</label>`;
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'entry-input';
    input.className = 'entry-input' + (q.digit ? ' entry-digit' : '');
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.maxLength = q.digit ? 1 : 12;
    input.addEventListener('input', () => { this._entryWarn(false); this._syncConfirm(); });
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!document.getElementById('confirm-btn').classList.contains('hidden')) this.confirmAnswer();
    });
    box.appendChild(input);
    wrap.appendChild(box);
    // the correction, with its own 🔊 (read aloud when it shows: a correction is a direction, THE STANDARD 10/27)
    const warn = document.createElement('div');
    warn.className = 'dir-section entry-warn hidden';
    warn.id = 'entry-warn';
    warn.setAttribute('role', 'alert');
    warn.innerHTML = '<button type="button" class="speak-btn" aria-label="Read this aloud" onclick="speakDir(this)">🔊</button><p class="dir-text">Type a number.</p>';
    wrap.appendChild(warn);
  },

  /* "Type a number." — shown and read aloud (on = true), or put away (the student typed again) */
  _entryWarn(on = true) {
    const warn = document.getElementById('entry-warn');
    if (!warn) return;
    if (!on) { if (!warn.classList.contains('hidden')) { warn.classList.add('hidden'); stopActiveSpeech(); } return; }
    const p = warn.querySelector('.dir-text');
    p.textContent = 'Type a number.';   // fresh words, so the read-aloud wraps them again
    warn.classList.remove('hidden');
    logEvent('notnumber', { id: (this.currentQ() || {}).id });
    speakDir(warn.querySelector('.speak-btn'));
    const input = document.getElementById('entry-input');
    if (input) { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }
  },

  /* 🎬 WATCH (Warm-Up) = THE LESSON VIDEO (Marcos 11/13, his pick: "Video replaces it"). No choices. The direction
     ("Press Play. Watch the video to the end.") is read first; the video's Play pulses; Next shows when the video has
     played to its end with no part jumped over (logged as heard · how 'video'). The teacher's ⏩ skips the wait as
     before. A video that does not load → the read-aloud worked example below, for the rest of this visit. */
  _renderWatch(q, total) {
    const ch = window.MM4Video ? MM4Video.forWatch(q) : null;
    if (!ch || this._videoFailed) { this._renderWatchText(q, total); return; }
    document.getElementById('twin-note').classList.add('hidden');
    document.getElementById('score-text').textContent = `${getFirstName(this.studentName)} · ${this.score}`;
    document.getElementById('progress-fill').style.width = `${(this.currentIndex / total) * 100}%`;
    this._renderStreak();
    document.getElementById('question-text').innerHTML = `<span class="watch-tag">🎬 Watch the video</span> ${formatMathText(q.title)}`;
    document.getElementById('speak-q-btn').classList.add('hidden');
    document.getElementById('q-visual').innerHTML = '';
    document.getElementById('q-words').innerHTML = '';
    document.getElementById('answers').innerHTML = '';
    ['confirm-btn', 'next-btn', 'next-timer-bar', 'reading-timer-bar'].forEach(id => document.getElementById(id).classList.add('hidden'));
    this.selectedAnswer = null; this.questionLocked = false; this.hintShown = false; this.wordOpen = null;
    const fb = document.getElementById('feedback');
    fb.className = 'feedback-box teach-box video-box';
    fb.style.display = 'block';
    fb.innerHTML = '';
    this.soakDone = true;                       // no pause here: watching it to the end is the wait
    this.mustHear = !reviewMode;
    if (!this.mustHear) this.questionLocked = true;
    // the notes go in the direction row above the video (Web Design Expert 11/13: under it they were below the fold, small and
    // silent); a correction is a direction, so it is read aloud (THE STANDARD 10/27); "Done" is a success line, not read
    const say = (text, read) => {
      const n = document.getElementById('video-note'); if (!n) return;
      n.textContent = text;
      if (read) speakDir(n.parentElement.querySelector('.speak-btn'));
    };
    const heard = how => {
      if (!this.mustHear) return;
      this._gateOpen = null;
      this.mustHear = false;
      this.questionLocked = true;
      logEvent('heard', { id: q.id, how });     // how: 'video' (watched to the end) or 'skip' (the teacher's ⏩)
      say('✅ Done. You can go on.');
      this.saveProgress();
      this._maybeShowNext();
    };
    MM4Video.mount(fb, ch, {
      why: 'watch', qid: q.id, must: this.mustHear, dir: 'Press Play. Watch the video to the end.',
      onDone: full => { if (full) heard('video'); else if (this.mustHear) say(VIDEO_SKIPPED, true); },
      onFail: () => { this._videoFailed = true; this._renderWatchText(q, total); },
    });
    const dirText = fb.querySelector('.video-dir .dir-text');
    if (dirText) { dirText.id = 'video-note'; dirText.setAttribute('aria-live', 'polite'); }
    this._gateOpen = () => heard('skip');       // 🧑‍🏫 ⏩ Skip the wait
    this.saveProgress();
    if (reviewMode) {
      document.getElementById('next-btn').classList.remove('hidden');
      if (reviewAutoRun) setTimeout(() => this.nextQuestion(), 1200);
    }
  },

  /* 👀 WATCH, READ ALOUD (the worked example before the videos; now only when a video does not load): no choices,
     the student must hear it to the end (the same Listen as after a miss), then Next shows. Not scored. */
  _renderWatchText(q, total) {
    document.getElementById('twin-note').classList.add('hidden');
    document.getElementById('score-text').textContent = `${getFirstName(this.studentName)} · ${this.score}`;
    document.getElementById('progress-fill').style.width = `${(this.currentIndex / total) * 100}%`;
    this._renderStreak();
    document.getElementById('question-text').innerHTML = `<span class="watch-tag">👀 Watch and listen</span> ${formatMathText(q.title)}`;
    document.getElementById('speak-q-btn').classList.add('hidden');   // the Listen button below reads this screen
    document.getElementById('q-visual').innerHTML = '';
    document.getElementById('q-words').innerHTML = '';
    document.getElementById('answers').innerHTML = '';
    ['confirm-btn', 'next-btn', 'next-timer-bar', 'reading-timer-bar'].forEach(id => document.getElementById(id).classList.add('hidden'));
    this.selectedAnswer = null; this.questionLocked = false; this.hintShown = false; this.wordOpen = null;
    const fb = document.getElementById('feedback');
    fb.className = 'feedback-box teach-box';
    fb.style.display = 'block';
    // one line per place / idea ("\n" in the data); the voice reads it all in one go
    fb.innerHTML = q.text.split('\n').map((line, i, all) => `<div class="watch-line${i === all.length - 1 ? ' watch-sum' : ''}">${wrapWords(formatMathText(line))}</div>`).join('');
    const spans = Array.from(fb.querySelectorAll('.wrd')).filter(el => /[A-Za-z0-9+=×÷−<>□]/.test(el.textContent));
    const spoken = sayWords(spans);
    const small = document.createElement('button');
    small.className = 'speak-btn';
    fb.prepend(small);
    this.soakDone = true;                       // no pause here: hearing it to the end is the wait
    this.mustHear = !reviewMode;
    if (this.mustHear) this._armListen(fb, small, spans, spoken, q.id, () => { this.questionLocked = true; });
    else { small.remove(); this.questionLocked = true; }
    fb.insertAdjacentHTML('beforeend', M2V.explainHTML(q.pic));   // the worked picture, under the Listen button
    this.saveProgress();
    if (reviewMode) {
      document.getElementById('next-btn').classList.remove('hidden');
      if (reviewAutoRun) setTimeout(() => this.nextQuestion(), 1200);
    }
  },

  _selectChoice(text, btn) {
    if (this.questionLocked || btn.disabled) return;
    document.querySelectorAll('#answers .answer-btn').forEach(b => b.classList.remove('selected'));
    this.selectedAnswer = text;
    btn.classList.add('selected');
    this._syncConfirm();
  },

  _renderStreak() {
    const el = document.getElementById('streak-bar');
    if (this.streak >= 3) {
      el.textContent = '🔥'.repeat(Math.min(this.streak, 8)) + ` ${this.streak} in a row!`;
    } else {
      el.textContent = '';
    }
  },

  /* Next appears when the 8 second pause is over and — after a miss — the feedback has been heard */
  _maybeShowNext() {
    if (!this.soakDone || this.mustHear) return;
    const next = document.getElementById('next-btn');
    next.classList.remove('hidden');
    next.scrollIntoView({ block: 'nearest' });
    // the keyboard goes to Next (Enter after a typed answer goes on; next-waits.js still holds it while the voice talks)
    try { next.focus({ preventScroll: true }); } catch (e) { next.focus(); }
  },

  /* LISTEN, THEN NEXT — the big Listen button under the feedback after a miss (see LISTEN_START_WAIT) */
  _armListen(fb, smallBtn, spans, text, qid, onHeard) {
    smallBtn.style.display = 'none';              // one thing to press
    const row = document.createElement('div');
    row.className = 'listen-row';
    row.innerHTML = `<button type="button" class="listen-btn" id="listen-btn">🔊 Listen</button>` +
      `<span class="listen-note" id="listen-note" aria-live="polite">Listen to the end. Then you can go on.</span>`;
    fb.appendChild(row);
    const btn = row.querySelector('#listen-btn'), note = row.querySelector('#listen-note');
    const words = text.split(/\s+/).filter(Boolean).length;
    const clearHl = () => spans.forEach(el => el.classList.remove('hl'));
    const idle = () => { btn.classList.remove('playing'); btn.textContent = this.mustHear ? '🔊 Listen' : '🔊 Listen again'; };

    const heard = how => {
      if (!this.mustHear || !btn.isConnected) return;
      this._gateOpen = null;
      this.mustHear = false;
      logEvent('heard', { id: qid, how });      // how: 'voice' or 'read' (no sound on the device)
      if (onHeard) onHeard();
      btn.disabled = false; btn.classList.add('heard'); btn.onclick = play; idle();
      note.textContent = '✅ Done. You can go on.';
      this.saveProgress();
      this._maybeShowNext();
    };

    // This device will not speak: wait long enough to read it, then an "I read it" button
    const noVoice = () => {
      clearHl();
      if (!this.mustHear) { idle(); return; }
      btn.classList.remove('playing'); btn.disabled = true; btn.textContent = '⏳ Read it first…';
      note.textContent = 'No sound here. Read it. Then tap the button.';
      setTimeout(() => {
        if (!this.mustHear || !btn.isConnected) return;
        btn.disabled = false; btn.textContent = '✅ I read it';
        btn.onclick = () => heard('read');
      }, listenDwellMs(words));
    };

    const play = () => {
      if (listenJob && !listenJob.settled && listenJob.btn === btn) return;   // a second tap must not cut the voice off
      stopActiveSpeech();
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { noVoice(); return; }
      const job = listenJob = { btn, settled: false, started: false, startTimer: null, watchdog: null };
      const settle = () => { job.settled = true; clearTimeout(job.startTimer); clearTimeout(job.watchdog); clearHl(); };
      const finish = ok => {
        if (job.settled) return;
        settle();
        if (!btn.isConnected) return;
        if (ok && this.mustHear) { heard('voice'); return; }
        idle();
        if (!ok && this.mustHear) note.textContent = 'It stopped early. Tap Listen. Hear it to the end.';
      };
      job.abort = () => finish(false);
      btn.classList.add('playing'); btn.textContent = '🔊 Listening…';
      const u = new SpeechSynthesisUtterance(text);
      english(u); u.rate = READ_RATE;
      u.onstart = () => {
        job.started = true;
        // Some voices never report that they finished. Generous on purpose (about 80 words a minute),
        // so it can only fire after a real voice would be done.
        job.watchdog = setTimeout(() => finish(true), words * 750 + 6000);
      };
      u.onboundary = e => {
        if (e.name !== 'word') return;
        clearHl();
        lightAt(spans, u.text, e.charIndex);
      };
      u.onend = () => finish(true);
      u.onerror = () => { if (job.settled) return; settle(); noVoice(); };
      addHighlightFallback(u, spans);
      job.startTimer = setTimeout(() => {
        if (job.started || job.settled) return;      // no sound started: this device cannot speak
        settle(); window.speechSynthesis.cancel(); noVoice();
      }, LISTEN_START_WAIT);
      window.speechSynthesis.speak(u);
    };
    btn.onclick = play;
    this._gateOpen = () => { if (this.mustHear && btn.isConnected) heard('skip'); };   // 🧑‍🏫 ⏩ Skip the wait
  },

  /* ── CONFIRM ANSWER (the ✅ That's My Answer! button, or Enter in the number box) ── */
  confirmAnswer() {
    if (this.questionLocked) return;   // answered already: a second tap or key must not count it again (10/27)
    const q = this.currentQ();
    if (!q || q.kind === 'watch' || !this._answerComplete()) return;
    const type = qType(q);
    const r = this._judge(q, type);
    if (r.invalid) { this._entryWarn(); return; }   // not a number: "Type a number." — not a try
    this.questionLocked = true;
    this.answersOpen = false;
    this._entryWarn(false);

    const correct = r.correct;
    const isTwin = !!this.twin;
    const isStep = q.kind === 'step';

    if (isStep) {
      // A Warm-Up step is teaching, not a question: it never changes the score and is not a "missed
      // question". It rides in the event log so the dashboard can show which step tripped whom.
      logEvent('step', Object.assign({ id: q.id, ok: correct }, correct ? {} : { pick: r.pick }));
    } else if (isTwin) {
      // "Try one like it" never changes the score. The result rides in the event
      // log (the dashboard reads it) and on the miss it follows (the end screen shows it).
      logEvent('twin', Object.assign({ id: q.id, of: q.twinOf, ok: correct }, correct ? {} : { pick: r.pick }));
      this.missedQuestions.forEach(m => {
        if (m.id === q.twinOf || String(m.id).startsWith(q.twinOf + '.')) m.twin = correct ? 'right' : 'wrong';
      });
    } else if (correct) {
      this.score++;
      this.streak++;
      this.lastMissed = false;
    } else {
      this.streak = 0;
      this.lastMissed = true;
      this.missedQuestions.push(...this._missEntries(q, type, r));
    }

    // The Warm-Up and the Practice teach: each row / option / choice marked right or wrong, the right one shown, the
    // mistake named, why. The tests: right or wrong only — the student's own number or choice is marked, a True/False
    // table or a select-all keeps its picks with no marks (a mark per row would hand over the answers), and nothing
    // else is shown (the teacher's review mode still sees it all).
    const teach = teaches(this.currentForm) || reviewMode;
    this._markAnswer(q, type, r, teach);

    const fb = document.getElementById('feedback');
    fb.className = 'feedback-box ' + (correct ? 'correct' : 'incorrect');
    fb.style.display = 'block';
    fb.innerHTML = !teach
      ? (correct ? `✅ <strong>Correct!</strong>` : `❌ <strong>Not quite.</strong>`)
      : correct
        ? `✅ <strong>Correct!</strong>${isTwin ? ' You fixed it!' : ''}<br>${formatMathText(q.explanation)}`
        // After a miss the screen stays short (Marcos 10/10 — too much on a page gets lost): the mistake,
        // the right answer, then the worked picture.
        : this._missHTML(q, type, r);

    // Feedback read-aloud button
    const fbSpeakBtn = document.createElement('button');
    fbSpeakBtn.className = 'speak-btn';
    fbSpeakBtn.style.cssText = 'float:left;margin:0 10px 4px 0;';
    fbSpeakBtn.textContent = '🔊';
    // Wrap feedback words in spans for word-by-word highlighting (skip emoji-only tokens)
    fb.innerHTML = wrapWords(fb.innerHTML);
    const fbSpans = Array.from(fb.querySelectorAll('.wrd')).filter(s => /[A-Za-z0-9+=×÷−<>□]/.test(s.textContent))   /* keep + − = × ÷ so they are read aloud */;
    const spokenFb = sayWords(fbSpans, fbSpans.map(s => {
      const gap = s.nextSibling && s.nextSibling.nodeType === 3 && /\u00a0{2,}/.test(s.nextSibling.textContent);
      return s.textContent + (gap ? ',' : '');
    }).join(' '));
    fbSpeakBtn.onclick = () => {
      if (activeSpeakBtn === fbSpeakBtn) { stopActiveSpeech(); return; }
      stopActiveSpeech();
      activeSpeakBtn = fbSpeakBtn; fbSpeakBtn.textContent = '⏹';
      const u = new SpeechSynthesisUtterance(spokenFb);
      english(u); u.rate = READ_RATE;
      u.onboundary = e => {
        if (e.name !== 'word') return;
        fbSpans.forEach(el => el.classList.remove('hl'));
        lightAt(fbSpans, u.text, e.charIndex);
      };
      u.onend = () => {
        fbSpans.forEach(el => el.classList.remove('hl'));
        fbSpeakBtn.textContent = '🔊'; if (activeSpeakBtn === fbSpeakBtn) activeSpeakBtn = null;
      };
      addHighlightFallback(u, fbSpans);
      window.speechSynthesis.speak(u);
    };
    fb.prepend(fbSpeakBtn);

    // After a miss the student must HEAR the mistake and the right answer before Next shows
    this.mustHear = teach && !correct && !reviewMode;
    // 🎬 Watch how waits until the correction has been heard (Web Design Expert 11/13: opening a video read its direction,
    // which cut the Listen off and scrolled it away — no Next, no Listen in sight)
    if (this.mustHear) this._armListen(fb, fbSpeakBtn, fbSpans, spokenFb, q.id, () => {
      const offer = fb.querySelector('.video-offer'); if (offer) offer.hidden = false;
      document.getElementById('question-text').classList.remove('vid-wait');
    });
    document.getElementById('question-text').classList.toggle('vid-wait', !!this.mustHear);

    // the parts that teach: show the worked pictures (lines of work · columns)
    if (teach) fb.insertAdjacentHTML('beforeend', M2V.explainHTML(q.explain));
    // 🎬 Watch how: the video for this kind of question, under the mistake (Practice, Marcos 11/13)
    if (teach && !correct) { const b = videoBtnHTML('miss', '🎬 Watch how'); if (b) fb.insertAdjacentHTML('beforeend', `<div class="video-offer"${this.mustHear ? ' hidden' : ''}>${b}</div>`); }

    document.getElementById('confirm-btn').classList.add('hidden');
    document.getElementById('score-text').textContent = `${getFirstName(this.studentName)} · ${this.score}`;
    this._renderStreak();
    // the keyboard goes to the Listen button after a miss (the next thing to press); else it waits for Next
    const listen = this.mustHear && document.getElementById('listen-btn');
    if (listen) { try { listen.focus({ preventScroll: true }); } catch (e) { listen.focus(); } }
    this.saveProgress();
    this.startNextTimer();
  },

  /* Right or wrong, and what was picked, for each kind of question (r.invalid = the number box holds no number) */
  _judge(q, type) {
    if (type === 'entry') {
      const input = document.getElementById('entry-input');
      const typed = input ? input.value.trim() : '';
      const n = normEntry(typed);
      if (n === null) return { invalid: true };
      const accept = (q.accept && q.accept.length ? q.accept : [q.answer]).map(normEntry).filter(v => v != null);
      return { correct: accept.includes(n), pick: typed, norm: n };
    }
    if (type === 'grid') {
      const picks = this.gridPicks.slice();
      const wrongRows = q.rows.map((row, i) => (picks[i] === row.answer ? -1 : i)).filter(i => i >= 0);
      return { correct: wrongRows.length === 0, pick: picks.join(' / '), picks, wrongRows };
    }
    if (type === 'ms') {
      const picked = q.options.filter(o => this.msPicks.includes(o.text));   // in the order on the screen
      const wrongOpts = q.options.filter(o => this.msPicks.includes(o.text) !== !!o.right);
      return { correct: wrongOpts.length === 0, pick: picked.map(o => o.text).join(' / '), wrongOpts };
    }
    return { correct: this.selectedAnswer === q.answer, pick: this.selectedAnswer };
  },

  /* The misses this answer adds for the sheet (missEntry) and the end screen. A True/False table adds one PER WRONG
     ROW ("A12.2" = row 2; its skill is SKILLS["A12.2"] or the table's). */
  _missEntries(q, type, r) {
    if (type === 'grid') {
      return r.wrongRows.map(i => {
        const id = `${q.id}.${i + 1}`;
        return { id, q: q.rows[i].text, skill: skillOf(id), yourAnswer: r.picks[i], correct: q.rows[i].answer,
          explanation: q.rows[i].why || q.explanation || '', of: q.id, stem: q.q, picks: r.picks };
      });
    }
    const right = type === 'ms' ? q.options.filter(o => o.right).map(o => o.text).join(' / ') : q.answer;
    return [{ id: q.id, q: q.q, skill: skillOf(q.id), yourAnswer: r.pick, correct: right, explanation: q.explanation || '' }];
  },

  /* Freeze the answer and mark it. teach = each row / option marked, the right one shown; else the student's own
     choice or number only (a test). */
  _markAnswer(q, type, r, teach) {
    answerControls().forEach(el => { el.disabled = true; el.classList.remove('locked-choice'); });
    if (type === 'entry') {
      const input = document.getElementById('entry-input');
      if (input) input.classList.add(r.correct ? 'correct' : 'incorrect');
      return;
    }
    if (type === 'grid') {
      if (!teach) return;
      q.rows.forEach((row, i) => {
        const ok = r.picks[i] === row.answer;
        document.querySelectorAll(`#answers .grid-cell[data-row="${i}"]`).forEach(cell => {
          if (cell.dataset.val === r.picks[i]) cell.classList.add(ok ? 'correct' : 'incorrect');
          else if (cell.dataset.val === row.answer) cell.classList.add('correct', 'key');   // the right one, shown
        });
        const line = document.querySelector(`#answers .tf-row[data-row="${i}"]`);
        if (line) {
          line.classList.add(ok ? 'row-right' : 'row-wrong');
          const mark = line.querySelector('.tf-mark');
          if (mark) { mark.textContent = ok ? '✅' : '❌'; mark.setAttribute('aria-label', ok ? 'right' : 'not right'); }
        }
      });
      return;
    }
    if (type === 'ms') {
      if (!teach) return;
      document.querySelectorAll('#answers .ms-option').forEach(btn => {
        const o = q.options[Number(btn.dataset.i)];
        const picked = this.msPicks.includes(o.text);
        btn.classList.add(picked ? (o.right ? 'correct' : 'incorrect') : (o.right ? 'missed' : 'skipped'));
        const v = btn.querySelector('.ms-verdict');
        if (v) v.textContent = o.right ? '✅ True' : picked ? '❌ Not true' : 'Not true';
      });
      return;
    }
    document.querySelectorAll('#answers .answer-btn').forEach(btn => {
      if (btn.dataset.answer === this.selectedAnswer) btn.classList.add(r.correct ? 'correct' : 'incorrect');
      else if (teach && btn.dataset.answer === q.answer) btn.classList.add('correct');
    });
  },

  /* After a miss on a part that teaches: the mistake named, then the right answer. Multiple choice and a typed number
     name it from `slips` (the general explanation is only the fallback for a pick with no note); a True/False table
     says each wrong row's right answer, select-all each option the student got wrong — the first one with its why. */
  _missHTML(q, type, r) {
    const head = '❌ <strong>Not quite.</strong>';
    const note = html => ` <span class="slip-note">${html}</span>`;
    // A table or a select-all: only the FIRST wrong row / option (screen order) is explained; the rest are named right or
    // not (Marcos 11/15: "shorten long feedback" → "Explain one, name the rest" — a miss on every option ran 87 s). The
    // ✅ / ❌ marks on the screen still show every one.
    const why = (k, text) => k === 0 && text ? ' ' + formatMathText(text) : '';
    if (type === 'grid') {
      const some = r.wrongRows.length < q.rows.length ? ' Every row must be right.' : '';
      const notes = r.wrongRows.map((i, k) => {
        const row = q.rows[i];
        return note(`“${formatMathText(row.text)}” is <strong>${formatMathText(row.answer)}.</strong>${why(k, row.why)}`);
      }).join('');
      const noWhy = r.wrongRows.length > 0 && !q.rows[r.wrongRows[0]].why;
      return `${head}${some}${notes}${noWhy && q.explanation ? `<br>${formatMathText(q.explanation)}` : ''}`;
    }
    if (type === 'ms') {
      const notes = r.wrongOpts.map((o, k) =>
        note(`“${formatMathText(o.text)}” is <strong>${o.right ? 'true.' : 'not true.'}</strong>${why(k, o.why)}`)).join('');
      const noWhy = r.wrongOpts.length > 0 && !r.wrongOpts[0].why;
      return `${head} Pick every true one.${notes}${noWhy && q.explanation ? `<br>${formatMathText(q.explanation)}` : ''}`;
    }
    const slip = q.slips ? q.slips[type === 'entry' ? r.norm : r.pick] : null;
    return `${head}${slip ? note(formatMathText(slip.say)) : ''} The correct answer is: <strong>${formatMathText(q.answer)}</strong>` +
      `${slip ? '' : `<br>${formatMathText(q.explanation)}`}`;
  },

  /* ── NEXT QUESTION ── */
  nextQuestion() {
    stopActiveSpeech();
    if (this.twin) {
      this.twin = null;                       // the twin is done → on to the next question of the form
    } else if (TWINS[this.currentForm] && this._offerTwin()) {
      this.renderQuestion();                  // a miss in the Practice → try one like it
      return;
    }
    this.currentIndex++;
    if (this.currentIndex >= this.currentBank.length) {
      this._finishSession();
    } else {
      this.renderQuestion();
    }
  },

  /* ── FINISH SESSION ── */
  _finishSession() {
    this.twin = null;
    this.finishedAt = new Date().toISOString(); logEvent('finish');
    this.stopTimerEngine();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RNDQ_SESSION_ID_KEY);

    const total = scoredCount(this.currentBank);   // the Warm-Up's watch and step items are not scored
    const pct   = Math.round((this.score / total) * 100);
    const date  = new Date();

    const scores   = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    const prevDone = (reviewMode || SHARE_MODE) ? 0 : scores.filter(s => s.name === this.studentName && s.form === this.currentForm && s.done).length;
    const attemptNum = prevDone + 1;
    this.currentAttemptNum = attemptNum;

    if (!reviewMode && !SHARE_MODE) {
      scores.push({
        name:    this.studentName,
        form:    this.currentForm,
        attempt: attemptNum,
        score:   this.score,
        total,
        pct,
        elapsed: this.timerSeconds,
        date:    date.toLocaleDateString(),
        time:    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        done:    true
      });
      localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    }

    submitScoreFinal();

    let letter = 'F', msg = "Let's practice more! 📚";
    if (pct === 100) { letter = 'A+'; msg = "⭐ PERFECT SCORE! ⭐"; }
    else if (pct >= 90) { letter = 'A'; msg = "Outstanding Work! 🌟"; }
    else if (pct >= 80) { letter = 'B'; msg = "Great Job! 👏"; }
    else if (pct >= 70) { letter = 'C'; msg = "Good Effort! 💪"; }
    else if (pct >= 60) { letter = 'D'; msg = "Keep Practicing! 🔄"; }

    this.show('end-screen');

    const againBtn = document.getElementById('end-again-btn');
    if (againBtn) againBtn.classList.toggle('hidden', reviewMode);
    document.getElementById('end-title').textContent =
      `🎉 ${FORM_NAMES[this.currentForm]}${retakeTag(this.currentForm)} Complete!`;

    document.getElementById('final-score-sub').textContent = SHARE_MODE
      ? `${FORM_NAMES[this.currentForm]}${retakeTag(this.currentForm)} · Guest view — this score was not saved`
      : `${formLabel(attemptNum)}${attemptNum > 1 ? ' · Attempt ' + attemptNum : ''} · ${this.studentName}`;
    document.getElementById('final-msg').textContent = msg;

    const pctEl = document.getElementById('final-percent');
    pctEl.innerHTML = `${this.score}/${total}<br><small style="font-size:0.5em;color:${pct>=70?'var(--correct)':'var(--danger)'};">${pct}% · ${letter}</small>`;
    setTimeout(() => pctEl.classList.add('revealed'), 50);

    const missedSec = document.getElementById('missed-section');
    // The Warm-Up and the Practice show the fix for every miss; a test shows the pick only.
    const showFix = teaches(this.currentForm) || reviewMode || SHARE_MODE;   // a visitor sees every fix, the test included
    const shown = this._missedForScreen(showFix);
    if (shown.length) {
      missedSec.classList.remove('hidden');
      document.getElementById('missed-items').innerHTML =
        shown.map(m =>
          `<div class="missed-item">
            <div class="mi-label">${m.id}</div>
            <div style="margin:3px 0;">${formatMathText(m.q)}</div>
            <div>Your answer: <span style="color:var(--danger);">${formatMathText(m.yourAnswer)}</span>${showFix ? ` &nbsp; ✅ Correct: <strong style="color:var(--correct);">${formatMathText(m.correct)}</strong>` : ''}</div>
            ${showFix && m.explanation ? `<div style="margin-top:5px;font-size:0.85rem;color:#555;font-style:italic;">💡 ${formatMathText(m.explanation)}</div>` : ''}
            ${m.twin ? `<div class="mi-twin ${m.twin}">🔁 Try one like it: ${m.twin === 'right' ? '✅ you got the next one right' : '❌ missed again — ask for help with this one'}</div>` : ''}
          </div>`
        ).join('');
    } else {
      missedSec.classList.add('hidden');
    }

    if (pct >= 70) startConfetti(pct);
  },

  /* The misses on the score screen. Where the fixes show (the Warm-Up, the Practice, a guest), each wrong True/False row
     is its own item with its right answer and why. On a test the fix is never shown, and a row's own pick would give its
     answer away (True or False), so a table's wrong rows come together as ONE item: the table's question and every
     row's pick, nothing marked. */
  _missedForScreen(showFix) {
    if (showFix) return this.missedQuestions;
    const out = [];
    this.missedQuestions.forEach(m => {
      if (!m.of) { out.push(m); return; }
      if (out.some(x => x.id === m.of)) return;
      out.push({ id: m.of, q: m.stem || m.q, yourAnswer: (m.picks || []).join(' / '), twin: m.twin });
    });
    return out;
  },

  /* 📖 Word help: draw the buttons (and the open card) under the question */
  _renderWords() {
    const box = document.getElementById('q-words');
    if (!box) return;
    const q = this.currentQ();
    // Warm-Up steps get no word help: a card could hand over the step's answer ("how many more" → subtract)
    box.innerHTML = q && wordHelp(this.currentForm) && !q.kind ? wordChipsHTML(q, this.wordOpen) : '';
  },

  /* Tap a word button → its card opens (tap again → closes). Nothing is read until its 🔊 is tapped. */
  showWord(key) {
    const q = this.currentQ();
    if (!q) return;
    stopActiveSpeech();
    const opening = this.wordOpen !== key;
    this.wordOpen = opening ? key : null;
    if (opening) { logEvent('word', { id: q.id, w: key }); this.saveProgress(); }
    this._renderWords();
    const focus = document.querySelector(opening ? '#q-words .word-speak-btn' : `#q-words .word-chip`);
    if (focus) focus.focus();
  },

  /* 🎬 open (or close) this question's video: beside the hint → under the question; after a miss → under the mistake */
  showVideo(why, btn) {
    const q = this.currentQ();
    const ch = window.MM4Video && MM4Video.forQuestion(q, this.currentForm);
    if (!ch) return;
    const cur = MM4Video.current();
    if (cur && cur.why === why) { MM4Video.close(); return; }
    if (this.mustHear) return;                  // a Listen is owed first (its voice must not be cut off)
    const host = document.getElementById(why === 'miss' ? 'video-host-miss' : 'video-host');   // outside the red feedback box
    MM4Video.mount(host, ch, { why, qid: q.id, closable: true, dir: 'Press Play to watch.' });
    if (btn) btn.setAttribute('aria-expanded', 'true');
  },

  /* ── SPEAK QUESTION ── */
  /* 💡 Need a hint? → open the hint box (not read aloud until its own 🔊 is tapped) */
  showHint() {
    const q = this.currentQ();
    const wrap = document.querySelector('#question-text .hint-wrap');
    if (!q || !q.hint || !wrap) return;
    this.hintShown = true;
    // Hint use is saved in the attempt's event log → the dashboard shows who
    // opened which hint (Marcos 10/8: "add hint tracking to dashboard")
    logEvent('hint', { id: q.id });
    this.saveProgress();
    wrap.outerHTML = hintBoxHTML(q.hint, true);
    const btn = document.querySelector('#question-text .hint-speak-btn');
    if (btn) btn.focus();
  },

  speakQuestion() {
    const qBtn = document.getElementById('speak-q-btn');
    if (activeSpeakBtn === qBtn) { stopActiveSpeech(); return; }
    stopActiveSpeech();
    activeSpeakBtn = qBtn;
    qBtn.textContent = '⏹';

    const q = this.currentQ();
    if (!q) return;

    // the question only — a hint is read by its own 🔊, and only after the student opens it
    // One span per word, line by line: a line break in a stem ("5,162 + 734 = □\nType the sum.") stays a line break on
    // the screen and is a stop for the voice.
    const qtEl = document.getElementById('question-text');
    const lines = String(q.q).split('\n');
    const originalWords = [];
    let qHTML = '';
    lines.forEach((line, li) => {
      if (li) qHTML += '<br>';
      line.split(/\s+/).filter(Boolean).forEach(w => {
        qHTML += `<span class="wrd" id="wrd${originalWords.length}">${formatMathText(w)}</span> `;
        originalWords.push(w);
      });
    });
    if (q.hint) qHTML += hintBoxHTML(q.hint, this.hintShown);
    qtEl.innerHTML = qHTML;

    // The picture's own words are read after the question (visuals.js picSay): the school-store poster, "eraser, 20 tickets",
    // word by word; the area model sentence by sentence (each lit part says what it is about in data-say)
    const picSpans = Array.from(document.querySelectorAll('#q-visual .wrd'));
    const picSaid = picSpans.length ? M2V.picSay(q.pic) : '';
    const raw = lines.map((l, li) => (li < lines.length - 1 && l.trim() && !/[.!?:]$/.test(l.trim()) ? l.trim() + '.' : l.trim()))
      .filter(Boolean).join(' ') + (picSaid ? ' ' + picSaid : '');
    const hlSpans = originalWords.map((_, i) => document.getElementById('wrd' + i)).concat(picSaid ? picSpans : []);
    const spokenText = sayWords(hlSpans, raw, originalWords.concat(picSaid ? picSpans.map(sp => sp.dataset.say || sp.textContent) : []));

    const u = new SpeechSynthesisUtterance(spokenText);
    english(u); u.rate = READ_RATE;

    u.onboundary = e => {
      if (e.name !== 'word') return;
      document.querySelectorAll('#question-text .wrd.hl').forEach(el => el.classList.remove('hl'));
      lightAt(hlSpans, u.text, e.charIndex);
    };
    u.onend = () => {
      document.querySelectorAll('#question-text .wrd.hl').forEach(el => el.classList.remove('hl'));
      if (activeSpeakBtn === qBtn) { qBtn.textContent = '🔊'; activeSpeakBtn = null; }
    };
    addHighlightFallback(u, hlSpans.filter(Boolean));
    window.speechSynthesis.speak(u);
  },

  /* ── SCORES ── */
  showScores(autoShow = false) {
    this.show('scoreboard-screen');
    const teacherBtns = document.getElementById('teacher-score-btns');
    if (teacherBtns) teacherBtns.style.display = this.studentName === 'Mr. O (Teacher)' ? 'flex' : 'none';
    if (!reviewMode) this._startScoreLock(autoShow ? 60 : 0);

    const all    = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    const listEl = document.getElementById('score-list');
    const noEl   = document.getElementById('no-scores-msg');

    if (!all.length) {
      listEl.innerHTML = '';
      noEl.style.display = 'block';
      return;
    }
    noEl.style.display = 'none';

    const forms = FORMS;

    const summaryCards = forms.map(form => {
      const best = all.filter(s => s.form === form && s.done)
        .reduce((b, r) => (!b || r.pct > b.pct) ? r : b, null);
      if (!best) {
        return `<div class="sb-summary-card">
          <div class="sb-summary-label">${FORM_NAMES[form]}</div>
          <div class="sb-summary-grade" style="color:#ccc;">—</div>
          <div class="sb-summary-score" style="color:#aaa;">Not yet completed</div>
        </div>`;
      }
      const grade = letterGrade(best.pct);
      const gc = best.pct>=90?'#27ae60':best.pct>=80?'#2980b9':best.pct>=70?'#f39c12':best.pct>=60?'#e67e22':'#e74c3c';
      return `<div class="sb-summary-card">
        <div class="sb-summary-label">${FORM_NAMES[form]}</div>
        <div class="sb-summary-grade" style="color:${gc};">${grade}</div>
        <div class="sb-summary-score">${best.score}/${best.total} · ${best.pct}%</div>
        <div class="sb-summary-attempt">Best of ${all.filter(s=>s.form===form&&s.done).length} attempt(s)</div>
      </div>`;
    }).join('');

    const details = forms.map(form => {
      const rows = all.filter(s => s.form === form && s.done);
      if (!rows.length) return '';
      const att1 = rows.filter(r => (r.attempt||1) === 1);
      const att2 = rows.filter(r => (r.attempt||1) >= 2);

      const buildTable = (attempts, label, headerColor) => {
        if (!attempts.length) return '';
        return `<div style="margin-bottom:14px;">
          <div style="display:inline-block;background:${headerColor};color:white;
                      font-size:0.72rem;font-weight:bold;letter-spacing:1px;
                      text-transform:uppercase;border-radius:6px;padding:3px 10px;
                      margin-bottom:6px;">${label}</div>
          <table class="scoreboard-table">
            <thead><tr><th>Score</th><th>%</th><th>Grade</th><th>Time</th><th>Date</th></tr></thead>
            <tbody>${attempts.map(r => {
              const grade = letterGrade(r.pct);
              const cls   = r.pct>=90?'score-good':r.pct>=70?'score-ok':'score-bad';
              return `<tr>
                <td>${r.score}/${r.total}</td>
                <td class="${cls}">${r.pct}%</td>
                <td class="${cls}" style="font-weight:800;">${grade}</td>
                <td>${r.time||'—'}</td>
                <td>${r.date}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;
      };

      return `<h3 style="color:var(--primary);margin:22px 0 8px;border-bottom:2px solid #e0e0e0;padding-bottom:6px;">${FORM_NAMES[form]}</h3>
        ${buildTable(att1,'Attempt 1','#5b3cc4')}
        ${buildTable(att2,'Attempt 2','#f39c12')}`;
    }).join('');

    listEl.innerHTML = `
      <div style="margin-bottom:6px;font-size:0.8rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;">Your Best Scores</div>
      <div class="sb-summary-row">${summaryCards}</div>
      <div style="margin-top:24px;">${details}</div>`;
  },

  _startScoreLock(secs) {
    const bar     = document.getElementById('sb-lock-bar');
    const fill    = document.getElementById('sb-lock-fill');
    const count   = document.getElementById('sb-lock-count');
    const buttons = document.querySelectorAll('#scoreboard-screen button:not(#sb-lock-bar button)');
    if (!secs || secs <= 0) { if (bar) bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    fill.style.width = '100%';
    count.textContent = secs;
    buttons.forEach(b => { b.disabled = true; b.style.opacity = '0.4'; });
    let remaining = secs;
    const open = () => { clearInterval(iv); bar.classList.add('hidden'); buttons.forEach(b => { b.disabled = false; b.style.opacity = '1'; }); this._scoreUnlock = null; };
    const iv = setInterval(() => {
      remaining--;
      count.textContent = remaining;
      fill.style.width = (remaining / secs * 100) + '%';
      if (remaining <= 0) open();
    }, 1000);
    this._scoreUnlock = open;   // 🧑‍🏫 ⏩ Skip the wait
  },

  clearScores() {
    const panel = document.getElementById('clear-confirm-panel');
    panel.classList.remove('hidden');
    document.getElementById('clear-pin-input').value = '';
    document.getElementById('clear-pin-error').textContent = '';
    setTimeout(() => document.getElementById('clear-pin-input').focus(), 80);
  },

  confirmClearScores() {
    const pin = document.getElementById('clear-pin-input').value.trim();
    if (pin === '9377') {
      localStorage.removeItem(SCORES_KEY);
      document.getElementById('clear-confirm-panel').classList.add('hidden');
      this.showScores();
    } else {
      document.getElementById('clear-pin-error').textContent = '❌ Incorrect PIN. Try again.';
      document.getElementById('clear-pin-input').value = '';
      document.getElementById('clear-pin-input').focus();
    }
  },

  cancelClearScores() {
    document.getElementById('clear-confirm-panel').classList.add('hidden');
  },

  printResults() {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    if (!all.length) { alert('No scores to print yet!'); return; }
    const rows = FORMS.flatMap(form =>
      all.filter(s => s.form === form).map(r => {
        const cc  = r.pct >= 80 ? 'good' : r.pct >= 60 ? 'ok' : 'bad';
        const att = r.attempt || 1;
        const attStyle = att === 1
          ? 'background:#d35400;color:white;padding:2px 7px;border-radius:4px;font-size:0.8em;'
          : 'background:#f39c12;color:#5a3000;padding:2px 7px;border-radius:4px;font-size:0.8em;';
        return `<tr>
          <td>${r.name||'—'}</td>
          <td>${FORM_NAMES[r.form] || 'Form ' + r.form}</td>
          <td><span style="${attStyle}">Attempt ${att}</span></td>
          <td>${r.score}/${r.total}</td>
          <td class="${cc}">${r.pct}%</td>
          <td>${r.time||'—'}</td>
          <td>${r.date}</td>
        </tr>`;
      })
    ).join('');
    const html = `<html><head><title>Base Ten IAB Review Scores</title>
      <style>body{font-family:Arial;padding:20px;}h2{color:#5b3cc4;}
      table{width:100%;border-collapse:collapse;margin-top:12px;}
      th,td{border:1px solid #ccc;padding:8px 12px;text-align:center;}
      th{background:#5b3cc4;color:white;}
      .good{color:green;font-weight:bold;}.ok{color:orange;font-weight:bold;}.bad{color:red;font-weight:bold;}</style>
      </head><body>
      <h2>🧮 SBAC Practice — Number and Operations in Base Ten (IAB) — Score Report</h2>
      <p>Printed: ${new Date().toLocaleString()}</p>
      <table><tr><th>Name</th><th>Form</th><th>Attempt</th><th>Score</th><th>%</th><th>Time</th><th>Date</th></tr>${rows}</table>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close(); w.print();
  },

  /* ── END SCREEN ACTIONS ── */
  tryAgain() {
    stopConfetti();
    this.timerSeconds = 0;
    this.show('start-screen');
    document.getElementById('welcome-panel').classList.add('hidden');
    document.getElementById('student-login-panel').classList.remove('hidden');
    applyFormLocks(this.studentName);
    this.checkResume();
  },

  /* Marcos 10/14: "Back to …" keeps a signed-in student signed in; only Sign Out starts over. */
  backToMenu() {
    if (!this.studentName) { this.restart(); return; }
    this.tryAgain();
  },

  restart() {
    stopConfetti();
    this.stopTimerEngine();
    this.timerSeconds   = 0;
    this.studentName    = '';
    loggedInName        = '';
    unlockedForms       = new Set();
    retakeFor           = '';
    document.getElementById('name-select').value = '';
    document.getElementById('student-pin').value = '';
    document.getElementById('pin-section').classList.add('hidden');
    document.getElementById('form-select-section').classList.add('hidden');
    document.getElementById('resume-container').classList.add('hidden');
    document.getElementById('login-error').textContent = '';
    const loginCard = document.getElementById('login-step-card');
    if (loginCard) loginCard.classList.remove('hidden');
    this.show('start-screen');
    document.getElementById('welcome-panel').classList.remove('hidden');
    document.getElementById('student-login-panel').classList.add('hidden');
  },

  /* ── GLOBAL PIN MODAL ── */
  showPinModal(title, msg, onSuccess) {
    pinModalCallback = onSuccess;
    document.getElementById('pin-modal-title').textContent = title;
    document.getElementById('pin-modal-msg').textContent   = msg;
    document.getElementById('pin-modal-input').value       = '';
    document.getElementById('pin-modal-error').textContent = '';
    document.getElementById('pin-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('pin-modal-input').focus(), 80);
  },

  confirmPinModal() {
    const pin = document.getElementById('pin-modal-input').value.trim();
    if (pin === '9377') {
      document.getElementById('pin-modal').classList.add('hidden');
      const cb = pinModalCallback;
      pinModalCallback = null;
      if (cb) cb();
    } else {
      document.getElementById('pin-modal-error').textContent = '❌ Incorrect PIN. Try again.';
      document.getElementById('pin-modal-input').value = '';
      document.getElementById('pin-modal-input').focus();
    }
  },

  cancelPinModal() {
    document.getElementById('pin-modal').classList.add('hidden');
    pinModalCallback = null;
  }
};

/* ── LEAVING ENDS THE READ-ALOUD ──────────────────────
   Marcos 10/23 (the QPS hub): "if I leave I still hear the read aloud". Another tab or leaving the
   site ends everything being read — the Read Aloud screen, a question, a Listen — for good, not
   just the sentence being said (the Read Aloud screen used to go on to its next sentence). */
function hushReadAloud() {
  introToken++; clearTimeout(introTimer);
  stopActiveSpeech();
}
window.addEventListener('pagehide', hushReadAloud);
document.addEventListener('visibilitychange', () => { if (document.hidden) hushReadAloud(); });

/* ── VISIBILITY / UNLOAD ─────────────────────────────── */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (!app.timerOn) return;
    tabSwitchCount++;
    logEvent('leave');
    app.stopTimerEngine();
    app.saveProgress();
    if (app.instructInterval) { clearInterval(app.instructInterval); }
    if (app.readInterval)     { clearInterval(app.readInterval); app.readInterval = null; app._readLockPaused = true; }
    app._wasTimerRunning = true;
  } else {
    if (!app._wasTimerRunning) return;
    app._wasTimerRunning = false;
    logEvent('return');
    const warnBanner = document.getElementById('tab-warning-banner');
    if (warnBanner) warnBanner.classList.remove('hidden');
    app.stopTimerEngine();
    app.timerInterval = setInterval(() => {
      app.timerSeconds++;
      app._tickTimer();
      if (app.timerSeconds % 30 === 0) app.saveProgress();
    }, 1000);
    app.timerOn = true;
    // The read lock stopped while the page was hidden; start it over so the
    // answers unlock again (left alone they stayed locked until a refresh).
    if (app._readLockPaused) { app._readLockPaused = false; app.startReadTimer(); }
  }
});

window.addEventListener('beforeunload', () => {
  if (app.timerOn) logEvent('close');
  if (app.timerOn) app.saveProgress();
});

/* ── CONFETTI ────────────────────────────────────────── */
const canvas = document.getElementById('confetti-canvas');
const ctx    = canvas.getContext('2d');
let particles = [], animId = null;

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

function startConfetti(pct) {
  particles = [];
  let count, cols;
  if (pct === 100) {
    count = 300;
    cols = ['#FFD700','#FFA500','#FFFACD','#f39c12','#ffffff','#FFD700'];
  } else if (pct >= 90) {
    count = 220;
    cols = ['#d35400','#f39c12','#2ecc71','#3498db','#9b59b6','#e74c3c','#FFD700'];
  } else if (pct >= 80) {
    count = 160;
    cols = ['#d35400','#f39c12','#2ecc71','#3498db','#e74c3c','#9b59b6'];
  } else {
    count = 80;
    cols = ['#d35400','#f39c12','#7f8c8d','#95a5a6','#bdc3c7'];
  }
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      c: cols[~~(Math.random() * cols.length)],
      s: Math.random() * 5 + 3,
      d: Math.random() * 5 + 2,
      r: Math.random() * Math.PI * 2
    });
  }
  animateConfetti();
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r += 0.05);
    ctx.fillStyle = p.c; ctx.fillRect(-p.s/2, -p.s/2, p.s, p.s);
    ctx.restore();
    p.y += p.d; p.x += Math.sin(p.r) * 1.5;
    if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
  });
  animId = requestAnimationFrame(animateConfetti);
}

function stopConfetti() {
  if (animId) cancelAnimationFrame(animId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  animId = null;
}

/* 🖥️ Slide Mode: the arrow keys and a clicker's Page Down / Page Up (Space too, unless a button has the keyboard) */
document.addEventListener('keydown', e => {
  if (!app._slides || document.getElementById('slide-screen').classList.contains('hidden')) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
  const k = e.key;
  if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && tag !== 'BUTTON')) { e.preventDefault(); app.slideNext(); }
  else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); app.slideBack(); }
});

/* ── BOOT ────────────────────────────────────────────── */
fillCounts();   // the start screen's and the directions' numbers, from the data
app.init();
if (TEACH) app._teachReady();
else if (location.hash === '#teacher' && teacherUnlocked()) app.openTeacher();

/* ── CLOSED-TO-STUDENTS LOCK ────────────────────────── */
(function applyReviewLock() {
  if (SHARE_MODE || ANY_OPEN) return;   // any part open → students can get in
  const btn = document.querySelector('.lgs-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.classList.add('locked');
  btn.textContent = '🔒 Not Open Yet';
  const note = document.createElement('p');
  note.className = 'locked-note';
  note.textContent = "Mr. O will let you know when this is ready!";
  btn.insertAdjacentElement('afterend', note);
})();

/* ── A KEY ON A HIDDEN BUTTON DOES NOTHING (10/27/2026) ──
   After a tap the keyboard stays on that button, even once it is hidden, so Enter or Space pressed it
   again: a right answer counted twice (13 of 12 on Vocab Practice) and Next skipped a question.
   Enter and Space on a button that is hidden or turned off are now ignored. */
['keydown', 'keyup'].forEach(type => document.addEventListener(type, e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = document.activeElement;
  if (el && el.tagName === 'BUTTON' && (el.disabled || !el.getClientRects().length)) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true));

/* ── PICK UP ON ANY COMPUTER (Marcos 11/12: "i want the kids to have the same experience that they have at home to be
   like they were logging on at school") — spot-sync.js (the same file on every site) keeps a copy of this site's save
   (STORAGE_KEY) on the sheet. At sign-in, checkResume waits for the sheet once (the menu held, "Looking for your saved
   work…") and the copy that is further along is the one "Welcome back! Resume Where I Left Off" shows. */
if (window.SpotSync) SpotSync.init({
  site: 'sbac-base-ten-iab-review', key: STORAGE_KEY, url: SHEET_URL, app,
  who: () => loggedInName,
  skip: () => SHARE_MODE || reviewMode,
  usable: s => Array.isArray(s.currentBank) && s.currentBank.length > 0
});

/* ── TESTS ARE TAKEN AT SCHOOL (Marcos 11/12/2026: "allow the kids to do the reviews only and make all of those [tests]
   off limits" at home → "I like your time idea") ──
   school-clock.js (the same file on every test site) says whether it is the school day: Monday–Friday, 8:40 AM–3:10 PM
   (12:50 PM on early-dismissal days), by the clock of the site's own address, not the computer's. Outside it
   Test Form A and Test Form B (and their retakes) are shut — each button reads "At school only" — and a test started at
   school waits for the next school day (its Resume button is shut, with a note). The Warm-Up and the Practice stay open at home. A
   test already on the screen at 3:10 goes on. The guest view (?share=), Try it and Teacher Access are never shut. */
const SCHOOL_NOTE = 'You finish the test at school. It opens on school days from 8:40 to 3:10.';
function atSchoolNow() { return !window.SchoolClock || SchoolClock.atSchool(); }
function schoolOnly(form) { return !SHARE_MODE && isTest(form) && testFlag(form) && !atSchoolNow(); }
// The "Welcome back" box: a saved TEST outside the school day — Resume shut, a note under it
function markSchoolResume() {
  const rc = document.getElementById('resume-container');
  const btn = rc && rc.querySelector('.resume-btn');
  if (!btn) return;
  let data = null;
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { data = null; }
  const shut = !!data && !rc.classList.contains('hidden') && schoolOnly(data.currentForm);
  btn.disabled = shut;
  btn.classList.toggle('locked', shut);
  let note = document.getElementById('resume-school-note');
  if (shut && !note) {
    note = document.createElement('p');
    note.id = 'resume-school-note';
    note.className = 'locked-note';
    note.textContent = '🏫 ' + SCHOOL_NOTE;
    btn.insertAdjacentElement('afterend', note);
  } else if (!shut && note) note.remove();
}
function applySchoolLock() {
  if (loggedInName && !SHARE_MODE) applyFormLocks(loggedInName);
  markSchoolResume();
}
if (window.SchoolClock) SchoolClock.whenKnown(applySchoolLock);
setInterval(applySchoolLock, 30000);

/* the teacher/admin guest link (share.js, Marcos 11/13): its 🧑‍🏫 Teacher / admin guest button opens the Teacher screen, no PIN */
if (window.SHARE_TEACHER) window.SHARE_OPEN_TEACHER = () => app.openTeacher();
