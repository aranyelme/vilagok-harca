# Kártyaképek

Minden momentumkártyához **két WebP** tartozik, előlap és hátlap, plusz mindkettőhöz
egy kisméretű galéria-bélyegkép:

- `mc_Na.webp` / `mc_Nb.webp` — modálban megjelenő, közepes felbontású változat (~450 px széles)
- `mc_Na.thumb.webp` / `mc_Nb.thumb.webp` — galéria-bélyegkép (~260 px széles)

ahol `N` a kártya sorszáma (1, 2, 3, ...).

## Miért WebP + thumbnail?

- A galéria csak a kis bélyegképeket tölti be, ezzel a betöltési méret
  (~5 MB PNG → ~0.4 MB WebP) töredékére csökken.
- A modál a nagyobb, de még mindig tömör WebP-et mutatja.

## Hiányzó képek

Ha egy kép hiányzik, a galériában és a modálban egy barátságos
„A kép hiányzik" placeholder jelenik meg — a többi kártya zavartalanul működik.
