/* =========================================================
   TIMELINE — Horizontal era strip + filter
   ========================================================= */

const Timeline = (() => {
  let track, nodesLayer, erasLayer;
  let activeEra = null;
  let onEraSelect = null;

  function init(opts = {}) {
    track = document.getElementById('timelineTrack');
    nodesLayer = document.getElementById('timelineNodes');
    erasLayer = document.getElementById('timelineEras');
    onEraSelect = opts.onEraSelect || null;
    if (!track) return;
    render();
  }

  function render() {
    const eras = DataStore.getEras();
    if (!eras.length) {
      _renderEmpty();
      return;
    }

    erasLayer.innerHTML = '';
    nodesLayer.innerHTML = '';

    const sorted = [...eras].sort((a, b) => (a.order || 0) - (b.order || 0));
    const slice = 100 / sorted.length;

    sorted.forEach((era, i) => {
      const segment = document.createElement('div');
      segment.className = 'timeline-era';
      segment.style.left = `${i * slice}%`;
      segment.style.width = `${slice}%`;
      segment.dataset.era = era.name;
      if (era.name === activeEra) segment.classList.add('active');

      const label = document.createElement('span');
      label.className = 'timeline-era-label';
      label.textContent = era.name;
      segment.appendChild(label);

      segment.addEventListener('click', () => _selectEra(era.name));
      erasLayer.appendChild(segment);
    });

    // Card nodes distributed inside each era segment
    DataStore.cards.forEach(card => {
      const eraIdx = sorted.findIndex(e => e.name === card.era);
      if (eraIdx === -1) return;
      const cardsInEra = DataStore.cards.filter(c => c.era === card.era);
      const indexInEra = cardsInEra.findIndex(c => c.id === card.id);
      const eraLeft = eraIdx * slice;
      const offset = ((indexInEra + 0.5) / cardsInEra.length) * slice;
      const node = document.createElement('span');
      node.className = 'timeline-node';
      node.style.left = `${eraLeft + offset}%`;
      node.title = card.title || card.id;
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.CardModal) CardModal.openById(card.id);
      });
      nodesLayer.appendChild(node);
    });

    _renderResetButton();
  }

  function _renderResetButton() {
    if (!track) return;
    let btn = track.querySelector('.timeline-reset');
    if (activeEra) {
      if (!btn) {
        btn = document.createElement('button');
        btn.className = 'timeline-reset';
        btn.textContent = 'Minden korszak';
        btn.addEventListener('click', () => _selectEra(null));
        track.appendChild(btn);
      }
    } else if (btn) {
      btn.remove();
    }
  }

  function _renderEmpty() {
    if (!erasLayer) return;
    erasLayer.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--parchment);font-family:var(--font-title);letter-spacing:.15em;font-size:.75rem;opacity:.65;">Az idővonal még üres</div>';
  }

  function _selectEra(eraName) {
    activeEra = eraName;
    render();
    if (onEraSelect) onEraSelect(eraName);
  }

  function getActiveEra() { return activeEra; }

  return { init, render, getActiveEra };
})();

if (typeof window !== 'undefined') window.Timeline = Timeline;
