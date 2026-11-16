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
  var DATA = [
    { n:'HTML5', c:'bahasa', l:'BAHASA', s:'H5', bg:'var(--yellow)', pop:0 },
    { n:'CSS3', c:'bahasa', l:'BAHASA', s:'CS', bg:'var(--cyan)', pop:0 },
    { n:'JavaScript', c:'bahasa', l:'BAHASA', s:'JS', bg:'var(--pink)', pop:1 },
    { n:'TypeScript', c:'bahasa', l:'BAHASA', s:'TS', bg:'var(--cyan)', pop:1 },
    { n:'PHP', c:'bahasa', l:'BAHASA', s:'PHP', bg:'var(--cream-2)', pop:0 },
    { n:'Python', c:'bahasa', l:'BAHASA', s:'PY', bg:'var(--yellow)', pop:1 },
    { n:'Next.js', c:'framework', l:'FRAMEWORK', s:'NX', bg:'var(--cyan)', pop:1 },
    { n:'React', c:'framework', l:'FRAMEWORK', s:'RC', bg:'var(--pink)', pop:1 },
    { n:'Express.js', c:'framework', l:'FRAMEWORK', s:'EX', bg:'var(--yellow)', pop:1 },
    { n:'Tailwind CSS', c:'framework', l:'FRAMEWORK', s:'TW', bg:'var(--cyan)', pop:1 },
    { n:'jQuery', c:'framework', l:'FRAMEWORK', s:'JQ', bg:'var(--cream-2)', pop:0 },
    { n:'Bootstrap', c:'framework', l:'FRAMEWORK', s:'BS', bg:'var(--pink)', pop:0 },
    { n:'Node.js', c:'backend', l:'BACKEND', s:'ND', bg:'var(--yellow)', pop:1 },
    { n:'MySQL', c:'backend', l:'BACKEND', s:'SQL', bg:'var(--cyan)', pop:0 },
    { n:'MongoDB', c:'backend', l:'BACKEND', s:'MG', bg:'var(--cream-2)', pop:0 },
    { n:'Firebase', c:'backend', l:'BACKEND', s:'FB', bg:'var(--yellow)', pop:1 },
    { n:'Supabase', c:'backend', l:'BACKEND', s:'SB', bg:'var(--pink)', pop:1 },
    { n:'Vercel', c:'backend', l:'BACKEND', s:'VC', bg:'var(--cyan)', pop:0 }
  ];
  var stage = document.getElementById('stackStage');
  var folder = document.getElementById('stackFolder');
  var hint = document.getElementById('stackFolderHint');
  var chipsBox = document.getElementById('stackChips');
  var marquee = document.getElementById('stackMarqueeTrack');
  var grid = document.getElementById('stackGrid');
  var tabs = document.querySelectorAll('[data-stack-cat]');
  if (!stage || !folder || !grid) return;
  var arc = [
    [-165,-42,-7],[-118,-98,-4],[-46,-126,-2],[46,-126,2],[118,-98,4],
    [165,-42,7],[-148,14,-5],[-72,-66,-3],[72,-66,3],[148,14,5]
  ];
  var popped = DATA.filter(function(item){ return item.pop; });

  function layoutChips(){
    var w = stage.clientWidth || 320;
    var scale = Math.min(1, Math.max(0.56, (w - 90) / 340));
    var nodes = chipsBox.querySelectorAll('.stack-chip');
    nodes.forEach(function(el, i){
      var p = arc[i % arc.length];
      el.style.setProperty('--tx', (p[0] * scale).toFixed(0) + 'px');
      el.style.setProperty('--ty', (p[1] * Math.max(0.82, scale)).toFixed(0) + 'px');
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
      var mark = document.createElement('span');
      mark.className = 'stack-mark'; mark.style.background = item.bg; mark.textContent = item.s;
      var meta = document.createElement('div'); meta.className = 'stack-meta';
      var nm = document.createElement('div'); nm.className = 'stack-name'; nm.textContent = item.n;
      var sub = document.createElement('div'); sub.className = 'stack-sub'; sub.textContent = item.l;
      meta.appendChild(nm); meta.appendChild(sub);
      card.appendChild(mark); card.appendChild(meta);
      frag.appendChild(card);
    });
    grid.textContent = ''; grid.appendChild(frag);
  }

  if (chipsBox){
    var cf = document.createDocumentFragment();
    popped.forEach(function(item, i){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'stack-chip';
      b.style.setProperty('--dl', (-i * 0.45) + 's');
      b.style.setProperty('--bd', (3.4 + (i % 4) * 0.35) + 's');
      b.style.transitionDelay = (i * 26) + 'ms';
      var d = document.createElement('span'); d.className = 'chip-dot'; d.style.setProperty('--cc', item.bg);
      b.appendChild(d); b.appendChild(document.createTextNode(item.n));
      b.addEventListener('click', function(e){
        e.stopPropagation();
        tabs.forEach(function(t){
          var on = t.getAttribute('data-stack-cat') === item.c;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        renderStack(item.c, item.n);
      });
      cf.appendChild(b);
    });
    chipsBox.appendChild(cf);
    layoutChips();
    window.addEventListener('resize', layoutChips);
  }

  if (marquee){
    var mf = document.createDocumentFragment();
    DATA.concat(DATA).forEach(function(item){
      var p = document.createElement('span'); p.className = 'marquee-pill';
      var d = document.createElement('span'); d.className = 'chip-dot'; d.style.setProperty('--cc', item.bg);
      p.appendChild(d); p.appendChild(document.createTextNode(item.n));
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
      tabs.forEach(function(t){
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      renderStack(cat);
    });
  });

  renderStack('all');
})();
