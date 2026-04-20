/* =========================================================
   ADMIN — In-page sidebar editor for cards + hotspots.
   Toggled from the top nav; shares map + data with the public
   view. Changes live in memory; Exportálás writes JSON files
   that the user commits to data/.
   ========================================================= */

const Admin = (() => {
  const UNLOCK_KEY = 'vh.adminUnlocked';
  let active = false;
  let panel, toggleBtn;
  let titleEl, eraSelect, descEl, frontEl, backEl;
  let coordsEl, hintEl;
  let saveBtn, cancelBtn, deleteBtn, exportBtn;
  let lockBtn, publishBtn, forgetTokenBtn, publishStatusEl;
  let ownerEl, repoEl, branchEl, tokenEl;
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
    lockBtn   = document.getElementById('adminLock');
    publishBtn      = document.getElementById('adminPublish');
    forgetTokenBtn  = document.getElementById('adminForgetToken');
    publishStatusEl = document.getElementById('adminPublishStatus');
    ownerEl  = document.getElementById('adminRepoOwner');
    repoEl   = document.getElementById('adminRepoName');
    branchEl = document.getElementById('adminRepoBranch');
    tokenEl  = document.getElementById('adminToken');

    _populateEras();
    _setupUnlock();
    _loadGithubConfig();

    toggleBtn.addEventListener('click', toggle);
    saveBtn.addEventListener('click', _onSave);
    cancelBtn.addEventListener('click', _onCancel);
    deleteBtn.addEventListener('click', _onDelete);
    exportBtn.addEventListener('click', _onExport);
    if (lockBtn)          lockBtn.addEventListener('click', _onLock);
    if (publishBtn)       publishBtn.addEventListener('click', _onPublish);
    if (forgetTokenBtn)   forgetTokenBtn.addEventListener('click', _onForgetToken);

    MapEngine.setAdminClickHandler(_onMapClick);
  }

  /* ---------- Hidden unlock ---------- */

  function _setupUnlock() {
    const params = new URLSearchParams(location.search);
    if (params.get('admin') === '1' || location.hash === '#admin') {
      _unlock();
    }
    if (localStorage.getItem(UNLOCK_KEY) === '1') {
      document.body.classList.add('admin-unlocked');
    }
    _bindShiftClickUnlock();
  }

  function _bindShiftClickUnlock() {
    const title = document.querySelector('.topbar .title');
    if (!title) return;
    let count = 0;
    let timer = null;
    title.addEventListener('click', (e) => {
      if (!e.shiftKey) return;
      count += 1;
      clearTimeout(timer);
      timer = setTimeout(() => { count = 0; }, 2000);
      if (count >= 3) {
        count = 0;
        _unlock();
      }
    });
  }

  function _unlock() {
    localStorage.setItem(UNLOCK_KEY, '1');
    document.body.classList.add('admin-unlocked');
  }

  function _onLock() {
    if (active) toggle();
    localStorage.removeItem(UNLOCK_KEY);
    document.body.classList.remove('admin-unlocked');
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
      _setHint(`${cardId || hotspot.id} új pozíciója: ${x}%, ${y}%. Kattints a „Mentés és publikálás” gombra a véglegesítéshez.`);
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
    _setHint(`✓ Mentve (memóriában): ${cardId}. A „Mentés és publikálás” gombbal véglegesítsd a GitHub-ra.`);
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

  /* ---------- GitHub publish ---------- */

  function _loadGithubConfig() {
    if (!window.GitHubSync) return;
    const cfg = GitHubSync.loadConfig();
    if (ownerEl)  ownerEl.value  = cfg.owner  || '';
    if (repoEl)   repoEl.value   = cfg.repo   || '';
    if (branchEl) branchEl.value = cfg.branch || '';
    if (tokenEl)  tokenEl.value  = cfg.token  || '';
  }

  function _collectGithubConfig() {
    return {
      owner:  (ownerEl  && ownerEl.value.trim())  || '',
      repo:   (repoEl   && repoEl.value.trim())   || '',
      branch: (branchEl && branchEl.value.trim()) || '',
      token:  (tokenEl  && tokenEl.value.trim())  || '',
    };
  }

  function _setPublishStatus(msg, kind) {
    if (!publishStatusEl) return;
    publishStatusEl.textContent = msg;
    publishStatusEl.classList.remove('is-ok', 'is-error', 'is-busy');
    if (kind) publishStatusEl.classList.add(`is-${kind}`);
  }

  async function _onPublish() {
    if (!window.GitHubSync) {
      _setPublishStatus('GitHubSync modul nem érhető el.', 'error');
      return;
    }
    const cfg = _collectGithubConfig();
    if (!cfg.token)  { _setPublishStatus('Add meg a GitHub PAT-et.', 'error'); return; }
    if (!cfg.owner || !cfg.repo || !cfg.branch) {
      _setPublishStatus('Töltsd ki a repo tulajdonos / név / branch mezőket.', 'error');
      return;
    }

    GitHubSync.saveConfig(cfg);

    const files = [
      { path: 'data/cards.json',    content: JSON.stringify(DataStore.cards, null, 2) + '\n' },
      { path: 'data/hotspots.json', content: JSON.stringify(DataStore.hotspots, null, 2) + '\n' },
      { path: 'data/timeline.json', content: JSON.stringify(DataStore.timeline, null, 2) + '\n' },
    ];
    const message = `Admin: pecsétek és kártyák frissítése (${new Date().toISOString()})`;

    publishBtn.disabled = true;
    _setPublishStatus('Publikálás folyamatban…', 'busy');
    try {
      const result = await GitHubSync.commitFiles(cfg, files, message);
      const shortSha = result.sha.slice(0, 7);
      _setPublishStatus(
        `✓ Commit: ${shortSha} a ${cfg.branch} branch-en. A GitHub Pages néhány percen belül frissíti az élő verziót.`,
        'ok'
      );
      _setHint(`✓ Publikálva: ${shortSha}`);
    } catch (err) {
      _setPublishStatus(`Hiba: ${err.message}`, 'error');
    } finally {
      publishBtn.disabled = false;
    }
  }

  function _onForgetToken() {
    if (window.GitHubSync) GitHubSync.forgetToken();
    if (tokenEl) tokenEl.value = '';
    _setPublishStatus('Token törölve a böngészőből.', 'ok');
  }

  return { init, toggle, isActive, editHotspot };
})();

if (typeof window !== 'undefined') window.Admin = Admin;
