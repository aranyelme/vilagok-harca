# Világok Harca

**Interaktív műhely-archívum** — az *Aranyelme* műhely gyermekeinek közös világépítő munkája, fantasy krónika-esztétikában feldolgozva.

A webhely három egymásba fonódó réteget mutat be:

1. **Térkép** — a kézzel rajzolt világtérkép, kattintható pecsétekkel.
2. **Momentumkártyák** — a történelmi pillanatok, előlapjukon illusztráció, hátukon cím és leírás.
3. **Idővonal** — a világ történelmének korszakai, kronológiai szűréssel.

---

## Élő verzió

GitHub Pages: *beállítandó a repo Settings → Pages menüjében (Branch: `main`, Folder: `/`).*

---

## Projektstruktúra

```
vilagok-harca/
├── index.html              # Főoldal (a „Szerkesztő” gomb megnyitja az oldalsávot)
├── css/
│   ├── style.css           # Alap stílusok (pergamen, tinta, arany)
│   └── cards.css           # Kártyafordítás és modál
├── js/
│   ├── data-loader.js      # JSON betöltő
│   ├── map.js              # Pan/zoom + pecsét réteg
│   ├── cards.js            # Kártyamodál + galéria
│   ├── timeline.js         # Idővonal komponens
│   ├── admin.js            # Szerkesztő logika
│   └── app.js              # Orchestrator
├── data/
│   ├── cards.json          # Kártyák metaadatai
│   ├── hotspots.json       # Térképi pozíciók
│   ├── timeline.json       # Korszakok
│   └── videos.json         # Videók (2. fázis)
├── assets/
│   ├── map/terkep_1.jpg    # Szkennelt térkép (HELYEZD EL!)
│   ├── cards/              # Kártyaképek: mc_Na.png, mc_Nb.png
│   ├── icons/pin.svg       # Pecsét ikon
│   └── textures/           # Pergamen textúrák
└── README.md
```

---

## Tartalom hozzáadása (új műhely után)

### 1. Képek feltöltése
- Szkenneld / fényképezd be az új kártyákat.
- Mentsd `mc_Na.png` (előlap) és `mc_Nb.png` (hátlap) néven.
- Tedd őket az `assets/cards/` mappába.

### 2. Nyisd meg a szerkesztőt
- Nyisd meg a főoldalt, majd a felső menü **Szerkesztő** gombjával kapcsold be az oldalsávot.
- Helyben: `python3 -m http.server 8000`, majd <http://localhost:8000>.

### 3. Pecsét elhelyezése
- Kattints a térképen oda, ahol a kártya helye van → a koordináták automatikusan kitöltődnek.
- Töltsd ki a jobb oldali űrlapot: ID, cím, korszak, képek, leírás.
- **Mentés** gomb → az adat a memóriában rögzül.

### 4. Exportálás
- Kattints a `cards.json`, `hotspots.json`, és (ha új korszak) `timeline.json` gombokra.
- A letöltött fájlokat másold a `data/` mappába.

### 5. Commit és deploy
```bash
git add data/ assets/cards/
git commit -m "Új kártyák: <műhely dátuma>"
git push
```
A GitHub Pages automatikusan frissíti az oldalt.

---

## Helyi futtatás

Statikus fájlok, nincs build step. Bármelyik HTTP szerver működik:

```bash
python3 -m http.server 8000
# vagy
npx serve .
```

Majd: <http://localhost:8000>

---

## Hiányzó térkép / képek

Ha a `assets/map/terkep_1.jpg` vagy egy kártyakép még nincs a repóban, a felület **jelzi a hiányt**, de nem tör össze — a többi működik tovább.

Cseréld ki a placeholdert egy valódi szkennelt képpel (~2000–4000 px szélesség ajánlott), és minden a helyére kerül.

---

## Tervezési döntések

| | |
|---|---|
| **Build step** | Nincs. Vanilla JS + CSS. |
| **Térkép** | Képes térkép CSS-transzform pan/zoom réteggel. |
| **Kártyafordítás** | CSS 3D transforms, hardware-accelerated. |
| **Adattárolás** | `data/*.json` — git-verzionált, bárki szerkesztheti. |
| **Admin** | Kliensoldali, JSON exporttal. Nincs backend. |
| **Nyelv** | Teljes magyar UI. |

---

## Ütemterv

- **1. fázis** ✓ Térkép + kártyák + galéria (MVP)
- **2. fázis** · Idővonal szűrés finomítása, videók
- **3. fázis** · Krónika oldal (videógaléria)
- **4. fázis** · GitHub OAuth direct-commit az admin felületről

---

*Koncepció: Richard Fejes & Claude — 2026. április*
