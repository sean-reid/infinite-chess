LATEXMK := latexmk -lualatex -interaction=nonstopmode -halt-on-error -output-directory=build
THEME := $(wildcard theme/*.sty)

all: build/slides.pdf build/script.pdf build/notes.pdf

figures:
	$(MAKE) -C figures

build/link.tex: demo/rook-attacked.url
	mkdir -p build
	printf '\\href{%s}{the prepared link}%%\n' "$$(cat $<)" > $@

build/slides.pdf: slides.tex $(THEME) build/link.tex figures
	$(LATEXMK) slides.tex

build/script.pdf: script.tex $(THEME) build/link.tex figures
	$(LATEXMK) script.tex

build/notes.pdf: notes.tex $(THEME)
	$(LATEXMK) notes.tex

stills:
	cd .. && node talk/demo/shots.mjs

clean:
	rm -rf build

.PHONY: all figures stills clean
