'use strict';
/* ═══════════════════════════════════════════════════════
   Mr. O's SBAC Base Ten IAB videos — the SHARED DRAWING KIT (every chapter loads it after lib/engine.js).
   Copied 11/14 from his Math Module 4 videos (math-module-4-videos/site/mm4-videos/lib/mm4.js); new here: the title
   card's label "SBAC IAB · Base Ten", THE AREA MODEL (dArea) and the IAB's own question shapes (dAsk, dChoices,
   dEntry) — at the end of this file. Read-only for chapter work: a chapter that needs more asks for it here, so
   every video gets it (the recipe: base-ten-iab-videos/README.md).
   His choices (11/11–11/14): gray board, colour that teaches, kid-size text (stage text ≥ 32), Ava's voice,
   reminders and hints; "the iab focuses on setting the problem up as oppose to actually solving it".
   Colours: TENS = blue, ONES = green all the way down (a part keeps its colour in every line and cell) ·
   TEAL = a step badge / the basic fact · ORANGE card = the answer · RED = a mistake · BLUE = the problem.
   Each equal group has its own colour (GROUP / GROUP_BG), and things take their group's colour as they land.
═══════════════════════════════════════════════════════ */
const TEAL = '#1f7a6c', ORANGE = '#c8501e', RED = '#c62828', BLUE = '#1d3f8f', INK = '#16211f';
const ROD = '#7fb2ec', ROD_EDGE = '#1b4f9c', CUBE = '#f2b84b', CUBE_EDGE = '#9a6a12', FLAT = '#9cc4f2', FLAT_EDGE = '#1b4f9c';
// (no orange, teal or red among them: those colours mean zeros, the fact and a mistake)
const GROUP = ['#2f74e0', '#16a34a', '#9333ea', '#e0457b', '#4338ca', '#65a30d', '#0284c7', '#c026d3', '#475569'];
const GROUP_BG = ['#e3eeff', '#dcf5e5', '#f1e4fd', '#fde4ef', '#e3e1fb', '#e8f5d3', '#dcf0fb', '#f8e1fb', '#e5e9ee'];
const TEAL_BG = '#dcf3ee', ORANGE_BG = '#fdeadf', BLUE_BG = '#e6efff', RED_BG = '#fde3e3', SUN_BG = '#fff3cf';
const NOTE = '#ffd966', NOTE_EDGE = '#c99a06';     // the sticky note that covers the zeros

/* one line of maths made of pieces, some coloured; hidden until t0. Returns its group; .row = the pieces
   (each piece has _px = its centre x and _w = its width, so other things can be placed on it). */
const dLine = (p, items, x, y, t0, { size = 64, anchor = 'middle', card = null } = {}) => {
  const g = G(p, { o: 0 });
  const row = tokens(g, items, { x, y, size, anchor });
  if (card) {                                       // a soft coloured card behind the line, drawn under it
    const w = row.w + size * 1.1, left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - row.w - size * .55 : x - size * .55;
    const r = mk('rect', { x: left, y: y - size * .98, width: w, height: size * 1.36, rx: size * .38, fill: card }, g);
    g.insertBefore(r, g.firstChild);
    g._card = { x: left, y: y - size * .98, w, h: size * 1.36 };
  }
  show(g, t0, .5);
  return Object.assign(g, { row });
};
// a soft coloured strip (behind several lines)
const dCard = (p, x, y, w, h, fill, t0) => {
  const r = mk('rect', { x, y, width: w, height: h, rx: 22, fill }, p);
  put(r, { o: 0 }); show(r, t0, .5);
  return r;
};
const dText = (p, str, x, y, t0, { size = 34, fill = COL.chalk, anchor = 'middle', weight = 600 } = {}) => {
  const e = T(p, str, { x, y, size, fill, anchor, weight, o: 0 });
  show(e, t0);
  return e;
};
// "Watch out!" — the red heading on a mistake beat
const dWatchOut = (p, t0, x = 800, y = 110) => dText(p, '⚠ Watch out!', x, y, t0, { size: 46, fill: RED, weight: 800 });

