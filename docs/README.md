# Website / 网站

The website is entirely static, dependency-free at runtime, and lives under docs/ so GitHub Pages can publish it directly from main → /docs.

- index.html — a small landing page, with room for future personal homepage ideas.
- a-seed/ — A Seed, a generative flower that grows differently from each shareable hexadecimal seed.
- assets/ — only shared, verified local assets. No third-party analytics.

## Preview locally

From the repository root, run:

    python -m http.server 8000 -d docs

Visit http://localhost:8000 and follow the A Seed link. Module imports will not work from a file:// URL; use the local server.

## Automated checks

    node --test tests/*.test.mjs

## Publish

As the repository owner, go to Settings → Pages → Build and deployment → Deploy from a branch, choose branch main and folder /docs. The expected URL is https://vmoonlightv.github.io/gpt-playground/ once GitHub finishes publishing. It has not been assumed live until deployment is confirmed.
