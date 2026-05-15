/* =========================================================
   CARDS — Modal, flip, navigation, tilt
   ========================================================= */

const CardModal = (() => {
  let modal, cardEl, frontImg, backImg, titleEl, eraEl, eraLabelEl, descEl, descSection, numEl, prevBtn, nextBtn, closeBtn;
  let videoSection, videoBtn, videoTitleEl;
  let modalFrame, relatedSection;
  let currentQueue = [];
  let currentIndex = 0;
  let isFlipped = false;
  let tiltHandler = null;
  let currentVideo = null;

  function init() {
    modal = document.getElementById('cardModal');
    cardEl = document.getElementById('cardEl');
    frontImg = document.getElementById('cardFrontImg');
    backImg = document.getElementById('cardBackImg');
    titleEl = document.getElementById('modalTitle');
    eraEl = document.getElementById('modalEra');
    eraLabelEl = document.getElementById('modalEraLabel');
    descEl = document.getElementById('modalDescription');
    modalFrame = modal && modal.querySelector('.modal-frame');
    descSection = document.getElementById('modalDescriptionSection');
    numEl = document.getElementById('modalNumber');
    prevBtn = document.getElementById('prevCard');
    nextBtn = document.getElementById('nextCard');
    closeBtn = document.getElementById('modalClose');
    videoSection = document.getElementById('modalVideoSection');
    videoBtn = document.getElementById('modalVideoBtn');
    videoTitleEl = document.getElementById('modalVideoTitle');

    if (!modal) return;

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', e => {
      if (e.target === modal) close();
    });
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    cardEl.addEventListener('click', flip);
    if (videoBtn) {
      videoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentVideo && window.VideoModal) VideoModal.open(currentVideo);
      });
    }
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

  // Open a character. Wraps the character object so the modal can render it
  // through the same code path as a momentum card without leaking ch_ ids
  // into card-only lookups (era position, video badge, etc.).
  function openCharacter(characterId) {
    const ch = DataStore.getCharacter(characterId);
    if (!ch) return;
    const ageLabel = ch.age_label || (ch.age != null ? `${ch.age} éves` : '');
    const adapted = {
      id: ch.id,
      isCharacter: true,
      title: ch.name || 'Névtelen karakter',
      era: ageLabel ? `${ageLabel} · ${ch.era || ''}`.replace(/ · $/, '') : (ch.era || ''),
      front_image: ch.front_image,
      back_image: ch.back_image,
      description: ch.bio || '',
      _related_card_ids: ch.related_card_ids || [],
    };
    openQueue([adapted], 0);
  }

  function _render() {
    const card = currentQueue[currentIndex];
    if (!card) return;
    isFlipped = false;
    cardEl.classList.remove('flipped');
    cardEl.style.transform = '';

    const isCharacter = !!card.isCharacter;
    if (modalFrame) modalFrame.classList.toggle('is-character', isCharacter);

    _setFace(frontImg, card.front_image);
    _setFace(backImg, card.back_image);

    titleEl.textContent = card.title || (isCharacter ? 'Névtelen karakter' : 'Névtelen kártya');

    if (eraLabelEl) eraLabelEl.textContent = isCharacter ? 'Karakter:' : 'Korszak:';
    if (isCharacter) {
      eraEl.textContent = card.era || '—';
    } else {
      const eraName = card.era || '—';
      const eraPos = DataStore.getCardEraPosition(card.id);
      eraEl.textContent = eraPos != null ? `${eraName} (#${eraPos})` : eraName;
    }

    if (numEl) {
      const num = isCharacter ? null : DataStore.getCardNumber(card.id);
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
    _renderRelated(card);

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === currentQueue.length - 1;
  }

  // Render related items: for a momentum card, list the characters who appear
  // in it; for a character, list the moments where they show up.
  function _renderRelated(card) {
    if (!modalFrame) return;
    if (relatedSection) {
      relatedSection.remove();
      relatedSection = null;
    }
    let items = [];
    let titleText = '';
    if (card.isCharacter) {
      const ids = card._related_card_ids || [];
      items = ids
        .map(id => DataStore.getCard(id))
        .filter(Boolean)
        .map(c => ({
          label: c.title || c.id,
          onClick: () => openById(c.id),
        }));
      titleText = 'Hozzá tartozó pillanatok';
    } else {
      const related = DataStore.getCharactersForCard(card.id) || [];
      items = related.map(ch => ({
        label: ch.name + (ch.age_label ? ` · ${ch.age_label}` : ''),
        onClick: () => openCharacter(ch.id),
      }));
      titleText = 'Szereplők';
    }
    if (!items.length) return;

    const section = document.createElement('section');
    section.className = 'card-related-section';
    const h3 = document.createElement('h3');
    h3.className = 'card-description-title';
    h3.textContent = titleText;
    section.appendChild(h3);
    const list = document.createElement('div');
    list.className = 'card-related-chips';
    items.forEach(it => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card-related-chip';
      btn.textContent = it.label;
      btn.addEventListener('click', it.onClick);
      list.appendChild(btn);
    });
    section.appendChild(list);
    // Insert just after the description (or at end of the meta block).
    const meta = modalFrame.querySelector('.card-meta');
    if (meta) meta.appendChild(section);
    relatedSection = section;
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
    currentVideo = videos[0] || null;
    if (!currentVideo) {
      videoSection.hidden = true;
      return;
    }
    if (videoTitleEl) videoTitleEl.textContent = currentVideo.title || '';
    videoSection.hidden = false;
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

  return { init, openQueue, openById, openCharacter, close };
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
