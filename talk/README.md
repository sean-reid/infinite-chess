# The talk

Slides and speaker notes for a class presentation on the two Integers papers the app is built from.

```sh
make -C talk            # talk/build/slides.pdf and talk/build/notes.pdf
make -C talk figures    # only the board diagrams, into talk/build/figures/
make -C talk clean
```

Needs a TeX Live with `lualatex`, `latexmk`, `beamer`, `fontspec`, `unicode-math` and `chessboard`. The board diagrams under `figures/src` are the authors' own figure code from their
arXiv sources, one file per published figure, compiled with `pdflatex` and the `chessboard` package; each
file names its source. Source Serif 4 and JetBrains Mono in `fonts/` are under the SIL Open Font License, texts alongside.

CI builds both PDFs on every change under `talk/` and attaches them to each GitHub release.
