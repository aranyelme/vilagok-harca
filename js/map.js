/* =========================================================
   MAP — Pan, zoom, hotspot layer
   Pure CSS-transform implementation (no external deps).
   ========================================================= */

const MapEngine = (() => {
  let viewport, canvas, image, hotspotsLayer;
  let scale = 1, minScale = 0.3, maxScale = 4;
  let posX = 0, posY = 0;
  let naturalW = 0, naturalH = 0;
  let viewportW = 0, viewportH = 0;
  let dragging = false, dragStart = null;
  let onHotspotClick = null;
  let pinchDist = null;
  let onPanZoom = null;

  function init(opts = {}) {
    viewport = document.getElementById('mapViewport');
    canvas = document.getElementById('mapCanvas');
    image = document.getElementById('mapImage');
    hotspotsLayer = document.getElementById('hotspotsLayer');
    onHotspotClick = opts.onHotspotClick || null;
    onPanZoom = opts.onPanZoom || null;

    if (!viewport || !canvas || !image) return;

    if (image.complete && image.naturalWidth) {
      _onImageReady();
    } else {
      image.addEventListener('load', _onImageReady);
      image.addEventListener('error', () => {
        console.warn('[Map] Map image failed to load. Add assets/map/terkep_1.jpg.');
        _showMissingImageNotice();
      });
    }

    _bindEvents(opts);
    window.addEventListener('resize', _onResize);
  }

  function _onImageReady() {
    naturalW = image.naturalWidth;
    naturalH = image.naturalHeight;
    _onResize();
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
        Kérjük helyezd el a szkennelt térképet<br/>
        <code>assets/map/terkep_1.jpg</code> néven.
      </span>
    `;
    canvas.appendChild(notice);
    naturalW = 1200;
    naturalH = 900;
    _onResize();
  }

  function _onResize() {
    const rect = viewport.getBoundingClientRect();
    viewportW = rect.width;
    viewportH = rect.height;
    if (!naturalW || !naturalH) return;
    const fit = Math.min(viewportW / naturalW, viewportH / naturalH);
    minScale = fit * 0.6;
    maxScale = fit * 4;
    if (scale < minScale || scale > maxScale) scale = fit;
    if (!posX && !posY) {
      posX = -naturalW * scale / 2;
      posY = -naturalH * scale / 2;
    }
    _apply();
  }

  function _apply() {
    canvas.style.transform = `translate(-50%, -50%) translate(${posX + naturalW / 2}px, ${posY + naturalH / 2}px) scale(${scale})`;
    canvas.style.width = `${naturalW}px`;
    canvas.style.height = `${naturalH}px`;
    if (onPanZoom) onPanZoom({ scale, posX, posY });
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

    if (opts.adminMode) {
      image.addEventListener('click', _onMapClick);
    }
  }

  function _onDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.hotspot')) return;
    dragging = true;
    dragStart = { x: e.clientX - posX, y: e.clientY - posY };
    viewport.classList.add('dragging');
  }

  function _onMove(e) {
    if (!dragging) return;
    posX = e.clientX - dragStart.x;
    posY = e.clientY - dragStart.y;
    _apply();
  }

  function _onUp() {
    dragging = false;
    viewport && viewport.classList.remove('dragging');
  }

  function _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    _zoomAt(e.clientX, e.clientY, factor);
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
    } else if (e.touches.length === 2) {
      dragging = false;
      pinchDist = _touchDist(e);
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
    }
  }

  function _touchDist(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function _onMapClick(e) {
    const rect = image.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    if (MapEngine._adminClickHandler) {
      MapEngine._adminClickHandler({ x: +x.toFixed(2), y: +y.toFixed(2) });
    }
  }

  function reset() {
    const fit = Math.min(viewportW / naturalW, viewportH / naturalH);
    scale = fit;
    posX = -naturalW * scale / 2;
    posY = -naturalH * scale / 2;
    _apply();
  }

  function renderHotspots(hotspots, opts = {}) {
    if (!hotspotsLayer) return;
    hotspotsLayer.innerHTML = '';
    hotspots.forEach(h => {
      const btn = document.createElement('button');
      btn.className = 'hotspot';
      btn.style.left = `${h.x}%`;
      btn.style.top = `${h.y}%`;
      btn.dataset.id = h.id;
      btn.setAttribute('aria-label', h.label || 'Pecsét');
      if (opts.admin) btn.classList.add('admin-hotspot');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onHotspotClick) onHotspotClick(h);
      });
      hotspotsLayer.appendChild(btn);
    });
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
    setAdminClickHandler(fn) { MapEngine._adminClickHandler = fn; },
    _adminClickHandler: null,
  };
})();

if (typeof window !== 'undefined') window.MapEngine = MapEngine;
