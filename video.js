/* ═══════════════════════════════════════════════════════
   🎬 THE LESSON VIDEOS IN THE SITE (Marcos 11/13 — see data/videos.js for what and where).
   One video at a time, inside the question card (an iframe of videos/chNN/). This file:
     · puts it on the page with its direction ("Press Play…"), which is read aloud first; the video stays
       locked until the direction is heard (THE STANDARD 10/27: every direction read first);
     · logs it for the dashboard: { e:'video', id, ch, why, t } when it opens, { e:'videodone', id, ch, full, t }
       when it reaches its end (full = every part played through, none jumped over);
     · stops it when the student closes it, goes on, leaves the page, or the site starts to speak; stops the
       site's own voice when the video starts;
     · falls back when a video does not load (onFail), so a student is never stuck on a blank box.
   The video page talks back through postMessage (videos/lib/embed.js: 'ready', 'start', 'beat', 'done').
═══════════════════════════════════════════════════════ */
(function () {
  const V = window.MM4_VIDEOS;
  const READY_WAIT = 10000;          // a video that has not said 'ready' by then did not load
  const DIR_MAX = 8000;              // the direction unlocks the video by then even if the voice never says it ended
  const BACK_AFTER = 2500;           // a help video's last frame ("Now you try.") stays this long, then back to the question
  let open = null;                   // { panel, frame, ch, qid, why, onDone, onFail, readyTimer, dirTimer }

  const pad = n => String(n).padStart(2, '0');
  const srcOf = (ch, must) => `videos/ch${pad(ch)}/index.html?v=${V.version}${must ? '&must=1' : ''}`;
  const post = cmd => { try { open && open.frame.contentWindow && open.frame.contentWindow.postMessage({ cmd }, '*'); } catch (e) {} };

  function forWatch(q) { return q && q.kind === 'watch' ? (V.watch[q.title] || null) : null; }
  // Practice questions and the "try one like it" that follows a Practice miss (form X) — nowhere else
  function forQuestion(q, form) { return q && !q.kind && (form === 'P') && q.spot ? (V.spot[q.spot] || null) : null; }

  // after a help video: back to where the student was — the question (Show me) or the answer and its Listen (Watch how)
  function backTo(me) {
    const to = me.why === 'miss' ? document.getElementById('feedback') : document.querySelector('.question-header');
    if (to) to.scrollIntoView({ block: 'start' });
    const btn = document.querySelector(me.why === 'miss' ? '#feedback .video-show-btn' : '#question-text .video-show-btn');
    if (btn) btn.focus({ preventScroll: true });
  }

  function close() {
    if (!open) return;
    post('pause');
    clearTimeout(open.readyTimer); clearInterval(open.dirTimer);
    const was = open; open = null;
    if (was.panel.isConnected) was.panel.remove();
    document.querySelectorAll('.video-show-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }

  /* host: where the panel goes. opts: { why: 'watch'|'hint'|'miss', qid, must (Next waits for it: the Play button
     pulses), closable, dir (the direction), onDone(full), onFail() } */
  function mount(host, ch, opts = {}) {
    close();
    const title = V.titles[ch] || 'Video';
    const dir = opts.dir || 'Press Play to watch.';
    const panel = document.createElement('div');
    panel.className = 'video-panel' + (opts.must ? ' video-must' : '');
    panel.dataset.ch = String(ch);
    // one row above the video: the direction (read first) and, for a help video, the way back (Web Design Expert 11/13:
    // a title row repeated the video's own cover and pushed the player off a 650 px screen; BUTTONS SAY WHERE THEY GO)
    const back = opts.why === 'miss' ? '⬆ Back to my answer' : '⬆ Back to the question';
    panel.innerHTML =
      `<div class="dir-section video-dir"><button type="button" class="speak-btn" aria-label="Read the direction aloud" onclick="speakDir(this)">🔊</button>` +
      `<p class="dir-text">${dir}</p>` +
      (opts.closable ? `<button type="button" class="video-close" aria-label="${back} — close the video">${back}</button>` : '') + `</div>` +
      `<div class="video-frame-wrap locked"><iframe class="video-frame" title="${title} — video" allow="autoplay; fullscreen" src="${srcOf(ch, opts.must)}"></iframe></div>`;
    host.appendChild(panel);
    const frame = panel.querySelector('iframe'), wrap = panel.querySelector('.video-frame-wrap');
    open = { panel, frame, ch, title, qid: opts.qid || null, why: opts.why || 'hint', onDone: opts.onDone, onFail: opts.onFail };
    const me = open;
    if (opts.closable) panel.querySelector('.video-close').onclick = () => { logEvent('videoclose', { id: me.qid, ch, t: title }); close(); backTo(me); };
    logEvent('video', { id: me.qid, ch, why: me.why, t: title });
    if (typeof app !== 'undefined' && app.saveProgress) app.saveProgress();
    me.readyTimer = setTimeout(() => { if (open === me && !me.ready) { const f = me.onFail; close(); if (f) f(); } }, READY_WAIT);

    // the direction is read aloud first; the video unlocks when it has been said (or cannot be)
    const btn = panel.querySelector('.video-dir .speak-btn');
    // in view: the Warm-Up's video (it is the whole card) from its top, under the sticky part banner; a help video only
    // as far as needed, so the question stays near. Again when the direction has been said (the moment Play is needed),
    // since a part starting scrolls the page to its top after the video is put on it (11/13, seen at 1366 × 650).
    const inView = () => {
      if (open !== me) return;
      const r = panel.getBoundingClientRect();
      if (r.top < 60 || r.bottom > innerHeight) panel.scrollIntoView({ block: opts.must ? 'start' : 'nearest' });   // a jump: a smooth scroll right after a part starts did not move the page (11/13)
    };
    const unlock = () => { clearInterval(me.dirTimer); wrap.classList.remove('locked'); inView(); };
    let began = false;
    const t0 = Date.now();
    speakDir(btn);
    me.dirTimer = setInterval(() => {
      if (open !== me) { clearInterval(me.dirTimer); return; }
      if (activeSpeakBtn === btn) began = true;
      if ((began && activeSpeakBtn !== btn) || (!began && Date.now() - t0 > 2500) || Date.now() - t0 > DIR_MAX) unlock();
    }, 150);
    setTimeout(inView, 80);
    return panel;
  }

  addEventListener('message', e => {
    const d = e.data;
    if (!open || !d || d.source !== 'mm4-video' || e.source !== open.frame.contentWindow) return;
    const me = open;
    if (d.ev === 'ready') { me.ready = true; clearTimeout(me.readyTimer); }
    if (d.ev === 'start') { me.ready = true; clearTimeout(me.readyTimer); stopActiveSpeech(); }
    if (d.ev === 'done') {
      logEvent('videodone', { id: me.qid, ch: me.ch, full: !!d.full, t: me.title });
      if (typeof app !== 'undefined' && app.saveProgress) app.saveProgress();
      if (me.onDone) me.onDone(!!d.full);
      // a help video ends on "Now you try.": let it be seen, then back to the question (or the answer)
      if (me.why !== 'watch') setTimeout(() => { if (open === me) { close(); backTo(me); } }, BACK_AFTER);
    }
  });

  // leaving the page stops it (LEAVING ENDS IT, 10/23); so does the site starting to speak
  addEventListener('pagehide', () => post('pause'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) post('pause'); });
  if ('speechSynthesis' in window) {
    const speak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = u => { post('pause'); return speak(u); };
  }

  window.MM4Video = { forWatch, forQuestion, mount, close, isOpen: () => !!open, current: () => open && { ch: open.ch, why: open.why, qid: open.qid } };
})();
