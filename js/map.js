/* =========================================================
   MAP — Pan, zoom, hotspot layer
   Pure CSS-transform implementation (no external deps).
   Adaptive LOD: swaps image source between lo/md/hi resolutions
   based on zoom scale to keep interaction smooth on large maps.
   ========================================================= */

const MapEngine = (() => {
  // Reference (logical) image dimensions — MUST match the source aspect ratio.
  // Layout uses these constants so that swapping LOD images does not shift
  // the canvas.
  const REF_W = 2400;
  const REF_H = 1600;

  const LODS = {
    lo: { src: 'assets/map/terkep_lo.jpg', pxW: 900 },
    md: { src: 'assets/map/terkep_md.jpg', pxW: 1500 },
    hi: { src: 'assets/map/terkep_hi.jpg', pxW: 2400 },
  };

  let viewport, canvas, image, hotspotsLayer;
  let scale = 1, minScale = 0.3, maxScale = 4;
  let posX = 0, posY = 0;
  let viewportW = 0, viewportH = 0;
  let dragging = false, dragStart = null;
  let downX = 0, downY = 0;
  let onHotspotClick = null;
  let onHotspotDrag = null;
  let pinchDist = null;
  let onPanZoom = null;

  let currentLod = 'lo';
  let targetLod = 'lo';
  let lodLoaded = { lo: false, md: false, hi: false };
  let interacting = false;
  let idleTimer = null;
  let rafPending = false;

  function init(opts = {}) {
    viewport = document.getElementById('mapViewport');
    canvas = document.getElementById('mapCanvas');
    image = document.getElementById('mapImage');
    hotspotsLayer = document.getElementById('hotspotsLayer');
    onHotspotClick = opts.onHotspotClick || null;
    onPanZoom = opts.onPanZoom || null;

    if (!viewport || !canvas || !image) return;

    // Canvas uses logical dims; image stretches to fill it regardless of
    // which LOD is currently loaded.
    canvas.style.width = REF_W + 'px';
    canvas.style.height = REF_H + 'px';
    image.style.width = '100%';
    image.style.height = '100%';

    // Start with the smallest LOD for fastest first paint.
    _setImageSrc(LODS.lo.src);
    currentLod = 'lo';
    lodLoaded.lo = true;

    image.addEventListener('error', () => {
      console.warn('[Map] Map image failed to load.');
      _showMissingImageNotice();
    });

    _onResize();
    _bindEvents(opts);
    window.addEventListener('resize', _onResize);

    // Preload higher-res LODs after initial paint so they're ready for zoom-in.
    _schedulePreload();
  }

  function _setImageSrc(src) {
    if (image.src && image.src.endsWith(src)) return;
    image.src = src;
  }

  function _schedulePreload() {
    const preload = (key) => {
      if (lodLoaded[key]) return;
      const img = new Image();
      img.onload = () => { lodLoaded[key] = true; _maybeUpgradeLod(); };
      img.src = LODS[key].src;
    };
    const run = () => { preload('md'); preload('hi'); };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 1500 });
    } else {
      setTimeout(run, 400);
    }
  }

  function _showMissingImageNotice() {
    if (!canvas) return;
    const notice = document.createElement('div');
    notice.style.cssText = `
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(244, 228, 193, 0.95);
      padding: 1.5rem 2rem; border: 2px solid #c9a84c;
      color: #3a2a1a; font-family: 'Cinzel', serif;
      text-align: center; max-width: 400px; border-radius: 4px;
    `;
    notice.innerHTML = `
      <strong>A térkép képe hiányzik</strong><br/>
      <span style="font-family: 'Source Serif Pro', serif; font-style: italic; font-size: 0.9rem;">
        Kérjük helyezd el a térkép LOD fájlokat<br/>
        <code>assets/map/terkep_lo.jpg</code>
      </span>
    `;
    canvas.appendChild(notice);
  }

  function _onResize() {
    const rect = viewport.getBoundingClientRect();
    viewportW = rect.width;
    viewportH = rect.height;
    const fit = Math.min(viewportW / REF_W, viewportH / REF_H);
    minScale = fit * 0.6;
    maxScale = fit * 4;
    if (!scale || scale < minScale || scale > maxScale) scale = fit;
    if (!posX && !posY) {
      posX = -REF_W * scale / 2;
      posY = -REF_H * scale / 2;
    }
    _apply();
  }

  function _apply() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(_commit);
  }

  function _commit() {
    rafPending = false;
    canvas.style.transform =
      `translate(-50%, -50%) translate(${posX + REF_W / 2}px, ${posY + REF_H / 2}px) scale(${scale})`;
    if (onPanZoom) onPanZoom({ scale, posX, posY });
    _updateLodTarget();
  }

  // Choose target LOD based on rendered pixels per source pixel.
  // At scale = S, one logical pixel of REF_W covers S screen pixels.
  // A LOD with pxW pixels covers the same area, so its screen-px per
  // source-px = S * REF_W / pxW. We want this ratio near 1.
  function _updateLodTarget() {
    const screenPxPerRef = scale; // ref has REF_W logical px
    // Effective resolution for each LOD = its pxW
    // We want LOD pxW >= visible_screen_pixels_across_map, roughly.
    // Simpler: use thresholds on scale.
    let t;
    if (screenPxPerRef < 0.45) t = 'lo';        // zoomed-out
    else if (screenPxPerRef < 0.85) t = 'md';    // normal
    else t = 'hi';                               // zoomed-in
    targetLod = t;
    _maybeUpgradeLod();
  }

  function _maybeUpgradeLod() {
    if (targetLod === currentLod) return;
    if (!lodLoaded[targetLod]) return;
    // Defer upgrades until interaction settles, to avoid mid-gesture flicker.
    if (interacting) return;
    currentLod = targetLod;
    _setImageSrc(LODS[currentLod].src);
  }

  function _setInteracting(on) {
    if (interacting === on) return;
    interacting = on;
    if (viewport) viewport.classList.toggle('interacting', on);
    if (on) _hidePreview();
    clearTimeout(idleTimer);
    if (!on) {
      // Tiny debounce before promoting LOD, so brief pauses mid-gesture
      // don't thrash the image element.
      idleTimer = setTimeout(_maybeUpgradeLod, 120);
    }
  }

  function _bindEvents(opts) {
    viewport.addEventListener('mousedown', _onDown);
    window.addEventListener('mousemove', _onMove);
    window.addEventListener('mouseup', _onUp);
    viewport.addEventListener('wheel', _onWheel, { passive: false });

    viewport.addEventListener('touchstart', _onTouchStart, { passive: false });
    viewport.addEventListener('touchmove', _onTouchMove, { passive: false });
    viewport.addEventListener('touchend', _onTouchEnd);

    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const zoomReset = document.getElementById('zoomReset');
    if (zoomIn) zoomIn.addEventListener('click', () => _zoomBy(1.25));
    if (zoomOut) zoomOut.addEventListener('click', () => _zoomBy(0.8));
    if (zoomReset) zoomReset.addEventListener('click', reset);

    // Always bind; the click only fires the admin callback when one is
    // registered via setAdminClickHandler(). Lets admin mode toggle at runtime.
    image.addEventListener('click', _onMapClick);
  }

  function _onDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.hotspot')) return;
    dragging = true;
    dragStart = { x: e.clientX - posX, y: e.clientY - posY };
    downX = e.clientX;
    downY = e.clientY;
    viewport.classList.add('dragging');
    _setInteracting(true);
  }

  function _onMove(e) {
    if (!dragging) return;
    posX = e.clientX - dragStart.x;
    posY = e.clientY - dragStart.y;
    _apply();
  }

  function _onUp() {
    dragging = false;
    if (viewport) viewport.classList.remove('dragging');
    _setInteracting(false);
  }

  let wheelIdleTimer = null;
  function _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    _setInteracting(true);
    _zoomAt(e.clientX, e.clientY, factor);
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => _setInteracting(false), 180);
  }

  function _zoomAt(clientX, clientY, factor) {
    const rect = viewport.getBoundingClientRect();
    const mx = clientX - rect.left - viewportW / 2;
    const my = clientY - rect.top - viewportH / 2;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * factor));
    const ratio = newScale / scale;
    posX = mx - (mx - posX) * ratio;
    posY = my - (my - posY) * ratio;
    scale = newScale;
    _apply();
  }

  function _zoomBy(factor) {
    const newScale = Math.max(minScale, Math.min(maxScale, scale * factor));
    scale = newScale;
    _apply();
  }

  function _onTouchStart(e) {
    if (e.touches.length === 1) {
      dragging = true;
      dragStart = { x: e.touches[0].clientX - posX, y: e.touches[0].clientY - posY };
      _setInteracting(true);
    } else if (e.touches.length === 2) {
      dragging = false;
      pinchDist = _touchDist(e);
      _setInteracting(true);
    }
  }

  function _onTouchMove(e) {
    if (e.touches.length === 1 && dragging) {
      e.preventDefault();
      posX = e.touches[0].clientX - dragStart.x;
      posY = e.touches[0].clientY - dragStart.y;
      _apply();
    } else if (e.touches.length === 2 && pinchDist) {
      e.preventDefault();
      const newDist = _touchDist(e);
      const factor = newDist / pinchDist;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      _zoomAt(cx, cy, factor);
      pinchDist = newDist;
    }
  }

  function _onTouchEnd(e) {
    if (e.touches.length === 0) {
      dragging = false;
      pinchDist = null;
      _setInteracting(false);
    }
  }

  function _touchDist(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function _onMapClick(e) {
    if (!MapEngine._adminClickHandler) return;
    // Ignore the synthetic click that follows a pan: if the pointer moved more
    // than a few pixels between mousedown and mouseup, treat it as a drag.
    if (Math.abs(e.clientX - downX) > 3 || Math.abs(e.clientY - downY) > 3) return;
    const rect = image.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    MapEngine._adminClickHandler({ x: +x.toFixed(2), y: +y.toFixed(2) });
  }

  function reset() {
    const fit = Math.min(viewportW / REF_W, viewportH / REF_H);
    scale = fit;
    posX = -REF_W * scale / 2;
    posY = -REF_H * scale / 2;
    _apply();
  }

  function renderHotspots(hotspots, opts = {}) {
    if (!hotspotsLayer) return;
    hotspotsLayer.innerHTML = '';
    const frag = document.createDocumentFragment();
    hotspots.forEach(h => {
      const cardId = (h.card_ids || [])[0];
      const num = cardId && window.DataStore ? DataStore.getCardNumber(cardId) : null;

      const btn = document.createElement('button');
      btn.className = 'hotspot';
      btn.style.left = `${h.x}%`;
      btn.style.top = `${h.y}%`;
      btn.dataset.id = h.id;
      if (num != null) btn.dataset.cardId = cardId;
      btn.setAttribute('aria-label', h.label || 'Pecsét');
      if (opts.admin) btn.classList.add('admin-hotspot');

      const numEl = document.createElement('span');
      numEl.className = 'hotspot-num';
      numEl.textContent = num != null ? String(num) : '·';
      btn.appendChild(numEl);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn._justDragged) { btn._justDragged = false; return; }
        if (onHotspotClick) onHotspotClick(h);
      });
      btn.addEventListener('pointerdown', (e) => {
        if (!onHotspotDrag) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        btn._justDragged = false;
        _startHotspotDrag(h, btn, e);
      });
      btn.addEventListener('mouseenter', () => _showPreview(h, btn));
      btn.addEventListener('mouseleave', _hidePreview);
      btn.addEventListener('focus', () => _showPreview(h, btn));
      btn.addEventListener('blur', _hidePreview);
      frag.appendChild(btn);
    });
    hotspotsLayer.appendChild(frag);
  }

  function _showPreview(hotspot, btn) {
    const preview = document.getElementById('hotspotPreview');
    if (!preview || !viewport) return;
    const cardId = (hotspot.card_ids || [])[0];
    const card = cardId && window.DataStore ? DataStore.getCard(cardId) : null;
    if (!card) return;

    const num = DataStore.getCardNumber(card.id);
    const imgEl = document.getElementById('hotspotPreviewImg');
    const titleEl = document.getElementById('hotspotPreviewTitle');
    const eraEl = document.getElementById('hotspotPreviewEra');
    const numEl = document.getElementById('hotspotPreviewNum');

    if (numEl) numEl.textContent = num != null ? String(num) : '';
    if (titleEl) titleEl.textContent = card.title || card.id;
    if (eraEl) eraEl.textContent = card.era || '';
    if (imgEl) {
      imgEl.alt = card.title || '';
      const thumb = (card.front_image || '').replace(/\.webp$/i, '.thumb.webp');
      imgEl.onerror = () => {
        if (imgEl.src.endsWith('.thumb.webp') && card.front_image) imgEl.src = card.front_image;
        else imgEl.style.visibility = 'hidden';
      };
      imgEl.style.visibility = '';
      imgEl.src = thumb || card.front_image || '';
    }

    preview.hidden = false;
    _positionPreview(btn);
  }

  function _positionPreview(btn) {
    const preview = document.getElementById('hotspotPreview');
    if (!preview || !viewport) return;
    const btnRect = btn.getBoundingClientRect();
    const vpRect = viewport.getBoundingClientRect();
    const pRect = preview.getBoundingClientRect();

    const centerX = btnRect.left + btnRect.width / 2 - vpRect.left;
    let left = centerX - pRect.width / 2;
    let top = btnRect.top - vpRect.top - pRect.height - 12;

    // If no room above, flip below.
    if (top < 8) top = btnRect.bottom - vpRect.top + 12;
    // Keep within viewport horizontally.
    const maxLeft = vpRect.width - pRect.width - 8;
    if (left < 8) left = 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);

    preview.style.left = left + 'px';
    preview.style.top = top + 'px';
  }

  function _hidePreview() {
    const preview = document.getElementById('hotspotPreview');
    if (preview) preview.hidden = true;
  }

  function _startHotspotDrag(hotspot, btn, startEvent) {
    startEvent.stopPropagation();
    const startClientX = startEvent.clientX;
    const startClientY = startEvent.clientY;
    let moved = false;
    let curX = hotspot.x;
    let curY = hotspot.y;

    try { btn.setPointerCapture(startEvent.pointerId); } catch (_) { /* noop */ }
    btn.classList.add('dragging');

    function onMove(e) {
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      moved = true;
      // Measure the layer every move so wheel-zoom mid-drag still works.
      const rect = hotspotsLayer.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const pctX = ((e.clientX - rect.left) / rect.width) * 100;
      const pctY = ((e.clientY - rect.top)  / rect.height) * 100;
      curX = +Math.max(0, Math.min(100, pctX)).toFixed(2);
      curY = +Math.max(0, Math.min(100, pctY)).toFixed(2);
      btn.style.left = curX + '%';
      btn.style.top  = curY + '%';
      if (onHotspotDrag) onHotspotDrag({ hotspot, x: curX, y: curY, phase: 'move' });
    }

    function onUp(e) {
      btn.removeEventListener('pointermove', onMove);
      btn.removeEventListener('pointerup', onUp);
      btn.removeEventListener('pointercancel', onUp);
      btn.classList.remove('dragging');
      try { btn.releasePointerCapture(startEvent.pointerId); } catch (_) { /* noop */ }
      if (moved) {
        btn._justDragged = true;
        if (onHotspotDrag) onHotspotDrag({ hotspot, x: curX, y: curY, phase: 'end' });
      }
    }

    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', onUp);
  }

  function filterHotspotsByEra(eraName) {
    if (!hotspotsLayer) return;
    const els = hotspotsLayer.querySelectorAll('.hotspot');
    els.forEach(el => {
      const id = el.dataset.id;
      const hotspot = DataStore.hotspots.find(h => h.id === id);
      if (!hotspot) return;
      const cards = (hotspot.card_ids || []).map(cid => DataStore.getCard(cid)).filter(Boolean);
      const match = !eraName || eraName === 'all' || cards.some(c => c.era === eraName);
      el.classList.toggle('dimmed', !match);
    });
  }

  function setActiveHotspot(hotspotId) {
    if (!hotspotsLayer) return;
    hotspotsLayer.querySelectorAll('.hotspot').forEach(el => {
      el.classList.toggle('active', el.dataset.id === hotspotId);
    });
  }

  return {
    init,
    renderHotspots,
    filterHotspotsByEra,
    setActiveHotspot,
    reset,
    // Recompute viewport size when outer layout changes (e.g. admin panel
    // opening and shrinking the map area).
    relayout() { _onResize(); },
    setAdminClickHandler(fn) { MapEngine._adminClickHandler = fn || null; },
    // Enable draggable hotspots by registering a callback. Pass null to disable.
    setHotspotDragHandler(fn) { onHotspotDrag = fn || null; },
    _adminClickHandler: null,
  };
})();

if (typeof window !== 'undefined') window.MapEngine = MapEngine;
