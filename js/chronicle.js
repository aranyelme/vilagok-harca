/* =========================================================
   CHRONICLE — Full-page timeline view, auto-grouped by era
   and ordered by per-card chronology.
   ========================================================= */

const Chronicle = (() => {
  let container;

  function init() {
    container = document.getElementById('chronicleEras');
  }

  function render() {
    if (!container) return;
    container.innerHTML = '';

    const eras = DataStore.getSortedEras();
    if (!eras.length) {
      container.innerHTML = '<p class="chronicle-empty">Az idővonal még üres.</p>';
      return;
    }

    eras.forEach(era => {
      const block = document.createElement('section');
      block.className = 'chronicle-era';
      block.style.setProperty('--era-color', era.color || 'var(--gold)');

      const header = document.createElement('header');
      header.className = 'chronicle-era-header';
      const title = document.createElement('h2');
      title.className = 'chronicle-era-title';
      title.textContent = era.name;
      header.appendChild(title);
      block.appendChild(header);

      const cards = DataStore.getCardsInEraOrdered(era.name);
      if (cards.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'chronicle-era-empty';
        empty.textContent = 'Nincs még pillanat ebben a korszakban.';
        block.appendChild(empty);
      } else {
        const list = document.createElement('ol');
        list.className = 'chronicle-list';
        cards.forEach(card => list.appendChild(_renderCardItem(card)));
        block.appendChild(list);
      }

      container.appendChild(block);
    });
  }

  function _renderCardItem(card) {
    const item = document.createElement('li');
    item.className = 'chronicle-item';
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', card.title || card.id);

    const marker = document.createElement('span');
    marker.className = 'chronicle-marker';
    marker.textContent = (card.chronology != null && card.chronology !== '')
      ? String(card.chronology)
      : '·';
    item.appendChild(marker);

    const body = document.createElement('div');
    body.className = 'chronicle-body';

    if (card.front_image) {
      const thumb = document.createElement('img');
      thumb.className = 'chronicle-thumb';
      thumb.src = card.front_image;
      thumb.alt = '';
      thumb.loading = 'lazy';
      body.appendChild(thumb);
    }

    const meta = document.createElement('div');
    meta.className = 'chronicle-meta';

    const num = DataStore.getCardNumber(card.id);
    const heading = document.createElement('h3');
    heading.className = 'chronicle-item-title';
    heading.textContent = (num != null ? `№ ${num} — ` : '') + (card.title || card.id);
    meta.appendChild(heading);

    if (card.description) {
      const desc = document.createElement('p');
      desc.className = 'chronicle-item-desc';
      desc.textContent = card.description;
      meta.appendChild(desc);
    }

    body.appendChild(meta);
    item.appendChild(body);

    const open = () => { if (window.CardModal) CardModal.openById(card.id); };
    item.addEventListener('click', open);
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });

    return item;
  }

  return { init, render };
})();

if (typeof window !== 'undefined') window.Chronicle = Chronicle;
