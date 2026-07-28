# Adrian Del Rosario — Developer Portfolio

Personal portfolio for **Adrian Del Rosario**, Full Stack Developer (Manila, PH).
Static site — no build step, no dependencies to install.

## Stack

- Semantic HTML5, Bootstrap 5.3 (grid + navbar only, via CDN with SRI)
- Vanilla CSS with design tokens, fluid `clamp()` typography, mobile-first breakpoints
- Vanilla JavaScript (ES modules pattern, no framework)
- Images served as WebP

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The whole page |
| `style.css` | Design tokens → base → components, each with its own media queries |
| `script.js` | Theme, scroll spy, accessible dialogs, gallery, swipe |
| `img/` | Optimized WebP screenshots + `manifest.json` of intrinsic sizes |
| `tools/to-webp.mjs` | One-off image pipeline (see below) |

## Run locally

```bash
npx --yes serve .
```

Then open the printed URL. Any static server works — the site has no server-side code.

## Deploy

Push to `main`. GitHub Pages → Settings → Pages → deploy from `main` / root.
Live at https://ian1219.github.io/adrian-dev-showcase/

> **Bump the cache-busting version whenever you change `style.css` or
> `script.js`.** Both are linked in `index.html` as `style.css?v=YYYYMMDD`.
> GitHub Pages serves them with `Cache-Control: max-age=600`, so without a new
> version string a returning visitor keeps the old stylesheet and sees a
> half-styled page — the HTML updates, the CSS does not.

> **Before going live**, replace the placeholder domain
> `https://ian1219.github.io/adrian-dev-showcase/` with the real one in:
> `index.html` (canonical + Open Graph tags), `robots.txt`, and `sitemap.xml`.

## Adding or replacing screenshots

Drop the new PNG/JPG into the right `img/` subfolder, then:

```bash
npm install --no-save sharp
node tools/to-webp.mjs
rm -rf node_modules
```

The script converts every PNG/JPG under `img/` to WebP (max 1600px wide, quality 82),
deletes the source, and rewrites `img/manifest.json` with each file's final
`width`/`height`. Copy those numbers into the `<img>` tag so the layout does not
shift while the image loads.

Original uncompressed PNGs live in `img-original/` (git-ignored) as a backup.

## Conventions worth keeping

- **The palette is strictly monochrome.** There is no colour token anywhere —
  every surface and text value derives from the `--gray-0 … --gray-950` ramp in
  `:root`. Hierarchy comes from weight, scale, spacing, hairlines and surface
  inversion instead. Do not introduce a hue.
- **Spacing, radii and type sizes also come from custom properties.** Dark mode
  only redefines those variables under `[data-theme="dark"]` — never add a
  second themed rule for a component.
- **`.is-inverted` flips a whole region** by reassigning the semantic tokens
  locally. That is how the Client Work band goes black, and how a card inverts
  on hover. Because every component reads tokens rather than literal colours,
  nothing else has to change. In dark mode it deliberately does *not* invert to
  white — it steps up the grey ramp instead, so the page never flashes a white
  band at a dark-mode reader.
- **Never build a card grid from container-background + 1px gaps.** It leaves a
  dead grey block wherever the last row isn't full (five cards in a four-up
  grid did exactly that). Give cards their own border and a real gap.
- **Mono type is the accent.** `--font-mono` (JetBrains Mono) carries labels,
  section numbers, badges and metadata; `--font-sans` (Inter) carries
  everything else. That contrast does the job colour usually would.
- **New sections get a `.section-head`** with a numbered `.section-eyebrow`, and
  a `data-reveal` (or `data-reveal-stagger`) attribute so they animate in.
- **Layout carries the hierarchy.** Client work uses two deliberately different
  treatments: `.case-spread` (full-width editorial, with a `.anatomy` spec
  panel) for systems built from scratch, and `.ledger-row` (compact table row)
  for sites inherited and maintained. The shape tells you which is which before
  you read a word — keep that distinction if you add more work.
- **Screenshots sit in a `.browser-frame`**, which echoes the hero's code
  window. They load desaturated and regain colour on hover.
- **Interactive controls are `<button>` or `<a>`**, never a clickable `<span>`.
  Everything keyboard-reachable, minimum 44×44px tap target.
- **Type scales with `clamp()`**, so a heading should not need a media query.
- Any new dialog needs `role="dialog"`, `aria-modal="true"`, an accessible name,
  and a `.modal-close` button — `script.js` handles focus trapping and body
  scroll locking automatically for `.custom-modal` / `.modal`.
- **A dialog panel is a pinned `.modal-head` over a scrolling `.modal-body`**,
  never one long panel that scrolls as a whole. The close button lives in the
  head so it stays reachable — the Al Qaysar case study is ~2100px of content
  and the button used to scroll out of sight on a phone.
- **Never call `focus()` or `scrollIntoView()` in a dialog flow.** Both scroll
  the page as a side effect, which is what made it jump on open and lose the
  reading position on close. Use `focus({ preventScroll: true })`, and move a
  scroll container by setting `scrollLeft`/`scrollTop` directly. `lockScroll()`
  also suspends `scroll-behavior: smooth` for the duration, so the correction
  when the body is fixed can never animate.
