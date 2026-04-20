# Térképképek

A főoldali térkép több felbontáson (LOD) érhető el. A kliens automatikusan
választ közülük a nagyítási szinthez:

- `terkep_lo.jpg` — kis felbontás (≈900 px), alapállapotú nézet / mobilra is gyors
- `terkep_md.jpg` — közepes felbontás (≈1500 px), normál nézet
- `terkep_hi.jpg` — teljes felbontás (≈2400 px), közeli nagyításkor

Ajánlott: JPG, progresszív, a látvány-szűrő (sepia/contrast/saturate) legyen
beleégetve a fájlokba, hogy ne kelljen CSS-ből a böngészőnek minden képkockán
újra alkalmaznia.

Frissíteni a `scripts/gen_map_lods.py` szerű segédszkripttel érdemes, ugyanarról
a forrásfájlról generálva mindhárom változatot.
