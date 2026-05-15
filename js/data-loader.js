/* =========================================================
   DATA LOADER
   Loads JSON data with graceful fallbacks.
   ========================================================= */

const FUTURE_ERA = '50 évvel később';

const DataStore = {
  FUTURE_ERA,
  cards: [],
  hotspots: [],
  timeline: { eras: [] },
  videos: [],
  characters: [],

  async loadAll() {
    const [cards, hotspots, timeline, videos, characters] = await Promise.all([
      this._fetch('data/cards.json', []),
      this._fetch('data/hotspots.json', []),
      this._fetch('data/timeline.json', { eras: [] }),
      this._fetch('data/videos.json', []),
      this._fetch('data/characters.json', []),
    ]);
    this.cards = cards;
    this.hotspots = hotspots;
    this.timeline = timeline;
    this.videos = videos;
    this.characters = characters;
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

  // 1-based display index used by pins + legend.
  getCardNumber(cardId) {
    const sorted = this.getSortedCards();
    const idx = sorted.findIndex(c => c.id === cardId);
    return idx === -1 ? null : idx + 1;
  },

  getEras() {
    return (this.timeline && this.timeline.eras) || [];
  },

  getSortedEras() {
    return [...this.getEras()].sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  getCardsInEraOrdered(eraName) {
    return this.cards
      .filter(c => c.era === eraName)
      .sort((a, b) => {
        const ac = (a.chronology != null) ? a.chronology : Infinity;
        const bc = (b.chronology != null) ? b.chronology : Infinity;
        if (ac !== bc) return ac - bc;
        return (a.id || '').localeCompare(b.id || '');
      });
  },

  // 1-based position of a card within its era's ordered list.
  getCardEraPosition(cardId) {
    const card = this.getCard(cardId);
    if (!card || !card.era) return null;
    const ordered = this.getCardsInEraOrdered(card.era);
    const idx = ordered.findIndex(c => c.id === cardId);
    return idx === -1 ? null : idx + 1;
  },

  getVideosByCardId(cardId) {
    if (!cardId) return [];
    return (this.videos || []).filter(v => (v.card_ids || []).includes(cardId));
  },

  hasVideoForCard(cardId) {
    return this.getVideosByCardId(cardId).length > 0;
  },

  isCardInFutureEra(card) {
    return !!(card && card.era === FUTURE_ERA);
  },

  isHotspotInFutureEra(hotspot) {
    const cardId = (hotspot.card_ids || [])[0];
    const card = cardId ? this.getCard(cardId) : null;
    return this.isCardInFutureEra(card);
  },

  getHotspotsForVariant(variant) {
    const wantFuture = variant === 'future';
    return this.hotspots.filter(h => this.isHotspotInFutureEra(h) === wantFuture);
  },

  getCharacter(id) {
    return this.characters.find(c => c.id === id);
  },

  getSortedCharacters() {
    return [...this.characters].sort((a, b) => {
      const ae = (a.era_order || 0);
      const be = (b.era_order || 0);
      if (ae !== be) return ae - be;
      return (a.id || '').localeCompare(b.id || '');
    });
  },

  getCharactersByEra(eraName) {
    if (!eraName || eraName === 'all') return this.characters;
    return this.characters.filter(c => c.era === eraName);
  },

  // Characters that reference a given moment card id in related_card_ids.
  getCharactersForCard(cardId) {
    if (!cardId) return [];
    return this.characters.filter(c => (c.related_card_ids || []).includes(cardId));
  },
};

if (typeof window !== 'undefined') {
  window.DataStore = DataStore;
}
