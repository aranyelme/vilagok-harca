/* =========================================================
   ADMIN — In-page sidebar editor for cards + hotspots.
   Toggled from the top nav; shares map + data with the public
   view. Changes live in memory; Exportálás writes JSON files
   that the user commits to data/.
   ========================================================= */

const Admin = (() => {
  let active = false;
  let panel, toggleBtn;
  let titleEl, eraSelect, descEl, frontEl, backEl;
  let coordsEl, hintEl;
  let saveBtn, cancelBtn, deleteBtn, exportBtn;
  let editingId = null;
  let pinX = null, pinY = null;
  let ghostPin = null;

  function init() {
    panel = document.getElementById('adminPanel');
    toggleBtn = document.getElementById('adminToggle');
    if (!panel || !toggleBtn) return;

    titleEl   = document.getElementById('adminTitle');
    eraSelect = document.getElementById('adminEra');
    descEl    = document.getElementById('adminDesc');
    frontEl   = document.getElementById('adminFront');
    backEl    = document.getElementById('adminBack');
    coordsEl  = document.getElementById('adminCoords');
    hintEl    = document.getElementById('adminHint');
    saveBtn   = document.getElementById('adminSave');
    cancelBtn = document.getElementById('adminCancel');
    deleteBtn = document.getElementById('adminDelete');
    exportBtn = document.getElementById('adminExport');

    _populateEras();

    toggleBtn.addEventListener('click', toggle);
    saveBtn.addEventListener('click', _onSave);
    cancelBtn.addEventListener('click', _onCancel);
    deleteBtn.addEventListener('click', _onDelete);
    exportBtn.addEventListener('click', _onExport);

    MapEngine.setAdminClickHandler(_onMapClick);
  }

  function isActive() { return active; }

  function toggle() {
    active = !active;
    document.body.classList.toggle('admin-active', active);
    panel.hidden = !active;
    toggleBtn.classList.toggle('active', active);

    if (active) {
      // Admin edits the map — make sure it's the visible view.
      const mapBtn = document.querySelector('.nav-btn[data-view="map"]');
      if (mapBtn && !mapBtn.classList.contains('active')) mapBtn.click();
      _reset();
      MapEngine.setHotspotDragHandler(_onHotspotDrag);
    } else {
      _reset();
      MapEngine.setHotspotDragHandler(null);
    }
    // Viewport shrank/grew — let the map recompute its fit.
    requestAnimationFrame(() => MapEngine.relayout());
  }

  function _onHotspotDrag({ hotspot, x, y, phase }) {
    if (!active) return;
    hotspot.x = x;
    hotspot.y = y;
    const cardId = (hotspot.card_ids || [])[0];
    const card = cardId ? DataStore.getCard(cardId) : null;
    if (card) card.map_location = { x, y };

    if (editingId === cardId) {
      pinX = x;
      pinY = y;
      _updateCoords();
      if (phase === 'end') _renderGhost();
    }

    if (phase === 'end') {
      _setHint(`${cardId || hotspot.id} új pozíciója: ${x}%, ${y}%. Ne felejtsd el exportálni!`);
    }
  }

  function editHotspot(hotspot) {
    if (!active) return;
    const cardId = (hotspot.card_ids || [])[0];
    const card = cardId ? DataStore.getCard(cardId) : null;
    if (!card) return;

    editingId = card.id;
    titleEl.value = card.title || '';
    if (card.era && [...eraSelect.options].some(o => o.value === card.era)) {
      eraSelect.value = card.era;
    }
    descEl.value  = card.description || '';
    frontEl.value = card.front_image || '';
    backEl.value  = card.back_image || '';
    pinX = hotspot.x;
    pinY = hotspot.y;

    _renderGhost();
    _updateCoords();
    deleteBtn.hidden = false;
    cancelBtn.hidden = false;
    _setHint(`Szerkesztés: „${card.title || card.id}”`);
  }

  function _onMapClick({ x, y }) {
    if (!active) return;
    pinX = x;
    pinY = y;
    _renderGhost();
    _updateCoords();
    cancelBtn.hidden = false;
    if (editingId) {
      _setHint(`${editingId} új pozíciója: ${x}%, ${y}%. Kattints Mentésre.`);
    } else {
      _setHint(`Új pecsét helye: ${x}%, ${y}%. Töltsd ki az űrlapot, majd Mentés.`);
    }
  }

  function _populateEras() {
    eraSelect.innerHTML = '';
    const eras = DataStore.getEras();
    eras.forEach(era => {
      const opt = document.createElement('option');
      opt.value = era.name;
      opt.textContent = era.name;
      eraSelect.appendChild(opt);
    });
  }

  function _updateCoords() {
    coordsEl.textContent = (pinX !== null && pinY !== null)
      ? `Pozíció: X=${pinX.toFixed(2)}%, Y=${pinY.toFixed(2)}%`
      : 'Pozíció: —';
  }

  function _renderGhost() {
    const layer = document.getElementById('hotspotsLayer');
    _removeGhost();
    if (!layer || pinX === null || pinY === null) return;
    ghostPin = document.createElement('div');
    ghostPin.className = 'admin-new-pin';
    ghostPin.style.left = pinX + '%';
    ghostPin.style.top  = pinY + '%';
    layer.appendChild(ghostPin);
  }

  function _removeGhost() {
    if (ghostPin) { ghostPin.remove(); ghostPin = null; }
  }

  function _onSave() {
    if (pinX === null || pinY === null) {
      alert('Előbb kattints a térképre a pecsét elhelyezéséhez.');
      return;
    }
    const title = titleEl.value.trim();
    if (!title) { alert('A cím megadása kötelező.'); return; }

    const era = eraSelect.value;
    const eraObj = DataStore.getEras().find(e => e.name === era);
    const eraOrder = eraObj ? eraObj.order : 0;

    const cardId = editingId || _nextCardId();
    let card = DataStore.getCard(cardId);
    if (!card) {
      card = { id: cardId };
      DataStore.cards.push(card);
    }
    card.title       = title;
    card.era         = era;
    card.era_order   = eraOrder;
    card.front_image = frontEl.value.trim();
    card.back_image  = backEl.value.trim();
    card.description = descEl.value.trim();
    card.map_location = { x: pinX, y: pinY };

    let hs = DataStore.getHotspotByCardId(cardId);
    if (!hs) {
      hs = { id: `hs_${cardId}`, x: pinX, y: pinY, card_ids: [cardId], label: title };
      DataStore.hotspots.push(hs);
    } else {
      hs.x = pinX;
      hs.y = pinY;
      hs.label = title;
    }

    _removeGhost();
    MapEngine.renderHotspots(DataStore.hotspots);
    if (window.Timeline && Timeline.render) Timeline.render();
    if (window.Legend && Legend.render) Legend.render();

    editingId = cardId;
    deleteBtn.hidden = false;
    cancelBtn.hidden = false;
    _setHint(`✓ Mentve: ${cardId}. Ne felejtsd el exportálni és commitálni!`);
  }

  function _onDelete() {
    if (!editingId) return;
    const card = DataStore.getCard(editingId);
    const label = card ? (card.title || card.id) : editingId;
    if (!confirm(`Biztosan törlöd: „${label}”?`)) return;

    const id = editingId;
    DataStore.cards = DataStore.cards.filter(c => c.id !== id);
    DataStore.hotspots = DataStore.hotspots
      .map(h => ({ ...h, card_ids: (h.card_ids || []).filter(cid => cid !== id) }))
      .filter(h => h.card_ids.length > 0);

    MapEngine.renderHotspots(DataStore.hotspots);
    if (window.Timeline && Timeline.render) Timeline.render();
    if (window.Legend && Legend.render) Legend.render();
    _reset();
    _setHint(`Törölve: ${id}.`);
  }

  function _onCancel() {
    _reset();
  }

  function _reset() {
    editingId = null;
    pinX = null;
    pinY = null;
    titleEl.value = '';
    descEl.value  = '';
    frontEl.value = '';
    backEl.value  = '';
    if (eraSelect.options.length) eraSelect.selectedIndex = 0;
    _removeGhost();
    _updateCoords();
    deleteBtn.hidden = true;
    cancelBtn.hidden = true;
    _setHint('Kattints a térképre új pecsét elhelyezéséhez, vagy egy meglévő pecsétre a szerkesztéshez.');
  }

  function _setHint(msg) { if (hintEl) hintEl.textContent = msg; }

  function _nextCardId() {
    let n = DataStore.cards.length + 1;
    let id = 'mc_' + String(n).padStart(2, '0');
    while (DataStore.getCard(id)) {
      n += 1;
      id = 'mc_' + String(n).padStart(2, '0');
    }
    return id;
  }

  function _onExport() {
    _download('cards.json', DataStore.cards);
    _download('hotspots.json', DataStore.hotspots);
    _download('timeline.json', DataStore.timeline);
  }

  function _download(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { init, toggle, isActive, editHotspot };
})();

if (typeof window !== 'undefined') window.Admin = Admin;
