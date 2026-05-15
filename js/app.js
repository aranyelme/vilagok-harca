/* =========================================================
   APP — Orchestrates views, data, interactions
   ========================================================= */

let _currentMapVariant = 'present';

(async function bootstrap() {
  await DataStore.loadAll();

  CardModal.init();
  if (window.VideoModal) VideoModal.init();
  Gallery.init();
  if (window.CharactersGallery) CharactersGallery.init();
  if (window.Chronicle) Chronicle.init();

  MapEngine.init({
    onHotspotClick: (hotspot) => {
      if (window.Admin && Admin.isActive()) {
        Admin.editHotspot(hotspot);
        return;
      }
      const cardIds = hotspot.card_ids || [];
      const cards = cardIds.map(id => DataStore.getCard(id)).filter(Boolean);
      if (cards.length) {
        MapEngine.setActiveHotspot(hotspot.id);
        CardModal.openQueue(cards, 0);
      }
    },
  });
  MapEngine.renderHotspots(DataStore.getHotspotsForVariant(_currentMapVariant));

  Timeline.init({
    onEraSelect: (eraName) => {
      // Switch map variant when selecting an era exclusive to one map.
      if (eraName === DataStore.FUTURE_ERA) _setMapVariant('future');
      else if (eraName) _setMapVariant('present');
      MapEngine.filterHotspotsByEra(eraName);
    },
  });

  if (window.Legend) Legend.init(_currentMapVariant);

  Admin.init();

  _bindViewNav();
  _bindDrawer();
  _bindMapVariant();
})();

function _setMapVariant(variant) {
  if (variant === _currentMapVariant) return;
  _currentMapVariant = variant;
  document.querySelectorAll('.map-variant-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.variant === variant);
  });
  if (window.MapEngine) {
    MapEngine.setVariant(variant);
    MapEngine.renderHotspots(DataStore.getHotspotsForVariant(variant));
  }
  if (window.Legend) Legend.render(variant);
}

function _bindMapVariant() {
  document.querySelectorAll('.map-variant-btn').forEach(btn => {
    btn.addEventListener('click', () => _setMapVariant(btn.dataset.variant));
  });
}

function _bindViewNav() {
  const navBtns = document.querySelectorAll('.nav-btn[data-view]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      _showView(view);
      navBtns.forEach(b => b.classList.toggle('active', b === btn));
    });
  });
}

function _showView(view) {
  const map = document.getElementById('mapView');
  const gallery = document.getElementById('galleryView');
  const characters = document.getElementById('charactersView');
  const chronicle = document.getElementById('chronicleView');
  document.body.classList.remove('view-map', 'view-gallery', 'view-characters', 'view-chronicle');
  const hide = (el) => { if (el) el.hidden = true; };
  hide(map); hide(gallery); hide(characters); hide(chronicle);
  if (view === 'map') {
    map.hidden = false;
    document.body.classList.add('view-map');
  } else if (view === 'gallery') {
    gallery.hidden = false;
    document.body.classList.add('view-gallery');
    Gallery.render();
  } else if (view === 'characters') {
    if (characters) characters.hidden = false;
    document.body.classList.add('view-characters');
    if (window.CharactersGallery) CharactersGallery.render();
  } else if (view === 'chronicle') {
    if (chronicle) chronicle.hidden = false;
    document.body.classList.add('view-chronicle');
    if (window.Chronicle) Chronicle.render();
  }
}

function _bindDrawer() {
  const drawer = document.getElementById('drawer');
  const menuBtn = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('drawerClose');
  if (!drawer || !menuBtn) return;

  menuBtn.addEventListener('click', () => { drawer.hidden = false; });
  closeBtn.addEventListener('click', () => { drawer.hidden = true; });

  drawer.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', () => {
      const view = link.dataset.view;
      const navBtn = document.querySelector(`.nav-btn[data-view="${view}"]`);
      if (navBtn) navBtn.click();
      drawer.hidden = true;
    });
  });
}
