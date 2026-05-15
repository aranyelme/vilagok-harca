# Világok Harca

**Interaktív műhely-archívum** — az *Aranyelme* műhely gyermekeinek közös világépítő munkája, fantasy krónika-esztétikában feldolgozva.

A webhely négy egymásba fonódó réteget mutat be:

1. **Térkép** — a kézzel rajzolt világtérkép, kattintható pecsétekkel. Két korszak között lehet váltani (jelen és „50 év múlva").
2. **Momentumkártyák** — a történelmi pillanatok, előlapjukon illusztráció, hátukon cím és leírás. Helyszínhez (pecséthez) kötődnek.
3. **Karakterek** — szereplők, akik megjelennek a történetekben. *Külön* adattípus a momentumoktól: nincs térképi pecsétjük, viszont több momentumhoz is kapcsolódhatnak (`related_card_ids`).
4. **Idővonal és Krónika** — a világ történelmének korszakai, kronológiai szűréssel.

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
│   ├── cards.json          # Momentumkártyák metaadatai
│   ├── characters.json     # Karakterek metaadatai (szereplők)
│   ├── hotspots.json       # Térképi pozíciók (csak momentumokhoz)
│   ├── timeline.json       # Korszakok
│   └── videos.json         # Videók
├── assets/
│   ├── map/terkep_*.jpg    # Szkennelt térkép (jelen + jövő, lo/md/hi)
│   ├── cards/              # Kártyaképek:
│   │                       #   mc_Na.webp / mc_Nb.webp    — momentum (előlap/hátlap)
│   │                       #   ch_Na.webp / ch_Nb.webp    — karakter
│   │                       #   *.thumb.webp               — galéria-bélyegkép
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

---

## Momentum vs. Karakter — fogalmi különbség

A repó két **különálló** kártya-fajtát tárol; a megkülönböztetés szándékos:

| | **Momentumkártya** (`mc_*`) | **Karakterkártya** (`ch_*`) |
|---|---|---|
| Mit ír le? | Egy *eseményt* / pillanatot | Egy *személyt* / szereplőt |
| Adatfájl | `data/cards.json` | `data/characters.json` |
| Térképi pecsét? | **Igen** — minden momentum egy hotspothoz tartozik | **Nem** — a karakterek nem helyhez, hanem több eseményhez köthetők |
| Korszakhoz tartozik? | Igen, és kronológiai pozíciója is van a korszakban | Igen (mely korszakban él), de kronológia nélkül |
| Galéria | „Kártyák" fül | „Karakterek" fül |
| Modal | Közös `cardModal` (csak más színű keret + más metaadatok) | Ugyanaz a modál, bronz színű kerettel és életkor-felirattal |
| Összekötés | A modal automatikusan listázza azokat a karaktereket, akik szerepelnek benne | A modal automatikusan listázza, mely momentumokban tűnik fel |

A kapcsolatot a **karakter** oldalon tároljuk: minden karakterhez tartozik egy `related_card_ids` lista. A momentum oldal nem ismétli meg ezt — a karakter→momentum irány az igazság forrása, momentum→karakter pedig egyszerű visszafelé keresés.

### Karakterkártya séma (`data/characters.json`)

```json
{
  "id": "ch_07",
  "name": "Rin és Santi",
  "age": null,
  "age_label": "nagy harcos és segítőtársa",
  "era": "50 évvel később",
  "era_order": 3,
  "faction": "harcos",
  "front_image": "assets/cards/ch_7a.webp",
  "back_image": "assets/cards/ch_7b.webp",
  "bio": "Rin — nagy harcos…",
  "related_card_ids": ["mc_19"]
}
```

- `age` numerikus érték, vagy `null` ha nem ismert.
- `age_label` opcionális, ezzel írható felül a megjelenítés (pl. „14–15 éves", „varázsló", „a háború hőse").
- `faction` szabad szöveges címke (boszorkány, harcos, varázsló, alakváltó, …).

### Új karakter felvétele

1. Két képet készíts elő (előlap+hátlap), majd futtasd ugyanazt a két-méretű WebP optimalizálást, mint a momentumoknál:
   - `ch_Na.webp` / `ch_Nb.webp` — 380×633, q≈82
   - `ch_Na.thumb.webp` / `ch_Nb.thumb.webp` — 240×400, q≈80
2. Vegyél fel egy új objektumot a `data/characters.json`-ba a fenti séma szerint.
3. (Opcionális) Töltsd ki a `related_card_ids` mezőt — minden megjelenés tükröződni fog a momentum modalban is.

---

*Koncepció: Richard Fejes & Claude — 2026. április*
