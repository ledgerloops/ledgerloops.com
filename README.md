# LedgerLoops
This repo contains the html content of https://ledgerloops.com

For more info on [LedgerLoops](https://ledgerloops.com), see: https://ledgerloops.com

# Build the [whitepaper](https://ledgerloops.com/doc/whitepaper.pdf) from LaTeX source:
```bash
$ cd doc
$ latex whitepaper.tex
$ bibtex whitepaper.tex
$ latex whitepaper.tex
$ latex whitepaper.tex
$ dvipdf whitepaper.dvi
$ cd ..
```
