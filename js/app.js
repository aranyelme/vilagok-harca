/* =========================================================
   APP — Orchestrates views, data, interactions
   ========================================================= */

(async function bootstrap() {
  await DataStore.loadAll();

  CardModal.init();
  Gallery.init();

  MapEngine.init({
    onHotspotClick: (hotspot) => {
      const cardIds = hotspot.card_ids || [];
      const cards = cardIds.map(id => DataStore.getCard(id)).filter(Boolean);
      if (cards.length) {
        MapEngine.setActiveHotspot(hotspot.id);
        CardModal.openQueue(cards, 0);
      }
    },
  });
  MapEngine.renderHotspots(DataStore.hotspots);

  Timeline.init({
    onEraSelect: (eraName) => {
      MapEngine.filterHotspotsByEra(eraName);
    },
  });

  _bindViewNav();
  _bindDrawer();
})();

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
  if (view === 'map') {
    map.hidden = false;
    gallery.hidden = true;
    document.body.classList.remove('view-gallery');
    document.body.classList.add('view-map');
  } else if (view === 'gallery') {
    map.hidden = true;
    gallery.hidden = false;
    document.body.classList.remove('view-map');
    document.body.classList.add('view-gallery');
    Gallery.render();
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
