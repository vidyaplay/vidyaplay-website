/* VidyaPlay phonics lesson engine (Phase 1, 14 Nov 2026). Plain JavaScript, no libraries.
   A lesson is data (lessons/<id>.js calls VP.lesson({...})); this file turns the data into screens.
   Step types: intro, listen, pictures (games: tap, basket, oddOneOut), letters, trace, done.
   Progress: localStorage "vp_phonics_v1" (old format {done:{s:2}} is read and upgraded, never deleted).
   ?legacy=1 turns off the Phase 1 improvements (used by the parity test to prove nothing changed). */
(function () {
  var VP = window.VP = window.VP || {};
  var registry = {}, order = [];
  VP.lessons = function (list) { order = list; };            // lessons/index.js: [{id:"s"}, {id:"a"}, ...]
  VP.lesson = function (def) { registry[def.id] = def; };     // lessons/<id>.js

  var params = new URLSearchParams(location.search);
  var LEGACY = params.get("legacy") === "1";
  var FEAT = { wand: !LEGACY, shuffle: !LEGACY, repeat: !LEGACY, hints: !LEGACY, gentleTrace: !LEGACY, preload: !LEGACY, unlock: !LEGACY, skip: !LEGACY };

  // ---------- progress ----------
  var KEY = "vp_phonics_v1", prog = { done: {} };
  try { var raw = localStorage.getItem(KEY); if (raw) prog = JSON.parse(raw) || prog; } catch (e) {}
  if (!prog || typeof prog !== "object") prog = { done: {} };
  if (!prog.done || typeof prog.done !== "object") prog.done = {};
  if (!prog.history || typeof prog.history !== "object") prog.history = {};
  prog.v = 2;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) {} }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function isOpen(i) { if (i === 0) return true; if (!FEAT.unlock) return false; var prev = order[i - 1]; return !!(prev && prog.done[prev.id] >= 1); }

  // ---------- small helpers ----------
  var card, L, base, timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(label, fn, cls) { var b = el("button", "ph-btn" + (cls ? " " + cls : "")); b.type = "button"; b.textContent = label; b.onclick = fn; return b; }
  function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
  function fill(t, map) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return map[k] != null ? map[k] : m; }); }
  function shuffled(a) { a = a.slice(); if (!FEAT.shuffle) return a; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ---------- audio ----------
  var ctx = null, cache = {}, current = null, haveVoice = {};
  function hiss(dur, vol) {                                 // browser-made "sss" (filtered noise, no vowel): fallback + magic-wand pulses
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      var d = dur || 0.9, V = vol || 0.35, n = Math.floor(ctx.sampleRate * d), buf = ctx.createBuffer(1, n, ctx.sampleRate), ch = buf.getChannelData(0);
      for (var i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3800;
      var bp = ctx.createBiquadFilter(); bp.type = "peaking"; bp.frequency.value = 6500; bp.Q.value = 1.2; bp.gain.value = 8;
      var g = ctx.createGain(), t0 = ctx.currentTime;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(V, t0 + Math.min(0.08, d / 3));
      g.gain.setValueAtTime(V, t0 + d - Math.min(0.15, d / 3)); g.gain.linearRampToValueAtTime(0, t0 + d);
      src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start();
    } catch (e) {}
  }
  function chime() {                                        // short happy notes (no voice needed)
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume();
      [523, 659, 784, 1047].forEach(function (f, i) { var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.12;
        o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.55); });
    } catch (e) {}
  }
  function clipUrl(name) { return base + "audio/" + name + ".mp3"; }
  function audioFor(name) { return cache[name] || (cache[name] = new Audio(clipUrl(name))); }
  function preload(names) { if (!FEAT.preload) return; (names || []).forEach(function (n) { if (n && !cache[n]) { var a = audioFor(n); a.preload = "auto"; try { a.load(); } catch (e) {} } }); }
  var screenId = 0;                                        // increases on every screen change; old sound callbacks are ignored
  function stopVoice() { if (current) { current.onended = null; current.onerror = null; try { current.pause(); } catch (e) {} current = null; } }
  function say(name, then) {                                // plays a recorded clip; if missing or blocked, carries on silently
    if (Array.isArray(name)) { var list = name.slice(), scr = screenId; var nx = function () { if (scr !== screenId) return; if (!list.length) { if (then) then(); return; } say(list.shift(), nx); }; return nx(); }
    stopVoice();
    if (!name) { if (then) then(); return; }
    var a = audioFor(name), myScreen = screenId;
    var done = false; function fin() { if (!done) { done = true; if (myScreen !== screenId) return; if (then) then(); } }
    a.onerror = function () { haveVoice[name] = false; fin(); };
    a.onended = fin; current = a;
    try { a.currentTime = 0; var p = a.play(); if (p && p.catch) p.catch(function () { fin(); }); } catch (e) { fin(); }
  }
  function replay(name) {                                  // "Again" button: always starts the clip from the beginning
    stopVoice(); if (!name) return;
    var a = new Audio(clipUrl(name)); current = a;
    try { var p = a.play(); if (p && p.catch) p.catch(function () { say(name); }); } catch (e) { say(name); }
  }
  function sound() {                                        // the lesson's pure sound, e.g. "sss"
    var n = L.soundClip;
    if (L.synth !== "hiss") { say(n); return; }
    if (haveVoice[n] === false) { hiss(); } else { say(n, null); setTimeout(function () { if (haveVoice[n] === false) hiss(); }, 250); }
  }

  // ---------- page parts ----------
  var firstScreen = true;
  function steps(k) {
    if (!firstScreen) { try { window.scrollTo(0, Math.max(0, card.getBoundingClientRect().top + window.pageYOffset - 70)); } catch (e) {} }
    firstScreen = false;
    [].forEach.call(document.querySelectorAll("#steps span"), function (s, i) { s.className = i < k ? "on" : ""; });
  }
  function drawMap() {
    var m = document.getElementById("map"); m.innerHTML = "";
    order.forEach(function (o, i) {
      var open = isOpen(i) && (!FEAT.unlock || registry[o.id] || o.id === L.id), cur = o.id === L.id;
      var built = !!registry[o.id];
      var t = el(FEAT.unlock && open && !cur && built ? "a" : "div", "ph-tile" + (open ? " open" : (FEAT.unlock && built ? " locked" : "")) + (prog.done[o.id] ? " done" : ""));
      t.textContent = o.id;
      t.title = open ? "Lesson " + (i + 1) : (built ? "Locked: finish the lesson before" : "Coming soon");
      if (t.tagName === "A") t.href = "?l=" + o.id;
      if (cur) t.setAttribute("aria-current", "page");
      m.appendChild(t);
    });
  }
  function confetti() {
    var C = ["#E8456B", "#F39A1E", "#F5C518", "#2E9E4F", "#1E5BB8", "#7B4CC9"];
    for (var i = 0; i < 40; i++) {
      var d = el("div", "ph-confetti");
      d.style.left = Math.random() * 100 + "vw"; d.style.background = C[i % C.length];
      d.style.animationDuration = (1.8 + Math.random() * 1.6) + "s"; d.style.animationDelay = (Math.random() * .5) + "s";
      document.body.appendChild(d); (function (x) { setTimeout(function () { if (x.parentNode) x.parentNode.removeChild(x); }, 4200); })(d);
    }
  }
  function repeatButton(clip) {                             // 🔁 hear the instruction again
    if (!FEAT.repeat || !clip) return;
    var b = el("button", "ph-repeat"); b.type = "button"; b.innerHTML = '<span aria-hidden="true">🔊</span> Again'; b.setAttribute("aria-label", "Hear the instruction again");
    b.onclick = function () { replay(clip); }; card.appendChild(b); card.classList.add("has-repeat");
  }
  var stepIdx = 0, missedAny = 0, missedWords = [];
  function go(i) {
    if (!L.steps[i]) return;
    screenId++; clearTimers(); stopVoice();
    if (!LEGACY) { card.style.pointerEvents = "none"; setTimeout(function () { card.style.pointerEvents = ""; }, 400); }   // a quick double tap cannot press the next screen's button
    [].forEach.call(document.querySelectorAll(".ph-confetti,.ph-fly,.ph-drag"), function (c) { c.parentNode.removeChild(c); });
    stepIdx = i; var s = L.steps[i]; card.classList.remove("has-repeat");
    steps(i + 1);
    if (i === 0) { missedAny = 0; missedWords = []; }
    TYPES[s.type](s);
    var nx = L.steps[i + 1]; if (nx) preload(clipsOf(nx));
  }
  function next() { go(stepIdx + 1); }
  function clipsOf(s) {
    var c = [].concat(s.audio || []);
    if (s.type === "pictures") { (s.rounds || []).concat(s.oddRounds || []).forEach(function (r) { (r.items || r).forEach(function (n) { var v = L.vocab[n]; if (v) c.push(v.yes || v.no); }); }); if (s.finish) c.push(s.finish.audio); }
    if (s.type === "scene") (s.spots || []).forEach(function (sp) { var v = L.vocab[sp.word]; if (v) c.push(v.yes || v.no); });
    if (s.yes) c.push(s.yes.audio); if (s.no) c.push(s.no.audio); if (s.great) c.push(s.great.audio);
    return c;
  }

  // ---------- step types ----------
  var TYPES = {};
  TYPES.intro = function (s) {
    card.innerHTML = '<h1>' + s.title + '</h1><img class="ph-sunny" src="' + base + L.character.img + '" alt="' + L.character.alt + '">' +
      '<p>' + s.text + '</p><div class="ph-big">' + L.letter + '</div>';
    var hear = btn(s.hearLabel, function () { sound(); nextB.disabled = false; }, "alt");
    var nextB = btn("Next", next); nextB.disabled = true;
    var start = btn("▶ Start", function () {
      start.style.display = "none"; hear.style.display = ""; nextB.style.display = "";
      try { window.scrollTo(0, Math.max(0, card.getBoundingClientRect().top + window.pageYOffset - 70)); } catch (e) {}
      if (FEAT.repeat && rep) { rep.style.display = ""; card.classList.add("has-repeat"); }
      say(s.audio, function () { nextB.disabled = false; });
    });
    hear.style.display = "none"; nextB.style.display = "none";
    card.appendChild(start); card.appendChild(hear);
    card.appendChild(document.createElement("br")); card.appendChild(nextB);
    repeatButton(s.audio); var rep = card.querySelector(".ph-repeat"); if (rep) { rep.style.display = "none"; card.classList.remove("has-repeat"); }
  };
  TYPES.listen = function (s) {
    card.innerHTML = '<h1>' + s.title + '</h1><div class="ph-slide" aria-hidden="true">' + (s.icon || "✋") + '</div><p>' + s.text + '</p>';
    card.appendChild(btn(s.soundLabel, sound, "alt"));
    card.appendChild(document.createElement("br"));
    card.appendChild(btn(s.doneLabel || "I did it!", next));
    repeatButton(s.audio);
    later(function () { say(s.audio); }, 300);
  };
  TYPES.pictures = function (s) { (GAMES[s.game] || GAMES.tap)(s); };
  TYPES.letters = function (s) {
    card.innerHTML = '<h1>' + s.title + '</h1><p>' + s.text + '</p>';
    card.appendChild(btn(s.hearLabel || "🔊 Hear it", sound, "alt"));
    var row = el("div", "ph-letters"), msg = el("div", "ph-msg");
    shuffled(s.choices).forEach(function (ch) {
      var b = el("button", "ph-letter"); b.type = "button"; b.textContent = ch; b.setAttribute("aria-label", "letter " + ch);
      b.onclick = function () {
        if (ch === s.answer) {
          b.className = "ph-letter right"; msg.className = "ph-msg good"; msg.textContent = s.yes.text;
          [].forEach.call(row.children, function (x) { x.onclick = null; });
          var moved = false; var on = function () { if (!moved) { moved = true; next(); } };
          say(s.yes.audio, function () { later(on, 700); }); later(on, 6000);
        } else {
          b.className = "ph-letter wrong"; msg.className = "ph-msg bad"; msg.textContent = s.no.text;
          say(s.no.audio);
        }
      };
      row.appendChild(b);
    });
    card.appendChild(row); card.appendChild(msg);
    repeatButton(s.audio);
    later(function () { say(s.audio); }, 300);
  };
  TYPES.trace = function (s) {
    card.innerHTML = '<h1>' + s.title + '</h1><p>' + s.text + '</p>';
    var cv = el("canvas"); cv.id = "trace"; card.appendChild(cv);
    if (!LEGACY) { cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Tracing box: trace the letter " + L.letter + " with your finger"); }
    var msg = el("div", "ph-msg"); card.appendChild(msg);
    var dpr = window.devicePixelRatio || 1, W = 280, H = 300; cv.width = W * dpr; cv.height = H * dpr;
    var g = cv.getContext("2d"); g.scale(dpr, dpr);
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", s.path);
    var len = path.getTotalLength(), pts = [];
    for (var i = 0; i <= 40; i++) { var p = path.getPointAtLength(len * i / 40); pts.push([p.x, p.y]); }
    var NEAR = FEAT.gentleTrace ? 38 : 30, START = FEAT.gentleTrace ? 44 : 34;
    var hit = 0, drawing = false, finished = false, demo = -1, sparks = [], raf = 0, lastPulse = 0;
    function star(x, y, r, a) { g.save(); g.globalAlpha = a; g.fillStyle = "#F5C518"; g.strokeStyle = "#E8456B"; g.lineWidth = 1; g.beginPath();
      for (var k = 0; k < 10; k++) { var ang = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + rr * Math.cos(ang), y + rr * Math.sin(ang)); }
      g.closePath(); g.fill(); g.stroke(); g.restore(); }
    function animate() { raf = 0; var now = Date.now(); sparks = sparks.filter(function (k) { return now - k.t < 900; }); paint(); if (sparks.length) raf = requestAnimationFrame(animate); }
    function line(upto, color, width) { g.strokeStyle = color; g.lineWidth = width; g.beginPath(); pts.slice(0, upto + 1).forEach(function (q, j) { j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); }
    function paint() {
      g.clearRect(0, 0, W, H); g.lineCap = "round"; g.lineJoin = "round";
      line(pts.length - 1, "#E6DDF6", 38); g.stroke();
      g.strokeStyle = "#9C7BD9"; g.lineWidth = 3; g.setLineDash([8, 8]); g.stroke(); g.setLineDash([]);
      line(hit, "#7B4CC9", 16); if (hit > 0) g.stroke();
      var q = pts[hit < pts.length - 1 ? hit : pts.length - 1];
      g.fillStyle = "#2E9E4F"; g.beginPath(); g.arc(q[0], q[1], 12, 0, 7); g.fill();
      var now = Date.now(); sparks.forEach(function (k) { var age = (now - k.t) / 900; star(k.x, k.y - age * 14, 7 + 5 * (1 - age), 1 - age); });
      if (demo >= 0) { var d = pts[demo]; g.fillStyle = "rgba(245,197,24,.95)"; g.beginPath(); g.arc(d[0], d[1], 10, 0, 7); g.fill(); }
    }
    function pos(e) { var b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; }
    function finish() {
      if (finished) return; finished = true; drawing = false; demo = -1; hit = pts.length - 1; paint();
      msg.className = "ph-msg good"; msg.textContent = s.great.text;
      var moved = false; var on = function () { if (!moved) { moved = true; next(); } };
      say(s.great.audio, function () { later(on, 500); }); later(on, 4000);
    }
    function move(e) {
      if (!drawing) return; e.preventDefault();
      var q = pos(e);
      var before = hit;
      while (hit < pts.length - 1) { var n = pts[hit + 1]; if (Math.hypot(n[0] - q[0], n[1] - q[1]) < NEAR) hit++; else break; }
      if (FEAT.wand && hit > before) {                    // magic wand: stars follow the finger, short sound pulses
        for (var j = before + 1; j <= hit; j++) sparks.push({ x: pts[j][0] + (Math.random() - .5) * 14, y: pts[j][1] + (Math.random() - .5) * 14, t: Date.now() });
        if (L.synth === "hiss" && Date.now() - lastPulse > 380) { lastPulse = Date.now(); hiss(0.28, 0.22); }
        if (!raf) raf = requestAnimationFrame(animate);
      }
      paint();
      if (hit >= pts.length - 1) finish();
    }
    cv.addEventListener("pointerdown", function (e) {
      var q = pos(e), st = pts[hit]; demo = -1;
      if (Math.hypot(st[0] - q[0], st[1] - q[1]) < START) { drawing = true; if (FEAT.gentleTrace && !finished) { msg.className = "ph-msg"; msg.textContent = ""; } try { cv.setPointerCapture(e.pointerId); } catch (x) {} }
      else if (FEAT.gentleTrace) { msg.className = "ph-msg tip"; msg.textContent = "Start from the green dot."; }
    });
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", function () { drawing = false; });
    cv.addEventListener("pointercancel", function () { drawing = false; });
    paint();
    if (FEAT.gentleTrace) {                               // show the stroke once: a yellow dot runs along the letter
      var k = 0; (function run() { if (finished || drawing) { demo = -1; paint(); return; } demo = k; paint(); k++; if (k < pts.length) later(run, 45); else { demo = -1; paint(); } })();
    }
    if (FEAT.skip) {                                      // keyboard / motor-difficulty way through
      var sk = el("button", "ph-skip"); sk.type = "button"; sk.textContent = "Skip writing"; sk.onclick = function () { next(); }; card.appendChild(sk);
    }
    repeatButton(s.audio && s.audio[0]);
    later(function () { say(s.audio); }, 300);
  };
  // Hidden Sound Safari: one big picture; tap the things that start with the sound
  TYPES.scene = function (s) {
    card.innerHTML = '<h1>' + s.title + '</h1>';
    var targets = s.spots.filter(function (sp) { return L.vocab[sp.word].first === L.letter; }), found = 0, wrongHere = 0, closed = false;
    var count = el("div", "ph-count"); card.appendChild(count);
    function showCount() { var t = ""; for (var i = 0; i < targets.length; i++) t += '<span class="' + (i < found ? "on" : "off") + '">★</span>'; count.innerHTML = t; count.setAttribute("aria-label", "Found " + found + " of " + targets.length); }
    var wrap = el("div", "ph-scene"), img = el("img"); img.src = base + s.img; img.alt = s.alt || ""; wrap.appendChild(img);
    var msg = el("div", "ph-msg");
    s.spots.forEach(function (sp) {
      var v = L.vocab[sp.word], b = el("button", "ph-spot"); b.type = "button"; b.setAttribute("aria-label", sp.word);
      b.style.left = sp.box[0] + "%"; b.style.top = sp.box[1] + "%"; b.style.width = sp.box[2] + "%"; b.style.height = sp.box[3] + "%";
      b.onclick = function () {
        if (closed || b.__used) return; b.__used = true;
        if (v.first === L.letter) {
          b.classList.add("found"); found++; showCount();
          msg.className = "ph-msg good"; msg.textContent = v.yesText;
          if (found === targets.length) closed = true;
          say(v.yes || L.soundClip, function () { if (closed) later(finishAll, 900); });
          if (closed) later(finishAll, 4500);
        } else {
          missedAny++; wrongHere++; if (missedWords.indexOf(sp.word) < 0) missedWords.push(sp.word);
          b.classList.add("nope"); msg.className = "ph-msg bad";
          msg.textContent = fill(s.wrongText, { Word: cap(sp.word), first: v.first }); say(v.no);
          if (FEAT.hints) { var r = [].filter.call(wrap.querySelectorAll(".ph-spot"), function (x) { return !x.__used && L.vocab[x.getAttribute("aria-label")].first === L.letter; })[0];
            if (r) { r.classList.add("hint"); setTimeout(function () { r.classList.remove("hint"); }, 2600); } }
        }
      };
      wrap.appendChild(b);
    });
    card.appendChild(wrap); card.appendChild(msg); showCount();
    var done = false;
    function finishAll() { if (done) return; done = true; clearTimers();
      msg.className = "ph-msg good"; msg.textContent = s.finish.text; chime(); confetti();
      var me = stepIdx;
      var row = el("div", "ph-actions"); card.appendChild(row);
      row.appendChild(btn("🔄 Play again", function () { go(me); }, "alt"));   // the child can play the garden again
      row.appendChild(btn("Next", next)); }
    repeatButton(s.audio);
    later(function () { say(s.audio); }, 300);
  };
  TYPES.done = function (s) {
    var stars = missedAny === 0 ? 3 : missedAny <= 2 ? 2 : 1;
    prog.done[L.id] = Math.max(prog.done[L.id] || 0, stars);
    var h = prog.history[L.id] || { best: 0, plays: 0, missed: [] };
    h.best = Math.max(h.best || 0, stars); h.plays = (h.plays || 0) + 1; h.last = today(); h.missed = missedWords.slice(0, 12);
    prog.history[L.id] = h; save(); drawMap();
    var idx = -1; order.forEach(function (o, i) { if (o.id === L.id) idx = i; });
    var nxt = order[idx + 1], nxtReady = FEAT.unlock && nxt && registry[nxt.id];
    card.innerHTML = '<img class="ph-sunny" src="' + base + L.character.img + '" alt="' + L.character.alt + '"><h1>' + s.title + '</h1><div class="ph-stars">' + "★".repeat(stars) + '</div>' +
      '<p>' + s.text + '</p>' + (nxt ? '<p class="ph-cap">Next lesson: <b>' + nxt.id + '</b>' + (nxtReady ? '' : ' (coming soon)') + '.</p>' : '') +
      (s.link ? '<a class="ph-link" href="' + s.link.href + '">' + s.link.text + '</a><br>' : '');
    if (nxtReady) { var a = btn("Next lesson ▶", function () { location.search = "?l=" + nxt.id; }); card.appendChild(a); }
    card.appendChild(btn("Play again", function () { go(0); }, "alt"));
    say(s.audio); confetti();
  };

  // ---------- picture games ----------
  var GAMES = {};
  function choiceButton(name) {
    var v = L.vocab[name], b = el("button", "ph-choice"); b.type = "button"; b.setAttribute("aria-label", name);
    b.innerHTML = '<img src="' + base + v.img + '" alt="' + (v.alt || name) + '">'; return b;
  }
  function flyTo(target, b) {
    try {
      var s = target.getBoundingClientRect(), q = b.getBoundingClientRect();
      var im = b.querySelector("img").cloneNode(); im.className = "ph-fly";
      im.style.left = q.left + q.width / 2 - 30 + "px"; im.style.top = q.top + q.height / 2 - 30 + "px"; im.style.width = "60px"; im.style.height = "60px";
      document.body.appendChild(im);
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        im.style.transform = "translate(" + (s.left + s.width / 2 - q.left - q.width / 2) + "px," + (s.top + s.height / 2 - q.top - q.height / 2) + "px) scale(.3)"; im.style.opacity = "0"; }); });
      setTimeout(function () { if (im.parentNode) im.parentNode.removeChild(im); }, 800);
    } catch (e) {}
  }
  function enableDrag(b, target, onDrop) {                 // optional drag: drop the picture on the target = same as tapping
    if (LEGACY) return;
    var ghost = null, sx = 0, sy = 0, moved = false;
    b.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; moved = false; ghost = null; });
    b.addEventListener("pointermove", function (e) {
      if (e.buttons === 0 && e.pointerType === "mouse") return;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) {
        moved = true; ghost = b.querySelector("img").cloneNode(); ghost.className = "ph-drag"; document.body.appendChild(ghost);
        try { b.setPointerCapture(e.pointerId); } catch (x) {}
      }
      if (ghost) { ghost.style.left = e.clientX - 42 + "px"; ghost.style.top = e.clientY - 42 + "px"; }
    });
    function drop() { if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost); ghost = null; }
    b.addEventListener("pointercancel", drop); b.addEventListener("lostpointercapture", function () { setTimeout(drop, 0); });
    b.addEventListener("pointerup", function (e) {
      if (!ghost) return;
      var r = target.getBoundingClientRect(); if (ghost.parentNode) ghost.parentNode.removeChild(ghost); ghost = null;
      b.__justDragged = true; setTimeout(function () { b.__justDragged = false; }, 60);
      if (e.clientX > r.left - 30 && e.clientX < r.right + 30 && e.clientY > r.top - 30 && e.clientY < r.bottom + 30) onDrop();
    });
  }
  // "tap" (Sunny glows) and "basket" (pictures go into a basket): tap or drag the pictures that start with the sound
  function sortGame(s, basket) {
    var rounds = s.rounds.map(function (r) { return r.items || r; });
    var total = 0; rounds.forEach(function (r) { r.forEach(function (n) { if (L.vocab[n].first === L.letter) total++; }); });
    var r = 0, fed = 0;
    function shine() {
      var t = document.getElementById("target"); if (!t || basket) return;
      var k = fed / total; t.style.transform = "scale(" + (1 + 0.18 * k) + ")";
      t.style.filter = "drop-shadow(0 0 " + Math.round(34 * k) + "px rgba(255,193,7," + (0.3 + 0.7 * k) + "))";
    }
    function round() {
      var list = rounds[r], left = list.filter(function (n) { return L.vocab[n].first === L.letter; }).length, wrongHere = 0;
      [].forEach.call(document.querySelectorAll(".ph-drag,.ph-fly"), function (c) { c.parentNode.removeChild(c); });
      card.innerHTML = (basket ? '<div class="ph-basket" id="target" aria-hidden="true">🧺</div>'
        : '<img class="ph-sunny" id="target" src="' + base + L.character.img + '" alt="' + L.character.alt + '">') + '<h1>' + s.title + '</h1>';
      var target = document.getElementById("target");
      var grid = el("div", "ph-grid"), msg = el("div", "ph-msg");
      var done = false;
      function nextRound() { if (done) return; done = true; clearTimers(); r++; r < rounds.length ? round() : finishAll(); }
      shuffled(list).forEach(function (name) {
        var v = L.vocab[name], b = choiceButton(name);
        function choose() {
          if (b.__used || grid.__closed) return;
          if (v.first === L.letter) {
            b.className = "ph-choice right used"; b.__used = true; fed++; left--; shine();
            msg.className = "ph-msg good"; msg.textContent = v.yesText;
            flyTo(target, b); if (basket) { target.classList.add("got"); setTimeout(function () { target.classList.remove("got"); }, 350); }
            if (left === 0) grid.__closed = true;
            say(v.yes, function () { if (left === 0) later(nextRound, 1400); });
            if (left === 0) later(nextRound, 3500);
          } else {
            missedAny++; wrongHere++; if (missedWords.indexOf(name) < 0) missedWords.push(name);
            b.className = "ph-choice wrong used"; b.__used = true; msg.className = "ph-msg bad";
            msg.textContent = fill(s.wrongText, { Word: cap(name), first: v.first });
            say(v.no);
            if (FEAT.hints && wrongHere >= 1) {           // after a wrong tap: gently show one right picture
              var right = [].filter.call(grid.children, function (x) { return x.className.indexOf("used") < 0 && L.vocab[x.getAttribute("aria-label")].first === L.letter; })[0];
              if (right) { right.classList.add("hint"); setTimeout(function () { right.classList.remove("hint"); }, 2600); }
            }
          }
        }
        b.onclick = function () { if (b.__justDragged) return; choose(); };
        enableDrag(b, target, choose);
        grid.appendChild(b);
      });
      card.appendChild(grid); card.appendChild(msg);
      shine();
      repeatButton(s.audio);
      if (r === 0) later(function () { say(s.audio); }, 300);
    }
    function finishAll() {
      clearTimers(); stopVoice();
      card.innerHTML = (basket ? '<div class="ph-basket" id="target" aria-hidden="true">🧺</div>'
        : '<img class="ph-sunny" id="target" src="' + base + L.character.img + '" alt="' + (s.finish.alt || L.character.alt) + '" style="margin:10px 0 14px">') +
        '<h1>' + s.finish.title + '</h1><p>' + s.finish.text + '</p>';
      fed = total; shine();
      card.appendChild(btn("Next", next));
      say(s.finish.audio); confetti();
    }
    round();
  }
  GAMES.tap = function (s) { sortGame(s, false); };
  GAMES.basket = function (s) { sortGame(s, true); };
  // "oddOneOut": each round shows a row; tap the ONE picture that does NOT start with the sound
  GAMES.oddOneOut = function (s) {
    var r = 0, rounds = s.oddRounds || [];
    function round() {
      var list = rounds[r];
      card.innerHTML = '<h1>' + (s.oddTitle || "Which one does not start with " + L.soundText + "?") + '</h1>';
      var row = el("div", "ph-row"), msg = el("div", "ph-msg"), done = false;
      shuffled(list).forEach(function (name) {
        var v = L.vocab[name], b = choiceButton(name);
        b.onclick = function () {
          if (done) return;
          if (v.first !== L.letter) {
            done = true; b.className = "ph-choice right"; msg.className = "ph-msg good";
            msg.textContent = fill(s.oddYesText || "Yes! {Word} starts with {first}.", { Word: cap(name), first: v.first });
            say(v.odd || null); later(function () { r++; r < rounds.length ? round() : next(); }, 2600);
          } else {
            missedAny++; b.className = "ph-choice wrong used"; msg.className = "ph-msg bad";
            msg.textContent = fill(s.oddNoText || "{Word} starts with {first}. Find the one that does not.", { Word: cap(name), first: L.soundText });
          }
        };
        row.appendChild(b);
      });
      card.appendChild(row); card.appendChild(msg);
    }
    round();
  };

  // ---------- start ----------
  function start() {
    card = document.getElementById("card"); if (!LEGACY) document.body.classList.add("ph-new");
    var want = params.get("l"), first = order[0] && order[0].id, id = want && registry[want] ? want : first;
    var wi = -1; order.forEach(function (o, i) { if (o.id === id) wi = i; });
    if (want && registry[want] && FEAT.unlock && !isOpen(wi)) id = first;    // a locked lesson opens lesson 1 instead
    L = registry[id]; base = L.base || "";
    if (LEGACY) L.steps = L.steps.filter(function (st) { return st.type !== "scene"; });   // legacy = the page before Phase 1
    if (!LEGACY && params.get("dev") === "1" && params.get("game")) L.steps.forEach(function (st) { if (st.type === "pictures") st.game = params.get("game"); });
    var bar = document.getElementById("steps"); bar.innerHTML = ""; L.steps.forEach(function () { bar.appendChild(el("span")); });
    if (L.parentNote) document.getElementById("note").innerHTML = L.parentNote;
    drawMap(); go(0);
  }
  VP.start = start;
})();
