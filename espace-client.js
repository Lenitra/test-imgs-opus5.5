(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const rand = (min, max) => Math.random() * (max - min) + min;
  const fmt = n => Math.round(n).toLocaleString('fr-FR');
  const pad = n => String(n).padStart(2, '0');
  const timeStr = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  const PORTRAIT = 'Gemini_Generated_Image_9hmils9hmils9hmi.jpg';
  const BANNER = 'Gemini_Generated_Image_5p38845p38845p38.jpg';

  /* ---------- Favicon rond ---------- */
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
  let W, H, dpr, stars = [], sat = null;

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
    if (!sat && Math.random() < 0.004) {
      const fromLeft = Math.random() < 0.5;
      sat = { x: fromLeft ? -20 : W + 20, y: rand(0.08, 0.6) * H, vx: (fromLeft ? 1 : -1) * rand(0.7, 1.3) * dpr, vy: rand(-0.15, 0.15) * dpr, t: 0 };
    }
    if (sat) {
      sat.x += sat.vx; sat.y += sat.vy; sat.t++;
      ctx.globalAlpha = 0.95;
      ctx.fillRect(sat.x - 1.5 * dpr, sat.y - 1.5 * dpr, 3 * dpr, 3 * dpr);
      if (sat.t % 60 < 8) {
        ctx.fillStyle = '#ff5d5d';
        ctx.beginPath();
        ctx.arc(sat.x, sat.y, 3.2 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      if (sat.x < -40 || sat.x > W + 40) sat = null;
    }
    ctx.globalAlpha = 1;
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  resize();
  addEventListener('resize', resize);
  draw();

  /* ---------- Réticule ---------- */
  if (finePointer && !reduceMotion) {
    const ret = $('#reticle');
    const label = $('#retLabel');
    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty, locked = false;
    document.body.classList.add('has-reticle');
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    document.addEventListener('mouseover', e => {
      locked = !!e.target.closest('a, button, input, .tile, img');
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

  /* ---------- Horloge de la bannière ---------- */
  function tickClock() {
    const d = new Date();
    $('#heroClock').textContent = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${timeStr(d)}`;
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------- Identifiant ---------- */
  const idInput = $('#loginId');
  const idHint = $('#idHint');
  idInput.addEventListener('input', () => {
    const v = idInput.value.trim();
    idHint.textContent =
      !v ? '' :
      v.includes('@') ? '✓ Adresse reconnue. Nous vous attendions.' :
      v.length > 2 ? '✓ Identifiant reconnu. On vous a reconnu·e à votre façon de taper.' : '';
  });

  /* ---------- Mot de passe : règles de plus en plus absurdes ---------- */
  const pwInput = $('#loginPw');
  const rulesBox = $('#rules');
  const pwFinal = $('#pwFinal');
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const digitSum = s => [...s].reduce((sum, c) => sum + (c >= '0' && c <= '9' ? Number(c) : 0), 0);
  const planets = ['mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune'];

  const rules = [
    { text: () => 'Au moins 8 caractères.', test: p => [...p].length >= 8 },
    { text: () => 'Doit contenir au moins un chiffre.', test: p => /\d/.test(p) },
    { text: () => 'Doit contenir une majuscule.', test: p => /[A-ZÀ-Ý]/.test(p) },
    { text: () => 'Doit contenir le nom d’une planète du système solaire.', test: p => planets.some(x => norm(p).includes(x)) },
    { text: () => 'Doit contenir un satellite 🛰️ (astuce : Win + . ou copiez celui-ci).', test: p => p.includes('🛰') },
    { text: p => `La somme des chiffres doit faire 42. Actuellement : ${digitSum(p)}.`, test: p => digitSum(p) === 42 },
    { text: () => 'Doit contenir le prénom de notre pigeon (indice : il roucoule et commence par B).', test: p => norm(p).includes('bernard') },
    { text: () => 'Doit contenir l’altitude du satellite qui vous est assigné, en km (indice : juste sous le titre).', test: p => p.includes('21430') },
    { text: () => 'Ne doit pas contenir « 1234 ». Trop surveillé.', test: p => !p.includes('1234') }
  ];
  const ruleEls = [];
  let allRulesOk = false;

  function checkPassword() {
    const p = pwInput.value;
    if (!p && !ruleEls.length) return;
    const results = rules.map(r => r.test(p));
    // Une nouvelle règle n'apparaît que quand toutes les précédentes sont respectées
    while (ruleEls.length < rules.length && results.slice(0, ruleEls.length).every(Boolean)) {
      const li = document.createElement('li');
      li.className = 'rule';
      li.innerHTML = `<span class="n">${String(ruleEls.length + 1).padStart(2, '0')}</span><span class="ic"></span><span class="t"></span>`;
      rulesBox.appendChild(li);
      ruleEls.push(li);
    }
    ruleEls.forEach((li, i) => {
      li.className = `rule ${results[i] ? 'ok' : 'ko'}`;
      $('.ic', li).textContent = results[i] ? '✓' : '✗';
      $('.t', li).textContent = rules[i].text(p);
    });
    const wasOk = allRulesOk;
    allRulesOk = ruleEls.length === rules.length && results.every(Boolean);
    pwFinal.textContent = allRulesOk
      ? '✓ Mot de passe valide. Il est déjà utilisé par Gérard, 54 ans, mais il ne s’en sert jamais. On vous le laisse.'
      : '';
    if (allRulesOk && !wasOk) toast('Mot de passe validé et enregistré. En clair, évidemment.');
  }
  pwInput.addEventListener('input', checkPassword);

  $('#revealBtn').addEventListener('click', e => {
    const hidden = pwInput.type === 'password';
    pwInput.type = hidden ? 'text' : 'password';
    e.currentTarget.textContent = hidden ? 'Masquer' : 'Afficher';
    if (!hidden) toast('Mot de passe masqué. Pour vous. Pas pour nous.');
  });

  /* ---------- Onglet « Créer un compte » ---------- */
  $('#signupTab').addEventListener('click', () => {
    toast('Inutile : votre compte existe déjà. Nous l’avons créé pour vous en 2019.', 'warn');
  });

  /* ---------- OrbitCAPTCHA™ ---------- */
  const robot = $('#robot');
  let isHuman = false;

  function tileStyle(src, ratio, i) {
    // Grille 3×3 découpée au centre de l'image, quel que soit son format
    const c = i % 3, r = Math.floor(i / 3);
    const bgW = 3 * Math.max(ratio, 1), bgH = 3 * Math.max(1 / ratio, 1);
    const px = ((bgW - 3) / 2 + c) / (bgW - 1) * 100;
    const py = ((bgH - 3) / 2 + r) / (bgH - 1) * 100;
    return `background-image:url('${src}');background-size:${bgW * 100}% ${bgH * 100}%;background-position:${px}% ${py}%`;
  }

  function captchaRound(round, attempts = 0) {
    const cfg = round === 0
      ? { src: BANNER, ratio: 1376 / 768, prompt: 'Sélectionnez toutes les cases contenant un satellite.' }
      : { src: PORTRAIT, ratio: 1, prompt: 'Sélectionnez toutes les cases où le Visionnaire vous regarde.' };
    const tiles = Array.from({ length: 9 }, (_, i) => `<button type="button" class="tile" style="${tileStyle(cfg.src, cfg.ratio, i)}" aria-label="Case ${i + 1}"></button>`).join('');
    openModal(`
      <p class="kicker">// OrbitCAPTCHA™ · Étape ${round + 1} sur 2</p>
      <h3>${cfg.prompt}</h3>
      <div class="cgrid" id="cgrid">${tiles}</div>
      <div class="captcha-foot">
        <p class="captcha-msg" id="cmsg"></p>
        <button type="button" class="btn small primary" id="cverify">Vérifier</button>
      </div>`);
    $$('.tile', modalBody).forEach(t => t.addEventListener('click', () => t.classList.toggle('sel')));
    $('#cverify').addEventListener('click', e => {
      const btn = e.currentTarget;
      const msg = $('#cmsg');
      const selected = $$('.tile.sel', modalBody).length;
      btn.disabled = true;
      if (round === 0) {
        msg.textContent = 'Incorrect. Il y avait un satellite dans toutes les cases. Ils sont juste très petits.';
        setTimeout(() => { if (msg.isConnected) captchaRound(1); }, 2200);
      } else if (selected === 9 || attempts >= 1) {
        msg.textContent = selected === 9
          ? 'Correct. Il vous regarde depuis toutes les cases.'
          : 'Bon. Vous êtes trop lent·e pour être un robot. Validé.';
        setTimeout(() => {
          if (!msg.isConnected) return;
          closeModal();
          isHuman = true;
          robot.classList.add('checked');
          toast('Vous êtes bien humain·e. Nous le savions déjà.');
        }, 1800);
      } else {
        msg.textContent = 'Raté : il vous regarde depuis toutes les cases. Réessayez.';
        setTimeout(() => { if (msg.isConnected) captchaRound(1, attempts + 1); }, 2000);
      }
    });
  }
  $('#robotBtn').addEventListener('click', () => {
    if (isHuman) { toast('Déjà vérifié. Vous ne pouvez plus devenir un robot, désolé.'); return; }
    captchaRound(0);
  });

  /* ---------- Connexion ---------- */
  const form = $('#loginForm');
  function shake() {
    form.classList.remove('shake');
    void form.offsetWidth;
    form.classList.add('shake');
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!idInput.value.trim()) {
      idInput.value = 'vous@nous-savons-qui.vous';
      idInput.dispatchEvent(new Event('input'));
      toast('Identifiant manquant. Pas grave, on l’a rempli pour vous.');
      return;
    }
    if (!allRulesOk) {
      shake();
      toast('Mot de passe pas assez orbital. Lisez les règles (elles changent).', 'alert');
      if (!ruleEls.length) { pwInput.focus(); }
      return;
    }
    if (!isHuman) {
      shake();
      toast('Prouvez d’abord que vous n’êtes pas un robot. Nous avons des doutes.', 'warn');
      return;
    }
    openModal(`
      <p class="kicker">// Authentification</p>
      <h3>Vérification en cours…</h3>
      <div class="progress"><i id="prog"></i></div>
      <p class="mono" id="progTxt">0 %</p>`);
    const bar = $('#prog');
    const txt = $('#progTxt');
    const steps = [
      [25, 'Triangulation via SAT-84…'],
      [55, 'Comparaison avec votre dossier (4 812 pages)…'],
      [85, 'Consultation de Bernard…'],
      [100, 'Accès accordé.']
    ];
    let i = 0;
    const tick = () => {
      if (!bar.isConnected) return;
      const [p, label] = steps[i];
      bar.style.width = p + '%';
      txt.textContent = `${p} % — ${label}`;
      i++;
      if (i < steps.length) setTimeout(tick, 850);
      else setTimeout(done, 700);
    };
    const done = () => {
      if (!bar.isConnected) return;
      modalBody.innerHTML = `
        <p class="kicker">// Session ouverte</p>
        <h3>Bienvenue, citoyen·ne n° ${fmt(rand(1e9, 8e9))}</h3>
        <p>Bonne nouvelle : vous étiez déjà connecté·e. Depuis 2019. Sur tous vos appareils. Et sur celui de votre voisin.</p>
        <p>Votre dossier fait <b>4 812 pages</b>. Il est classifié. Même pour vous.</p>
        <button type="button" class="btn primary" id="logoutBtn">Me déconnecter</button>
        <p class="mono" id="logoutMsg" aria-live="polite"></p>`;
      const answers = [
        'Déconnexion impossible : la porte ne s’ouvre que de l’extérieur.',
        'Toujours non.',
        'Vous pouvez fermer l’onglet. Nous, on reste.'
      ];
      let n = 0;
      $('#logoutBtn').addEventListener('click', () => {
        $('#logoutMsg').textContent = answers[Math.min(n++, answers.length - 1)];
      });
    };
    setTimeout(tick, 300);
  });

  $('#forgotBtn').addEventListener('click', () =>
    toast('Pas de panique, nous l’avons : il commence par « 1234 ». Comme celui de 38 % des gens.'));

  /* ---------- Connexions alternatives ---------- */
  $('#faceBtn').addEventListener('click', () => {
    openModal(`
      <p class="kicker">// Reconnaissance faciale</p>
      <h3>Analyse de votre visage…</h3>
      <div class="scan"><img src="${PORTRAIT}" alt="Visage analysé"><div class="scan-line"></div></div>
      <div class="scan-cap" id="scanCap">Ne bougez pas. Souriez. Non, pas comme ça.</div>`);
    const cap = $('#scanCap');
    setTimeout(() => {
      if (!cap.isConnected) return;
      cap.style.color = 'var(--red)';
      cap.textContent = 'Visage reconnu : ce n’est pas vous. C’est le Visionnaire. Accès refusé (à vous), accordé (à lui).';
    }, 2600);
  });
  $('#fingerBtn').addEventListener('click', () =>
    toast('Posez votre doigt sur l’écran. Plus fort. Encore. Voilà, c’est sale maintenant.'));
  $('#pigeonBtn').addEventListener('click', () =>
    toast('Bernard est en route avec votre mot de passe. Délai estimé : 3 à 5 jours ouvrés.'));

  /* ---------- Menu mobile (inutile) ---------- */
  $('#burger').addEventListener('click', () => {
    toast('Menu inutile : nous savons déjà où vous voulez aller. Ici.');
    form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  });

  /* ---------- Onglet & potins ---------- */
  const baseTitle = document.title;
  let escapes = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      escapes++;
      document.title = '👁 Revenez… votre session vous attend';
    } else {
      document.title = '👁 Re-bonjour. Toujours connecté·e.';
      setTimeout(() => { document.title = baseTitle; }, 2500);
      toast(`Tentative de fuite n° ${escapes} enregistrée. Votre session, elle, n’a pas bougé.`, 'warn');
    }
  });

  document.addEventListener('copy', () => toast('Copie détectée. Exceptionnellement autorisée.'));

  const gossip = [
    '🔐 Rappel : nous ne vous demanderons jamais votre mot de passe. Nous l’avons déjà.',
    '🛰️ SAT-84 a remarqué que vous hésitiez. Prenez votre temps, il a l’éternité.',
    '🐦 Bernard a atterri sur votre rebord de fenêtre. Ne le chassez pas, il est en mission.',
    '📋 Votre dossier vient de passer à 4 813 pages.',
    '⌨️ Vous tapez à 42 mots par minute. Pile la réponse à tout.',
    '🍪 Nous n’avons pas mis de bandeau cookies sur cette page. Vous les avez déjà acceptés.'
  ];
  let bag = [];
  const nextGossip = () => {
    if (!bag.length) bag = gossip.slice().sort(() => Math.random() - 0.5);
    return bag.pop();
  };
  const scheduleGossip = () => setTimeout(() => {
    if (!document.hidden && modal.hidden) toast(nextGossip());
    scheduleGossip();
  }, rand(16000, 26000));
  setTimeout(() => { toast(nextGossip()); scheduleGossip(); }, 6000);
})();
