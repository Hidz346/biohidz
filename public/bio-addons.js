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
    if (ly) ly.textContent = 'BERLAKU: ' + y;
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
    if (cs) cs.textContent = label === 'ONLINE' ? 'ONLINE · 24/7' : label;
    if (ab && label !== 'MENGECEK…') ab.textContent = label;
    if (cd){
      cd.style.background = label === 'ONLINE' ? 'var(--pink)' : (label.indexOf('MAINTENANCE') === 0 ? 'var(--yellow)' : '#999');
    }
    var sp = document.getElementById('statProjects');
    var cp = document.getElementById('idCardProjects');
    if (sp && cp){
      var total = sp.getAttribute('data-count-to') || '13';
      cp.textContent = total + '+ Web Apps';
    }
  }
  syncLiveBadges();
  var stEl = document.getElementById('statusText');
  if (stEl && 'MutationObserver' in window){
    new MutationObserver(syncLiveBadges).observe(stEl, { childList:true, characterData:true, subtree:true });
  }
  var spEl = document.getElementById('statProjects');
  if (spEl && 'MutationObserver' in window){
    new MutationObserver(syncLiveBadges).observe(spEl, { attributes:true, attributeFilter:['data-count-to'] });
  }
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible'){ updateAgeAndYear(); syncLiveBadges(); } });
  window.addEventListener('focus', function(){ updateAgeAndYear(); syncLiveBadges(); });
  var sectionEl = document.getElementById('identitas');
  var cardEl = document.getElementById('idCardBody');
  var flipBtn = document.getElementById('idFlipBtn');
  var strapOutline = document.getElementById('idStrapOutline');
  var strapBody = document.getElementById('idStrapBody');
  var strapStripe = document.getElementById('idStrapStripe');
  var claspEl = document.getElementById('idClasp');
  if (!sectionEl || !cardEl) return;

  var strapRestLen = 52, cardHeight = cardEl.offsetHeight || 462, cardHalfH = cardHeight * 0.5, restCenterY = strapRestLen + cardHalfH;
  var posX = 0, posY = 0, velX = 0, velY = 0, rotX = 0, velRotX = 0, rotY = 0, velRotY = 0, rotZ = 0, velRotZ = 0;
  var targetFlipY = 0, hoverX = 0, hoverY = 0, glareX = 50, glareY = 30, grabOffsetX = 0, grabOffsetY = 0;
  var ctrlX = 0, ctrlY = 36, cVelX = 0, cVelY = 0;
  var isDragging = false, activePointerId = null, startClientX = 0, startClientY = 0, startPosX = 0, startPosY = 0, startTime = 0, samples = [], rafId = null;

  function clamp(v, min, max){ return v < min ? min : (v > max ? max : v); }
  function measureCard(){ cardHeight = cardEl.offsetHeight || 462; cardHalfH = cardHeight * 0.5; restCenterY = strapRestLen + cardHalfH; }
  window.addEventListener('resize', measureCard);

  function updateLanyard(){
    if (!strapOutline || !strapBody || !strapStripe || !claspEl) return;
    var radZ = rotZ * Math.PI / 180, slotRadius = cardHalfH - 12;
    var endX = posX + slotRadius * Math.sin(radZ), endY = restCenterY + posY - slotRadius * Math.cos(radZ);
    var dist = Math.hypot(endX, endY), sag = Math.max(0, 18 - dist * 0.045);
    cVelX = (cVelX + (endX * 0.48 - ctrlX) * 0.24) * 0.72;
    cVelY = (cVelY + (endY * 0.5 + sag - ctrlY) * 0.24) * 0.72;
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
    velRotY += (dir >= 0 ? 8.5 : -8.5);
    velRotZ += (dir >= 0 ? -3.5 : 3.5);
    ensureLoop();
  }

  function step(){
    rafId = null;
    if (!isDragging){
      velX = (velX - 0.044 * posX) * 0.905; velY = (velY - 0.044 * posY) * 0.905;
      posX += velX; posY += velY;
      if (Math.abs(velRotY) > 4.2){
        velRotY *= 0.958; rotY += velRotY; targetFlipY = Math.round(rotY / 180) * 180;
      } else {
        velRotY = (velRotY + ((targetFlipY + hoverY) - rotY) * 0.14) * 0.77; rotY += velRotY;
      }
      velRotZ = (velRotZ + (clamp(-posX * 0.042 + velX * 0.45, -38, 38) - rotZ) * 0.12) * 0.80; rotZ += velRotZ;
      velRotX = (velRotX + (clamp(hoverX + velY * 0.35, -26, 26) - rotX) * 0.14) * 0.80; rotX += velRotX;
    }
    renderCard();
    var moving = isDragging || Math.abs(posX) > 0.2 || Math.abs(posY) > 0.2 || Math.abs(velX) > 0.12 || Math.abs(velY) > 0.12 || Math.abs(velRotY) > 0.12 || Math.abs((targetFlipY + hoverY) - rotY) > 0.2 || Math.abs(rotZ) > 0.2 || Math.abs(velRotZ) > 0.12 || Math.abs(rotX - hoverX) > 0.2 || Math.abs(cVelX) > 0.15 || Math.abs(cVelY) > 0.15;
    if (moving){ rafId = requestAnimationFrame(step); }
    else { posX = 0; posY = 0; velX = 0; velY = 0; rotZ = 0; velRotZ = 0; rotX = hoverX; velRotX = 0; rotY = targetFlipY + hoverY; velRotY = 0; sectionEl.classList.remove('is-dragging'); renderCard(); }
  }