/* base-ten blocks, each drawn around its own centre (place with x/y, recolour through ._r's c_fill) */
const dCube = (p, x, y, s = 28) => {
  const g = G(p, { x, y, o: 0 });
  g._r = mk('rect', { x: -s / 2, y: -s / 2, width: s, height: s, rx: 4, fill: CUBE, stroke: CUBE_EDGE, 'stroke-width': 2 }, g);
  put(g._r, { c_fill: CUBE });
  return g;
};
const dRod = (p, x, y, h = 120) => {                // a ten: ten cubes in a column
  const g = G(p, { x, y, o: 0 }), w = h * .15, c = h / 10;
  g._r = mk('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 3, fill: ROD, stroke: ROD_EDGE, 'stroke-width': 2 }, g);
  put(g._r, { c_fill: ROD });
  let d = '';
  for (let j = 1; j < 10; j++) d += `M${-w / 2} ${-h / 2 + j * c}H${w / 2}`;
  path(g, d, { stroke: ROD_EDGE, 'stroke-width': 1.2, fill: 'none' });
  return g;
};
const dFlat = (p, x, y, s = 70) => {                // a hundred: a ten-by-ten square
  const g = G(p, { x, y, o: 0 }), c = s / 10;
  g._r = mk('rect', { x: -s / 2, y: -s / 2, width: s, height: s, rx: 3, fill: FLAT, stroke: FLAT_EDGE, 'stroke-width': 2 }, g);
  put(g._r, { c_fill: FLAT });
  let d = '';
  for (let j = 1; j < 10; j++) d += `M${-s / 2} ${-s / 2 + j * c}H${s / 2}M${-s / 2 + j * c} ${-s / 2}V${s / 2}`;
  path(g, d, { stroke: FLAT_EDGE, 'stroke-width': .8, fill: 'none', 'stroke-opacity': .55 });
  return g;
};
// a coloured box for one equal group (i = which group), drawn BEHIND what lands in it
const dGroupBox = (p, cx, cy, w, h, t0, i) => {
  const r = mk('rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 18, fill: GROUP_BG[i % GROUP.length],
    stroke: GROUP[i % GROUP.length], 'stroke-width': 3.5 }, p);
  p.insertBefore(r, p.firstChild);
  put(r, { o: 0 });
  show(r, t0, .5);
  return r;
};
// deal things into equal groups one at a time, like sharing: thing k goes to group k % n, landing at slot(g, j)
// (j = its place in that group) and taking the group's colour. Returns when the last one lands.
const dDeal = (things, n, slot, t0, { gap = .06, dur = .5 } = {}) => {
  things.forEach((c, k) => {
    const g = k % n, j = Math.floor(k / n), t = t0 + k * gap, [x, y] = slot(g, j);
    tw(c, { x, y }, t, dur);
    if (c._r) tw(c._r, { c_fill: GROUP[g % GROUP.length] }, t + dur * .6, .4);
  });
  return t0 + (things.length - 1) * gap + dur;
};
// a short pop to point at something already on screen
const dNudge = (e, t0) => { tw(e, { s: 1.22 }, t0, .3, out); tw(e, { s: 1 }, t0 + .3, .35, io); };

/* THE STICKY NOTE that covers zeros: over pieces i..j of a dLine's row. It drops on at t0 and lifts off at t1
   (t1 optional). Kids see the zeros hidden, do the fact, then see the zeros come back. */
