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
    var cardAge = document.getElementById('idCardAge');
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
  var sectionEl = document.getElementById('idStage');
  var cardEl = document.getElementById('idCardBody');
  var flipBtn = document.getElementById('idFlipBtn');
  var strapOutline = document.getElementById('idStrapOutline');
  var strapBody = document.getElementById('idStrapBody');
  var strapStripe = document.getElementById('idStrapStripe');
  var claspEl = document.getElementById('idClasp');
  if (!sectionEl || !cardEl) return;

  var strapRestLen = 52, cardHeight = cardEl.offsetHeight || 446, cardHalfH = cardHeight * 0.5, restCenterY = strapRestLen + cardHalfH;
  var posX = 0, posY = 0, velX = 0, velY = 0, rotX = 0, velRotX = 0, rotY = 0, velRotY = 0, rotZ = 0, velRotZ = 0;
  var targetFlipY = 0, hoverX = 0, hoverY = 0, glareX = 50, glareY = 30;
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
    targetFlipY = Math.round(targetFlipY / 180) * 180 + (dir >= 0 ? 180 : -180);
    velRotY = dir >= 0 ? 14 : -14;
    velRotZ += dir >= 0 ? -4 : 4;
    ensureLoop();
  }

  function step(){
    rafId = null;
    if (!isDragging){
      // Pegas lembut agar kartu bisa melayang jauh & berayun seperti bandul
      velX = (velX - 0.019 * posX) * 0.955;
      velY = (velY - 0.019 * posY) * 0.955;
      posX += velX; posY += velY;

      // Putaran Y bebas berputar-putar jika masih kencang, baru mengunci ke sisi terdekat saat melambat
      if (Math.abs(velRotY) > 2.2){
        velRotY *= 0.976;
        rotY += velRotY;
        targetFlipY = Math.round(rotY / 180) * 180;
      } else {
        velRotY = (velRotY + ((targetFlipY + hoverY) - rotY) * 0.11) * 0.78;
        rotY += velRotY;
      }

      // Putaran Z mengikuti sudut tali pendulum + momentum
      var ropeAngle = Math.atan2(posX, Math.max(80, restCenterY + posY)) * (180 / Math.PI);
      var targetZ = clamp(-ropeAngle * 0.85 + velX * 0.55, -75, 75);
      velRotZ = (velRotZ + (targetZ - rotZ) * 0.12) * 0.84;
      rotZ += velRotZ;

      // Putaran X 3D tumbling saat terlontar
      velRotX = (velRotX + ((hoverX + velY * 0.45) - rotX) * 0.10) * 0.86;
      rotX += velRotX;
    }
    renderCard();
    var moving = isDragging || Math.hypot(posX, posY) > 0.35 || Math.hypot(velX, velY) > 0.15 || Math.abs(velRotY) > 0.12 || Math.abs((targetFlipY + hoverY) - rotY) > 0.25 || Math.abs(rotZ) > 0.25 || Math.abs(velRotZ) > 0.12 || Math.abs(rotX - hoverX) > 0.25 || Math.hypot(cVelX, cVelY) > 0.15;
    if (moving){ rafId = requestAnimationFrame(step); }
    else { sectionEl.classList.remove('is-dragging'); posX = 0; posY = 0; velX = 0; velY = 0; rotZ = 0; velRotZ = 0; rotX = hoverX; velRotX = 0; rotY = targetFlipY + hoverY; velRotY = 0; sectionEl.classList.remove('is-dragging'); renderCard(); }
  }
  function pushSample(x, y){ samples.push({ x:x, y:y, t:performance.now() }); if (samples.length > 6) samples.shift(); }

  cardEl.addEventListener('pointerdown', function(e){
    if (e.button !== undefined && e.button !== 0) return;
    isDragging = true; activePointerId = e.pointerId;
    try { cardEl.setPointerCapture(e.pointerId); } catch (err) {}
    sectionEl.classList.add('is-dragging'); cardEl.classList.add('is-grabbed');
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
    if (elapsed < 350 && Math.abs(totalDx) > 36 && Math.abs(totalDx) > Math.abs(totalDy) * 1.4 && speed < 14){
      velX = vx * 0.5; velY = vy * 0.3; flipInDirection(totalDx >= 0 ? 1 : -1); return;
    }

    velX = clamp(vx * 1.45, -95, 95);
    velY = clamp(vy * 1.45, -95, 95);
    if (speed >= 3.5){
      var dir = vx !== 0 ? (vx > 0 ? 1 : -1) : 1;
      velRotY = dir * clamp(speed * 1.65, 16, 60);
      velRotZ = clamp(vx * 0.85, -28, 28);
      velRotX = clamp(-vy * 0.85, -28, 28);
    } else {
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
    if (!isDragging && Math.abs(delta) > 1){ velY -= delta * 0.16; velRotX += delta * 0.12; ensureLoop(); }
  }, { passive:true });

  renderCard();
})();
