/* =========================================================
   VIDEOS — YouTube modal player for cards with linked videos
   ========================================================= */

const VideoModal = (() => {
  let modal, iframe, titleEl, descEl, cardsHintEl, closeBtn;
  let currentVideo = null;

  function init() {
    modal = document.getElementById('videoModal');
    iframe = document.getElementById('videoIframe');
    titleEl = document.getElementById('videoModalTitle');
    descEl = document.getElementById('videoModalDesc');
    cardsHintEl = document.getElementById('videoCardsHint');
    closeBtn = document.getElementById('videoClose');
    if (!modal) return;

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', e => {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', _onKey);
  }

  function open(video) {
    if (!modal || !video) return;
    currentVideo = video;
    const ytId = video.youtube_id || _extractYouTubeId(video.url);
    if (!ytId) return;

    titleEl.textContent = video.title || 'Videó';

    const desc = (video.description || '').trim();
    if (desc) {
      descEl.textContent = desc;
      descEl.hidden = false;
    } else {
      descEl.textContent = '';
      descEl.hidden = true;
    }

    _renderCardsHint(video.card_ids || []);

    iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;
    modal.hidden = false;
    modal.classList.add('is-open');
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove('is-open');
    if (iframe) iframe.src = '';
    currentVideo = null;
  }

  function _renderCardsHint(cardIds) {
    if (!cardsHintEl) return;
    const store = window.DataStore;
    if (!store || cardIds.length === 0) {
      cardsHintEl.textContent = '';
      cardsHintEl.hidden = true;
      return;
    }
    const parts = cardIds
      .map(id => {
        const c = store.getCard(id);
        if (!c) return null;
        const n = store.getCardNumber(id);
        const label = c.title || id;
        return n != null ? `№ ${n} — ${label}` : label;
      })
      .filter(Boolean);
    if (parts.length === 0) {
      cardsHintEl.hidden = true;
      return;
    }
    cardsHintEl.textContent = 'Kapcsolódó pillanatok: ' + parts.join(' · ');
    cardsHintEl.hidden = false;
  }

  function _onKey(e) {
    if (!modal || modal.hidden) return;
    if (e.key === 'Escape') close();
  }

  function _extractYouTubeId(url) {
    if (!url) return null;
    const m = String(url).match(
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{6,})/
    );
    return m ? m[1] : null;
  }

  return { init, open, close };
})();

if (typeof window !== 'undefined') window.VideoModal = VideoModal;
