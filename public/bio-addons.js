(function(){
  'use strict';
  document.querySelectorAll('img[data-fallback-src]').forEach(function(img){
    img.addEventListener('error', function onErr(){
      var fb = img.getAttribute('data-fallback-src');
      if (fb && img.src !== fb) img.src = fb;
      img.removeEventListener('error', onErr);
    });
  });

  function updateAgeAndYear(){
    var wib = new Date(Date.now() + 7 * 3600000);
    var y = wib.getUTCFullYear(), m = wib.getUTCMonth() + 1, d = wib.getUTCDate();
    var age = y - 2012 - ((m > 1 || (m === 1 && d >= 13)) ? 0 : 1);
    var txt = age + ' Years Old';
    var frontAge = document.getElementById('idFrontAge');
    var cardAge = document.getElementById('idCardAge');
    if (frontAge) frontAge.textContent = txt;
    if (cardAge) cardAge.textContent = txt;
    var aboutAge = document.getElementById('aboutAgeText');
    if (aboutAge){
      aboutAge.textContent = txt;
    } else {
      var list = document.querySelector('#tentang .status-list');
      if (list){
        var li = document.createElement('li');
        var k = document.createElement('span'); k.textContent = 'UMUR';
        var v = document.createElement('span'); v.id = 'aboutAgeText'; v.textContent = txt;
        li.appendChild(k); li.appendChild(v);
        list.insertBefore(li, list.children[1] || null);
      }
    }
    var ly = document.getElementById('legalYearBadge');
    if (ly) ly.textContent = String(y);
  }
  updateAgeAndYear();
  setInterval(updateAgeAndYear, 60000);

  function syncLiveBadges(){
    var st = document.getElementById('statusText');
    var label = st ? st.textContent.trim() : 'ONLINE';
    var ct = document.getElementById('cardLiveText');
    var cd = document.getElementById('cardLiveDot');
    var cs = document.getElementById('idCardStatus');
    var ab = document.querySelector('#tentang .status-list li:first-child span:last-child');
    if (ct) ct.textContent = label;
    if (cs) cs.textContent = label;
    if (ab && label !== 'MENGECEK…') ab.textContent = label;
    if (cd) cd.style.background = label === 'ONLINE' ? 'var(--pink)' : (label.indexOf('MAINTENANCE') === 0 ? 'var(--yellow)' : '#999');
    var sp = document.getElementById('statProjects');
    var cp = document.getElementById('idCardProjects');
    if (sp && cp) cp.textContent = (sp.getAttribute('data-count-to') || '13') + '+ Web Apps';
  }
  syncLiveBadges();
  var stEl = document.getElementById('statusText');
  if (stEl && 'MutationObserver' in window) new MutationObserver(syncLiveBadges).observe(stEl, { childList:true, characterData:true, subtree:true });
  var spEl = document.getElementById('statProjects');
  if (spEl && 'MutationObserver' in window) new MutationObserver(syncLiveBadges).observe(spEl, { attributes:true, attributeFilter:['data-count-to'] });
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible'){ updateAgeAndYear(); syncLiveBadges(); } });
  window.addEventListener('focus', function(){ updateAgeAndYear(); syncLiveBadges(); });
  var stageEl = document.getElementById('idStage');
  var cardEl = document.getElementById('idCardBody');
  var flipBtn = document.getElementById('idFlipBtn');
  var strapOutline = document.getElementById('idStrapOutline');
  var strapBody = document.getElementById('idStrapBody');
  var strapStripe = document.getElementById('idStrapStripe');
  var claspEl = document.getElementById('idClasp');
  if (!stageEl || !cardEl) return;

  var strapRestLen = 52, cardHeight = cardEl.offsetHeight || 446, cardHalfH = cardHeight * 0.5, restCenterY = strapRestLen + cardHalfH;
  var posX = 0, posY = 0, velX = 0, velY = 0, rotX = 0, velRotX = 0, rotY = 0, velRotY = 0, rotZ = 0, velRotZ = 0;
  var targetFlipY = 0, isFreeSpin = false, hoverX = 0, hoverY = 0, glareX = 50, glareY = 30;
  var ctrlX = 0, ctrlY = 36, cVelX = 0, cVelY = 0;
  var isDragging = false, activePointerId = null, startClientX = 0, startClientY = 0, startPosX = 0, startPosY = 0, startTime = 0, samples = [], rafId = null;

  function clamp(v, min, max){ return v < min ? min : (v > max ? max : v); }
  function measureCard(){ cardHeight = cardEl.offsetHeight || 446; cardHalfH = cardHeight * 0.5; restCenterY = strapRestLen + cardHalfH; }
  window.addEventListener('resize', measureCard);

  function updateLanyard(){
    if (!strapOutline || !strapBody || !strapStripe || !claspEl) return;
    var radZ = rotZ * Math.PI / 180, slotRadius = cardHalfH - 11;
    var endX = posX + slotRadius * Math.sin(radZ), endY = restCenterY + posY - slotRadius * Math.cos(radZ);
    var dist = Math.hypot(endX, endY), sag = Math.max(0, 16 - dist * 0.04);
    cVelX = (cVelX + (endX * 0.48 - ctrlX) * 0.24) * 0.74;
    cVelY = (cVelY + (endY * 0.5 + sag - ctrlY) * 0.24) * 0.74;
    ctrlX += cVelX; ctrlY += cVelY;
    var d = 'M 0 0 Q ' + ctrlX.toFixed(1) + ' ' + ctrlY.toFixed(1) + ' ' + endX.toFixed(1) + ' ' + endY.toFixed(1);
    strapOutline.setAttribute('d', d); strapBody.setAttribute('d', d); strapStripe.setAttribute('d', d);
    claspEl.setAttribute('transform', 'translate(' + endX.toFixed(1) + ',' + endY.toFixed(1) + ') rotate(' + rotZ.toFixed(1) + ')');
  }

  function renderCard(){
    cardEl.style.transform = 'translate3d(' + posX.toFixed(2) + 'px,' + posY.toFixed(2) + 'px,0) rotateZ(' + rotZ.toFixed(2) + 'deg) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';
    cardEl.style.setProperty('--gx', glareX.toFixed(1) + '%');
    cardEl.style.setProperty('--gy', glareY.toFixed(1) + '%');
    updateLanyard();
  }
  function ensureLoop(){ if (!rafId) rafId = requestAnimationFrame(step); }
  function flipInDirection(dir){
    isFreeSpin = false;
    targetFlipY = Math.round(targetFlipY / 180) * 180 + (dir >= 0 ? 180 : -180);
    velRotZ += dir >= 0 ? -4 : 4;
    ensureLoop();
  }

  function step(){
    rafId = null;
    if (!isDragging){
      velX = (velX - 0.02 * posX) * 0.95;
      velY = (velY - 0.02 * posY) * 0.95;
      posX += velX; posY += velY;

      if (isFreeSpin && Math.abs(velRotY) > 2.4){
        velRotY *= 0.976; rotY += velRotY; targetFlipY = Math.round(rotY / 180) * 180;
      } else {
        isFreeSpin = false;
        velRotY = (velRotY + ((targetFlipY + hoverY) - rotY) * 0.14) * 0.74;
        rotY += velRotY;
      }

      var ropeAngle = Math.atan2(posX, Math.max(80, restCenterY + posY)) * (180 / Math.PI);
      velRotZ = (velRotZ + (clamp(-ropeAngle * 0.85 + velX * 0.5, -75, 75) - rotZ) * 0.12) * 0.84;
      rotZ += velRotZ;
      velRotX = (velRotX + ((hoverX + velY * 0.4) - rotX) * 0.11) * 0.84;
      rotX += velRotX;
    }
    renderCard();
    var moving = isDragging || Math.hypot(posX, posY) > 0.35 || Math.hypot(velX, velY) > 0.15 || Math.abs(velRotY) > 0.12 || Math.abs((targetFlipY + hoverY) - rotY) > 0.25 || Math.abs(rotZ) > 0.25 || Math.abs(velRotZ) > 0.12 || Math.abs(rotX - hoverX) > 0.25 || Math.hypot(cVelX, cVelY) > 0.15;
    if (moving){ rafId = requestAnimationFrame(step); }
    else { stageEl.classList.remove('is-dragging'); posX = 0; posY = 0; velX = 0; velY = 0; rotZ = 0; velRotZ = 0; rotX = hoverX; velRotX = 0; rotY = targetFlipY + hoverY; velRotY = 0; renderCard(); }
  }
  function pushSample(x, y){ samples.push({ x:x, y:y, t:performance.now() }); if (samples.length > 6) samples.shift(); }

  cardEl.addEventListener('pointerdown', function(e){
    if (e.button !== undefined && e.button !== 0) return;
    isDragging = true; isFreeSpin = false; activePointerId = e.pointerId;
    try { cardEl.setPointerCapture(e.pointerId); } catch (err) {}
    stageEl.classList.add('is-dragging'); cardEl.classList.add('is-grabbed');
    startClientX = e.clientX; startClientY = e.clientY; startPosX = posX; startPosY = posY; startTime = performance.now();
    velX = 0; velY = 0; velRotY = 0; velRotZ = 0; velRotX = 0; samples = []; pushSample(e.clientX, e.clientY); ensureLoop();
  });

  cardEl.addEventListener('pointermove', function(e){
    var rect = cardEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0){
      glareX = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
      glareY = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
    }
    if (isDragging && e.pointerId === activePointerId){
      var prevX = posX, prevY = posY;
      posX = startPosX + (e.clientX - startClientX);
      posY = startPosY + (e.clientY - startClientY);
      var stepVx = posX - prevX, stepVy = posY - prevY;
      var ropeAngle = Math.atan2(posX, Math.max(80, restCenterY + posY)) * (180 / Math.PI);
      rotZ = clamp(-ropeAngle * 0.9 + stepVx * 0.85, -85, 85);
      rotX = clamp(-stepVy * 0.9, -45, 45);
      rotY += stepVx * 0.85;
      pushSample(e.clientX, e.clientY); ensureLoop();
    } else if (e.pointerType === 'mouse' && rect.width > 0){
      hoverY = clamp((((e.clientX - rect.left) / rect.width) - 0.5) * 18, -10, 10);
      hoverX = clamp(-(((e.clientY - rect.top) / rect.height) - 0.5) * 18, -10, 10);
      ensureLoop();
    }
  });

  function endDrag(e){
    if (!isDragging || (e.pointerId !== undefined && e.pointerId !== activePointerId)) return;
    isDragging = false; activePointerId = null; cardEl.classList.remove('is-grabbed');
    var now = performance.now(), ref = samples[0] || { x:startClientX, y:startClientY, t:startTime };
    for (var s = samples.length - 1; s >= 0; s--){ if (now - samples[s].t >= 24){ ref = samples[s]; break; } }
    var dt = Math.max(14, now - ref.t), vx = ((e.clientX - ref.x) / dt) * 16, vy = ((e.clientY - ref.y) / dt) * 16, speed = Math.hypot(vx, vy);
    var totalDx = e.clientX - startClientX, totalDy = e.clientY - startClientY, elapsed = now - startTime;

    if (Math.hypot(totalDx, totalDy) < 8 && elapsed < 250){ flipInDirection(1); return; }
    if (elapsed < 360 && Math.abs(totalDx) > 36 && Math.abs(totalDx) > Math.abs(totalDy) * 1.35 && speed < 15){
      velX = vx * 0.45; velY = vy * 0.25; flipInDirection(totalDx >= 0 ? 1 : -1); return;
    }

    velX = clamp(vx * 1.45, -95, 95); velY = clamp(vy * 1.45, -95, 95);
    if (speed >= 5){
      isFreeSpin = true;
      velRotY = (vx !== 0 ? (vx > 0 ? 1 : -1) : 1) * clamp(speed * 1.65, 16, 60);
      velRotZ = clamp(vx * 0.85, -28, 28); velRotX = clamp(-vy * 0.85, -28, 28);
    } else {
      isFreeSpin = false;
      targetFlipY = Math.round(rotY / 180) * 180;
    }
    ensureLoop();
  }

  cardEl.addEventListener('pointerup', endDrag);
  cardEl.addEventListener('pointercancel', endDrag);
  cardEl.addEventListener('pointerleave', function(e){ if (!isDragging && e.pointerType === 'mouse'){ hoverX = 0; hoverY = 0; ensureLoop(); } });
  cardEl.addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); flipInDirection(1); }
    else if (e.key === 'ArrowRight'){ e.preventDefault(); flipInDirection(1); }
    else if (e.key === 'ArrowLeft'){ e.preventDefault(); flipInDirection(-1); }
  });
  if (flipBtn) flipBtn.addEventListener('click', function(){ flipInDirection(1); });

  var lastScrollY = window.scrollY;
  window.addEventListener('scroll', function(){
    var sy = window.scrollY, delta = clamp(sy - lastScrollY, -35, 35); lastScrollY = sy;
    if (!isDragging && Math.abs(delta) > 1){ velY -= delta * 0.14; velRotX += delta * 0.10; ensureLoop(); }
  }, { passive:true });

  renderCard();
})();
(function(){
  var tabs = document.querySelectorAll('[data-legal-tab]');
  var panes = document.querySelectorAll('[data-legal-pane]');
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      var target = tab.getAttribute('data-legal-tab');
      tabs.forEach(function(t){
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panes.forEach(function(p){ p.hidden = p.getAttribute('data-legal-pane') !== target; });
    });
  });
  document.querySelectorAll('.faq-q').forEach(function(btn){
    btn.addEventListener('click', function(){
      var item = btn.closest('.faq-item');
      if (!item) return;
      var open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var ic = btn.querySelector('.faq-icon');
      if (ic) ic.textContent = open ? '\u00d7' : '+';
    });
  });
})();
(function(){
  var CDN = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/';
  var DATA = [
    { n:'HTML5', c:'bahasa', l:'BAHASA', s:'H5', ic:'html5/html5-original.svg', pop:1 },
    { n:'CSS3', c:'bahasa', l:'BAHASA', s:'CS', ic:'css3/css3-original.svg', pop:1 },
    { n:'JavaScript', c:'bahasa', l:'BAHASA', s:'JS', ic:'javascript/javascript-original.svg', pop:1 },
    { n:'TypeScript', c:'bahasa', l:'BAHASA', s:'TS', ic:'typescript/typescript-original.svg', pop:1 },
    { n:'PHP', c:'bahasa', l:'BAHASA', s:'PHP', ic:'php/php-original.svg', pop:0 },
    { n:'Python', c:'bahasa', l:'BAHASA', s:'PY', ic:'python/python-original.svg', pop:1 },
    { n:'Next.js', c:'framework', l:'FRAMEWORK', s:'NX', ic:'nextjs/nextjs-original.svg', pop:1 },
    { n:'React', c:'framework', l:'FRAMEWORK', s:'RC', ic:'react/react-original.svg', pop:1 },
    { n:'Express.js', c:'framework', l:'FRAMEWORK', s:'EX', ic:'express/express-original.svg', pop:1 },
    { n:'Tailwind CSS', c:'framework', l:'FRAMEWORK', s:'TW', ic:'tailwindcss/tailwindcss-original.svg', pop:1 },
    { n:'jQuery', c:'framework', l:'FRAMEWORK', s:'JQ', ic:'jquery/jquery-original.svg', pop:0 },
    { n:'Bootstrap', c:'framework', l:'FRAMEWORK', s:'BS', ic:'bootstrap/bootstrap-original.svg', pop:0 },
    { n:'Node.js', c:'backend', l:'BACKEND', s:'ND', ic:'nodejs/nodejs-original.svg', pop:1 },
    { n:'MySQL', c:'backend', l:'BACKEND', s:'SQL', ic:'mysql/mysql-original.svg', pop:0 },
    { n:'MongoDB', c:'backend', l:'BACKEND', s:'MG', ic:'mongodb/mongodb-original.svg', pop:0 },
    { n:'Firebase', c:'backend', l:'BACKEND', s:'FB', ic:'firebase/firebase-plain.svg', pop:1 },
    { n:'Supabase', c:'backend', l:'BACKEND', s:'SB', ic:'supabase/supabase-original.svg', pop:1 },
    { n:'Vercel', c:'backend', l:'BACKEND', s:'VC', ic:'vercel/vercel-original.svg', pop:0 }
  ];
  var stage = document.getElementById('stackStage'), folder = document.getElementById('stackFolder'), hint = document.getElementById('stackFolderHint');
  var chipsBox = document.getElementById('stackChips'), marquee = document.getElementById('stackMarqueeTrack'), grid = document.getElementById('stackGrid');
  var tabs = document.querySelectorAll('[data-stack-cat]');
  if (!stage || !folder || !grid) return;

  function makeLogoImg(item, cls, fallbackParent){
    var img = document.createElement('img'); img.className = cls; img.alt = item.n; img.loading = 'lazy'; img.src = CDN + item.ic;
    img.addEventListener('error', function(){ img.remove(); if (fallbackParent && !fallbackParent.textContent) fallbackParent.textContent = item.s; });
    return img;
  }

  var arc = [[-72,-16,-3],[0,-26,0],[72,-16,3],[-58,-62,-2],[58,-62,2],[-64,-104,-3],[64,-104,3],[-54,-146,-2],[62,-146,2],[-72,-188,-3],[0,-196,0],[72,-188,3]];
  var popped = DATA.filter(function(item){ return item.pop; });

  function layoutChips(){
    var w = stage.clientWidth || 268;
    var scaleX = Math.min(1.55, Math.max(0.86, (w - 30) / 255));
    chipsBox.querySelectorAll('.stack-chip').forEach(function(el, i){
      var p = arc[i % arc.length];
      el.style.setProperty('--tx', (p[0] * scaleX).toFixed(0) + 'px');
      el.style.setProperty('--ty', p[1] + 'px');
      el.style.setProperty('--tr', p[2] + 'deg');
    });
  }
  function renderStack(cat, flashName){
    var frag = document.createDocumentFragment();
    var list = cat === 'all' ? DATA : DATA.filter(function(x){ return x.c === cat; });
    list.forEach(function(item, i){
      var card = document.createElement('div');
      card.className = 'stack-card' + (flashName === item.n ? ' is-flash' : '');
      card.style.animationDelay = Math.min(i * 22, 220) + 'ms';
      var mark = document.createElement('span'); mark.className = 'stack-mark';
      mark.appendChild(makeLogoImg(item, 'stack-mark-img', mark));
      var meta = document.createElement('div'); meta.className = 'stack-meta';
      var nm = document.createElement('div'); nm.className = 'stack-name'; nm.textContent = item.n;
      var sub = document.createElement('div'); sub.className = 'stack-sub'; sub.textContent = item.l;
      meta.appendChild(nm); meta.appendChild(sub); card.appendChild(mark); card.appendChild(meta);
      frag.appendChild(card);
    });
    grid.textContent = ''; grid.appendChild(frag);
  }

  if (chipsBox){
    var cf = document.createDocumentFragment();
    popped.forEach(function(item, i){
      var b = document.createElement('button'); b.type = 'button'; b.className = 'stack-chip';
      b.style.setProperty('--dl', (-i * 0.38) + 's'); b.style.setProperty('--bd', (3.3 + (i % 4) * 0.35) + 's');
      b.style.transitionDelay = (i * 22) + 'ms';
      b.appendChild(makeLogoImg(item, 'stack-chip-ico', null)); b.appendChild(document.createTextNode(item.n));
      b.addEventListener('click', function(e){
        e.stopPropagation();
        tabs.forEach(function(t){ var on = t.getAttribute('data-stack-cat') === item.c; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
        renderStack(item.c, item.n);
      });
      cf.appendChild(b);
    });
    chipsBox.appendChild(cf); layoutChips(); window.addEventListener('resize', layoutChips);
  }

  if (marquee){
    var mf = document.createDocumentFragment();
    DATA.concat(DATA).forEach(function(item){
      var p = document.createElement('span'); p.className = 'marquee-pill';
      p.appendChild(makeLogoImg(item, 'marquee-ico', null)); p.appendChild(document.createTextNode(item.n));
      mf.appendChild(p);
    });
    marquee.appendChild(mf);
  }

  folder.addEventListener('click', function(){
    layoutChips();
    var open = stage.classList.toggle('is-open');
    folder.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (hint) hint.textContent = open ? 'Klik untuk tutup' : 'Klik untuk buka';
  });

  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      var cat = tab.getAttribute('data-stack-cat');
      tabs.forEach(function(t){ var on = t === tab; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
      renderStack(cat);
    });
  });

  renderStack('all');
})();
(function(){
  if (document.getElementById('hidzBgmBtn')) return;
  var NS = 'http://www.w3.org/2000/svg';
  var SRC = 'https://audio.jukehost.co.uk/01a18d50-31e2-71ba-b7be-01326924c3fa';
  var audio = document.createElement('audio');
  audio.src = SRC; audio.loop = true; audio.preload = 'auto'; audio.volume = 0.45; audio.setAttribute('playsinline', '');

  var btn = document.createElement('button');
  btn.id = 'hidzBgmBtn'; btn.type = 'button'; btn.className = 'bgm-nav-btn';
  btn.setAttribute('aria-label', 'Putar atau jeda musik'); btn.setAttribute('aria-pressed', 'false');

  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'bgm-note-svg'); svg.setAttribute('aria-hidden', 'true');
  var stem = document.createElementNS(NS, 'path');
  stem.setAttribute('d', 'M9 17V5l10-2v12'); stem.setAttribute('fill', 'none'); stem.setAttribute('stroke', 'currentColor'); stem.setAttribute('stroke-width', '2.4'); stem.setAttribute('stroke-linecap', 'round'); stem.setAttribute('stroke-linejoin', 'round');
  var c1 = document.createElementNS(NS, 'circle'); c1.setAttribute('cx', '6.5'); c1.setAttribute('cy', '17.5'); c1.setAttribute('r', '2.6'); c1.setAttribute('fill', 'currentColor');
  var c2 = document.createElementNS(NS, 'circle'); c2.setAttribute('cx', '16.5'); c2.setAttribute('cy', '15.5'); c2.setAttribute('r', '2.6'); c2.setAttribute('fill', 'currentColor');
  svg.appendChild(stem); svg.appendChild(c1); svg.appendChild(c2);

  var fallWrap = document.createElement('span');
  fallWrap.className = 'bgm-fall-wrap'; fallWrap.setAttribute('aria-hidden', 'true');
  btn.appendChild(svg); btn.appendChild(fallWrap);

  var navInner = document.querySelector('.nav-inner');
  var navToggle = document.getElementById('navToggle');
  if (navInner && navToggle){
    var actions = document.createElement('div'); actions.className = 'nav-actions';
    navInner.insertBefore(actions, navToggle);
    actions.appendChild(btn); actions.appendChild(navToggle);
  }
  document.body.appendChild(audio);
  var userPaused = false, fadeRaf = null, dropTimer = null, unlocked = false;
  var GLYPHS = ['\u266A', '\u266B', '\u2669'];
  var COLORS = ['var(--ink)', 'var(--pink)', 'var(--violet)', 'var(--cyan)'];

  function spawnNote(){
    if (audio.paused || document.visibilityState === 'hidden') return;
    if (fallWrap.childElementCount > 6) return;
    var n = document.createElement('span');
    n.className = 'bgm-drop-note';
    n.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    n.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    n.style.fontSize = (11 + Math.floor(Math.random() * 5)) + 'px';
    n.style.setProperty('--nx1', ((Math.random() - 0.5) * 14).toFixed(1) + 'px');
    n.style.setProperty('--nx2', ((Math.random() - 0.5) * 24).toFixed(1) + 'px');
    n.style.setProperty('--nr1', ((Math.random() - 0.5) * 20).toFixed(0) + 'deg');
    n.style.setProperty('--nr2', ((Math.random() - 0.5) * 44).toFixed(0) + 'deg');
    n.style.setProperty('--fd', (1.15 + Math.random() * 0.45).toFixed(2) + 's');
    n.addEventListener('animationend', function(){ if (n.parentNode) n.parentNode.removeChild(n); });
    fallWrap.appendChild(n);
    setTimeout(function(){ if (n.parentNode) n.parentNode.removeChild(n); }, 1800);
  }

  function syncBtn(){
    var playing = !audio.paused;
    btn.classList.toggle('is-playing', playing);
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    if (playing){
      if (!dropTimer){ spawnNote(); dropTimer = setInterval(spawnNote, 420); }
    } else {
      if (dropTimer){ clearInterval(dropTimer); dropTimer = null; }
      fallWrap.textContent = '';
    }
  }
  function fadeIn(){
    if (fadeRaf) cancelAnimationFrame(fadeRaf);
    var start = performance.now();
    function tick(now){
      var p = Math.min(1, (now - start) / 1000);
      audio.volume = 0.05 + p * 0.40;
      if (p < 1 && !audio.paused) fadeRaf = requestAnimationFrame(tick); else fadeRaf = null;
    }
    fadeRaf = requestAnimationFrame(tick);
  }
  function removeUnlock(){
    if (unlocked) return; unlocked = true;
    ['click', 'touchend', 'keydown'].forEach(function(ev){ window.removeEventListener(ev, onFirstGesture, true); });
  }
  function tryStart(){
    if (userPaused || !audio.paused) return;
    audio.volume = 0.05;
    var p = audio.play();
    if (p && typeof p.then === 'function') p.then(function(){ removeUnlock(); fadeIn(); syncBtn(); }).catch(function(){ syncBtn(); });
  }
  function onFirstGesture(e){
    if (e.target && (e.target === btn || btn.contains(e.target))) return;
    if (!userPaused && audio.paused) tryStart();
  }
  ['click', 'touchend', 'keydown'].forEach(function(ev){ window.addEventListener(ev, onFirstGesture, { capture:true, passive:true }); });

  btn.addEventListener('click', function(){
    if (audio.paused){ userPaused = false; removeUnlock(); tryStart(); }
    else { userPaused = true; removeUnlock(); if (fadeRaf) cancelAnimationFrame(fadeRaf); audio.pause(); }
    syncBtn();
  });
  audio.addEventListener('play', syncBtn); audio.addEventListener('pause', syncBtn);

  var intro = document.createElement('div'); intro.id = 'hidzIntro'; intro.className = 'hidz-intro';
  var cTop = document.createElement('div'); cTop.className = 'intro-curtain intro-curtain-top';
  var cBot = document.createElement('div'); cBot.className = 'intro-curtain intro-curtain-bot';
  var box = document.createElement('div'); box.className = 'intro-box';
  var head = document.createElement('div'); head.className = 'intro-head';
  var logo = document.createElement('img'); logo.className = 'intro-logo'; logo.src = '/logo.png'; logo.alt = 'Logo HidzProject';
  var pill = document.createElement('span'); pill.className = 'intro-pill'; pill.textContent = 'HIDZ.MY.ID';
  head.appendChild(logo); head.appendChild(pill);
  var ttl = document.createElement('h2'); ttl.className = 'intro-title'; ttl.textContent = 'SYAHID SUBHAN PUTRA';
  var sub = document.createElement('p'); sub.className = 'intro-sub'; sub.textContent = 'DEVELOPER & FOUNDER';
  var track = document.createElement('div'); track.className = 'intro-track';
  var fill = document.createElement('div'); fill.className = 'intro-fill'; track.appendChild(fill);
  var meta = document.createElement('div'); meta.className = 'intro-meta';
  var stepTxt = document.createElement('span'); stepTxt.textContent = 'MEMUAT PROFIL...';
  var pctTxt = document.createElement('span'); pctTxt.textContent = '0%';
  meta.appendChild(stepTxt); meta.appendChild(pctTxt);
  var skip = document.createElement('button'); skip.type = 'button'; skip.className = 'intro-skip'; skip.textContent = 'Lewati →';
  box.appendChild(head); box.appendChild(ttl); box.appendChild(sub); box.appendChild(track); box.appendChild(meta); box.appendChild(skip);
  intro.appendChild(cTop); intro.appendChild(cBot); intro.appendChild(box);
  document.documentElement.style.overflow = 'hidden';
  document.body.appendChild(intro);

  var closed = false, t0 = performance.now(), DUR = 5000;
  function closeIntro(){
    if (closed) return; closed = true;
    intro.classList.add('is-leaving');
    document.documentElement.style.overflow = '';
    setTimeout(function(){ if (intro.parentNode) intro.parentNode.removeChild(intro); }, 720);
  }
  function tickIntro(now){
    if (closed) return;
    var raw = Math.min(1, (now - t0) / 4600);
    var eased = 1 - Math.pow(1 - raw, 2.2);
    var pct = Math.round(eased * 100);
    fill.style.width = pct + '%'; pctTxt.textContent = pct + '%';
    if (pct >= 85) stepTxt.textContent = 'SIAP MASUK';
    else if (pct >= 45) stepTxt.textContent = 'MEMUAT HIDZPROJECT...';
    if (now - t0 >= DUR){ closeIntro(); return; }
    requestAnimationFrame(tickIntro);
  }
  requestAnimationFrame(tickIntro);
  skip.addEventListener('click', function(){ tryStart(); closeIntro(); });
  tryStart();
})();
