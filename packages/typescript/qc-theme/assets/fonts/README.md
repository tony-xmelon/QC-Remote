# Quad Cortex UI font source

These are the three IBM Plex Sans faces embedded and registered by CorOS
ZenUI: Regular, Medium, and Bold. The same byte-for-byte files are also
embedded in Cortex Control 4.1.0 (`Cortex Control.exe` SHA-256
`9BE548FB6CBD2E8C80715015C2A2F0F248C9B01A7165004E2B017FFE2B14E65A`).

`tools/extract-cortex-control-fonts.mjs` locates the SFNT resources and
validates their PostScript names and SHA-256 digests. The files are canonical
shared theme assets; Windows and Android do not carry separate copies.

For firmware verification, `tools/extract-coros-rootfs.py` reads ZenUI from an
unmounted CorOS rootfs image, and the font extractor can scan that binary with
`QC_FONT_ALLOW_SUBSET=1`. This is read-only and does not require a connected QC.

IBM Plex is distributed under the SIL Open Font License 1.1. See `LICENSE.txt`.
