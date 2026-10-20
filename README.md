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

## Figure provenance

Results and displayed figures are synchronized with the local Overleaf source
`ISO_arxiv_0928`. The page layout and styles are retained. The manifold schematic shows ambient frame updates followed by polar restoration.

| File | Source under `ISO_arxiv_0928/Figure/` |
|---|---|
| `teaser.png` | `teaser.png` |
| `math_1p7b_adamw.png` | `math_1.7b_adam_iclr.png` |
| `math_4b_adamw.png` | `math_4b_adam_iclr.png` |
| `math_4b_muon.png` | `math_4b_muon_iclr.png` |
| `coding_ds1p5b.png` | `coding_iclr.png` |
| `iso_overhead_time.png` | `iso_overhead_time.png` |
| `math_pion.png` | `math_pion.png` |
| `learnable_sigma.png` | `learnable_sigma.png` |

Optimizer tables and accompanying claims follow `Section_new/5_exp_b.tex`;
checkpoint selection follows `Section_new/8_appendix.tex`. Merger tables were
checked against `Table/model_merge_Qwen.tex` and `Table/model_merge_deepseek.tex`
and already match. Legacy 8B images are retained as unused assets. The bundled
`static/ISO.pdf` was refreshed from https://arxiv.org/pdf/2607.19331 on 2026-10-20;
its main result values match the local Overleaf source.

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
