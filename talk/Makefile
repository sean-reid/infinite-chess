LATEXMK := latexmk -lualatex -interaction=nonstopmode -halt-on-error -output-directory=build

all: build/slides.pdf build/notes.pdf

figures:
	$(MAKE) -C figures

build/link.tex: demo/rook-attacked.url
	mkdir -p build
	printf '\\href{%s}{the prepared link}%%\n' "$$(cat $<)" > $@

build/slides.pdf: slides.tex theme/beamerthemepaper.sty build/link.tex figures
	$(LATEXMK) slides.tex

build/notes.pdf: notes.tex build/link.tex figures
	$(LATEXMK) notes.tex

stills:
	cd .. && node talk/demo/shots.mjs

clean:
	rm -rf build

.PHONY: all figures stills clean
