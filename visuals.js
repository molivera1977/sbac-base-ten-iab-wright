/* ═══════════════════════════════════════════════════════
   SBAC IAB PRACTICE · NUMBER AND OPERATIONS IN BASE TEN · visuals.js
   (Math Module 4's pictures, plus the school-store poster.)
   The pictures that go with a question or its explanation.
   Each one is built from numbers in the data file, so the
   picture can never disagree with the answer:
   - stack : the problem worked in columns, with the regrouping
             marks a student would write (carried 1s when adding,
             crossed-out digits when subtracting)
   - rect  : a rectangle or square with its sides labeled
   - bar   : the parts / total bar model for comparison problems
             (same model as the M1–M2 review homework)
   - work  : short lines of work, used for the rounding estimates
   - prices: (pic.kind 'prices') a store poster — a title and items with prices,
             read aloud after the question ("eraser, 20 tickets"; picSay)
   - area  : (pic.area / explain.area) an area model with partial products (HMH Module 8:
             "Break apart each factor into tens and ones", "partial products"), read
             aloud after the question too (picSay)
   A question can carry `pic` (shown under the question) and
   `explain` (shown in the feedback when the form teaches).
   Under a question nothing gives the answer away: the columns end
   in "?", the bar model's missing part is "?", no regroup marks.
═══════════════════════════════════════════════════════ */
(function (root) {
  const fmt = n => Number(n).toLocaleString('en-US');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ── COLUMN WORK ─────────────────────────────────────
     Works a + b or a − b the way the standard algorithm does, right to
     left, and keeps what a student writes above the top number:
     adding      → a small 1 over the next place each time a place makes 10+
     subtracting → the new value over every top digit that changed
                   (5,032 − 3,981: the 5 becomes 4, the 0 becomes 9, the 3 becomes 13) */
  function stackModel(a, b, op) {
    const res = op === '+' ? a + b : a - b;
    const n = Math.max(String(a).length, String(b).length, String(res).length);
    const pad = v => String(v).padStart(n, ' ').split('');
    const A = pad(a), B = pad(b), R = pad(res);
    const digit = (arr, i) => (arr[i] === ' ' ? 0 : Number(arr[i]));
    const marks = new Array(n).fill('');
    const struck = new Array(n).fill(false);
    if (op === '+') {
      let carry = 0;
      for (let i = n - 1; i >= 0; i--) {
        if (carry) marks[i] = '1';
        carry = digit(A, i) + digit(B, i) + carry >= 10 ? 1 : 0;
      }
    } else {
      let borrow = 0;
      for (let i = n - 1; i >= 0; i--) {
        let cur = digit(A, i) - borrow;
        if (cur < digit(B, i)) { cur += 10; borrow = 1; } else { borrow = 0; }
        if (A[i] !== ' ' && cur !== digit(A, i)) { marks[i] = String(cur); struck[i] = true; }
      }
    }
    return { n, A, B, R, marks, struck, res };
  }

  /* WARM-UP STEPS (Marcos 10/15): the problem part-way worked, one place at a time.
     cfg.step = { upto, now, regrouped }
       upto      = how many places are already done, counting from the ones (their answer digits show)
       now       = the next place is the one being worked: it is highlighted and its answer is "?"
       regrouped = that place has already regrouped (subtracting): its new value and the place it took 1 from show
     Worked the same way stackModel works it, place by place, so a step picture can never disagree
     with the finished columns. (No regrouping across a 0 here — the Warm-Up does not use one.) */
  function stepState(cfg) {
    const m = stackModel(cfg.a, cfg.b, cfg.op);
    const n = m.n, st = cfg.step || {}, upto = st.upto || 0;
    const digit = (arr, i) => (arr[i] === ' ' ? 0 : Number(arr[i]));
    const R = new Array(n).fill(' '), marks = new Array(n).fill(''), struck = new Array(n).fill(false);
    if (cfg.op === '+') {
      let carry = 0;
      for (let r = 0; r < upto && r < n; r++) {
        const i = n - 1 - r, sum = digit(m.A, i) + digit(m.B, i) + carry;
        R[i] = String(sum % 10);
        carry = sum >= 10 ? 1 : 0;
        if (carry && i > 0) marks[i - 1] = '1';
      }
    } else {
      const cur = m.A.map(ch => (ch === ' ' ? null : Number(ch)));
      const borrow = i => { cur[i] += 10; cur[i - 1] -= 1; };
      for (let r = 0; r < upto && r < n; r++) {
        const i = n - 1 - r;
        if (cur[i] < digit(m.B, i)) borrow(i);
        R[i] = cur[i] - digit(m.B, i) === 0 && i === 0 ? ' ' : String(cur[i] - digit(m.B, i));
      }
      if (st.regrouped && upto < n) borrow(n - 1 - upto);
      cur.forEach((v, i) => { if (v !== null && v !== digit(m.A, i)) { marks[i] = String(v); struck[i] = true; } });
    }
    const nowAt = st.now && upto < n ? n - 1 - upto : -1;
    if (nowAt >= 0) R[nowAt] = '?';
    return { m, R, marks, struck, nowAt };
  }

  /* mode 'worked' (default) = the answer and the regrouping marks ·
     'ask' = the problem set up in columns, "?" for the answer, no marks ·
     'done' = the answer shown, no marks (a finished problem to look at) */
  function stackHTML(cfg, mode) {
    mode = cfg.step ? 'step' : (mode || 'worked');
    const m = stackModel(cfg.a, cfg.b, cfg.op);
    let nowAt = -1;
    if (mode === 'step') {
      const s = stepState(cfg);
      m.R = s.R; m.marks = s.marks; m.struck = s.struck; nowAt = s.nowAt;
    }
    if (mode !== 'worked' && mode !== 'step') { m.marks.fill(''); m.struck.fill(false); }
    if (mode === 'ask') m.R = m.R.map((ch, i) => (i === m.n - 1 ? '?' : ' '));
    const sign = cfg.op === '+' ? '+' : '−';
    // the thousands digit (and the millions digit) carries the comma
    const cell = (ch, i, cls) => {
      const fromRight = m.n - 1 - i;
      const comma = ch !== ' ' && fromRight > 0 && fromRight % 3 === 0;
      const klass = [cls, comma ? 'm2-comma' : '', i === nowAt ? 'm2-now' : ''].filter(Boolean).join(' ');
      return `<td${klass ? ` class="${klass}"` : ''}>${ch === ' ' ? '' : ch}</td>`;
    };
    const row = (arr, cls, lead, each) =>
      `<tr${cls ? ` class="${cls}"` : ''}><td class="m2-op">${lead}</td>${arr.map((ch, i) => cell(ch, i, each ? each(i) : '')).join('')}</tr>`;
    const hasMarks = m.marks.some(Boolean);
    const marksRow = hasMarks
      ? `<tr class="m2-marks"><td class="m2-op"></td>${m.marks.map((v, i) => `<td${i === nowAt ? ' class="m2-now"' : ''}>${v}</td>`).join('')}</tr>` : '';
    const said = `${fmt(cfg.a)} ${cfg.op === '+' ? 'plus' : 'minus'} ${fmt(cfg.b)}` +
      (mode === 'ask' || mode === 'step' ? ', written in columns' : ` equals ${fmt(m.res)}, ${mode === 'done' ? 'written' : 'worked'} in columns`);
    return `<div class="m2-vis m2-stack-wrap"><table class="m2-stack" role="img" aria-label="${said}">` +
      marksRow +
      row(m.A, '', '', i => (m.struck[i] ? 'm2-struck' : '')) +
      row(m.B, 'm2-bot', sign) +
      row(m.R, mode === 'ask' ? 'm2-ans m2-ask' : mode === 'step' ? 'm2-ans m2-step' : 'm2-ans', '') +
      `</table></div>`;
  }

  /* ── RECTANGLE / SQUARE ──────────────────────────────
     cfg = { l, w, unit, sides: 'all' | 'one', name }
     sides 'all' labels all four sides (the worked picture);
     sides 'one' labels a single side (a square in a question). */
  function rectSVG(cfg) {
    const W = 640, H = 210, RH = 112;
    const ratio = Math.max(1, Math.min(2.4, cfg.l / cfg.w));
    const RW = Math.round(RH * ratio);
    const x0 = (W - RW) / 2, y0 = 48;
    // lenLabel / widLabel let a word card label the sides with words ("length", "width")
    const lenLabel = cfg.lenLabel || `${cfg.l} ${cfg.unit}`, widLabel = cfg.widLabel || `${cfg.w} ${cfg.unit}`;
    const square = cfg.l === cfg.w;
    let s = `<rect x="${x0}" y="${y0}" width="${RW}" height="${RH}" rx="3" class="m2-rect-shape"/>`;
    if (cfg.name) {
      const lines = String(cfg.name).split('\n');
      const top = y0 + RH / 2 - (lines.length - 1) * 11 + 6;
      lines.forEach((ln, i) => { s += `<text x="${W / 2}" y="${top + i * 22}" class="m2-rect-name">${esc(ln)}</text>`; });
    }
    s += `<text x="${x0 + RW + 14}" y="${y0 + RH / 2 + 7}" class="m2-rect-label m2-rect-side">${esc(widLabel)}</text>`;
    if (cfg.sides === 'all' || !square) {
      s += `<text x="${W / 2}" y="${y0 - 12}" class="m2-rect-label">${esc(lenLabel)}</text>`;
    }
    if (cfg.sides === 'all') {
      s += `<text x="${W / 2}" y="${y0 + RH + 28}" class="m2-rect-label">${esc(lenLabel)}</text>`;
      s += `<text x="${x0 - 14}" y="${y0 + RH / 2 + 7}" class="m2-rect-label m2-rect-side-left">${esc(widLabel)}</text>`;
    }
    const said = square
      ? `A square. Each side is ${lenLabel}.`
      : `A rectangle. It is ${lenLabel} long and ${widLabel} wide.`;
    return `<div class="m2-vis m2-rect-wrap"><svg viewBox="0 0 ${W} ${H}" class="m2-rect" role="img" aria-label="${esc(said)}">${s}</svg></div>`;
  }

  /* ── BAR MODEL (parts on top, total on the bottom) ───
     cfg = { total, part, answer } — the answer is the other part, shown in
     green in the explanation. With no answer (under a question) it is "?". */
  function barHTML(cfg) {
    const share = Math.max(28, Math.min(72, Math.round(cfg.part / cfg.total * 100)));
    const ask = cfg.answer == null;
    const said = `Bar model. The total is ${fmt(cfg.total)}. One part is ${fmt(cfg.part)}. The other part is ${ask ? 'missing' : fmt(cfg.answer)}.`;
    return `<div class="m2-vis m2-bar" role="img" aria-label="${said}">` +
      `<div class="m2-bar-labs" aria-hidden="true"><span>Parts</span><span>Total</span></div>` +
      `<div class="m2-bar-box" aria-hidden="true">` +
        `<div class="m2-bar-top" style="grid-template-columns:${share}fr ${100 - share}fr">` +
          `<div>${fmt(cfg.part)}</div><div class="${ask ? 'm2-bar-ask' : 'm2-bar-ans'}">${ask ? '?' : fmt(cfg.answer)}</div></div>` +
        `<div class="m2-bar-bot">${fmt(cfg.total)}</div>` +
      `</div></div>`;
  }

  /* ── LINES OF WORK (rounding, then adding or subtracting) ── */
  function workHTML(lines, plain) {     // plain = under a question: no "answer" line at the bottom
    const said = lines.map(l => l.replace(/←/g, 'is below').replace(/→ \?/g, 'rounds to what').replace(/→/g, 'rounds to').replace(/−/g, 'minus').replace(/\+/g, 'plus').replace(/=/g, 'equals')).join('. ');
    return `<div class="m2-vis m2-work" role="img" aria-label="${esc(said)}">` +
      lines.map((l, i) => `<div${!plain && lines.length > 1 && i === lines.length - 1 ? ' class="m2-work-last"' : ''} aria-hidden="true">${esc(l)}</div>`).join('') +
      `</div>`;
  }

  /* ── TIMES AS MANY BAR MODEL (Module 3 — Marcos's frame, 10/22) ──
     Names at the side, 1 box on top, t equal boxes below, a bracket with the total.
     cfg = { top, bottom, n, t, ask, total?, letter?, more? }
       n      = what each box holds: a number, '?' or a letter
       ask    = 'total'  → bracket shows "?"            (find the bigger amount)
                'small'  → boxes hold n ('?' or a letter), bracket shows the total
                'letter' → bracket shows the letter      (pick the equation)
                'times'  → the bottom is ONE long bar with the total: drawing
                           t boxes would give the answer away
                null     → worked: the bracket shows t × n in green
       more   = shade boxes 2…t (the "how many more" part of a two-step problem)
       label  = Marcos's class words (11/6), on the parts with help only: "smaller number" beside the top box,
                "larger number · the total" under the bottom bar, and on a worked picture the equation
                with factor 1 (groups) · factor 2 (in each group) · product (total) */
  function multHTML(cfg) {
    const t = cfg.t, num = typeof cfg.n === 'number';
    const cell = v => (typeof v === 'number' ? fmt(v) : esc(String(v)));
    const total = num ? t * cfg.n : cfg.total;
    const who = name => `<div class="m3-who${name ? '' : ' m3-who-empty'}" aria-hidden="true">${esc(name || '')}</div>`;   // no names: a plain number question
    const askCls = num ? '' : ' m3-ask';
    const L = !!cfg.label;
    let bottom, brk, said;
    if (cfg.ask === 'times') {
      bottom = `<div class="m3-row"><div class="m3-cell m3-long">${cell(cfg.total)}</div></div>`;
      brk = `<div class="m3-brk-lab">? times as many</div>`;
      said = `Bar model. ${cfg.top ? `The top bar is ${cfg.top}: ` : 'The top bar is '}one group of ${cell(cfg.n)}. ${cfg.bottom ? `The bottom bar is ${cfg.bottom}. The total for ${cfg.bottom} is` : 'The bottom bar holds'} ${cell(cfg.total)}. How many times as many is missing.`;
    } else {
      const cells = Array.from({ length: t }, (_, i) =>
        `<div class="m3-cell${askCls}${cfg.more && cfg.ask == null && i > 0 ? ' m3-more' : ''}">${cell(cfg.n)}</div>`).join('');
      bottom = `<div class="m3-row">${cells}</div>`;
      const lab = cfg.ask === 'total' ? '?' : cfg.ask === 'letter' ? esc(cfg.letter) : cfg.ask === 'small' ? cell(cfg.total) : cell(total);
      brk = `<div class="m3-brk" aria-hidden="true"></div><div class="m3-brk-lab${cfg.ask == null ? ' m3-ans' : ''}">${lab}</div>`;
      said = `Bar model. ${cfg.top ? `The top bar is ${cfg.top}: ` : 'The top bar is '}one group of ${cell(cfg.n)}. ${cfg.bottom ? `The bottom bar is ${cfg.bottom}: ` : 'The bottom bar is '}${t} groups of ${cell(cfg.n)}. ${cfg.bottom ? `The total for ${cfg.bottom}` : 'The total'} is ${cfg.ask === 'total' ? 'missing' : lab}.`;
    }
    const legend = cfg.more && cfg.ask == null ? `<div class="m3-legend" aria-hidden="true">The shaded groups are how many more.</div>` : '';
    const strip = L && cfg.ask == null && num ? '<div></div>' + factorStrip(t, cfg.n) : '';
    if (L) said += ' The smaller number is the top box. The larger number is the total for the bottom bar.' +
      (strip ? ` Factor 1, ${t}, is the number of groups. Factor 2, ${cell(cfg.n)}, is the number in each group. The product, ${cell(total)}, is the total.` : '');
    return `<div class="m2-vis m3-mult" role="img" aria-label="${esc(said)}">` +
      who(cfg.top) + `<div class="m3-row" aria-hidden="true"><div class="m3-cell${askCls}">${cell(cfg.n)}</div>${L ? '<span class="m3-tag">smaller number</span>' : ''}</div>` +
      who(cfg.bottom) + `<div class="m3-botwrap" aria-hidden="true">${bottom}${brk}${L ? '<div class="m3-tag m3-tag-total">larger number · the total</div>' : ''}</div>` +
      strip + legend + `</div>`;
  }

  /* t × n = P with Marcos's words under each number (11/6: "factor 1 being the number of groups, factor 2 being
     the number in each group, and the product being the total") */
  function factorStrip(t, n) {
    const part = (v, a, b, cls) => `<div class="m3-f${cls ? ' ' + cls : ''}"><b>${fmt(v)}</b><span>${a}</span><span>${b}</span></div>`;
    return `<div class="m3-strip" aria-hidden="true">${part(t, 'factor 1', 'groups')}<div class="m3-op">×</div>` +
      `${part(n, 'factor 2', 'in each group')}<div class="m3-op">=</div>${part(t * n, 'product', 'total', 'm3-ans')}</div>`;
  }

  /* ── EQUAL GROUPS OF DOTS (Module 3 Pre-Warm-Up — Marcos 11/6) ──
     For the student who is not ready for the bar model: "4 times as many as 2" is 4 groups of 2 dots.
     Names at the side, like the bar model.
     cfg = { t, n, ask, top?, bottom?, more?, share? }
       ask   = 'total' → one group of n on top, t groups of n below, "?" for how many in all
               'share' → t × n loose dots on top, t empty groups below, each "?" (find the smaller amount)
               null    → worked: the groups and the equation in green
                         (share: true → only the t shared groups and the ÷ equation)
       more  = shade groups 2…t (the "how many more" part of a two-step problem)
       label = Marcos's class words, like the bar model (not on a sharing picture: there the total is on top) */
  function groupsHTML(cfg) {
    const t = cfg.t, n = cfg.n, P = t * n;
    const dots = k => Array.from({ length: k }, () => '<span class="m3-dot"></span>').join('');
    const group = (k, cls) => `<div class="m3-grp${cls ? ' ' + cls : ''}">${k == null ? '<span class="m3-grp-q">?</span>' : dots(k)}</div>`;
    const who = name => `<div class="m3-who${name ? '' : ' m3-who-empty'}" aria-hidden="true">${esc(name || '')}</div>`;
    const row = inner => `<div class="m3-g-row" aria-hidden="true">${inner}</div>`;
    const lab = (text, ans) => `<div class="m3-g-lab${ans ? ' m3-ans' : ''}" aria-hidden="true">${esc(text)}</div>`;
    let body, said;
    if (cfg.ask === 'share') {
      body = who('') + `<div class="m3-g-row m3-g-loose" aria-hidden="true">${dots(P)}</div>` +
        who('') + row(Array.from({ length: t }, () => group(null)).join('')) +
        '<div></div>' + lab(`${P} shared into ${t} equal groups`);
      said = `${P} dots to share into ${t} equal groups. How many go in each group is missing.`;
    } else if (cfg.ask == null && cfg.share) {
      body = who(cfg.top) + row(Array.from({ length: t }, () => group(n)).join('')) +
        '<div></div>' + lab(`${P} ÷ ${t} = ${n}`, true);
      said = `${P} dots shared into ${t} equal groups. Each group has ${n}.`;
    } else {
      const L = !!cfg.label;
      const groupsBelow = Array.from({ length: t }, (_, i) => group(n, cfg.more && cfg.ask == null && i > 0 ? 'm3-more' : '')).join('');
      const tag = text => `<span class="m3-tag">${text}</span>`;
      const worked = '<div></div>' + (L ? factorStrip(t, n) : lab(`${t} × ${n} = ${P}`, true));
      body = who(cfg.top) + row(group(n) + (L ? tag('smaller number') : '')) +
        who(cfg.bottom) + row(groupsBelow) +
        (cfg.ask === 'total' ? '<div></div>' + lab('? in all') : '') +
        (L ? '<div></div><div class="m3-tag m3-tag-total" aria-hidden="true">larger number · the total</div>' : '') +
        (cfg.ask === 'total' ? '' : worked);   // the total named under the groups, then the worked equation (like the bar model)
      said = `${cfg.top ? cfg.top + ': ' : ''}one group of ${n} dots. ${cfg.bottom ? cfg.bottom + ': ' : ''}${t} groups of ${n} dots. ` +
        (cfg.ask === 'total' ? 'How many in all is missing.' : `${t} times ${n} is ${P}.`) +
        (L ? ' The smaller number is the top group. The larger number is the total for the bottom row.' : '');
    }
    const legend = cfg.more && cfg.ask == null ? `<div class="m3-legend" aria-hidden="true">The shaded groups are how many more.</div>` : '';
    return `<div class="m2-vis m3-groups" role="img" aria-label="${esc(said)}">${body}${legend}</div>`;
  }

  /* ── THE STORE POSTER (pic.kind 'prices', SBAC Base Ten spot 10) ──
     cfg = { kind: 'prices', title, unit, items: [{ name, emoji, price }] }
     A poster on the wall of the school store: its title, then one card per item — the picture, the name, the price.
     Every word a student reads is a .wrd span, in the order picSay says them, so the question's 🔊 reads the poster
     after the question and lights each word as it is said ("School Store. eraser, 20 tickets. …"). */
  const unitFor = (price, unit) => (Number(price) === 1 && /s$/.test(unit || '') ? String(unit).slice(0, -1) : String(unit || ''));
  const wrdSpans = text => String(text).split(/\s+/).filter(Boolean).map(w => `<span class="wrd">${esc(w)}</span>`).join(' ');
  function pricesHTML(cfg) {
    const items = (cfg.items || []).map(it =>
      `<li class="nb-item">` +
        `<span class="nb-emoji" aria-hidden="true">${esc(it.emoji || '')}</span>` +
        `<span class="nb-name">${wrdSpans(it.name)}</span>` +
        `<span class="nb-price">${wrdSpans(fmt(it.price))} ${wrdSpans(unitFor(it.price, cfg.unit))}</span>` +
      `</li>`).join('');
    return `<div class="m2-vis nb-poster">` +
      (cfg.title ? `<div class="nb-poster-title"><span aria-hidden="true">🏪</span> ${wrdSpans(cfg.title)}</div>` : '') +
      `<ul class="nb-items">${items}</ul></div>`;
  }
  /* ── THE AREA MODEL (pic.area / explain.area) — multiplication with partial products ──
     cfg = { rows: [10, 4], cols: [20, 3], fill: true | 'parts' | false, ask: [[r, c], …], sum: true|false }
       rows = the parts of the FIRST factor, top to bottom; cols = the parts of the SECOND factor, left to right (one row
       or one column is fine: 6 × 34 = rows [6], cols [30, 4]).
       fill true    → each cell "10 × 20" with "= 200" under it; sum → one line under it: "200 + 30 + 80 + 12 = 322"
       fill 'parts' → each cell only its set-up, "10 × 20" — no product, no sum line (the IAB sets the problem up:
                      Marcos 11/14, "the IAB focuses on setting the problem up as opposed to actually solving it")
       fill false   → empty cells (a set-up picture under a question — never solved)
       ask          → those cells show a big "?", the rest are filled (and a sum line shows "?" for them and the total)
     Sizes roughly follow the parts, but every part keeps a minimum (and room for its numbers), so the ones row and
     column stay readable; the numbers shrink to fit a narrow screen (container units), never below 11 px.
     Read aloud after the question like the poster: picSay gives the sentences, and each one lights its own part —
     the whole model ("Area model. 14 is broken into 10 and 4. …"), then each cell as it is said, then the sum line
     (data-say on each .wrd target). */
  const AREA_TINTS = ['#efe9fc', '#e4f1fd', '#fdf1e3', '#e7f6ec', '#fce8f0', '#f2f7dc'];
  const andList = xs => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
  function areaParts(cfg) {
    const rows = (cfg.rows || []).map(Number), cols = (cfg.cols || []).map(Number);
    const asked = (cfg.ask || []).map(rc => `${rc[0]},${rc[1]}`);
    const isAsk = (r, c) => asked.includes(`${r},${c}`);
    // 'parts' = the set-up in each cell · 'filled' = the products too (ask: the rest are filled) · 'empty'
    const mode = cfg.fill === 'parts' ? 'parts' : cfg.fill === false && !asked.length ? 'empty' : 'filled';
    const R = rows.reduce((a, b) => a + b, 0), C = cols.reduce((a, b) => a + b, 0);
    const cells = [];
    rows.forEach((r, i) => cols.forEach((c, j) => cells.push({ i, j, r, c, p: r * c, ask: isAsk(i, j) })));
    const intro = ['Area model.'];
    if (rows.length > 1) intro.push(`${fmt(R)} is broken into ${andList(rows.map(fmt))}.`);
    if (cols.length > 1) intro.push(`${fmt(C)} is broken into ${andList(cols.map(fmt))}.`);
    cells.forEach(x => {
      x.say = x.ask ? `${fmt(x.r)} times ${fmt(x.c)} is missing.`
        : mode === 'parts' ? `${fmt(x.r)} times ${fmt(x.c)}` : `${fmt(x.r)} times ${fmt(x.c)} is ${fmt(x.p)}.`;
    });
    let body = '';
    if (mode === 'empty') body = 'The parts are empty.';
    else if (mode === 'parts') {
      const shown = cells.filter(x => !x.ask).map(x => x.say);
      body = (shown.length ? `The parts are ${andList(shown)}.` : '') + cells.filter(x => x.ask).map(x => ' ' + x.say).join('');
    } else body = cells.map(x => x.say).join(' ');
    const showSum = !!cfg.sum && mode === 'filled';
    const sumSay = showSum && !asked.length ? `${cells.map(x => fmt(x.p)).join(' plus ')} is ${fmt(R * C)}.` : '';
    const sumText = showSum ? `${cells.map(x => (x.ask ? '?' : fmt(x.p))).join(' + ')} = ${asked.length ? '?' : fmt(R * C)}` : '';
    return { rows, cols, cells, mode, intro: intro.join(' '), body: body.trim(), sumSay, sumText, R, C };
  }
  function areaSay(cfg) {
    const a = areaParts(cfg);
    return [a.intro, a.body, a.sumSay].filter(Boolean).join(' ');
  }
  function areaHTML(cfg) {
    const a = areaParts(cfg);
    const n = a.cols.length, m = a.rows.length;
    // each cell's lines, for the room its column needs
    const line1 = x => `${fmt(x.r)} × ${fmt(x.c)}`, line2 = x => `= ${fmt(x.p)}`;
    const lenOf = x => (x.ask || a.mode === 'empty' ? 2 : a.mode === 'parts' ? line1(x).length : Math.max(line1(x).length, line2(x).length));
    const need = a.cols.map((c, j) => Math.max(fmt(c).length + 1, ...a.cells.filter(x => x.j === j).map(lenOf)));
    const totalC = a.C || 1, totalR = a.R || 1;
    // widths: half by size, half equal — then at least the room its numbers need
    const blend = a.cols.map(c => 0.5 * c / totalC + 0.5 / n);
    const room = need.map(k => k / need.reduce((s, v) => s + v, 0));
    let share = blend.map((b, j) => Math.max(b, room[j]));
    const sum = share.reduce((s, v) => s + v, 0);
    share = share.map(v => v / sum);
    // the cell text size: the narrowest column (by its numbers) decides; ~0.56 em per character, 88% of the width for cells
    const fs = Math.min(...share.map((sh, j) => (sh * 88 * 0.92) / (0.56 * need[j])));
    // heights: half by size, half equal, never under two lines of numbers (one line for the set-up)
    const minH = a.mode === 'filled' ? 3.2 : 2.4;
    const heights = a.rows.map(r => Math.max(minH, +((0.5 * r / totalR + 0.5 / m) * m * (minH + 1)).toFixed(2)));
    const cols = `auto ${share.map(v => `minmax(0, ${v.toFixed(3)}fr)`).join(' ')}`;
    const rowsT = `auto ${heights.map(h => `${h}em`).join(' ')}`;
    let g = `<div aria-hidden="true"></div>` + a.cols.map(c => `<div class="nb-area-col">${fmt(c)}</div>`).join('');
    a.rows.forEach((r, i) => {
      g += `<div class="nb-area-row">${fmt(r)}</div>`;
      a.cells.filter(x => x.i === i).forEach(x => {
        const edge = [x.j === 0 ? 'c0' : '', x.j === n - 1 ? 'cl' : '', i === 0 ? 'r0' : '', i === m - 1 ? 'rl' : ''].filter(Boolean).join(' ');
        const tint = AREA_TINTS[(i * n + x.j) % AREA_TINTS.length];
        const body = x.ask ? '<span class="nb-area-ask">?</span>'
          : a.mode === 'filled' ? `<span class="nb-area-l1">${esc(line1(x))}</span><span class="nb-area-l2">${esc(line2(x))}</span>`
          : a.mode === 'parts' ? `<span class="nb-area-l1">${esc(line1(x))}</span>` : '';
        const target = a.mode !== 'empty' ? ` wrd" data-say="${esc(x.say)}` : '';
        g += `<div class="nb-area-cell ${edge}${target}" style="--tint:${tint}">${body}</div>`;
      });
    });
    return `<div class="m2-vis nb-area" role="img" aria-label="${esc(areaSay(cfg))}">` +
      `<div class="nb-area-grid wrd" data-say="Area model." style="--nb-area-fs:${fs.toFixed(2)}cqw;grid-template-columns:${cols};grid-template-rows:${rowsT}">${g}</div>` +
      (a.sumText ? `<div class="nb-area-sum${a.sumSay ? ' wrd' : ''}"${a.sumSay ? ` data-say="${esc(a.sumSay)}"` : ''}>${esc(a.sumText)}</div>` : '') +
      `</div>`;
  }

  /* What the question's 🔊 says for a picture after the question (the poster and the area model have words of their own) */
  function picSay(pic) {
    if (pic && pic.area) return areaSay(pic.area);
    if (!pic || pic.kind !== 'prices') return '';
    const lines = (pic.items || []).map(it => `${it.name}, ${fmt(it.price)} ${unitFor(it.price, pic.unit)}`.trim() + '.');
    return [pic.title ? `${pic.title}.` : ''].concat(lines).filter(Boolean).join(' ');
  }

  /* Picture under the question — set up, never solved */
  function picHTML(pic) {
    if (!pic) return '';
    if (pic.kind === 'prices') return pricesHTML(pic);
    if (pic.area)  return areaHTML(pic.area);
    if (pic.groups) return groupsHTML(pic.groups);
    if (pic.mult)  return multHTML(pic.mult);
    if (pic.rect)  return rectSVG(pic.rect);
    if (pic.stack) return stackHTML(pic.stack, pic.stack.done ? 'done' : 'ask');
    if (pic.bar)   return barHTML({ total: pic.bar.total, part: pic.bar.part });
    if (pic.work)  return workHTML(pic.work, true);
    return '';
  }

  /* Pictures in the feedback: model first, then the worked columns */
  function explainHTML(ex) {
    if (!ex) return '';
    let out = '';
    if (ex.area)   out += areaHTML(ex.area);    // the area model first, then the lines of work
    if (ex.kind === 'prices') out += pricesHTML(ex);   // the store poster: a worked example's / a slide's picture
    if (ex.groups) out += groupsHTML(ex.groups);
    if (ex.mult)  out += multHTML(ex.mult);
    if (ex.bar)   out += barHTML(ex.bar);
    if (ex.rect)  out += rectSVG(ex.rect);
    if (ex.work)  out += workHTML(ex.work);
    if (ex.stack) out += stackHTML(ex.stack);
    return out ? `<div class="m2-explain">${out}</div>` : '';
  }

  const api = { stackModel, stepState, stackHTML, rectSVG, barHTML, multHTML, groupsHTML, workHTML, pricesHTML, areaHTML, areaSay, picSay, picHTML, explainHTML };
  root.M2V = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
