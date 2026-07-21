# ISO-RLVR.github.io

Project page for **ISO: An RLVR-Native Optimization Stack** — *inherit the spectrum, optimize the frames*.

Static site (no build step). GitHub Pages serves `index.html` from the `main` branch of this
`<org>.github.io` repo automatically — just push.

## Layout

```
index.html              # the whole page
static/css/index.css    # styles
static/js/alpha.js      # interactive α-slider (spectrum-interpolation demo)
static/images/          # figures
```

## TODO before going live

1. **Teaser image** — export Figure 1 from the paper PDF and save it as
   `static/images/teaser.png` (until then the page shows a placeholder box):

   ```bash
   pdftoppm -png -r 220 -f 2 -l 2 ISO_arxiv.pdf fig1   # page 2 = Figure 1
   # crop to the figure and save as static/images/teaser.png
   ```

2. **Links** — code repo is set (https://github.com/zhuhanqing/ISO); still missing: the
   arXiv URL on the Paper button, author homepage links (search `href="#"`), and the
   arXiv id in the BibTeX block.

## Figure provenance

| File | Source |
|---|---|
| `math_8b.png` | paper Fig. 9 (`visualization/benchmark_avg_acc_mean16_8b_neurips_v3.png`) |
| `math_1p7b_adamw.png` | paper Fig. 6 left (`...1.7b_adam_neurips_v2.png`) |
| `math_4b_adamw.png` | paper Fig. 6 right (`...4b_step400_neurips_v1.png`) |
| `math_4b_muon.png` | paper Fig. 8 (`...4b_muon_step300_neurips_v3.png`) |
| `coding_ds1p5b.png` | paper Fig. 7 (`...mean8_step220_neurips_v3.png`) |
| `iso_8b_annotated.png` | teaser-style annotated 8B curve (currently unused spare) |

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
