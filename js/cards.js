/* =========================================================
   CARDS — Modal, flip, navigation, tilt
   ========================================================= */

const CardModal = (() => {
  let modal, cardEl, frontImg, backImg, titleEl, eraEl, descEl, descSection, numEl, prevBtn, nextBtn, closeBtn;
  let videoSection;
  let currentQueue = [];
  let currentIndex = 0;
  let isFlipped = false;
  let tiltHandler = null;

  function init() {
    modal = document.getElementById('cardModal');
    cardEl = document.getElementById('cardEl');
    frontImg = document.getElementById('cardFrontImg');
    backImg = document.getElementById('cardBackImg');
    titleEl = document.getElementById('modalTitle');
    eraEl = document.getElementById('modalEra');
    descEl = document.getElementById('modalDescription');
    descSection = document.getElementById('modalDescriptionSection');
    numEl = document.getElementById('modalNumber');
    prevBtn = document.getElementById('prevCard');
    nextBtn = document.getElementById('nextCard');
    closeBtn = document.getElementById('modalClose');
    videoSection = document.getElementById('modalVideoSection');

    if (!modal) return;

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', e => {
      if (e.target === modal) close();
    });
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    cardEl.addEventListener('click', flip);
    // Per-video click handlers are wired inside _renderVideoButton, since the
    // section is now rebuilt each render to support multiple linked videos.
    document.addEventListener('keydown', _onKey);
  }

  function openQueue(cards, startIndex = 0) {
    if (!cards || cards.length === 0) return;
    currentQueue = cards;
    currentIndex = Math.max(0, Math.min(startIndex, cards.length - 1));
    _render();
    modal.hidden = false;
    modal.classList.add('is-open');
    _attachTilt();
  }

  function openById(cardId) {
    const card = DataStore.getCard(cardId);
    if (!card) return;
    openQueue([card], 0);
  }

  function _render() {
    const card = currentQueue[currentIndex];
    if (!card) return;
    isFlipped = false;
    cardEl.classList.remove('flipped');
    cardEl.style.transform = '';

    _setFace(frontImg, card.front_image);
    _setFace(backImg, card.back_image);

    titleEl.textContent = card.title || 'Névtelen kártya';
    const eraName = card.era || '—';
    const eraPos = DataStore.getCardEraPosition(card.id);
    eraEl.textContent = eraPos != null ? `${eraName} (#${eraPos})` : eraName;

    const num = DataStore.getCardNumber(card.id);
    if (numEl) {
      if (num != null) {
        numEl.textContent = '№ ' + num;
        numEl.hidden = false;
      } else {
        numEl.textContent = '';
        numEl.hidden = true;
      }
    }

    const desc = (card.description || '').trim();
    descEl.textContent = desc;
    if (descSection) descSection.hidden = !desc;

    _renderVideoButton(card);

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === currentQueue.length - 1;
  }

  function _setFace(imgEl, src) {
    const face = imgEl.parentElement;
    face.classList.remove('missing');
    face.querySelectorAll('.missing-label').forEach(n => n.remove());
    if (src) {
      imgEl.src = src;
      imgEl.alt = '';
      imgEl.style.display = '';
      imgEl.onerror = () => {
        imgEl.style.display = 'none';
        face.classList.add('missing');
        const lbl = document.createElement('span');
        lbl.className = 'missing-label';
        lbl.textContent = 'A kép hiányzik';
        face.appendChild(lbl);
      };
    } else {
      imgEl.removeAttribute('src');
      imgEl.style.display = 'none';
      face.classList.add('missing');
      const lbl = document.createElement('span');
      lbl.className = 'missing-label';
      lbl.textContent = 'A kép hiányzik';
      face.appendChild(lbl);
    }
  }

  function _renderVideoButton(card) {
    if (!videoSection) return;
    const videos = (window.DataStore && DataStore.getVideosByCardId(card.id)) || [];
    if (!videos.length) {
      videoSection.hidden = true;
      videoSection.innerHTML = '';
      return;
    }
    videoSection.hidden = false;
    videoSection.innerHTML = '';
    videos.forEach(v => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card-video-btn';
      const icon = document.createElement('span');
      icon.className = 'card-video-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '▶';
      const label = document.createElement('span');
      label.className = 'card-video-label';
      label.textContent = videos.length > 1 ? 'Videó' : 'Nézd meg a videót';
      const title = document.createElement('span');
      title.className = 'card-video-title';
      title.textContent = v.title || '';
      btn.appendChild(icon);
      btn.appendChild(label);
      btn.appendChild(title);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.VideoModal) VideoModal.open(v);
      });
      videoSection.appendChild(btn);
    });
  }

  function flip() {
    isFlipped = !isFlipped;
    cardEl.classList.toggle('flipped', isFlipped);
  }

  function prev() {
    if (currentIndex > 0) {
      currentIndex--;
      _render();
    }
  }

  function next() {
    if (currentIndex < currentQueue.length - 1) {
      currentIndex++;
      _render();
    }
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove('is-open');
    _detachTilt();
  }

  function _onKey(e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
  }

  function _attachTilt() {
    // Tilt disabled: the inline transform it set per-mousemove fought the
    // CSS flip transition and caused visible jank during spin. Left as a
    // no-op so the existing attach/detach wiring still works.
  }

  function _detachTilt() {
    if (tiltHandler) {
      window.removeEventListener('mousemove', tiltHandler);
      tiltHandler = null;
    }
    if (cardEl) {
      cardEl.classList.remove('tiltable');
      cardEl.style.transform = '';
    }
  }

  return { init, openQueue, openById, close };
})();

