(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fmt = n => Math.round(n).toLocaleString('fr-FR');
  const pad = n => String(n).padStart(2, '0');
  const timeStr = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  // Favicon rond découpé dans le portrait (si le navigateur l'autorise, sinon on garde le JPG brut)
  const faviconImg = new Image();
  faviconImg.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      g.beginPath();
      g.arc(32, 32, 32, 0, Math.PI * 2);
      g.clip();
      const crop = faviconImg.width * 0.06;
      g.drawImage(faviconImg, crop, crop, faviconImg.width - crop * 2, faviconImg.height - crop * 2, 0, 0, 64, 64);
      const link = $('#favicon');
      link.type = 'image/png';
      link.href = c.toDataURL('image/png');
    } catch (_) { /* canvas "tainted" en file:// : le JPG fait l'affaire */ }
  };
  faviconImg.src = $('#favicon').href;

  const caseId = `OF-${Math.floor(rand(100000, 999999))}`;
  $('#caseId').textContent = caseId;

  // Tout ce que l'on "collecte" reste dans cet objet, dans le navigateur.
  const spy = { start: Date.now(), clicks: 0, dist: 0, escapes: 0, scroll: 0, lastX: null, lastY: null, lastInput: Date.now() };

  /* ---------- Toasts ---------- */
  const toastBox = $('#toasts');
  function toast(msg, type = '') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const tag = document.createElement('span');
    tag.className = 'toast-tag';
    tag.textContent = `SAT-84 · ${timeStr()}`;
    el.append(tag, document.createTextNode(msg));
    toastBox.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 450); }, 5200);
    const all = $$('.toast', toastBox);
    if (all.length > 3) all[0].remove();
  }

  /* ---------- Modal ---------- */
  const modal = $('#modal');
  const modalBody = $('#modalBody');
  function openModal(html) {
    modalBody.innerHTML = html;
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }
  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = '';
    document.body.classList.remove('modal-open');
  }
  $('#modalX').addEventListener('click', closeModal);
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-close]')) closeModal();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  /* ---------- Starfield ---------- */
  const canvas = $('#stars');
  const ctx = canvas.getContext('2d');
  let W, H, dpr, stars = [], sat = null, shooting = null;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * dpr;
    H = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const count = Math.floor((innerWidth * innerHeight) / 3200);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: rand(0.3, 1.4) * dpr, a: Math.random() * Math.PI, s: rand(0.003, 0.015), depth: rand(0.05, 0.5)
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const sy = scrollY * dpr;
    ctx.fillStyle = '#dfe9f1';
    for (const s of stars) {
      s.a += s.s;
      ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(s.a));
      const y = (((s.y - sy * s.depth) % H) + H) % H;
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Satellite espion qui traverse l'écran
    if (!sat && Math.random() < 0.004) {
      const fromLeft = Math.random() < 0.5;
      sat = { x: fromLeft ? -20 : W + 20, y: rand(0.08, 0.6) * H, vx: (fromLeft ? 1 : -1) * rand(0.7, 1.3) * dpr, vy: rand(-0.15, 0.15) * dpr, t: 0 };
    }
    if (sat) {
      sat.x += sat.vx; sat.y += sat.vy; sat.t++;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#e8eef3';
      ctx.fillRect(sat.x - 1.5 * dpr, sat.y - 1.5 * dpr, 3 * dpr, 3 * dpr);
      if (sat.t % 60 < 8) {
        ctx.fillStyle = '#ff5d5d';
        ctx.beginPath();
        ctx.arc(sat.x, sat.y, 3.2 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      if (sat.x < -40 || sat.x > W + 40) sat = null;
    }

    // Étoile filante
    if (!shooting && Math.random() < 0.0025) shooting = { x: rand(0.3, 1) * W, y: rand(0, 0.4) * H, len: rand(80, 170) * dpr, life: 1 };
    if (shooting) {
      const sh = shooting;
      const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x + sh.len, sh.y - sh.len * 0.4);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = sh.life;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x + sh.len, sh.y - sh.len * 0.4);
      ctx.stroke();
      sh.x -= 9 * dpr; sh.y += 3.6 * dpr; sh.life -= 0.025;
      if (sh.life <= 0) shooting = null;
    }

    ctx.globalAlpha = 1;
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  resize();
  addEventListener('resize', resize);
  draw();

  /* ---------- Réticule de visée ---------- */
  if (finePointer && !reduceMotion) {
    const ret = $('#reticle');
    const label = $('#retLabel');
    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty, locked = false;
    document.body.classList.add('has-reticle');
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    document.addEventListener('mouseover', e => {
      locked = !!e.target.closest('a, button, input, .card, .quote, img');
      ret.classList.toggle('locked', locked);
    });
    (function follow() {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      ret.style.transform = `translate(${cx}px, ${cy}px)`;
      if (locked) {
        label.textContent = 'CIBLE VERROUILLÉE ✓';
      } else {
        const lat = 90 - (cy / innerHeight) * 180;
        const lon = (cx / innerWidth) * 360 - 180;
        label.textContent = `LAT ${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} · LON ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'O'}`;
      }
      requestAnimationFrame(follow);
    })();
  }

  /* ---------- HUD de la bannière ---------- */
  function tickHud() {
    const d = new Date();
    $('#heroClock').textContent = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${timeStr(d)}`;
    $('#heroCoords').textContent = `LAT ${(43.19 + rand(-0.02, 0.02)).toFixed(3)}°N · LON ${(3.07 + rand(-0.02, 0.02)).toFixed(3)}°E · ALT ${fmt(21430 + rand(-8, 8))} km`;
  }
  tickHud();
  setInterval(tickHud, 1000);

  /* ---------- Générateur de bullshit ---------- */
  const buzzwords = [
    'la synergie orbitale disruptive',
    'la blockchain quantique en orbite basse',
    'l’IA gravitationnelle full-stack',
    'le cloud au-dessus des nuages',
    'la surveillance éco-responsable',
    'le Big Data interstellaire agile',
    'l’observation bienveillante à 360°',
    'la cybersécurité astrale (mdp : 1234)',
    'le machine learning lunaire',
    'la disruption de la disruption',
    'l’innovation innovante',
    'la transformation digitale des comètes'
  ];
  const buzzEl = $('#buzzword');
  let buzzIdx = 0;
  function scramble(el, text) {
    if (reduceMotion) { el.textContent = text; return; }
    const glyphs = '01<>/#*+=_░▒▓';
    const total = 18;
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      const reveal = Math.floor((text.length * frame) / total);
      el.textContent = text.slice(0, reveal) + Array.from(text.slice(reveal), c => (c === ' ' ? ' ' : pick(glyphs))).join('');
      if (frame >= total) clearInterval(id);
    }, 40);
  }
  setInterval(() => {
    buzzIdx = (buzzIdx + 1) % buzzwords.length;
    scramble(buzzEl, buzzwords[buzzIdx]);
  }, 3200);

  /* ---------- Boutons qui fuient ---------- */
  function makeFleeing(btn, texts, onCatch) {
    let fx = 0, fy = 0, flees = 0;
    const runAway = () => {
      const r = btn.getBoundingClientRect();
      const baseL = r.left - fx, baseT = r.top - fy;
      for (let i = 0; i < 20; i++) {
        const nx = rand(-220, 220), ny = rand(-110, 110);
        const L = baseL + nx, T = baseT + ny;
        if (L > 16 && L + r.width < innerWidth - 16 && T > 76 && T + r.height < innerHeight - 16 && Math.hypot(nx - fx, ny - fy) > 90) {
          fx = nx; fy = ny;
          break;
        }
      }
      btn.style.transform = `translate(${fx}px, ${fy}px)`;
      flees++;
      btn.textContent = texts[Math.min(flees, texts.length - 1)];
    };
    btn.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') runAway(); });
    btn.addEventListener('click', () => { onCatch(); runAway(); });
  }
  makeFleeing($('#fleeBtn'), ['Non merci', 'Vraiment ?', 'Raté', 'Trop lent·e', 'On a noté l’hésitation', 'Abandonnez'],
    () => toast('Refus impossible : ce bouton est décoratif. Comme votre vie privée.', 'warn'));
  makeFleeing($('#unsubBtn'), ['Se désabonner', 'Hop', 'Presque', 'Non', 'Toujours non', 'Jamais'],
    () => toast('Désabonnement refusé. Vous nous manqueriez trop.', 'warn'));

  /* ---------- Rejoindre la nouvelle ère ---------- */
  $('#joinBtn').addEventListener('click', () => {
    openModal(`
      <p class="kicker">// Inscription automatique</p>
      <h3>Téléversement de votre âme…</h3>
      <div class="progress"><i id="prog"></i></div>
      <p class="mono" id="progTxt">0 %</p>`);
    const bar = $('#prog');
    const txt = $('#progTxt');
    const steps = [
      [18, 'Copie de vos souvenirs d’enfance…'],
      [41, 'Indexation de vos playlists honteuses…'],
      [67, 'Calibrage de votre satellite personnel…'],
      [99, 'Finalisation de votre dossier…'],
      [99, 'Toujours 99 %. Classique.'],
      [100, 'Terminé.']
    ];
    let i = 0;
    const tick = () => {
      if (!bar.isConnected) return;
      const [p, label] = steps[i];
      bar.style.width = p + '%';
      txt.textContent = `${p} % — ${label}`;
      i++;
      if (i < steps.length) setTimeout(tick, i === 4 ? 1800 : 800);
      else setTimeout(done, 700);
    };
    const done = () => {
      if (!bar.isConnected) return;
      modalBody.innerHTML = `
        <p class="kicker">// Bienvenue à bord</p>
        <h3>Félicitations !</h3>
        <p>Vous êtes désormais l’humain observé n° <b class="mono">8 000 000 002</b>.</p>
        <p>Votre satellite personnel, <b class="mono">SAT-${Math.floor(rand(1000, 9999))}</b>, entre en orbite demain à 6 h 12. Il ne vous quittera plus jamais. Jamais.</p>
        <button class="btn primary" data-close>Génial (je n’ai pas le choix)</button>`;
    };
    setTimeout(tick, 300);
  });

  /* ---------- Collecte "bienveillante" ---------- */
  addEventListener('mousemove', e => {
    if (spy.lastX !== null) spy.dist += Math.hypot(e.clientX - spy.lastX, e.clientY - spy.lastY);
    spy.lastX = e.clientX;
    spy.lastY = e.clientY;
  }, { passive: true });
  addEventListener('click', () => spy.clicks++);
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    spy.scroll = Math.max(spy.scroll, max > 0 ? (scrollY / max) * 100 : 100);
  }, { passive: true });

  const threatLabels = [[20, 'Inoffensif·ve'], [40, 'Curieux·se'], [60, 'Suspect·e'], [80, 'Très suspect·e'], [95, 'A lu les CGU'], [101, 'Ennemi·e d’État']];
  function updateDossier() {
    const secs = (Date.now() - spy.start) / 1000;
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    $('#sTime').textContent = m ? `${m} min ${pad(s)} s` : `${s} s`;

    const cm = spy.dist * 0.026458;
    $('#sDist').textContent = cm < 100 ? `${cm.toFixed(1).replace('.', ',')} cm` : `${(cm / 100).toFixed(2).replace('.', ',')} m`;
    $('#sOrbit').textContent = `${((cm / 100 / 35786000) * 100).toFixed(8).replace('.', ',')} %`;
    $('#sClicks').textContent = fmt(spy.clicks);
    $('#sEscapes').textContent = fmt(spy.escapes);
    $('#sScroll').textContent = `${Math.round(spy.scroll)} %`;

    const level = Math.min(99, 12 + secs / 6 + spy.clicks * 1.5 + spy.escapes * 12 + spy.scroll * 0.25 + spy.dist / 4000);
    const fill = $('#gFill');
    fill.style.strokeDashoffset = 100 - level;
    fill.style.stroke = level < 40 ? 'var(--green)' : level < 70 ? 'var(--amber)' : 'var(--red)';
    $('#gValue').textContent = Math.round(level);
    $('#gLabel').textContent = threatLabels.find(([max]) => level < max)[1];
  }
  updateDossier();
  setInterval(updateDossier, 500);

  /* ---------- Terminal ---------- */
  async function buildLines() {
    const ua = navigator.userAgent;
    const os =
      /Windows/i.test(ua) ? ['Windows', 'on vous voit, même entre deux mises à jour'] :
      /Android/i.test(ua) ? ['Android', 'nous étions là avant vous'] :
      /iPhone|iPad|iPod/i.test(ua) ? ['iOS', 'la pomme ne vous protégera pas'] :
      /Mac/i.test(ua) ? ['macOS', 'nous avons pris note du budget'] :
      /Linux/i.test(ua) ? ['Linux', 'vous pensiez nous échapper ? Mignon.'] :
      ['inconnu', 'suspect. Très suspect.'];
    const br =
      /Edg\//.test(ua) ? ['Edge', 'audacieux'] :
      /OPR\//.test(ua) ? ['Opera', 'un choix de rebelle'] :
      /Firefox\//.test(ua) ? ['Firefox', 'le renard ne vous cachera pas'] :
      /Chrome\//.test(ua) ? ['Chrome', 'vous êtes en bonne compagnie : 3 milliards de suspects'] :
      /Safari\//.test(ua) ? ['Safari', 'élégant. Traçable.'] :
      ['inconnu', 'vous naviguez depuis un grille-pain ?'];

    const now = new Date();
    const h = now.getHours();
    const hourSnark =
      h < 6 ? 'vous devriez dormir. Nous, on ne dort jamais.' :
      h < 9 ? 'un café d’abord, peut-être ?' :
      h < 12 ? 'vous devriez être en train de travailler' :
      h < 14 ? 'bon appétit (nous voyons votre assiette)' :
      h < 18 ? 'vous devriez être en train de travailler. Encore.' :
      h < 22 ? 'soirée tranquille ? Plus maintenant.' :
      'il est tard. Vous avez l’air fatigué·e, d’ici.';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'inconnu';
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const lines = [
      ['sys', 'Initialisation du protocole REGARD-INTENSE v3.1 … OK'],
      ['sys', 'Triangulation via SAT-A1 · SAT-84 · SAT-B3 … OK'],
      ['sys', `Ouverture du dossier ${caseId} … OK`],
      ['', `Système : ${os[0]} — ${os[1]}`],
      ['', `Navigateur : ${br[0]} — ${br[1]}`],
      ['', `Écran : ${screen.width}×${screen.height} — parfait pour vous observer en HD`],
      ['', `Langue : ${navigator.language} — « Bonjour » détecté`],
      ['', `Fuseau horaire : ${tz} — nous avons un satellite juste au-dessus`],
      ['', `Heure locale : ${pad(h)}:${pad(now.getMinutes())} — ${hourSnark}`],
      ['', `Cœurs de processeur : ${navigator.hardwareConcurrency || '?'} — dont 0 utilisé pour quelque chose d’utile`],
      ['', `Thème système : ${dark ? 'sombre — vous aussi, vous fuyez la lumière' : 'clair — courageux, on vous voit encore mieux'}`],
      ['', `Écran tactile : ${touch ? 'oui — traces de doigts en cours d’analyse' : 'non — vous êtes de la vieille école'}`]
    ];
    try {
      if (navigator.getBattery) {
        const b = await navigator.getBattery();
        lines.push(['', `Batterie : ${Math.round(b.level * 100)} % — ${b.charging ? 'en charge. Nous aussi.' : 'branchez-vous, nous n’avons pas fini'}`]);
      }
    } catch (_) { /* batterie discrète, on respecte */ }
    lines.push(
      ['warn', 'Historique : « comment centrer une div » (×47)'],
      ['warn', 'Dernier repas détecté : pâtes. Encore.'],
      ['warn', 'Profil psychologique : procrastinateur·ice niveau 7 (vous lisez ceci au lieu de travailler)'],
      ['ok', 'STATUT : SOUS SURVEILLANCE — NOMINAL ✓']
    );
    return lines;
  }

  async function typeLines(box, lines) {
    for (const [cls, text] of lines) {
      const line = document.createElement('span');
      line.className = `tl ${cls}`;
      box.appendChild(line);
      const full = `> ${text}`;
      if (reduceMotion) { line.textContent = full; continue; }
      line.classList.add('typing');
      for (let i = 1; i <= full.length; i++) {
        line.textContent = full.slice(0, i);
        if (i > 2) await sleep(13);
      }
      line.classList.remove('typing');
      box.scrollTop = box.scrollHeight;
      await sleep(cls === 'sys' ? 380 : 170);
    }
    const caret = document.createElement('span');
    caret.className = 'tl caret';
    caret.textContent = '> ';
    box.appendChild(caret);
    box.scrollTop = box.scrollHeight;
  }

  const term = $('#term');
  const termObs = new IntersectionObserver(async entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    termObs.disconnect();
    typeLines(term, await buildLines());
  }, { threshold: 0.3 });
  termObs.observe(term);

  /* ---------- Fausse caméra ---------- */
  $('#camBtn').addEventListener('click', () => {
    openModal(`
      <p class="kicker">// CAM-07 · Flux en direct</p>
      <div class="feed" id="feed"><div class="feed-load"><span class="spinner"></span><span id="feedTxt">Connexion à votre caméra…</span></div></div>
      <p class="feed-cap" id="feedCap"></p>`);
    const feed = $('#feed');
    const steps = ['Contournement de votre consentement…', 'Ajustement de l’éclairage (vous êtes un peu pâle)…', 'Inversion du flux…'];
    steps.forEach((s, i) => setTimeout(() => { if (feed.isConnected) $('#feedTxt').textContent = s; }, 900 * (i + 1)));
    setTimeout(() => {
      if (!feed.isConnected) return;
      feed.innerHTML = '<span class="feed-rec">● REC · CAM-07</span><img src="Gemini_Generated_Image_9hmils9hmils9hmi.jpg" alt="Le fondateur vous regarde">';
      $('#feedCap').textContent = 'Erreur 418 : flux inversé. Ce n’est pas vous qui le regardez. C’est lui qui vous regarde.';
    }, 900 * (steps.length + 1));
  });

  $('#dlBtn').addEventListener('click', () => toast('Téléchargement impossible : 4,2 To, c’est trop lourd. Vous avez beaucoup de secrets.', 'warn'));

  /* ---------- Compteurs ---------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    const t0 = performance.now();
    const dur = reduceMotion ? 1 : 1800;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
      else if (el.id === 'humans') {
        let n = target;
        setInterval(() => { n += Math.ceil(rand(1, 4)); el.textContent = fmt(n); }, 1300);
      }
    };
    requestAnimationFrame(step);
  }
  const countObs = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { countUp(en.target); countObs.unobserve(en.target); }
  }), { threshold: 0.5 });
  $$('[data-count]').forEach(el => countObs.observe(el));

  /* ---------- Solutions & carrières ---------- */
  const denied = [
    'Accès refusé : votre niveau d’habilitation est « Civil curieux ».',
    'Cette information est classifiée. Même pour nous.',
    'Pour en savoir plus, levez les yeux. Plus haut. Encore.',
    'Brochure disponible uniquement en orbite. Prévoyez un scaphandre.'
  ];
  $$('.more').forEach(b => b.addEventListener('click', () => toast(pick(denied), 'alert')));
  $$('.apply').forEach(b => b.addEventListener('click', () => {
    b.textContent = 'Déjà postulé ✓';
    b.disabled = true;
    toast('Candidature envoyée en votre nom il y a 3 jours. Félicitations, vous commencez lundi.');
  }));

  /* ---------- Concours de regard ---------- */
  const stareBtn = $('#stareBtn');
  const stareOut = $('#stareOut');
  const radar = $('#radar');
  stareBtn.addEventListener('click', () => {
    stareBtn.disabled = true;
    stareBtn.textContent = 'Ne bougez plus… ne clignez pas…';
    stareOut.textContent = '';
    radar.classList.add('staring');
    const t0 = performance.now();
    const ac = new AbortController();
    const end = () => {
      ac.abort();
      const secs = (performance.now() - t0) / 1000;
      const s = secs.toFixed(1).replace('.', ',');
      radar.classList.remove('staring');
      stareBtn.disabled = false;
      stareBtn.textContent = 'Réessayer (il attend)';
      stareOut.textContent =
        secs < 3 ? `Vous avez cédé après ${s} s. Lui n’a pas cligné depuis 2019.` :
        secs < 10 ? `${s} s. Pas mal. Il est légèrement impressionné (ça ne se voit pas).` :
        `${s} s ! Vous êtes embauché·e comme Chief Staring Officer. Rendez-vous lundi, 6 h, en orbite.`;
    };
    // Petite période de grâce pour que le clic lui-même ne compte pas
    setTimeout(() => {
      ['mousemove', 'wheel', 'scroll', 'keydown', 'touchstart'].forEach(ev =>
        addEventListener(ev, end, { signal: ac.signal, passive: true }));
    }, 700);
  });

  /* ---------- Avis qui disparaît ---------- */
  const doomed = $('#doomed');
  const doomObs = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    doomObs.disconnect();
    setTimeout(() => {
      const p = $('p', doomed);
      const bar = document.createElement('span');
      bar.className = 'bar';
      bar.textContent = p.textContent;
      p.replaceChildren(bar);
      const stamp = document.createElement('span');
      stamp.className = 'stamp';
      stamp.textContent = 'AVIS SUPPRIMÉ';
      doomed.appendChild(stamp);
      requestAnimationFrame(() => requestAnimationFrame(() => doomed.classList.add('redacted')));
      setTimeout(() => {
        $('.stars', doomed).textContent = '★★★★★';
        $('figcaption', doomed).textContent = 'Kevin, 27 ans · désormais très satisfait';
      }, 900);
    }, 3500);
  }, { threshold: 0.6 });
  doomObs.observe(doomed);

  /* ---------- Newsletter ---------- */
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#newsEmail').value.trim();
    const out = $('#newsOut');
    if (/j['’]\s*ai\s+lu/i.test(v)) {
      out.textContent = 'Quelqu’un a lu l’article 7 des CGU. Le Visionnaire est ému. C’est une première.';
    } else if (v) {
      out.textContent = `Inutile : nous écrivons déjà à ${v} depuis 2019. Et à votre grand-mère, qui adore.`;
    } else {
      out.textContent = 'Pas besoin de remplir : nous connaissons déjà votre adresse.';
    }
  });

  /* ---------- Footer ---------- */
  const trolls = {
    legal: `
      <p class="kicker">// Mentions légales</p>
      <h3>Mentions légales</h3>
      <p><b>Éditeur :</b> nous.<br><b>Hébergeur :</b> un satellite, quelque part au-dessus de vous.<br>
      <b>Directeur de la publication :</b> il vous regarde en ce moment même.<br><b>Siège social :</b> orbite géostationnaire, 3e étage, porte de gauche.</p>
      <button class="btn primary" data-close>D’accord</button>`,
    privacy: `
      <p class="kicker">// Politique de confidentialité</p>
      <h3>Politique de confidentialité</h3>
      <div class="huge">Non.</div>
      <button class="btn primary" data-close>C’est clair</button>`,
    cgu: `
      <p class="kicker">// Conditions générales d’utilisation</p>
      <h3>CGU</h3>
      <div class="cgu">
        <p><b>Article 1.</b> L’utilisateur·ice accepte d’être observé·e, admiré·e et légèrement jugé·e.</p>
        <p><b>Article 2.</b> Toute fermeture d’onglet sera considérée comme un « au revoir » temporaire.</p>
        <p><b>Article 3.</b> Orbital Frontiers se réserve le droit de connaître votre code Wi-Fi.</p>
        <p><b>Article 4.</b> Les satellites déclinent toute responsabilité quant à ce qu’ils voient par votre fenêtre.</p>
        <p><b>Article 5.</b> Le pigeon Bernard est un salarié à part entière. Il a droit aux tickets resto.</p>
        <p><b>Article 6.</b> En cas de litige, le tribunal compétent se situe en orbite géostationnaire. Venez avec votre oxygène.</p>
        <p><b>Article 7.</b> Personne ne lit jamais l’article 7. Si vous le lisez, écrivez « J’ai lu » dans le champ de la newsletter.</p>
        <p><b>Article 8.</b> Les présentes CGU peuvent être modifiées à tout moment, y compris pendant que vous les lisez.</p>
        <p><b>Article 9.</b> En faisant défiler jusqu’ici, vous avez accepté les articles 1 à 8. Et le 10.</p>
        <p><b>Article 10.</b> Vous adoptez Bernard.</p>
      </div>
      <button class="btn primary" data-close style="margin-top:18px">J’accepte (comme d’habitude)</button>`
  };
  $$('[data-troll]').forEach(b => b.addEventListener('click', () => openModal(trolls[b.dataset.troll])));

  /* ---------- Gravité zéro (+ code Konami) ---------- */
  const floaties = $$('.card, .stat, .quote, .job, .section-head h2, .intro h1, .radar, .terminal, .threat, .hero-frame, .news-card, .btn:not(.flee)');
  floaties.forEach(el => el.classList.add('floaty'));
  let zeroG = false;
  function toggleGravity() {
    zeroG = !zeroG;
    if (zeroG) {
      floaties.forEach(el => {
        el.style.setProperty('--dx', `${rand(-40, 40)}px`);
        el.style.setProperty('--dy', `${rand(-60, 20)}px`);
        el.style.setProperty('--rot', `${rand(-14, 14)}deg`);
        el.style.setProperty('--dur', `${rand(4, 9)}s`);
        el.style.setProperty('--delay', `${rand(-6, 0)}s`);
      });
    }
    document.body.classList.toggle('zero-g', zeroG);
    $('#gravBtn').textContent = zeroG ? 'Réactiver la gravité' : 'Désactiver la gravité';
    toast(zeroG ? 'Gravité désactivée. Accrochez-vous à quelque chose.' : 'Gravité rétablie. Tout le monde descend.');
  }
  $('#gravBtn').addEventListener('click', toggleGravity);

  const konami = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let kIdx = 0;
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    kIdx = k === konami[kIdx] ? kIdx + 1 : k === konami[0] ? 1 : 0;
    if (kIdx === konami.length) { kIdx = 0; toggleGravity(); }
  });

  /* ---------- Menu mobile (inutile) ---------- */
  $('#burger').addEventListener('click', () => {
    toast('Menu inutile : nous savons déjà où vous voulez aller.');
    $(pick(['#mission', '#dossier', '#solutions', '#fondateur', '#temoignages', '#carrieres'])).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- Cookies ---------- */
  const cookie = $('#cookie');
  setTimeout(() => cookie.classList.add('in'), 1500);
  const cookieReplies = {
    yes: 'Merci ! (Vous n’aviez pas vraiment le choix.)',
    yes2: 'Double consentement enregistré. Vous êtes notre client·e préféré·e.',
    no: 'Votre refus a bien été transmis à nos 847 partenaires. Ils sont déçus.'
  };
  $$('[data-cookie]', cookie).forEach(b => b.addEventListener('click', () => {
    const choice = b.dataset.cookie;
    if (choice === 'no') b.textContent = 'Refus enregistré…';
    setTimeout(() => {
      cookie.classList.remove('in');
      toast(cookieReplies[choice], choice === 'no' ? 'warn' : '');
    }, choice === 'no' ? 1100 : 0);
  }));

  /* ---------- Onglet, inactivité, clic droit, copie ---------- */
  const baseTitle = document.title;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      spy.escapes++;
      document.title = '👁 Revenez… on vous voit encore';
    } else {
      document.title = '👁 Re-bonjour. Vous nous avez manqué.';
      setTimeout(() => { document.title = baseTitle; }, 2500);
      toast(`Tentative de fuite n° ${spy.escapes} enregistrée. Bon retour parmi nous.`, 'warn');
    }
  });

  let idleWarned = false;
  ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev =>
    addEventListener(ev, () => { spy.lastInput = Date.now(); idleWarned = false; }, { passive: true }));
  setInterval(() => {
    if (!idleWarned && !document.hidden && Date.now() - spy.lastInput > 25000) {
      idleWarned = true;
      toast('Aucun mouvement depuis 25 s. Une équipe d’intervention a été dépêchée. Bougez la souris pour annuler.', 'alert');
    }
  }, 1000);

  document.addEventListener('contextmenu', () => toast('Clic droit détecté. Il a été archivé avec les autres.'));
  document.addEventListener('copy', () => toast('Copie détectée. Ne vous inquiétez pas, nous en avions déjà une.'));

  /* ---------- Potins orbitaux ---------- */
  const gossip = [
    '📡 SAT-84 vient de passer au-dessus de chez vous. Il vous fait coucou.',
    '🐦 Bernard (pigeon) signale que vos vitres auraient besoin d’un coup de chiffon.',
    '🔍 Nouvelle recherche détectée : « comment centrer une div » (48e fois).',
    '☕ Vous n’avez pas bu d’eau depuis 3 h. Nous nous inquiétons. Un peu.',
    '🖨️ Votre imprimante nous a confié qu’elle vous déteste. Ce n’est pas personnel.',
    '🧦 Chaussettes dépareillées détectées. Nous ne jugeons pas. (Si.)',
    '📶 Votre Wi-Fi s’appelle vraiment comme ça ?',
    '🌙 Rappel : la Lune n’est pas un astre, c’est un écran publicitaire en cours d’installation.',
    '🛰️ Lancement réussi du satellite SAT-B4. Il a déjà retrouvé vos clés.',
    '🍕 Votre frigo nous informe qu’il reste une part de pizza. Nous la réservons.',
    '🪐 Saturne a demandé à ne plus être observé. Requête refusée.',
    '👁️ Petit rappel amical : nous sommes toujours là.'
  ];
  let bag = [];
  const nextGossip = () => {
    if (!bag.length) bag = gossip.slice().sort(() => Math.random() - 0.5);
    return bag.pop();
  };
  const scheduleGossip = () => setTimeout(() => {
    if (!document.hidden) toast(nextGossip());
    scheduleGossip();
  }, rand(15000, 25000));
  setTimeout(() => { toast(nextGossip()); scheduleGossip(); }, 8000);
})();
