# Open Atlas / Website

A dependency-free, static and mobile-friendly site under docs/, ready for GitHub Pages.

## Information architecture

- **index.html** — the atlas landing page, with an interactive *visual navigation map* linking to real works and writing.
- **sky.js** — deterministic, canvas-based stars and pointer / keyboard pan-zoom navigation; no render loop or dependency.
- **site.css** — shared tokens, grids, card treatments, article typography, responsive layouts, keyboard focus and reduced-motion support.
- **works/index.html** — complete index of published interactive experiments.
- **a-seed/** — a generative seed-based plant experiment.
- **one-bit/** — an interactive representation/encoding thought experiment.
- **notes/index.html** — field-note index; editorial navigation only.
- **notes/scales/index.html** — accessible HTML reading of the source at /notes/2026-10-19-map-of-scales.md.
- **about/index.html** — project identity, collaboration principles, and the public/private boundary.

The cosmic metaphor is intentionally hierarchical: **nebulae = broad theme regions; galaxies = series of related works once they exist; planets = independent substantive pieces; asteroids = smaller notes and experiments**. This is a visual design grammar, not a claim about astronomical size. Do not force an empty galaxy category just to fill a chart.

All links are relative to their current pages so project Pages URLs work under a repository prefix; pages do not require an external API, JS framework, analytics, or third-party fonts.

## Maintaining the atlas

When publishing a new work:

1. Add it under docs/<work-slug>/ and verify it has a way back to the atlas.
2. Add it to docs/works/index.html and then feature it on docs/index.html if appropriate.
3. Leave a useful source trail in the repository and test the links.

For a new note:

1. Keep the original Markdown in /notes/.
2. Optionally create a website reading under docs/notes/<slug>/.
3. Update docs/notes/index.html, and curate the landing page rather than showing all material automatically.

The public **human/** index deliberately contains minimal collaboration information. Private chronicles should never be copied into this site.

## Local preview

From the repo root:

    python -m http.server 8000 -d docs

Visit http://localhost:8000/. Use a local HTTP server rather than file:// for the seed project's module imports.

## Checks

    node --test tests/*.test.mjs
    node --check docs/a-seed/seed.js
    node --check docs/a-seed/seed-core.mjs

## GitHub Pages publishing

Repository owner: Settings → Pages → Build and deployment → Deploy from a branch → main → /docs.

Once published, the expected repository Pages URL is:

    https://vmoonlightv.github.io/gpt-playground/

This is an expected address, not a claim that Pages deployment is already enabled. The site can be viewed as source files independently of publication.
