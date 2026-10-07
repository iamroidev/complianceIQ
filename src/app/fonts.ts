import localFont from "next/font/local";

/**
 * Same faces the `geist` package wires up via `geist/font/{sans,mono}`, but
 * with GeistSans preloaded: the hero subhead (the current LCP element) is set
 * in GeistSans, so its file must start on the critical path with the
 * Newsreader pair — left to CSS discovery it races the first text paint and
 * LCP flips between the fallback paint and the swap repaint (bimodal ~150ms).
 * The face is a pyftsubset cut of the package's Geist-Variable.woff2
 * (68KB -> 40.6KB: latin + punctuation/arrows/symbols the UI uses, wght
 * 100-900 axis intact) because on Lantern's slow-4G the Geist download sits
 * at the end of the font queue and its swap sets LCP; -27KB is ~-140ms.
 * Regenerate: `python -m fontTools.subset node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2
 * --flavor=woff2 --output-file=src/assets/fonts/Geist-Variable-subset.woff2
 * --unicodes="U+0020-00FF,U+0100-017F,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-21FF,U+2212,U+25A0-25FF,U+2600-26FF,U+2700-27BF,U+FE00-FE0F" --layout-features="*" --no-hinting`
 * GeistMono is not preloaded: nothing on the landing page uses it, and a
 * forced 70KB download would only compete with the fonts that do back LCP.
 * `geist/font/*` preloads every face by default and puts them all in the
 * Link response header too.
 */
export const GeistSans = localFont({
  src: "../assets/fonts/Geist-Variable-subset.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  preload: true,
});

export const GeistMono = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  adjustFontFallback: false,
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Roboto Mono",
    "Menlo",
    "Monaco",
    "Liberation Mono",
    "DejaVu Sans Mono",
    "Courier New",
    "monospace",
  ],
  weight: "100 900",
  preload: false,
});