if (typeof window !== 'undefined') window.CardModal = CardModal;


/* =========================================================
   GALLERY
   ========================================================= */

const Gallery = (() => {
  let grid, filter;

  function init() {
    grid = document.getElementById('galleryGrid');
    filter = document.getElementById('eraFilter');
    if (!grid) return;

    _populateFilter();
    render();
    filter.addEventListener('change', render);
  }

  function _populateFilter() {
    if (!filter) return;
    const eras = DataStore.getEras();
    eras.forEach(era => {
      const opt = document.createElement('option');
      opt.value = era.name;
      opt.textContent = era.name;
      filter.appendChild(opt);
    });
  }

  function render() {
    const eraName = filter ? filter.value : 'all';
    const cards = DataStore.getCardsByEra(eraName);
    grid.innerHTML = '';
    if (cards.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'gallery-card placeholder';
      empty.innerHTML = '<em>Ebből a korszakból még nincsenek feljegyzések.</em>';
      grid.appendChild(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    DataStore.getSortedCards()
      .filter(c => eraName === 'all' || c.era === eraName)
      .forEach(card => {
        const tile = document.createElement('button');
        tile.className = 'gallery-card';
        tile.type = 'button';
        const img = document.createElement('img');
        img.src = _thumbPath(card.front_image) || '';
        img.alt = card.title || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 260;
        img.height = 433;
        img.onerror = () => {
          tile.classList.add('placeholder');
          tile.innerHTML = `<em>${card.title || card.id}</em>`;
        };
        const label = document.createElement('span');
        label.className = 'gc-label';
        label.textContent = card.title || card.id;
        tile.appendChild(img);
        tile.appendChild(label);
        if (window.DataStore && DataStore.hasVideoForCard(card.id)) {
          tile.classList.add('has-video');
          const badge = document.createElement('span');
          badge.className = 'gallery-video-badge';
          badge.setAttribute('aria-label', 'Videó elérhető');
          badge.title = 'Videó elérhető';
          badge.textContent = '▶';
          tile.appendChild(badge);
        }
        tile.addEventListener('click', () => CardModal.openById(card.id));
        frag.appendChild(tile);
      });
    grid.appendChild(frag);
  }

  // Derive a thumbnail path: "x.webp" -> "x.thumb.webp".
  // Falls back to the original if the pattern doesn't match.
  function _thumbPath(src) {
    if (!src) return src;
    return src.replace(/\.webp$/i, '.thumb.webp');
  }

  return { init, render };
})();

if (typeof window !== 'undefined') window.Gallery = Gallery;
