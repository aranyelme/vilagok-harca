/* =========================================================
   DATA LOADER
   Loads JSON data with graceful fallbacks.
   ========================================================= */

const DataStore = {
  cards: [],
  hotspots: [],
  timeline: { eras: [] },
  videos: [],

  async loadAll() {
    const [cards, hotspots, timeline, videos] = await Promise.all([
      this._fetch('data/cards.json', []),
      this._fetch('data/hotspots.json', []),
      this._fetch('data/timeline.json', { eras: [] }),
      this._fetch('data/videos.json', []),
    ]);
    this.cards = cards;
    this.hotspots = hotspots;
    this.timeline = timeline;
    this.videos = videos;
    return this;
  },

  async _fetch(path, fallback) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[DataStore] Failed to load ${path}:`, err.message);
      return fallback;
    }
  },

  getCard(id) {
    return this.cards.find(c => c.id === id);
  },

  getCardsByEra(eraName) {
    if (!eraName || eraName === 'all') return this.cards;
    return this.cards.filter(c => c.era === eraName);
  },

  getHotspotByCardId(cardId) {
    return this.hotspots.find(h => (h.card_ids || []).includes(cardId));
  },

  getSortedCards() {
    return [...this.cards].sort((a, b) => {
      const ae = (a.era_order || 0);
      const be = (b.era_order || 0);
      if (ae !== be) return ae - be;
      return (a.id || '').localeCompare(b.id || '');
    });
  },

  getEras() {
    return (this.timeline && this.timeline.eras) || [];
  },
};

if (typeof window !== 'undefined') {
  window.DataStore = DataStore;
}
