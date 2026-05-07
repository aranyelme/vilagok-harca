# Térképképek

A főoldali térkép több felbontáson (LOD) érhető el. A kliens automatikusan
választ közülük a nagyítási szinthez:

- `terkep_lo.jpg` — kis felbontás (≈900 px), alapállapotú nézet / mobilra is gyors
- `terkep_md.jpg` — közepes felbontás (≈1500 px), normál nézet
- `terkep_hi.jpg` — teljes felbontás (≈2400 px), közeli nagyításkor

A „50 évvel később” korszak külön térképet használ, ugyanezzel a sémával,
`terkep_future_` előtaggal:

- `terkep_future_lo.jpg`
- `terkep_future_md.jpg`
- `terkep_future_hi.jpg`

Ajánlott: JPG, progresszív, a látvány-szűrő (sepia/contrast/saturate) legyen
beleégetve a fájlokba, hogy ne kelljen CSS-ből a böngészőnek minden képkockán
újra alkalmaznia.

Frissíteni a `scripts/gen_map_lods.py` segédszkripttel érdemes, ugyanarról a
forrásfájlról generálva mindhárom változatot:

```
python scripts/gen_map_lods.py path/to/jelen-forras.jpg --prefix terkep
python scripts/gen_map_lods.py path/to/jovo-forras.jpg --prefix terkep_future
```
