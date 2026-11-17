'use strict';
/* ═══════════════════════════════════════════════════════
   A Math Module 4 video INSIDE the site (an iframe in math-module-4). Loaded after lib/engine.js, before boot().
   It tells the page (postMessage, source 'mm4-video'):
     'start'  — the student pressed Play
     'beat'   — a new step began { i, id }
     'done'   — the video reached its end { full: every step was played through, not jumped over; played: [i…] }
   and it pauses when the page says { cmd: 'pause' } (the student closed it or left the question).
   Watched "all the way through" = each step ran to its end while playing (85% of it at least), so jumping
   to the last step does not count. Outside an iframe it only marks <html class="embedded"> off, nothing else.
═══════════════════════════════════════════════════════ */
(function () {
  const inFrame = (() => { try { return parent !== window; } catch { return true; } })();
  if (inFrame) document.documentElement.classList.add('embedded');
  // ?must=1: the site waits for this video before Next (the Warm-Up's Watch), so its Play button pulses
  // (Marcos 11/4: only a button that must be pressed to go on pulses)
  if (/[?&]must=1\b/.test(location.search)) document.documentElement.classList.add('must');
  const say = (ev, extra = {}) => { if (inFrame) parent.postMessage({ source: 'mm4-video', ch: CHAPTER.number, ev, ...extra }, '*'); };
  window.MM4_EMBED = { played: new Set(), events: [] };            // for the site tests
  const log = (ev, extra) => { window.MM4_EMBED.events.push({ ev, ...extra }); say(ev, extra); };
  addEventListener('load', () => log('ready'));
  // the cover's button says the word the site's direction says: "Press Play…" (Web Design Expert 11/13: a cover still
  // loading says "Start lesson")
  const playWord = () => { const g = document.getElementById('coverGo'); if (g) g.textContent = 'Play'; };
  setTimeout(playWord, 0); addEventListener('load', playWord);
  // Inside the site the picture fills the frame's width. The player's own fit treats a frame under 700 px as a
  // phone and keeps 120 px for phone controls, which left the picture a third of the frame (11/13, seen at
  // 1366×768: 496 px in a 688 px frame). book.css pins the stage to the top-left; this sets its scale: the
  // stage as wide as the frame, with the player bar (real size under 700 px, as the engine keeps it) below it.
  if (inFrame) {
    const k = () => {
      if (document.fullscreenElement) return;            // full screen: the player's own fit
      const bar = document.getElementById('bar');
      const small = true;                                 // inside the site the bar is always the full-size one (book.css)
      const barH = small ? (bar ? bar.getBoundingClientRect().height : 56) || 56 : 0;
      const kk = small ? Math.min(innerWidth / SW, (innerHeight - barH) / SH) : Math.min(innerWidth / SW, innerHeight / (SH + 60));
      document.documentElement.style.setProperty('--k', kk);
    };
    addEventListener('resize', () => requestAnimationFrame(k));
    document.addEventListener('fullscreenchange', () => setTimeout(k, 50));
    k(); addEventListener('load', k); setTimeout(k, 300);
  }
  let started = false, lastI = -1, ended = false;
  const tick = () => {
    if (typeof P !== 'object' || !Array.isArray(BEATS)) return;
    if (P.started && !started) { started = true; log('start'); }
    if (!P.started) return;
    if (P.i !== lastI) { lastI = P.i; ended = false; log('beat', { i: P.i, id: BEATS[P.i] && BEATS[P.i].id }); }
    if ((P.playing || P.done) && P.end > 0 && P.t >= P.end * .85) window.MM4_EMBED.played.add(P.i);
    if (P.done && !ended) {
      ended = true;
      const played = [...window.MM4_EMBED.played].sort((a, b) => a - b);
      log('done', { full: played.length === BEATS.length, played });
    }
    if (!P.done) ended = false;
  };
  setInterval(tick, 150);
  addEventListener('message', e => {
    if (!e.data || e.data.cmd !== 'pause') return;
    try { if (P.playing) setPlaying(false); } catch {}
  });
})();
