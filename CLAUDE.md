# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-page static portfolio site for Ramesh Senthil Kumar (Business Analyst, Product Owner & Assurance Analyst). The entire site lives in [index.html](index.html) — HTML, CSS (`<style>`), and JS (`<script>`) are all inline in that one file. There is no build system, no package manager, no framework, and no dependencies beyond a Google Fonts `<link>` (Cormorant Garamond, DM Mono, DM Sans). The file is named `index.html` (not a custom name) so it serves as the default document at the site's root — [https://rameshshakthi.github.io/](https://rameshshakthi.github.io/) — once GitHub Pages is enabled on this repo.

## Running locally

The site is opened directly by VS Code's **Live Preview** extension. [.vscode/settings.json](.vscode/settings.json) pins the default preview path to `/index.html`, so launching Live Preview serves that page. Any static server (e.g. `python -m http.server`) also works — just open `index.html`. There is no build, lint, or test step.

## File-level architecture

Because everything is in one file, navigate by the section anchors rather than by file. Top-level structure of [index.html](index.html):

- **`<style>` (lines ~8–790)** — all CSS. Design tokens live in `:root` CSS custom properties (`--black`, `--white`, `--grey-100/300/500/700`, `--accent`, `--line`). Reuse these variables; do not hardcode colors.
- **`<body>`** — sections in order: `nav`, `#home` (hero), `#about`, `#skills`, `#experience`, `#projects`, `#personal-details`, `#hobbies`, `#contact`, `footer`. The nav links depend on these exact IDs. The cursor uses the browser default — there is no custom cursor implementation.
- **`<script>`** — one behavior, no framework:
  1. **Scroll reveal** — elements with class `.reveal` fade in via `IntersectionObserver` adding `.visible`, staggered 80ms per element in the batch.

## Conventions

- Keep everything in the single HTML file — do not split into separate CSS/JS files unless explicitly asked. The Live Preview workflow and the lack of a build step depend on this.
- Use the existing CSS variables for colors and the existing font stacks (`DM Sans` for body, `Cormorant Garamond` for display/emphasis, `DM Mono` for labels/eyebrows).
- Section numbering uses `.section-num` eyebrow labels (`01`, `02`, …) — keep them sequential when adding sections.
- New animated-in elements should get `class="reveal"` to participate in the scroll-reveal observer.
