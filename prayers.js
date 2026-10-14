'use strict';
(() => {
  const STORAGE_KEY = 'source.prayers.v1';
  const MAX_PRAYERS = 200;
  const SKY_LIMIT = 36;
  const themes = {
    peace: { name: 'Peace', color: '#becda3', starter: 'May someone who feels alone find a little warmth today.', reflections: [
      'May this quiet moment make room for your breath, your unfinished thoughts, and the peace you do not have to earn.',
      'You can set one worry down for a moment. The world can wait while you return to yourself.',
      'Let this light hold a little space for stillness, even if everything around you is still moving.',
      'Peace can begin as something small: a softened shoulder, an honest breath, a kinder word to yourself.'
    ] },
    healing: { name: 'Healing', color: '#a9cdc0', starter: 'May those carrying something heavy find tenderness and support today.', reflections: [
      'Whatever hurts deserves tenderness. May this moment help you meet yourself with patience, without asking you to hurry.',
      'You do not have to turn pain into a lesson today. Let care be enough for this moment.',
      'Let this light honor what you carry, and the courage it takes to ask for comfort.',
      'Healing has no single rhythm. There is room here for rest, uncertainty, and the support you need.'
    ] },
    gratitude: { name: 'Gratitude', color: '#e2bb7d', starter: 'Thank you for the small kindnesses that made today a little brighter.', reflections: [
      'Let the good you noticed glow a little longer: a familiar voice, a small kindness, a moment that mattered.',
      'Gratitude can share a room with grief. You are allowed to cherish something beautiful while missing something else.',
      'Your thanks becomes a small light here, a reminder to notice the ordinary things that quietly sustain you.',
      'Hold this moment gently. A little appreciation can make an everyday kindness feel seen, remembered, and worth passing on.'
    ] },
    hope: { name: 'Hope', color: '#dfc69f', starter: 'May tomorrow hold one small possibility for everyone who needs a new beginning.', reflections: [
      'Hope does not ask you to know the ending. It can begin with one small, possible next step.',
      'Let this light leave room for tomorrow, while giving today’s feelings the kindness and space they deserve.',
      'You can feel uncertain and still reach toward something good. Both can belong in the same breath.',
      'May your wish become a gentle reminder of what matters to you, and where you might begin again.'
    ] }
  };
  const $ = selector => document.querySelector(selector);
  const form = $('#prayer-form'), message = $('#prayer-message'), release = $('#release-prayer');
  const status = $('#prayer-status'), error = $('#prayer-error'), starContainer = $('#prayer-stars');
  const detailDialog = $('#prayer-detail'), clearDialog = $('#clear-sky-dialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let storageAvailable = true, prayers = [], selectedId = null, detailId = null, returnFocus = null;
  let motionPaused = reducedMotion.matches;
  const formatDate = value => new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'}).format(new Date(value));
  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i++) { value ^= text.charCodeAt(i); value = Math.imul(value, 16777619); }
    return value >>> 0;
  }
  function reflectionFor(prayer) { return themes[prayer.intention].reflections[hash(prayer.message) % 4]; }
  function isPrayer(item) {
    return item && typeof item.id === 'string' && item.id.length <= 80 && typeof item.message === 'string' && item.message.trim().length > 0 && item.message.length <= 600 && Object.hasOwn(themes, item.intention) && typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt));
  }
  function loadPrayers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.prayers) || data.prayers.length > MAX_PRAYERS || !data.prayers.every(isPrayer) || new Set(data.prayers.map(p => p.id)).size !== data.prayers.length) throw new Error('Invalid saved prayers');
      return data.prayers;
    } catch {
      storageAvailable = false;
      status.textContent = 'Saved lights couldn’t be loaded. New lights can still be kept here for this visit.';
      return [];
    }
  }
  function persistPrayers() {
    if (!storageAvailable) return false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, prayers})); return true; }
    catch { storageAvailable = false; return false; }
  }
  function createSparkIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#spark'); svg.append(use); return svg;
  }
  function positionFor(prayer) {
    // The words shape a stable place in this visitor's sky; no message is transmitted.
    const seed = hash(prayer.id + prayer.message);
    return { x: 9 + (seed % 8200) / 100, y: 12 + (Math.floor(seed / 8200) % 7600) / 100 };
  }
  function renderPrayers(newId) {
    const count = prayers.length;
    $('#sky-empty').hidden = count > 0;
    $('#saved-empty').hidden = count > 0;
    $('#sky-count').textContent = `${count} ${count === 1 ? 'LIGHT' : 'LIGHTS'} / ALL YOURS`;
    $('#sky-hint').textContent = count > SKY_LIMIT ? `YOUR ${SKY_LIMIT} MOST RECENT LIGHTS` : count ? 'TOUCH A LIGHT TO RETURN TO IT' : 'YOUR WORDS, IN ANOTHER FORM';
    $('#saved-count').textContent = count;
    $('#clear-prayers').disabled = count === 0;
    release.disabled = count >= MAX_PRAYERS;
    starContainer.replaceChildren();
    prayers.slice(-SKY_LIMIT).forEach((prayer, index) => {
      const theme = themes[prayer.intention], pos = positionFor(prayer);
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'prayer-star' + (prayer.id === newId ? ' is-new' : '');
      button.style.left = `${pos.x}%`; button.style.top = `${pos.y}%`; button.style.setProperty('--light', theme.color);
      button.setAttribute('aria-label', `${theme.name} prayer ${Math.max(0, count - SKY_LIMIT) + index + 1}, ${formatDate(prayer.createdAt)}`);
      button.append(createSparkIcon()); button.addEventListener('click', () => openPrayer(prayer.id, button));
      starContainer.append(button);
    });
    const list = $('#saved-prayers-list'); list.replaceChildren();
    [...prayers].reverse().forEach(prayer => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      const top = document.createElement('span'); top.className = 'saved-item-top';
      const intention = document.createElement('span'); intention.textContent = themes[prayer.intention].name;
      const date = document.createElement('time'); date.dateTime = prayer.createdAt; date.textContent = formatDate(prayer.createdAt);
      const excerpt = document.createElement('span'); excerpt.className = 'saved-message';
      // User text is always rendered as text, including when restored from storage.
      excerpt.textContent = prayer.message.length > 100 ? prayer.message.slice(0, 100) + '…' : prayer.message;
      top.append(intention, date); button.append(top, excerpt); li.append(button); list.append(li);
      button.addEventListener('click', () => openPrayer(prayer.id, button));
    });
    drawSky();
  }
  function openPrayer(id, trigger) {
    const prayer = prayers.find(item => item.id === id); if (!prayer) return;
    returnFocus = trigger; detailId = id;
    const theme = themes[prayer.intention];
    $('#detail-heading').textContent = `${theme.name.toUpperCase()} / YOUR WORDS, YOUR LIGHT`;
    $('#detail-message').textContent = prayer.message;
    $('#detail-reflection').textContent = reflectionFor(prayer);
    $('#detail-date').textContent = `Released ${formatDate(prayer.createdAt)} · Kept only in this browser`;
    $('.detail-symbol').style.color = theme.color;
    detailDialog.showModal();
  }
  $('#close-prayer-detail').addEventListener('click', () => detailDialog.close());
  detailDialog.addEventListener('close', () => {
    detailId = null;
    $('#detail-message').textContent = ''; $('#detail-reflection').textContent = '';
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
  });
  function updateDraft() {
    $('#character-count').textContent = `${message.value.length} / 600`;
    $('#prayer-starter').disabled = message.value.trim().length > 0;
    if (error.textContent) { error.textContent = ''; message.removeAttribute('aria-invalid'); }
  }
  message.addEventListener('input', updateDraft);
  form.addEventListener('change', () => {
    const intention = new FormData(form).get('intention');
    message.placeholder = themes[intention].starter;
  });
  $('#prayer-starter').addEventListener('click', () => {
    if (message.value.trim()) return;
    message.value = themes[new FormData(form).get('intention')].starter;
    updateDraft(); message.focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const words = message.value.trim(), intention = new FormData(form).get('intention');
    if (!words || words.length > 600) {
      error.textContent = words ? 'Keep your prayer within 600 characters.' : 'Give your prayer or kind message a few words first.';
      message.setAttribute('aria-invalid', 'true'); message.focus(); return;
    }
    if (prayers.length >= MAX_PRAYERS) { status.textContent = 'Your sky holds 200 lights. Clear your sky when you’re ready for a new collection.'; return; }
    const prayer = {id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, message: words, intention, createdAt: new Date().toISOString()};
    prayers.push(prayer); selectedId = prayer.id;
    const saved = persistPrayers(); renderPrayers(prayer.id);
    $('#reflection-heading').textContent = `${themes[intention].name.toUpperCase()} / YOUR WORDS BECAME A LIGHT`;
    $('#reflection-text').textContent = reflectionFor(prayer);
    $('.reflection-symbol').style.color = themes[intention].color;
    const result = $('#release-result'); result.hidden = false;
    status.textContent = saved ? 'Your light is released and saved in this browser. Come back whenever you need it.' : 'Your light is released for this visit. This browser couldn’t save it for later.';
    message.value = ''; updateDraft();
    if (window.innerWidth < 761) { result.focus({preventScroll: true}); result.scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest'}); }
  });
  $('#open-latest-light').addEventListener('click', event => openPrayer(selectedId, event.currentTarget));
  $('#clear-prayers').addEventListener('click', () => {
    $('#clear-description').textContent = `This removes your ${prayers.length === 1 ? 'saved prayer' : prayers.length + ' saved prayers'} from this browser.`;
    clearDialog.showModal(); $('#keep-prayers').focus();
  });
  $('#keep-prayers').addEventListener('click', () => clearDialog.close());
  clearDialog.addEventListener('close', () => { if (!$('#clear-prayers').disabled) $('#clear-prayers').focus({preventScroll: true}); });
  $('#confirm-clear').addEventListener('click', () => {
    let cleared = true;
    try { localStorage.removeItem(STORAGE_KEY); storageAvailable = true; } catch { cleared = false; }
    prayers = []; selectedId = null; $('#release-result').hidden = true;
    clearDialog.close(); renderPrayers();
    status.textContent = cleared ? 'Your sky is clear. There is room for a new beginning.' : 'Cleared for this visit. Browser storage couldn’t be changed, so saved lights may return after reloading.';
    message.focus({preventScroll: true});
  });
  window.addEventListener('storage', event => {
    if (event.storageArea !== localStorage || (event.key !== STORAGE_KEY && event.key !== null)) return;
    prayers = loadPrayers();
    if (selectedId && !prayers.some(p => p.id === selectedId)) {
      selectedId = null; $('#release-result').hidden = true;
    }
    if (detailId && !prayers.some(p => p.id === detailId) && detailDialog.open) detailDialog.close();
    renderPrayers();
  });
  const sky = $('.prayer-sky'), canvas = $('#prayer-canvas'), ctx = canvas.getContext('2d');
  let width = 0, height = 0, time = 0, lastFrame = 0, visible = true;
  const dust = Array.from({length: 90}, (_, i) => ({x: ((i * 7919) % 1000) / 1000, y: ((i * 3571 + 113) % 1000) / 1000, radius: i % 9 === 0 ? 1.1 : .55, phase: i * .93}));
  function drawSky() {
    if (!ctx || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width*.52, height*.51, 0, width*.52, height*.51, Math.max(width, height)*.56);
    glow.addColorStop(0, '#bda46812'); glow.addColorStop(.45, '#77926109'); glow.addColorStop(1, '#00000000'); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    dust.forEach(p => {
      ctx.fillStyle = `rgba(195,207,162,${.12 + .21 * (.5 + .5 * Math.sin(p.phase + time*.28))})`;
      ctx.beginPath(); ctx.arc(p.x*width, p.y*height, p.radius, 0, Math.PI*2); ctx.fill();
    });
    ctx.lineWidth = .6;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = '#d7b5830d'; ctx.beginPath(); ctx.ellipse(width*.52, height*.51, width*(.26+i*.075), height*(.25+i*.045), -.35, 0, Math.PI*2); ctx.stroke();
    }
    const positions = prayers.slice(-SKY_LIMIT).map(p => positionFor(p));
    if (positions.length > 1) {
      const areaW = Math.max(0, width-68), areaH = Math.max(0, height-138);
      ctx.strokeStyle = '#d7b58324'; ctx.beginPath();
      positions.forEach((p,i) => { const x = 34 + p.x/100*areaW, y = 68 + p.y/100*areaH; i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }); ctx.stroke();
    }
  }
  function resizeSky() {
    const rect = sky.getBoundingClientRect(); width = sky.clientWidth; height = sky.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width*dpr; canvas.height = rect.height*dpr; ctx?.setTransform(dpr,0,0,dpr,0,0); drawSky();
  }
  new ResizeObserver(resizeSky).observe(sky);
  new IntersectionObserver(([entry]) => {visible = entry.isIntersecting;}, {rootMargin: '100px'}).observe(sky);
  function animate(timestamp) {
    if (timestamp-lastFrame > 40) {
      const dt = Math.min((timestamp-lastFrame)/1000,.1); lastFrame = timestamp;
      if (visible && !motionPaused && !document.hidden) {time += dt; drawSky();}
    }
    requestAnimationFrame(animate);
  }
  function renderMotion() {
    $('#prayer-motion').textContent = motionPaused ? 'Resume motion ▷' : 'Pause motion Ⅱ';
    $('#prayer-motion').setAttribute('aria-pressed', String(motionPaused));
    starContainer.classList.toggle('motion-paused', motionPaused);
  }
  $('#prayer-motion').addEventListener('click', () => {motionPaused = !motionPaused; renderMotion();});
  reducedMotion.addEventListener('change', () => {motionPaused = reducedMotion.matches; renderMotion();});
  prayers = loadPrayers(); renderPrayers(); renderMotion(); requestAnimationFrame(animate);
})();
