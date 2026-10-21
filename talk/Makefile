LATEXMK := latexmk -lualatex -interaction=nonstopmode -halt-on-error -output-directory=build

all: build/slides.pdf build/notes.pdf

figures:
	$(MAKE) -C figures

build/slides.pdf: slides.tex theme/beamerthemepaper.sty figures
	$(LATEXMK) slides.tex

build/notes.pdf: notes.tex figures
	$(LATEXMK) notes.tex

clean:
	rm -rf build

.PHONY: all figures clean
