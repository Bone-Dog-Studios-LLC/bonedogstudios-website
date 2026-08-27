# Claude Design bundle

Generates the component previews that back the **Bone Dog Studios — Web** design
system on claude.ai/design, so anything generated there comes out on-brand.

`assets/site.css` is the source of truth. These previews are derived output —
never edit the generated bundle, and never let it become a second place where
design decisions live.

## Rebuild

```
python3 design-system/build.py
```

Writes `design-system/bundle/` (gitignored — derived output). Re-run after any
change to `assets/site.css`, then ask Claude Code to re-sync the bundle to the
design system project.

## What it emits

17 cards in five groups: Foundations (color, type, brand, layout/motion),
Navigation (header, footer), Actions (buttons), Sections (hero, feature cards,
product card, CTA panel, wordmark/screenshots), Content (legal styles).

Each preview inlines the real `site.css` and loads the self-hosted variable
fonts from `assets/fonts/`, so it renders in Space Grotesk and Inter rather than
a fallback. The first line of every generated file is a
`<!-- @dsCard group="…" -->` marker — that is what the Design System pane reads
to build its card index.

## Not covered

The hero's sphere-nav constellation (`assets/sphere.js`) is pure canvas, so a
static card renders an empty rectangle. It is documented in the hero card's
footnote instead.

## Preview locally

```
python3 -m http.server 8777 --directory design-system/bundle
```

`file://` will not work — the inlined `@font-face` rules need an HTTP origin.
