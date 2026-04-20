/* =========================================================
   LEGEND — Collapsible side panel mapping pin numbers to
   card titles. Click an entry to open the corresponding card.
   ========================================================= */

const Legend = (() => {
  let panel, toggleBtn, body, list;

  function init() {
    panel = document.getElementById('mapLegend');
    toggleBtn = document.getElementById('legendToggle');
    body = document.getElementById('legendBody');
    list = document.getElementById('legendList');
    if (!panel || !toggleBtn || !list) return;

    toggleBtn.addEventListener('click', _toggle);
    render();
  }

  function render() {
    if (!list) return;
    const sorted = DataStore.getSortedCards();
    list.innerHTML = '';
    const frag = document.createDocumentFragment();
    sorted.forEach((card, i) => {
      const n = i + 1;
      const li = document.createElement('li');
      li.className = 'legend-item';
      li.dataset.cardId = card.id;

      const num = document.createElement('span');
      num.className = 'legend-num';
      num.textContent = n;

      const text = document.createElement('span');
      text.className = 'legend-text';
      const title = document.createElement('span');
      title.className = 'legend-title';
      title.textContent = card.title || card.id;
      const era = document.createElement('span');
      era.className = 'legend-era';
      era.textContent = card.era || '';
      text.appendChild(title);
      text.appendChild(era);

      li.appendChild(num);
      li.appendChild(text);
      li.addEventListener('click', () => {
        if (window.CardModal) CardModal.openById(card.id);
      });
      frag.appendChild(li);
    });
    list.appendChild(frag);
  }

  function _toggle() {
    const collapsed = panel.classList.toggle('collapsed');
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  }

  return { init, render };
})();

if (typeof window !== 'undefined') window.Legend = Legend;