const dCover = (line, i, j, t0, t1) => {
  const row = line.row, size = row.size;
  const left = row[i]._px - row[i]._w / 2 - size * .12, right = row[j]._px + row[j]._w / 2 + size * .12;
  // drawn around its own centre, so a dNudge pops it in place (11/13: drawn from the stage corner it jumped ~170 px)
  const cx = (left + right) / 2, cy = row.y - size * .31, w = right - left, h = size * 1.22;
  const g = G(line, { o: 0, x: cx, y: cy - 40 });
  mk('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 10, fill: NOTE, stroke: NOTE_EDGE, 'stroke-width': 3 }, g);
  path(g, `M${w / 2 - 26} ${h / 2}l26 -26v26z`, { fill: NOTE_EDGE, 'fill-opacity': .35 });   // a turned corner
  g._cy = cy;
  tw(g, { o: 1, y: cy }, t0, .45, out);
  if (t1 != null) dLift(g, t1);
  return g;
};
// lift a sticky note off (the zeros come back): up and away
const dLift = (note, t0) => tw(note, { o: 0, y: (note._cy != null ? note._cy : 0) - 70 }, t0, .5, io);
// fly a line's pieces in from somewhere else (e.g. zeros from the problem to the answer): pieces k of line,
// starting at (x, y) and landing in their own place
const dFly = (line, ks, from, t0, dur = .8) => {
  ks.forEach((k, n) => {
    const e = line.row[k], [x, y] = typeof from === 'function' ? from(n) : from;
    put(e, { x, y });
    tw(e, { x: e._px, y: line.row.y }, t0 + n * .12, dur, io);
  });
};
// a red strike through a line (a mistake), drawn on at t0 — through pieces i..j only when given (the Video Director
// 11/13: strike only the wrong number, keep the problem in ink: "450 ÷ 9 = ~~500~~")
const dStrike = (line, t0, color = RED, [i, j] = [0, line.row.length - 1]) => {
  const row = line.row, a = row[i]._px - row[i]._w / 2 - 8, b = row[j]._px + row[j]._w / 2 + 8;
  // through the upper half of the digits, above the bars of + and = (at the middle it ran along them: "2 + 6 + 50 = 58"
  // read as bars, ch09 11/13)
  const s = path(line, `M${a} ${row.y - row.size * .5}L${b} ${row.y - row.size * .5}`, { stroke: color, 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' }, { d: 0 });
  draw(s, t0, .4);
  return s;
};
// a mistake: a red card with the wrong thing, struck through, and a short red note under it.
// strike: [i, j] = strike only pieces i..j (the wrong number; give those pieces fill RED and the rest ink).
// THE SERIES RULE (Video Director 11/13): the note is Ava's own words or nothing; the right answer is on screen too
// (dRight, on a spoken line); the finished mistake holds at least 2.5 s (minDur on the beat).
// strikeAt: when the red line draws (default half a second after the card; later when pieces arrive with the voice)
const dMistake = (p, items, x, y, t0, note, { size = 64, noteSize = 36, strike = null, strikeAt = null } = {}) => {
  const line = dLine(p, items.map(it => typeof it === 'string' ? { t: it, fill: strike ? INK : RED } : it), x, y, t0, { size, card: RED_BG });
  dStrike(line, strikeAt != null ? strikeAt : t0 + .5, RED, strike || undefined);
  if (note) dText(p, note, x, y + size * .95 + noteSize * .6, t0 + .8, { size: noteSize, fill: RED });
  return line;
};
// the right answer beside a mistake: an orange answer card with a green ✓ after it
const dRight = (p, items, x, y, t0, { size = 64, anchor = 'middle' } = {}) => {
  const line = dLine(p, items, x, y, t0, { size, card: ORANGE_BG, anchor });
  const right = line._card ? line._card.x + line._card.w : x;
  dTick(p, right + 44, y - size * .3, t0 + .4);
  return line;
};
// a check mark beside something right
const dTick = (p, x, y, t0, color = '#2e7d32') => {
  const t = path(p, `M${x - 22} ${y}l16 18l32 -38`, { stroke: color, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, { d: 0 });
  draw(t, t0, .4);
  return t;
};

/* A NUMBER LINE from `from` to `to` drawn between x0 and x1 at y. ticks: values with a tick; labels: values with a
   number under them. Returns { g, xOf(v), dot(v, t0, opts), mark(v, t0, opts) }. */
const dNumberLine = (p, { x0 = 260, x1 = 1340, y = 420, from, to, ticks = [], labels = [], t0 = 0, size = 40, color = INK } = {}) => {
  const g = G(p, {});
  const xOf = v => x0 + (v - from) / (to - from) * (x1 - x0);
  const axis = path(g, `M${x0 - 40} ${y}H${x1 + 40}`, { stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }, { d: 0 });
  draw(axis, t0, .6);
  ticks.forEach((v, k) => { const tk = path(g, `M${xOf(v)} ${y - 18}V${y + 18}`, { stroke: color, 'stroke-width': 4, fill: 'none' }, { d: 0 }); draw(tk, t0 + .3 + k * .05, .25); });
  labels.forEach(v => dText(g, Number(v).toLocaleString('en-US'), xOf(v), y + 18 + size * 1.1, t0 + .4, { size, fill: color, weight: 700 }));
  const dot = (v, t, { fill = BLUE, r = 16, label = null, labelY = -44, labelSize = 40 } = {}) => {
    const d = G(g, { x: xOf(v), y, o: 0, s: .3 });
    mk('circle', { cx: 0, cy: 0, r, fill, stroke: '#fff', 'stroke-width': 4 }, d);
    if (label != null) T(d, String(label), { x: 0, y: labelY, size: labelSize, fill, anchor: 'middle', weight: 800 });
    tw(d, { o: 1, s: 1 }, t, .45, back);
    return d;
  };
  // a coloured band along the line from a to b (an "in here" zone)
  const zone = (a, b, t, fill = SUN_BG) => {
    const r = mk('rect', { x: xOf(a), y: y - 26, width: xOf(b) - xOf(a), height: 52, rx: 14, fill }, g);
    g.insertBefore(r, g.firstChild); put(r, { o: 0 }); show(r, t, .5);
    return r;
  };
  return { g, xOf, dot, zone };
};
// a curved jump arrow from (x1, y1) to (x2, y2), bulging up by `lift`, drawn on at t0
const dJump = (p, x1, y1, x2, y2, t0, { color = ORANGE, lift = 90, dur = .7 } = {}) => {
  const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - lift;
  const a = path(p, `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`, { stroke: color, 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' }, { d: 0 });
  draw(a, t0, dur);
  const ang = Math.atan2(y2 - my, x2 - mx), L = 22;
  const head = path(p, `M${x2} ${y2}L${x2 - L * Math.cos(ang - .45)} ${y2 - L * Math.sin(ang - .45)}M${x2} ${y2}L${x2 - L * Math.cos(ang + .45)} ${y2 - L * Math.sin(ang + .45)}`,
    { stroke: color, 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' }, { d: 0 });
  draw(head, t0 + dur * .9, .2);
  return a;
};

/* THE TITLE CARD every video opens with (beat 'intro': "<title>. [[sub]]<subtitle>.").
   titleBeat(title, sub[, label]): the small label reads "SBAC IAB · Base Ten" unless a chapter gives another. */
const LABEL = 'SBAC IAB · Base Ten';
const titleBeat = (title, sub, label = LABEL) => (m) => {
  // on its own panel, with no fade at the end: the next beat's cut takes it away (Video Director 11/13 — the subtitle
  // faded out while Ava was still reading it, then the board stood empty)
  const g = G(panel(0), { o: 0, y: 24 });
  mk('rect', { x: 230, y: 210, width: 1140, height: 300, rx: 40, fill: SUN_BG }, g);
  T(g, label, { x: 800, y: 290, size: 34, fill: '#8a5a00', anchor: 'middle', weight: 700 });
  T(g, title, { x: 800, y: 410, size: title.length > 30 ? 64 : title.length > 22 ? 78 : 96, weight: 800, anchor: 'middle', fill: BLUE });
  GROUP.slice(0, 4).forEach((c, i) => mk('circle', { cx: 680 + i * 80, cy: 466, r: 16, fill: c }, g));
  tw(g, { o: 1, y: 0 }, .2, 1.1, out);
  dText(g.parentNode, sub, 800, 580, m('sub'), { size: 40, fill: COL.dim });
};
/* THE "REMEMBER" CARD every video ends with: numbered steps at their marks, then "Now you try." at [[end]]
   (lines = [['Cover the zeros.', 'w1'], …]; none for a video that ends on "Now you try." alone) */
const rememberBeat = (lines = []) => (m) => {
  const p = panel(0);
  const top = lines.length ? 250 : 380;
  if (lines.length) dText(p, 'Remember', 800, 120, .3, { size: 52, fill: BLUE, weight: 800 });
  lines.forEach(([str, mark], i) => {
    const g = G(p, { x: -16, y: top + i * 132, o: 0 });
    mk('rect', { x: 250, y: -70, width: 1100, height: 108, rx: 26, fill: GROUP_BG[i] }, g);
    mk('circle', { cx: 300, cy: -16, r: 30, fill: GROUP[i] }, g);
    T(g, String(i + 1), { x: 300, y: -4, size: 34, fill: '#ffffff', weight: 700, anchor: 'middle' });
    T(g, str, { x: 370, y: 0, size: 44, weight: 600 });
    tw(g, { o: 1, x: 0 }, m(mark), .6);
  });
  const y = top + lines.length * 132 + 40;
  const g = G(p, { o: 0, s: .8, x: 800, y });
  T(g, '✏️ Now you try.', { x: 0, y: 8, size: 64, weight: 800, anchor: 'middle', fill: BLUE });
  tw(g, { o: 1, s: 1 }, m('end'), .5, back);
};

/* ═══════════════════════════════════════════════════════
   NEW FOR THE BASE TEN IAB (11/14)
═══════════════════════════════════════════════════════ */
// place colours (his Module 4 board: tens part blue, ones part green all the way down; hundreds purple)
const TENS = GROUP[0], ONES = GROUP[1], HUNS = GROUP[2], TENS_BG = GROUP_BG[0], ONES_BG = GROUP_BG[1], HUNS_BG = GROUP_BG[2];
// a broken-apart part's colour by its place; a factor that is NOT broken apart (the 3 in 3 × 46) stays ink
const placeCol = (v, broken = true) => !broken ? INK : v >= 100 ? HUNS : v >= 10 ? TENS : ONES;
const placeBg = (v, broken = true) => !broken ? '#ffffff' : v >= 100 ? HUNS_BG : v >= 10 ? TENS_BG : ONES_BG;
const fmt = v => Number(v).toLocaleString('en-US');
// show pieces ks of a dLine only at t (a number arrives when the voice says it)
const dLater = (line, ks, t) => ks.forEach(k => { put(line.row[k], { o: 0 }); show(line.row[k], t, .4); });
// the centre x of pieces i..j of a dLine
const dMid = (line, i, j) => (line.row[i]._px - line.row[i]._w / 2 + line.row[j]._px + line.row[j]._w / 2) / 2;
// a teal numbered circle like his board's ("Step 1"), centred at (x, y), popping in at t0
const dBadge = (p, n, x, y, t0) => {
  const g = G(p, { x, y, o: 0, s: .6 });
  mk('circle', { cx: 0, cy: 0, r: 30, fill: TEAL }, g);
  T(g, String(n), { x: 0, y: 12, size: 36, fill: '#ffffff', weight: 700, anchor: 'middle' });
  tw(g, { o: 1, s: 1 }, t0, .45, back);
  return g;
};

/* THE AREA MODEL (Marcos 11/14: "the area modeling is basically multipling using expanded form").
   A rectangle split by place value: SIDE = the first factor's parts (rows, labels on the left), TOP = the second
   factor's parts (columns, labels above). The same picture as the site's own (data: pic.area rows/cols).
   Not to scale: a ones part is drawn at least `min` (half) of the biggest part, so its label and cell fit.
     const A = dArea(p, { x: 820, y: 330, w: 680, h: 400, side: [10, 3], top: [20, 5] });
     A.frame(t)            the rectangle draws on (white inside, ink lines)
     A.sideLab(i, t) · A.topLab(j, t)      a part's label fades in, in its place colour
     A.cell(i, j, t, { product })          "10 × 20" in the cell (the SET-UP); product: true → "10 × 20 = 200"
                                           (pieces 3, 4 = " = 200": hide them till the voice says it with dLater)
     A.tint(i, j, t[, fill])               the cell's soft colour (one factor broken apart: that part's colour)
     A.flash(i, j, t)      a red outline that blinks 3 times (a part left out) · A.ring(i, j, t, color) one that stays
     A.cx(j) · A.cy(i) · A.xs · A.ys · A.g (the whole model, for hiding or moving)
   A factor with ONE part (3 in 3 × 46) is not broken apart: its label and its pieces in the cells stay ink. */
const dArea = (p, { x, y, w, h, side, top, size = 52, labelSize = 60, min = .5 }) => {
  const g = G(p, {});
  const split = (vals, len) => {
    const big = Math.max(...vals), wt = vals.map(v => Math.max(v, big * min)), sum = wt.reduce((a, b) => a + b, 0);
    const out = [0]; wt.forEach(v => out.push(out[out.length - 1] + v / sum * len));
    return out;
  };
  const xs = split(top, w).map(v => x + v), ys = split(side, h).map(v => y + v);
  const sBroken = side.length > 1, tBroken = top.length > 1;
  const base = mk('rect', { x, y, width: w, height: h, fill: '#ffffff' }, g); put(base, { o: 0 });
  const tints = G(g, {}), lines = G(g, {}), words = G(g, {});
  const cx = j => (xs[j] + xs[j + 1]) / 2, cy = i => (ys[i] + ys[i + 1]) / 2;
  const cellW = j => xs[j + 1] - xs[j], cellH = i => ys[i + 1] - ys[i];
  const A = {
    g, xs, ys, cx, cy, side, top,
    frame(t, dur = .9) {
      show(base, t, .4);
      draw(path(lines, `M${x} ${y}H${x + w}V${y + h}H${x}Z`, { stroke: INK, 'stroke-width': 5 }, { d: 0 }), t, dur);
      xs.slice(1, -1).forEach((xx, k) => draw(path(lines, `M${xx} ${y}V${y + h}`, { stroke: INK, 'stroke-width': 4 }, { d: 0 }), t + dur * .7 + k * .15, .45));
      ys.slice(1, -1).forEach((yy, k) => draw(path(lines, `M${x} ${yy}H${x + w}`, { stroke: INK, 'stroke-width': 4 }, { d: 0 }), t + dur * .7 + k * .15, .45));
    },
    sideLab(i, t) { return dLine(g, [{ t: fmt(side[i]), fill: placeCol(side[i], sBroken) }], x - 30, cy(i) + labelSize * .35, t, { size: labelSize, anchor: 'end' }); },
    topLab(j, t) { return dLine(g, [{ t: fmt(top[j]), fill: placeCol(top[j], tBroken) }], cx(j), y - 26, t, { size: labelSize }); },
    // the soft colour of a cell: with one factor broken apart, that part's own colour (as his "4 × 30 = 120" cards)
    tint(i, j, t, fill) {
      const f = fill || (sBroken && !tBroken ? placeBg(side[i]) : tBroken && !sBroken ? placeBg(top[j]) : '#f3f5f7');
      const r = mk('rect', { x: xs[j] + 3, y: ys[i] + 3, width: cellW(j) - 6, height: cellH(i) - 6, fill: f }, tints);
      put(r, { o: 0 }); show(r, t, .5);
      return r;
    },
    cell(i, j, t, { product = false, tint = true, fill } = {}) {
      const a = side[i], b = top[j];
      const pCol = sBroken && !tBroken ? placeCol(a) : tBroken && !sBroken ? placeCol(b) : INK;
      const items = [{ t: fmt(a), fill: placeCol(a, sBroken) }, ' × ', { t: fmt(b), fill: placeCol(b, tBroken) }];
      if (product) items.push(' = ', { t: fmt(a * b), fill: pCol });
      const sz = A.fit(product);
      if (tint) A.tint(i, j, t, fill);
      return dLine(words, items, cx(j), cy(i) + sz * .35, t, { size: sz });
    },
    // one text size for every cell of a model (the biggest that fits the tightest cell with room around it, never under 34)
    fit(product = false) {
      let sz = size;
      const fits = s => side.every((a, i) => top.every((b, j) => textW(`${fmt(a)} × ${fmt(b)}${product ? ' = ' + fmt(a * b) : ''}`, s) <= cellW(j) - 56 && s * 1.3 <= cellH(i)));
      while (sz > 34 && !fits(sz)) sz -= 2;
      return sz;
    },
    ring(i, j, t, color = BLUE) {
      const r = mk('rect', { x: xs[j] + 9, y: ys[i] + 9, width: cellW(j) - 18, height: cellH(i) - 18, rx: 12, fill: 'none', stroke: color, 'stroke-width': 6 }, words);
      put(r, { o: 0 }); show(r, t, .3);
      return r;
    },
    // a part LEFT OUT: the cell blinks red (behind its words, so they stay sharp) and stays red until `off` (a time)
    flash(i, j, t, { times = 3, color = RED, off = null } = {}) {
      const r = mk('rect', { x: xs[j] + 3, y: ys[i] + 3, width: cellW(j) - 6, height: cellH(i) - 6, fill: RED_BG, stroke: color, 'stroke-width': 7 }, tints);
      put(r, { o: 0 });
      for (let k = 0; k < times; k++) { tw(r, { o: 1 }, t + k * .7, .25); if (k < times - 1) tw(r, { o: .15 }, t + k * .7 + .35, .25); }
      if (off != null) tw(r, { o: 0 }, off, .4);
      return r;
    },
  };
  return A;
};

/* THE IAB'S OWN QUESTION SHAPES — what the student meets on the test and on the site (style.css: white choice
   buttons with a grey edge, the right one green #d4edda / #28a745; the typing box white with a #94a3b8 edge). */
// the question in a white card: "Which expression is equal to 13 × 25?" (UI face, left-aligned like the site)
const dAsk = (p, str, x, y, t0, { w = 1240, size = 46, fill = INK } = {}) => {
  const g = G(p, { o: 0 });
  mk('rect', { x, y: y - size * 1.15, width: w, height: size * 1.75, rx: 22, fill: '#ffffff', stroke: '#c9d3dc', 'stroke-width': 3 }, g);
  T(g, str, { x: x + 34, y: y, size, fill, weight: 700 });
  show(g, t0, .5);
  return g;
};
/* the choices, stacked like the site's buttons, each drawn around its own centre (a pop stays in place).
   items: one dLine items list per choice. Returns the choices: each { g, line, glow(t), bad(t) }.
   glow = the right one turns green with a ✓ (the site's "correct"); bad = red edge (a wrong one). */
const dChoices = (p, items, x, y, t0, { w = 760, h = 96, gap = 24, size = 50, step = .12 } = {}) => items.map((it, k) => {
  const cy = y + k * (h + gap) + h / 2;
  const g = G(p, { x: x + w / 2, y: cy, o: 0 });
  mk('rect', { x: -w / 2, y: -h / 2 + 5, width: w, height: h, rx: 16, fill: '#d6dbe0' }, g);           // the button's bottom edge
  const face = mk('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 16, fill: '#ffffff', stroke: '#d6dbe0', 'stroke-width': 3 }, g);
  put(face, { c_fill: '#ffffff', c_stroke: '#d6dbe0' });
  put(face, { 'a_stroke-width': 3 });
  const line = dLine(g, it, -w / 2 + 36, size * .35, t0 + k * step, { size, anchor: 'start' });
  tw(g, { o: 1 }, t0 + k * step, .4);
  const c = { g, line, face };
  c.glow = t => {
    tw(face, { c_fill: '#d4edda', c_stroke: '#28a745', 'a_stroke-width': 6 }, t, .4);
    dTick(g, w / 2 - 56, 14, t + .3);
    dNudge(g, t + .1);
  };
  c.bad = t => tw(face, { c_fill: '#f8d7da', c_stroke: '#dc3545' }, t, .4);
  return c;
});
/* the typing box of a "Type the …" question, its left edge at x, sitting on the text baseline y of a line of `size`
   (put it right after "37 × 20 = "). Returns { g, type(str, t) }: the answer appears in it as the voice says it. */
const dEntry = (p, x, y, t0, { w = 250, size = 64 } = {}) => {
  const h = size * 1.45, top = y - size * .35 - h / 2;
  const g = G(p, { o: 0 });
  mk('rect', { x, y: top, width: w, height: h, rx: 16, fill: '#ffffff', stroke: '#94a3b8', 'stroke-width': 4 }, g);
  show(g, t0, .4);
  return {
    g, x, w,
    type(str, t, fill = INK) { const e = dLine(g, [{ t: str, fill }], x + w / 2, y, t, { size }); return e; },
  };
};
