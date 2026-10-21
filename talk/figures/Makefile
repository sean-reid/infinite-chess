SRC := $(wildcard src/*.tex)
OUT := $(patsubst src/%.tex,../build/figures/%.pdf,$(SRC))

all: $(OUT)

../build/figures:
	mkdir -p $@

../build/figures/%.pdf: src/%.tex wrap.tex | ../build/figures
	cd ../build/figures && TEXINPUTS="$(CURDIR)//:" pdflatex -interaction=nonstopmode -halt-on-error \
	  -jobname=$* "$(if $(filter eh14,$(firstword $(subst -, ,$*))),\def\papereh{1})\def\figfile{src/$*.tex}\input{wrap.tex}" > $*.out 2>&1 \
	  || { tail -40 $*.out; exit 1; }

clean:
	rm -rf ../build/figures

.PHONY: all clean
