/* =========================================================
   ADMIN — Visual editor for cards, hotspots, eras.
   Client-side only; exports JSON for manual commit.
   ========================================================= */

(async function adminBootstrap() {
  await DataStore.loadAll();

  // Working copies we mutate locally
  const state = {
    cards: JSON.parse(JSON.stringify(DataStore.cards)),
    hotspots: JSON.parse(JSON.stringify(DataStore.hotspots)),
    timeline: JSON.parse(JSON.stringify(DataStore.timeline || { eras: [] })),
    selectedId: null,
    pendingPoint: null,
  };

  const $ = id => document.getElementById(id);
  const els = {
    id: $('fId'),
    title: $('fTitle'),
    era: $('fEra'),
    eraOrder: $('fEraOrder'),
    newEra: $('fNewEra'),
    front: $('fFront'),
    back: $('fBack'),
    x: $('fX'),
    y: $('fY'),
    description: $('fDescription'),
    save: $('saveBtn'),
    new: $('newBtn'),
    delete: $('deleteBtn'),
    status: $('status'),
    pinList: $('pinList'),
    exportCards: $('exportCards'),
    exportHotspots: $('exportHotspots'),
    exportTimeline: $('exportTimeline'),
  };

  MapEngine.init({
    adminMode: true,
    onHotspotClick: (hotspot) => {
      const firstCardId = (hotspot.card_ids || [])[0];
      if (firstCardId) selectCard(firstCardId);
    },
  });
  MapEngine.setAdminClickHandler(({ x, y }) => {
    if (!state.selectedId) {
      state.pendingPoint = { x, y };
      els.x.value = x;
      els.y.value = y;
      setStatus(`Új pecsét helye: ${x}%, ${y}% — töltsd ki az űrlapot, majd Mentés.`);
    } else {
      els.x.value = x;
      els.y.value = y;
      setStatus(`A ${state.selectedId} kártya új pozíciója: ${x}%, ${y}%.`);
    }
  });

  refreshEraSelect();
  refreshHotspotsOnMap();
  refreshPinList();

  els.save.addEventListener('click', onSave);
  els.new.addEventListener('click', () => clearForm(true));
  els.delete.addEventListener('click', onDelete);

  els.exportCards.addEventListener('click', () => downloadJSON('cards.json', state.cards));
  els.exportHotspots.addEventListener('click', () => downloadJSON('hotspots.json', state.hotspots));
  els.exportTimeline.addEventListener('click', () => downloadJSON('timeline.json', state.timeline));

  els.newEra.addEventListener('change', () => {
    const v = els.newEra.value.trim();
    if (!v) return;
    const exists = state.timeline.eras.some(e => e.name === v);
    if (!exists) {
      const nextOrder = (state.timeline.eras.reduce((m, e) => Math.max(m, e.order || 0), 0)) + 1;
      state.timeline.eras.push({ name: v, order: nextOrder });
      refreshEraSelect();
      els.era.value = v;
      els.eraOrder.value = nextOrder;
    }
  });

  els.era.addEventListener('change', () => {
    const era = state.timeline.eras.find(e => e.name === els.era.value);
    if (era) els.eraOrder.value = era.order;
  });

  // ---------- Functions ----------

  function setStatus(msg) { els.status.textContent = msg; }

  function refreshEraSelect() {
    const currentVal = els.era.value;
    els.era.innerHTML = '';
    const sorted = [...state.timeline.eras].sort((a, b) => (a.order || 0) - (b.order || 0));
    sorted.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.name;
      opt.textContent = e.name;
      els.era.appendChild(opt);
    });
    if (currentVal && sorted.some(e => e.name === currentVal)) els.era.value = currentVal;
  }

  function refreshHotspotsOnMap() {
    MapEngine.renderHotspots(state.hotspots, { admin: true });
    highlightActiveHotspot();
  }

  function highlightActiveHotspot() {
    const hs = findHotspotForCard(state.selectedId);
    MapEngine.setActiveHotspot(hs ? hs.id : null);
  }

  function refreshPinList() {
    els.pinList.innerHTML = '';
    if (!state.cards.length) {
      els.pinList.innerHTML = '<em style="color:var(--ink-soft);font-size:.85rem;">Még nincsenek kártyák.</em>';
      return;
    }
    const sorted = [...state.cards].sort((a, b) => (a.era_order || 0) - (b.era_order || 0) || a.id.localeCompare(b.id));
    sorted.forEach(card => {
      const row = document.createElement('div');
      row.className = 'pin-list-item';
      if (card.id === state.selectedId) row.classList.add('active');
      row.innerHTML = `<span><strong>${card.id}</strong> · ${card.title || '—'}</span><span style="font-size:.75rem;color:var(--ink-soft);">${card.era || ''}</span>`;
      row.addEventListener('click', () => selectCard(card.id));
      els.pinList.appendChild(row);
    });
  }

  function findHotspotForCard(cardId) {
    return state.hotspots.find(h => (h.card_ids || []).includes(cardId));
  }

  function selectCard(cardId) {
    const card = state.cards.find(c => c.id === cardId);
    if (!card) return;
    state.selectedId = cardId;
    state.pendingPoint = null;

    els.id.value = card.id;
    els.title.value = card.title || '';
    els.era.value = card.era || '';
    els.eraOrder.value = card.era_order || '';
    els.front.value = card.front_image || '';
    els.back.value = card.back_image || '';
    els.description.value = card.description || '';

    const hs = findHotspotForCard(cardId);
    if (hs) {
      els.x.value = hs.x;
      els.y.value = hs.y;
    } else if (card.map_location) {
      els.x.value = card.map_location.x;
      els.y.value = card.map_location.y;
    } else {
      els.x.value = '';
      els.y.value = '';
    }

    highlightActiveHotspot();
    refreshPinList();
    setStatus(`${card.id} kiválasztva. Módosíts és Mentés, vagy kattints a térképre új pozícióért.`);
  }

  function clearForm(resetAll) {
    state.selectedId = null;
    state.pendingPoint = null;
    if (resetAll) {
      els.id.value = '';
      els.title.value = '';
      els.description.value = '';
      els.front.value = '';
      els.back.value = '';
      els.x.value = '';
      els.y.value = '';
    }
    highlightActiveHotspot();
    refreshPinList();
    setStatus('Új kártya létrehozása — kattints a térképre a pozícióhoz.');
  }

  function onSave() {
    const id = els.id.value.trim();
    if (!id) { alert('Azonosító megadása kötelező (pl. mc_16).'); return; }

    const title = els.title.value.trim();
    const era = els.era.value || '';
    const eraOrder = parseInt(els.eraOrder.value, 10) || 0;
    const description = els.description.value.trim();
    const front = els.front.value.trim();
    const back = els.back.value.trim();
    const x = parseFloat(els.x.value);
    const y = parseFloat(els.y.value);

    if (isNaN(x) || isNaN(y)) {
      alert('Kattints a térképre a pecsét elhelyezéséhez (x/y koordináták).');
      return;
    }

    let card = state.cards.find(c => c.id === id);
    if (!card) {
      card = { id };
      state.cards.push(card);
    }
    card.title = title;
    card.era = era;
    card.era_order = eraOrder;
    card.front_image = front;
    card.back_image = back;
    card.description = description;
    card.map_location = { x, y };

    let hotspot = findHotspotForCard(id);
    if (!hotspot) {
      hotspot = {
        id: `hs_${id}`,
        x, y,
        card_ids: [id],
        label: title || id,
      };
      state.hotspots.push(hotspot);
    } else {
      hotspot.x = x;
      hotspot.y = y;
      hotspot.label = title || id;
    }

    state.selectedId = id;
    state.pendingPoint = null;
    refreshHotspotsOnMap();
    refreshPinList();
    setStatus(`✓ Mentve: ${id}. Ne felejtsd el exportálni és commitálni!`);
  }

  function onDelete() {
    if (!state.selectedId) return;
    if (!confirm(`Biztosan törlöd a ${state.selectedId} kártyát?`)) return;
    const id = state.selectedId;
    state.cards = state.cards.filter(c => c.id !== id);
    state.hotspots = state.hotspots
      .map(h => ({ ...h, card_ids: (h.card_ids || []).filter(cid => cid !== id) }))
      .filter(h => h.card_ids.length > 0);
    clearForm(true);
    refreshHotspotsOnMap();
    refreshPinList();
    setStatus(`Törölve: ${id}.`);
  }

  function downloadJSON(filename, data) {
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
})();
