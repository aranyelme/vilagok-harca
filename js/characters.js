/* =========================================================
   CHARACTERS — Separate gallery + modal hand-off
   Characters live in data/characters.json. They are distinct
   from "momentum" cards: they are people, not events, so they
   do not occupy hotspots on the map.
   ========================================================= */

const CharactersGallery = (() => {
  let grid, filter;

  function init() {
    grid = document.getElementById('charactersGrid');
    filter = document.getElementById('characterEraFilter');
    if (!grid) return;

    _populateFilter();
    render();
    filter.addEventListener('change', render);
  }

  function _populateFilter() {
    if (!filter) return;
    DataStore.getEras().forEach(era => {
      const opt = document.createElement('option');
      opt.value = era.name;
      opt.textContent = era.name;
      filter.appendChild(opt);
    });
  }

  function render() {
    if (!grid) return;
    const eraName = filter ? filter.value : 'all';
    const characters = DataStore.getSortedCharacters()
      .filter(c => eraName === 'all' || c.era === eraName);
    grid.innerHTML = '';
    if (characters.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'gallery-card placeholder';
      empty.innerHTML = '<em>Ebből a korszakból még nincs karakter.</em>';
      grid.appendChild(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    characters.forEach(ch => {
      const tile = document.createElement('button');
      tile.className = 'gallery-card character-card';
      tile.type = 'button';
      const img = document.createElement('img');
      img.src = _thumbPath(ch.front_image) || '';
      img.alt = ch.name || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 260;
      img.height = 433;
      img.onerror = () => {
        tile.classList.add('placeholder');
        tile.innerHTML = `<em>${ch.name || ch.id}</em>`;
      };
      const label = document.createElement('span');
      label.className = 'gc-label';
      const ageBit = ch.age_label || (ch.age != null ? `${ch.age} éves` : '');
      label.textContent = ageBit ? `${ch.name} · ${ageBit}` : ch.name;
      tile.appendChild(img);
      tile.appendChild(label);
      tile.addEventListener('click', () => CardModal.openCharacter(ch.id));
      frag.appendChild(tile);
    });
    grid.appendChild(frag);
  }

  function _thumbPath(src) {
    if (!src) return src;
    return src.replace(/\.webp$/i, '.thumb.webp');
  }

  return { init, render };
})();

if (typeof window !== 'undefined') window.CharactersGallery = CharactersGallery;
